import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  METRIC_FIELDS,
  GoogleAdsApiError,
  MISSING_PRIMARY_CONVERSION_REASON,
  campaignHealth,
  campaignsMissingPrimaryConversion,
  channelLabel,
  dateFilter,
  defaultCustomerId,
  gaql,
  hasPrimaryConversionAction,
  mapMetrics,
  micros,
  num,
  statusLabel,
} from "./google-ads.server";
import {
  listAccounts,
  resolveCustomerId,
  syncAccounts,
  touchSync,
} from "./google-ads-accounts.server";

const periodSchema = z.object({
  customerId: z.string().optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Connection status + available customer accounts (MCC ready). */
export const getGoogleAdsConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const projectDefault = defaultCustomerId();
    if (!process.env.GOOGLE_ADS_API_KEY || !projectDefault) {
      return {
        connected: false as const,
        accounts: [],
        selected: null,
        error: null as string | null,
      };
    }
    try {
      let accounts = await listAccounts(context as any);
      if (accounts.length === 0) accounts = await syncAccounts(context as any);
      const selected =
        accounts.find((a) => a.isSelected) ??
        accounts.find((a) => a.customerId === projectDefault) ??
        accounts[0] ??
        null;
      return { connected: true as const, accounts, selected, error: null as string | null };
    } catch (err) {
      const e = err as GoogleAdsApiError;
      console.error("[GoogleAds] connection check failed", e.message);
      return { connected: true as const, accounts: [], selected: null, error: e.message };
    }
  });

/** Re-read the account tree from Google Ads and stamp the sync time. */
export const syncGoogleAdsAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const accounts = await syncAccounts(context as any);
      const selected = accounts.find((a) => a.isSelected) ?? accounts[0] ?? null;
      if (selected) await touchSync(context as any, selected.customerId);
      return { ok: true as const, accounts, selected, error: null as string | null };
    } catch (err) {
      const message = (err as Error).message;
      console.error("[GoogleAds] sync failed", message);
      return { ok: false as const, accounts: [], selected: null, error: message };
    }
  });

/** Switch the active customer account. */
export const selectGoogleAdsAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ customerId: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    await ctx.supabase
      .from("google_ads_accounts")
      .update({ is_selected: false })
      .eq("user_id", ctx.userId);
    const { error } = await ctx.supabase
      .from("google_ads_accounts")
      .update({ is_selected: true, updated_at: new Date().toISOString() })
      .eq("user_id", ctx.userId)
      .eq("customer_id", data.customerId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

/** Account-level KPIs for a period. */
export const getGoogleAdsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => periodSchema.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const cid = await resolveCustomerId(context as any, data.customerId);
      const rows = await gaql(
        cid,
        `SELECT customer.id, customer.descriptive_name, customer.currency_code, ${METRIC_FIELDS}
         FROM customer WHERE ${dateFilter(data.start, data.end)}`,
      );
      const first: any = rows[0] ?? {};
      return {
        ok: true as const,
        customerId: cid,
        currency: first?.customer?.currencyCode ?? "EUR",
        metrics: mapMetrics(first?.metrics),
        error: null as string | null,
      };
    } catch (err) {
      console.error("[GoogleAds] overview failed", (err as Error).message);
      return { ok: false as const, customerId: null, currency: "EUR", metrics: null, error: (err as Error).message };
    }
  });

/** All campaigns with metrics for a period (campaigns without traffic are kept). */
export const getGoogleAdsCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => periodSchema.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const cid = await resolveCustomerId(context as any, data.customerId);
      const [structure, perf, hasPrimary, missingPerCampaign] = await Promise.all([
        (async () => {
          const fields = `campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                  campaign.advertising_channel_sub_type, campaign.bidding_strategy_type,
                  campaign.start_date_time, campaign.end_date_time,
                  campaign_budget.amount_micros, campaign_budget.explicitly_shared, campaign_budget.name`;
          try {
            return await gaql(
              cid,
              `SELECT ${fields}, campaign.primary_status, campaign.primary_status_reasons
               FROM campaign ORDER BY campaign.name`,
            );
          } catch {
            return await gaql(cid, `SELECT ${fields} FROM campaign ORDER BY campaign.name`);
          }
        })(),

        gaql(
          cid,
          `SELECT campaign.id, ${METRIC_FIELDS}
           FROM campaign WHERE ${dateFilter(data.start, data.end)}`,
        ),
        hasPrimaryConversionAction(cid),
        campaignsMissingPrimaryConversion(cid),
      ]);

      const metricsById = new Map<string, any>();
      for (const row of perf as any[]) metricsById.set(String(row.campaign?.id), row.metrics);

      const campaigns = (structure as any[]).map((row) => {
        const c = row.campaign ?? {};
        const b = row.campaignBudget ?? {};
        const missesConversion =
          missingPerCampaign !== null ? missingPerCampaign.has(String(c.id)) : hasPrimary === false;
        const extra =
          missesConversion && c.status !== "REMOVED" ? [MISSING_PRIMARY_CONVERSION_REASON] : [];

        return {
          id: String(c.id),
          name: c.name ?? String(c.id),
          status: statusLabel(c.status),
          rawStatus: c.status ?? "UNKNOWN",
          type: channelLabel(c.advertisingChannelType),
          rawType: c.advertisingChannelType ?? "UNKNOWN",
          subType: c.advertisingChannelSubType ?? null,
          bidStrategy: c.biddingStrategyType ? String(c.biddingStrategyType).replace(/_/g, " ") : null,
          startedAt: c.startDateTime ?? null,
          endsAt: c.endDateTime ?? null,
          dailyBudget: micros(b.amountMicros),
          sharedBudget: Boolean(b.explicitlyShared),
          budgetName: b.name ?? null,
          health: campaignHealth(c.primaryStatus, c.primaryStatusReasons, extra),
          metrics: mapMetrics(metricsById.get(String(c.id))),
        };
      });

      return { ok: true as const, customerId: cid, campaigns, error: null as string | null };

    } catch (err) {
      console.error("[GoogleAds] campaigns failed", (err as Error).message);
      return { ok: false as const, customerId: null, campaigns: [], error: (err as Error).message };
    }
  });

/** Campaign detail: ad groups, ads, keywords, search terms (Search) or asset groups (PMax). */
export const getGoogleAdsCampaignDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => periodSchema.extend({ campaignId: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      const cid = await resolveCustomerId(context as any, data.customerId);
      const campaignId = data.campaignId.replace(/[^0-9]/g, "");
      if (!campaignId) throw new GoogleAdsApiError("Ongeldige campagne.", 400);
      const period = dateFilter(data.start, data.end);
      const scope = `campaign.id = ${campaignId} AND ${period}`;

      const base = await gaql(
        cid,
        `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                campaign.bidding_strategy_type, campaign.start_date_time, campaign.end_date_time,
                campaign_budget.amount_micros, campaign_budget.explicitly_shared,
                ${METRIC_FIELDS}
         FROM campaign WHERE campaign.id = ${campaignId} AND ${period}`,
      );
      const structFields = `campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                campaign.bidding_strategy_type, campaign_budget.amount_micros`;
      const structure = await gaql(
        cid,
        `SELECT ${structFields}, campaign.primary_status, campaign.primary_status_reasons
         FROM campaign WHERE campaign.id = ${campaignId}`,
      ).catch(() => gaql(cid, `SELECT ${structFields} FROM campaign WHERE campaign.id = ${campaignId}`));

      const info: any = (structure[0] as any)?.campaign ?? (base[0] as any)?.campaign;
      if (!info) throw new GoogleAdsApiError("Campagne niet gevonden in Google Ads.", 404);

      const hasPrimary = await hasPrimaryConversionAction(cid);
      const rawType = info.advertisingChannelType as string | undefined;
      const campaign = {
        id: String(info.id),
        name: info.name,
        status: statusLabel(info.status),
        type: channelLabel(rawType),
        rawType: rawType ?? "UNKNOWN",
        bidStrategy: info.biddingStrategyType ? String(info.biddingStrategyType).replace(/_/g, " ") : null,
        dailyBudget: micros(
          (structure[0] as any)?.campaignBudget?.amountMicros ?? (base[0] as any)?.campaignBudget?.amountMicros,
        ),
        health: campaignHealth(
          info.primaryStatus,
          info.primaryStatusReasons,
          hasPrimary === false && info.status !== "REMOVED" ? [MISSING_PRIMARY_CONVERSION_REASON] : [],
        ),
        metrics: mapMetrics((base[0] as any)?.metrics),
      };


      const isSearchLike = rawType === "SEARCH" || rawType === "SHOPPING" || rawType === "DISPLAY" || rawType === "VIDEO" || rawType === "SMART";
      const isPmax = rawType === "PERFORMANCE_MAX";

      let adGroups: any[] = [];
      let ads: any[] = [];
      let keywords: any[] = [];
      let searchTerms: any[] = [];
      let assetGroups: any[] = [];

      if (isSearchLike) {
        const [agRows, adRows, kwRows, stRows] = await Promise.all([
          gaql(cid, `SELECT ad_group.id, ad_group.name, ad_group.status, ${METRIC_FIELDS} FROM ad_group WHERE ${scope}`),
          gaql(
            cid,
            `SELECT ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status,
                    ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions,
                    ad_group_ad.ad.final_urls, ${METRIC_FIELDS}
             FROM ad_group_ad WHERE ${scope}`,
          ),
          gaql(
            cid,
            `SELECT ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
                    ad_group_criterion.status, ${METRIC_FIELDS}
             FROM keyword_view WHERE ${scope} ORDER BY metrics.cost_micros DESC LIMIT 500`,
          ),
          gaql(
            cid,
            `SELECT search_term_view.search_term, search_term_view.status, ad_group.name, ${METRIC_FIELDS}
             FROM search_term_view WHERE ${scope} ORDER BY metrics.impressions DESC LIMIT 500`,
          ),
        ]);

        adGroups = (agRows as any[]).map((r) => ({
          id: String(r.adGroup?.id),
          name: r.adGroup?.name,
          status: statusLabel(r.adGroup?.status),
          metrics: mapMetrics(r.metrics),
        }));
        ads = (adRows as any[]).map((r) => ({
          id: String(r.adGroupAd?.ad?.id),
          adGroup: r.adGroup?.name ?? null,
          type: r.adGroupAd?.ad?.type ? String(r.adGroupAd.ad.type).replace(/_/g, " ") : null,
          status: statusLabel(r.adGroupAd?.status),
          headlines: (r.adGroupAd?.ad?.responsiveSearchAd?.headlines ?? []).map((h: any) => h.text).filter(Boolean),
          descriptions: (r.adGroupAd?.ad?.responsiveSearchAd?.descriptions ?? []).map((d: any) => d.text).filter(Boolean),
          finalUrls: r.adGroupAd?.ad?.finalUrls ?? [],
          metrics: mapMetrics(r.metrics),
        }));
        keywords = (kwRows as any[]).map((r) => ({
          text: r.adGroupCriterion?.keyword?.text ?? "—",
          matchType: r.adGroupCriterion?.keyword?.matchType ?? null,
          adGroup: r.adGroup?.name ?? null,
          status: statusLabel(r.adGroupCriterion?.status),
          metrics: mapMetrics(r.metrics),
        }));
        searchTerms = (stRows as any[]).map((r) => ({
          text: r.searchTermView?.search_term ?? r.searchTermView?.searchTerm ?? "—",
          status: r.searchTermView?.status ? String(r.searchTermView.status).replace(/_/g, " ") : null,
          adGroup: r.adGroup?.name ?? null,
          metrics: mapMetrics(r.metrics),
        }));
      }

      if (isPmax) {
        const [agRows, assetRows] = await Promise.all([
          gaql(
            cid,
            `SELECT asset_group.id, asset_group.name, asset_group.status, asset_group.final_urls, ${METRIC_FIELDS}
             FROM asset_group WHERE ${scope}`,
          ),
          gaql(
            cid,
            `SELECT asset_group.id, asset_group_asset.field_type, asset_group_asset.status,
                    asset_group_asset.primary_status, asset.type, asset.text_asset.text, asset.name
             FROM asset_group_asset WHERE campaign.id = ${campaignId}`,
          ),
        ]);
        const assetsByGroup = new Map<string, any[]>();
        for (const r of assetRows as any[]) {
          const gid = String(r.assetGroup?.id ?? "");
          const list = assetsByGroup.get(gid) ?? [];
          list.push({
            fieldType: r.assetGroupAsset?.fieldType ? String(r.assetGroupAsset.fieldType).replace(/_/g, " ") : null,
            status: r.assetGroupAsset?.status ?? null,
            primaryStatus: r.assetGroupAsset?.primaryStatus ?? null,
            assetType: r.asset?.type ?? null,
            text: r.asset?.textAsset?.text ?? r.asset?.name ?? null,
          });
          assetsByGroup.set(gid, list);
        }
        assetGroups = (agRows as any[]).map((r) => ({
          id: String(r.assetGroup?.id),
          name: r.assetGroup?.name,
          status: statusLabel(r.assetGroup?.status),
          finalUrls: r.assetGroup?.finalUrls ?? [],
          metrics: mapMetrics(r.metrics),
          assets: assetsByGroup.get(String(r.assetGroup?.id)) ?? [],
        }));
      }

      return {
        ok: true as const,
        customerId: cid,
        campaign,
        adGroups,
        ads,
        keywords,
        searchTerms,
        assetGroups,
        error: null as string | null,
      };
    } catch (err) {
      console.error("[GoogleAds] campaign detail failed", (err as Error).message);
      return {
        ok: false as const,
        customerId: null,
        campaign: null,
        adGroups: [],
        ads: [],
        keywords: [],
        searchTerms: [],
        assetGroups: [],
        error: (err as Error).message,
      };
    }
  });

/** Google Ads conversion actions + our own (still empty) B2B conversion framework. */
export const getGoogleAdsConversions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => periodSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as any;

    const { data: definitions } = await ctx.supabase
      .from("conversion_definitions")
      .select("key, label, funnel, stage_order, source, value_type")
      .order("funnel", { ascending: true })
      .order("stage_order", { ascending: true });

    const { count: eventCount } = await ctx.supabase
      .from("conversion_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId);

    try {
      const cid = await resolveCustomerId(ctx, data.customerId);
      const [actionRows, statRows] = await Promise.all([
        gaql(
          cid,
          `SELECT conversion_action.id, conversion_action.name, conversion_action.category,
                  conversion_action.type, conversion_action.status, conversion_action.primary_for_goal,
                  conversion_action.include_in_conversions_metric
           FROM conversion_action WHERE conversion_action.status = 'ENABLED'`,
        ),
        gaql(
          cid,
          `SELECT segments.conversion_action, metrics.all_conversions, metrics.all_conversions_value
           FROM campaign WHERE ${dateFilter(data.start, data.end)}`,
        ),
      ]);
      const statsById = new Map<string, { allConversions: number; value: number }>();
      for (const r of statRows as any[]) {
        const resource = String(r.segments?.conversionAction ?? "");
        const id = resource.split("/").pop() ?? "";
        if (!id) continue;
        const prev = statsById.get(id) ?? { allConversions: 0, value: 0 };
        statsById.set(id, {
          allConversions: prev.allConversions + num(r.metrics?.allConversions),
          value: prev.value + num(r.metrics?.allConversionsValue),
        });
      }

      const actions = (actionRows as any[]).map((r) => {
        const a = r.conversionAction ?? {};
        const m = statsById.get(String(a.id));
        return {
          id: String(a.id),
          name: a.name,
          category: a.category ? String(a.category).replace(/_/g, " ") : null,
          type: a.type ? String(a.type).replace(/_/g, " ") : null,
          usage: a.primaryForGoal ? ("primary" as const) : ("secondary" as const),
          countedInConversions: Boolean(a.includeInConversionsMetric),
          conversions: a.primaryForGoal ? (m?.allConversions ?? 0) : 0,
          allConversions: m?.allConversions ?? 0,
          conversionsValue: m?.value ?? 0,
        };
      });

      return {
        ok: true as const,
        customerId: cid,
        actions,
        definitions: definitions ?? [],
        ownEventCount: eventCount ?? 0,
        error: null as string | null,
      };
    } catch (err) {
      console.error("[GoogleAds] conversions failed", (err as Error).message);
      return {
        ok: false as const,
        customerId: null,
        actions: [],
        definitions: definitions ?? [],
        ownEventCount: eventCount ?? 0,
        error: (err as Error).message,
      };
    }
  });

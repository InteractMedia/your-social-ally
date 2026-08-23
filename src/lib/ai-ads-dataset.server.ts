/**
 * Controlled dataset for the AI Ads Analyst.
 *
 * The AI never touches the database or the Google Ads API directly: this module
 * builds one aggregated, PII-free snapshot (no names, e-mails, phone numbers,
 * click IDs) and that snapshot is the only thing the model ever sees.
 *
 * Conceptual separation that must be preserved:
 * - `googleAds.*`      = platformmetingen van Google Ads (conversions / all_conversions).
 * - `socialCockpitB2B` = onze eigen B2B lead- en klantdata. Dit zijn GEEN Google Ads-conversies.
 */

import {
  METRIC_FIELDS,
  dateFilter,
  gaql,
  mapMetrics,
  micros,
  num,
  channelLabel,
  statusLabel,
  type Metrics,
} from "./google-ads.server";
import { resolveCustomerId, type AdsContext } from "./google-ads-accounts.server";
import {
  CUSTOMER_STATUSES,
  QUALIFIED_STATUSES,
  cac,
  cpl,
  cpql,
  periodBounds,
  roas,
} from "./leads-shared";

export type AnalysisSnapshot = Awaited<ReturnType<typeof buildAdsAnalysisSnapshot>>;

const TOP_N = 40;
const INSIGHT_N = 25;

/** Alleen deze metrics zijn toegestaan op campaign_search_term_insight. */
const INSIGHT_METRIC_FIELDS = [
  "metrics.impressions",
  "metrics.clicks",
  "metrics.conversions",
  "metrics.conversions_value",
].join(", ");

function shiftPeriod(start: string, end: string) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(s.getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(prevStart), end: iso(prevEnd), days };
}

const round = (n: number, d = 2) => Number(n.toFixed(d));

function slimMetrics(m: Metrics) {
  return {
    spend: round(m.spend),
    impressions: m.impressions,
    clicks: m.clicks,
    ctr: round(m.ctr),
    avgCpc: round(m.avgCpc),
    conversions: round(m.conversions, 1),
    conversionsValue: round(m.conversionsValue),
    allConversions: round(m.allConversions, 1),
    allConversionsValue: round(m.allConversionsValue),
    costPerConversion: round(m.costPerConversion),
    conversionRate: round(m.conversionRate),
  };
}

type LeadAggregate = {
  leads: number;
  qualified: number;
  poor: number;
  customers: number;
  revenue: number;
  testLeads: number;
};

const emptyAgg = (): LeadAggregate => ({
  leads: 0,
  qualified: 0,
  poor: 0,
  customers: 0,
  revenue: 0,
  testLeads: 0,
});

function addLead(agg: LeadAggregate, lead: any) {
  agg.leads += 1;
  if (QUALIFIED_STATUSES.includes(lead.status) || ["qualified", "hot"].includes(lead.lead_quality))
    agg.qualified += 1;
  if (lead.lead_quality === "poor") agg.poor += 1;
  if (lead.became_customer || CUSTOMER_STATUSES.includes(lead.status)) agg.customers += 1;
  agg.revenue += Number(lead.revenue ?? lead.order_value ?? 0);
}

function withKpis(agg: LeadAggregate, spend: number) {
  return {
    leads: agg.leads,
    qualifiedLeads: agg.qualified,
    poorLeads: agg.poor,
    customers: agg.customers,
    revenue: round(agg.revenue),
    cpl: cpl(spend, agg.leads) === null ? null : round(cpl(spend, agg.leads)!),
    cpql: cpql(spend, agg.qualified) === null ? null : round(cpql(spend, agg.qualified)!),
    cac: cac(spend, agg.customers) === null ? null : round(cac(spend, agg.customers)!),
    roas: roas(agg.revenue, spend) === null ? null : round(roas(agg.revenue, spend)!, 2),
  };
}

/** Conversion-action breakdown (per action, per campaign) for one period. */
function mapConversionActionRows(rows: any[]) {
  const byAction = new Map<
    string,
    {
      conversionActionId: string | null;
      conversionActionName: string | null;
      category: string | null;
      conversions: number;
      allConversions: number;
      conversionsValue: number;
      allConversionsValue: number;
      campaigns: Map<string, { conversions: number; allConversions: number; channelType: string; status: string }>;
    }
  >();

  for (const r of rows) {
    const seg = r.segments ?? {};
    const name = seg.conversionActionName ?? "(onbekend)";
    const entry =
      byAction.get(name) ??
      {
        conversionActionId: seg.conversionAction ? String(seg.conversionAction).split("/").pop()! : null,
        conversionActionName: seg.conversionActionName ?? null,
        category: seg.conversionActionCategory ?? null,
        conversions: 0,
        allConversions: 0,
        conversionsValue: 0,
        allConversionsValue: 0,
        campaigns: new Map(),
      };
    entry.conversions += num(r.metrics?.conversions);
    entry.allConversions += num(r.metrics?.allConversions);
    entry.conversionsValue += num(r.metrics?.conversionsValue);
    entry.allConversionsValue += num(r.metrics?.allConversionsValue);

    const cname = r.campaign?.name ?? String(r.campaign?.id ?? "(onbekend)");
    const c =
      entry.campaigns.get(cname) ??
      {
        conversions: 0,
        allConversions: 0,
        channelType: channelLabel(r.campaign?.advertisingChannelType),
        status: statusLabel(r.campaign?.status),
      };
    c.conversions += num(r.metrics?.conversions);
    c.allConversions += num(r.metrics?.allConversions);
    entry.campaigns.set(cname, c);
    byAction.set(name, entry);
  }

  return [...byAction.values()]
    .map((e) => ({
      conversionActionId: e.conversionActionId,
      conversionActionName: e.conversionActionName,
      category: e.category,
      conversions: round(e.conversions, 1),
      allConversions: round(e.allConversions, 1),
      conversionsValue: round(e.conversionsValue),
      allConversionsValue: round(e.allConversionsValue),
      perCampaign: [...e.campaigns.entries()].map(([campaign, v]) => ({
        campaign,
        campaignType: v.channelType,
        campaignStatus: v.status,
        conversions: round(v.conversions, 1),
        allConversions: round(v.allConversions, 1),
      })),
    }))
    .sort((a, b) => b.allConversions - a.allConversions);
}

/** Builds the full analysis snapshot for one workspace + period. */
export async function buildAdsAnalysisSnapshot(opts: {
  ctx: AdsContext;
  workspaceId: string;
  start: string;
  end: string;
  customerId?: string | null;
  includeTestLeads?: boolean;
}) {
  const { ctx, workspaceId, start, end } = opts;
  const cid = await resolveCustomerId(ctx, opts.customerId ?? undefined);
  const prev = shiftPeriod(start, end);

  const CONV_SEGMENT_FIELDS = `segments.conversion_action, segments.conversion_action_name,
          segments.conversion_action_category, metrics.conversions, metrics.all_conversions,
          metrics.conversions_value, metrics.all_conversions_value`;

  const [
    accountRows,
    prevAccountRows,
    structure,
    perf,
    prevPerf,
    keywordRows,
    termRows,
    convRows,
    prevConvRows,
    actionConfigRows,
  ] = await Promise.all([
    gaql(
      cid,
      `SELECT customer.id, customer.descriptive_name, customer.currency_code, ${METRIC_FIELDS}
         FROM customer WHERE ${dateFilter(start, end)}`,
    ),
    gaql(cid, `SELECT customer.id, ${METRIC_FIELDS} FROM customer WHERE ${dateFilter(prev.start, prev.end)}`),
    gaql(
      cid,
      `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                campaign.bidding_strategy_type, campaign_budget.amount_micros
         FROM campaign ORDER BY campaign.name`,
    ),
    gaql(cid, `SELECT campaign.id, ${METRIC_FIELDS} FROM campaign WHERE ${dateFilter(start, end)}`),
    gaql(cid, `SELECT campaign.id, ${METRIC_FIELDS} FROM campaign WHERE ${dateFilter(prev.start, prev.end)}`),
    // Alleen zoekwoorden die daadwerkelijk hebben gedraaid: keyword_view geeft anders
    // ook alle keywords uit gepauzeerde campagnes terug met nul-metrics.
    gaql(
      cid,
      `SELECT campaign.name, campaign.status, ad_group.name, ad_group_criterion.keyword.text,
                ad_group_criterion.keyword.match_type, ad_group_criterion.status, ${METRIC_FIELDS}
         FROM keyword_view WHERE ${dateFilter(start, end)} AND metrics.impressions > 0
         ORDER BY metrics.cost_micros DESC LIMIT ${TOP_N}`,
    ).catch(() => []),
    gaql(
      cid,
      `SELECT campaign.name, campaign.advertising_channel_type, search_term_view.search_term, ${METRIC_FIELDS}
         FROM search_term_view WHERE ${dateFilter(start, end)}
         ORDER BY metrics.cost_micros DESC LIMIT ${TOP_N}`,
    ).catch(() => []),
    gaql(
      cid,
      `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                ${CONV_SEGMENT_FIELDS}
         FROM campaign WHERE ${dateFilter(start, end)}`,
    ).catch(() => []),
    gaql(
      cid,
      `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                ${CONV_SEGMENT_FIELDS}
         FROM campaign WHERE ${dateFilter(prev.start, prev.end)}`,
    ).catch(() => []),
    gaql(
      cid,
      `SELECT conversion_action.id, conversion_action.name, conversion_action.category,
                conversion_action.type, conversion_action.status, conversion_action.primary_for_goal,
                conversion_action.origin, conversion_action.counting_type,
                conversion_action.click_through_lookback_window_days
         FROM conversion_action WHERE conversion_action.status = 'ENABLED'`,
    ).catch(() => []),
  ]);

  const accountRow: any = accountRows[0] ?? {};
  const account = {
    currency: accountRow?.customer?.currencyCode ?? "EUR",
    current: slimMetrics(mapMetrics(accountRow?.metrics)),
    previous: slimMetrics(mapMetrics((prevAccountRows[0] as any)?.metrics)),
  };

  const prevById = new Map<string, any>();
  for (const r of prevPerf as any[]) prevById.set(String(r.campaign?.id), r.metrics);
  const curById = new Map<string, any>();
  for (const r of perf as any[]) curById.set(String(r.campaign?.id), r.metrics);

  const campaignStructureAll = (structure as any[]).map((row) => {
    const c = row.campaign ?? {};
    return {
      id: String(c.id),
      name: c.name ?? String(c.id),
      status: statusLabel(c.status),
      type: channelLabel(c.advertisingChannelType),
      rawType: c.advertisingChannelType ?? null,
      bidStrategy: c.biddingStrategyType ? String(c.biddingStrategyType).replace(/_/g, " ") : null,
      dailyBudget: round(micros(row.campaignBudget?.amountMicros)),
      current: slimMetrics(mapMetrics(curById.get(String(c.id)))),
      previous: slimMetrics(mapMetrics(prevById.get(String(c.id)))),
    };
  });

  // Alleen campagnes die in een van beide periodes hebben gedraaid; de rest is ruis.
  const campaignStructure = campaignStructureAll.filter(
    (c) => c.current.impressions > 0 || c.previous.impressions > 0 || c.status === "actief",
  );

  const servingNow = campaignStructure.filter((c) => c.current.impressions > 0);
  const servingPrev = campaignStructure.filter((c) => c.previous.impressions > 0);

  /* ---------- Performance Max search-term insights (categorieën) ---------- */

  const pmaxServing = servingNow.filter((c) => c.rawType === "PERFORMANCE_MAX");
  const pmaxInsightResults = await Promise.all(
    pmaxServing.slice(0, 5).map(async (c) => {
      // campaign_search_term_insight ondersteunt GEEN cost_micros, average_cpc, ctr,
      // all_conversions of all_conversions_value: die metrics laten Google de query
      // afwijzen (PROHIBITED_METRIC_IN_SELECT_OR_WHERE_CLAUSE) en leverden 0 rijen op.
      const rows = await gaql(
        cid,
        `SELECT campaign_search_term_insight.id, campaign_search_term_insight.category_label,
                campaign_search_term_insight.campaign_id, ${INSIGHT_METRIC_FIELDS}
         FROM campaign_search_term_insight
         WHERE ${dateFilter(start, end)}
           AND campaign_search_term_insight.campaign_id = ${c.id}
         ORDER BY metrics.impressions DESC LIMIT ${INSIGHT_N}`,
      ).catch((err) => {
        console.error("[AiDataset] pmax search insights query failed", (err as Error).message);
        return [];
      });
      return (rows as any[]).map((r) => {
        const label = r.campaignSearchTermInsight?.categoryLabel;
        return {
          campaign: c.name,
          campaignType: c.type,
          categoryLabel: label && label !== "" ? label : "(overige/niet-gecategoriseerd)",
          ...slimMetrics(mapMetrics(r.metrics)),
        };
      });
    }),
  );
  const pmaxSearchInsights = pmaxInsightResults.flat();

  /* ---------- Google Ads conversion actions ---------- */

  const conversionActionConfig = (actionConfigRows as any[]).map((r) => {
    const a = r.conversionAction ?? {};
    return {
      id: String(a.id),
      name: a.name ?? null,
      category: a.category ?? null,
      type: a.type ?? null,
      status: a.status ?? null,
      primaryForGoal: Boolean(a.primaryForGoal),
      origin: a.origin ?? null,
      countingType: a.countingType ?? null,
      clickThroughLookbackWindowDays: a.clickThroughLookbackWindowDays
        ? Number(a.clickThroughLookbackWindowDays)
        : null,
    };
  });
  const primaryByName = new Map(conversionActionConfig.map((a) => [a.name, a.primaryForGoal]));

  const decorate = (rows: ReturnType<typeof mapConversionActionRows>) =>
    rows.map((r) => ({
      ...r,
      primaryForGoal: primaryByName.get(r.conversionActionName) ?? null,
      countsTowardsBidding: primaryByName.get(r.conversionActionName) ?? null,
    }));

  const conversionActionsCurrent = decorate(mapConversionActionRows(convRows as any[]));
  const conversionActionsPrevious = decorate(mapConversionActionRows(prevConvRows as any[]));

  /* ---------- SocialCockpit B2B leads (aggregated, no PII) ---------- */

  const bounds = periodBounds(start, end);
  const { data: leadRows, error: leadError } = await ctx.supabase
    .from("leads")
    .select(
      "status, lead_quality, became_customer, revenue, order_value, industry_name, landing_page, campaign_id, campaign_name, keyword, gclid, is_test, poor_reason, poor_reason_label, funnel_type",
    )
    .eq("workspace_id", workspaceId)
    .gte("received_at", bounds.from)
    .lt("received_at", bounds.to)
    .limit(5000);

  const allLeads: any[] = leadError ? [] : (leadRows ?? []);
  const testLeadCount = allLeads.filter((l) => l.is_test).length;
  const leads = opts.includeTestLeads ? allLeads : allLeads.filter((l) => !l.is_test);

  const total = emptyAgg();
  const byCampaign = new Map<string, LeadAggregate>();
  const byIndustry = new Map<string, LeadAggregate>();
  const byLandingPage = new Map<string, LeadAggregate>();
  const poorReasons = new Map<string, number>();
  let leadsWithGclid = 0;
  let leadsWithCampaign = 0;

  for (const lead of leads) {
    addLead(total, lead);
    if (lead.gclid) leadsWithGclid += 1;
    const campaignKey = lead.campaign_name ?? lead.campaign_id ?? "(onbekend)";
    if (lead.campaign_name || lead.campaign_id) leadsWithCampaign += 1;
    for (const [map, key] of [
      [byCampaign, campaignKey],
      [byIndustry, lead.industry_name ?? "(onbekend)"],
      [byLandingPage, lead.landing_page ?? "(onbekend)"],
    ] as [Map<string, LeadAggregate>, string][]) {
      const agg = map.get(key) ?? emptyAgg();
      addLead(agg, lead);
      map.set(key, agg);
    }
    if (lead.lead_quality === "poor") {
      const key = lead.poor_reason_label ?? lead.poor_reason ?? "(geen reden vastgelegd)";
      poorReasons.set(key, (poorReasons.get(key) ?? 0) + 1);
    }
  }

  const spendByCampaignName = new Map<string, number>();
  for (const c of campaignStructure) spendByCampaignName.set(c.name, c.current.spend);

  const leadsByCampaign = [...byCampaign.entries()]
    .map(([name, agg]) => ({
      campaign: name,
      spend: round(spendByCampaignName.get(name) ?? 0),
      ...withKpis(agg, spendByCampaignName.get(name) ?? 0),
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, TOP_N);

  const totalSpend = account.current.spend;

  /* ---------- tracking signals (feiten, geen conclusies) ---------- */

  const spendChangePct =
    account.previous.spend > 0
      ? round(((account.current.spend - account.previous.spend) / account.previous.spend) * 100, 1)
      : null;

  const trackingSignals = {
    explanation:
      "Deze feiten zijn bedoeld om te beoordelen of een daling in conversies een trackingprobleem is of gewoon minder/ander verkeer. Trek zelf de conclusie op basis van deze signalen, niet op basis van 'vorige periode > 0 en nu 0'.",
    currentPeriod: {
      spend: account.current.spend,
      clicks: account.current.clicks,
      primaryConversions: account.current.conversions,
      allConversions: account.current.allConversions,
      allConversionsValue: account.current.allConversionsValue,
      campaignsServing: servingNow.map((c) => ({ name: c.name, type: c.type, status: c.status })),
      conversionActionsWithData: conversionActionsCurrent.map((a) => a.conversionActionName),
    },
    previousPeriod: {
      spend: account.previous.spend,
      clicks: account.previous.clicks,
      primaryConversions: account.previous.conversions,
      allConversions: account.previous.allConversions,
      campaignsServing: servingPrev.map((c) => ({ name: c.name, type: c.type, status: c.status })),
      conversionActionsWithData: conversionActionsPrevious.map((a) => a.conversionActionName),
    },
    spendChangePct,
    campaignMixChanged:
      servingNow.map((c) => c.id).join(",") !== servingPrev.map((c) => c.id).join(","),
    campaignsStoppedServing: servingPrev
      .filter((p) => !servingNow.some((c) => c.id === p.id))
      .map((c) => ({ name: c.name, type: c.type, status: c.status })),
    measurementStillActive: account.current.allConversions > 0,
    zeroPrimaryButAllConversionsPresent:
      account.current.conversions === 0 && account.current.allConversions > 0,
    enabledPrimaryConversionActions: conversionActionConfig
      .filter((a) => a.primaryForGoal)
      .map((a) => a.name),
    enabledSecondaryConversionActions: conversionActionConfig
      .filter((a) => !a.primaryForGoal)
      .map((a) => a.name),
    conversionLagWarning:
      "Conversies kunnen met vertraging binnenkomen (lookback windows tot 90 dagen). Recente dagen in de huidige periode zijn mogelijk nog niet compleet.",
    socialCockpitTracking: {
      leadsReceivedInPeriod: total.leads,
      leadsWithGoogleClickId: leadsWithGclid,
      ingestWorking: total.leads > 0,
      note: "Dit is onze eigen B2B lead-registratie in SocialCockpit, los van Google Ads-conversiemeting. Komen hier leads binnen, dan werkt onze eigen tracking ook al meet Google Ads niets.",
    },
  };

  const searchCampaignsServing = servingNow.filter((c) => c.rawType === "SEARCH");

  const dataQuality = {
    leadsInPeriod: total.leads,
    leadsWithClickId: leadsWithGclid,
    leadsWithCampaignAttribution: leadsWithCampaign,
    unattributedLeads: total.leads - leadsWithCampaign,
    testLeadsExcluded: opts.includeTestLeads ? 0 : testLeadCount,
    servingSearchCampaigns: searchCampaignsServing.length,
    servingPmaxCampaigns: pmaxServing.length,
    keywordRowsAvailable: (keywordRows as any[]).length,
    searchTermRowsAvailable: (termRows as any[]).length,
    pmaxSearchInsightRowsAvailable: pmaxSearchInsights.length,
    leadReadError: leadError?.message ?? null,
    warnings: [] as string[],
  };
  if (total.leads === 0)
    dataQuality.warnings.push(
      "Geen SocialCockpit-leads in deze periode — conclusies over CPL/CAC zijn niet mogelijk.",
    );
  if (total.leads > 0 && leadsWithCampaign / total.leads < 0.5)
    dataQuality.warnings.push("Meer dan de helft van de leads heeft geen campagne-attributie.");
  if (totalSpend > 0 && account.current.conversions === 0 && account.current.allConversions > 0)
    dataQuality.warnings.push(
      "Primaire conversies zijn 0, maar 'alle conversies' is groter dan 0: er wordt wél gemeten, maar niet op een actie die meebiedt.",
    );
  if (totalSpend > 0 && account.current.allConversions === 0)
    dataQuality.warnings.push(
      "Spend zonder enige gemeten conversie (ook geen 'alle conversies') — dit is een sterk trackingsignaal.",
    );
  if (searchCampaignsServing.length === 0)
    dataQuality.warnings.push(
      "Geen actieve Search-campagnes in deze periode: klassieke zoekwoorden en zoektermen bestaan dan niet. Dit is geen trackingprobleem.",
    );
  if (searchCampaignsServing.length > 0 && (termRows as any[]).length === 0)
    dataQuality.warnings.push(
      "Search-campagnes draaiden wel, maar er zijn geen zoektermregels — dit is wél opvallend.",
    );

  return {
    meta: {
      customerId: cid,
      currency: account.currency,
      accountName: accountRow?.customer?.descriptiveName ?? null,
      period: { start, end, days: prev.days },
      previousPeriod: { start: prev.start, end: prev.end },
      generatedAt: new Date().toISOString(),
      attributionModel: "last_non_direct_click",
      dataDictionary: {
        "googleAds.conversions":
          "Primaire Google Ads-conversies (acties die meebieden). Dit zijn platformconversies, geen B2B leads.",
        "googleAds.allConversions":
          "Alle Google Ads-conversies inclusief secundaire acties die niet meebieden.",
        "googleAds.keywords": "Klassieke Search-zoekwoorden (alleen rijen die impressies hadden).",
        "googleAds.searchTerms": "Klassieke Search-zoektermen; bestaan alleen bij Search-campagnes.",
        "googleAds.pmaxSearchInsights":
          "Performance Max search-term insights: zoekcategorieën, geen individuele zoektermen.",
        socialCockpitB2B:
          "Onze eigen B2B lead-/klantdata uit SocialCockpit. Nooit gelijkstellen aan Google Ads-conversies.",
      },
    },
    account,
    campaigns: campaignStructure.map(({ rawType, ...c }) => c),
    googleAds: {
      conversionActionConfig,
      conversionActionsCurrentPeriod: conversionActionsCurrent,
      conversionActionsPreviousPeriod: conversionActionsPrevious,
      keywords: (keywordRows as any[]).map((r) => ({
        campaign: r.campaign?.name ?? null,
        campaignStatus: statusLabel(r.campaign?.status),
        adGroup: r.adGroup?.name ?? null,
        keyword: r.adGroupCriterion?.keyword?.text ?? null,
        matchType: r.adGroupCriterion?.keyword?.matchType ?? null,
        status: statusLabel(r.adGroupCriterion?.status),
        ...slimMetrics(mapMetrics(r.metrics)),
      })),
      searchTerms: (termRows as any[]).map((r) => ({
        campaign: r.campaign?.name ?? null,
        campaignType: channelLabel(r.campaign?.advertisingChannelType),
        searchTerm: r.searchTermView?.searchTerm ?? null,
        ...slimMetrics(mapMetrics(r.metrics)),
      })),
      pmaxSearchInsights,
    },
    socialCockpitB2B: {
      total: withKpis(total, totalSpend),
      byCampaign: leadsByCampaign,
      byIndustry: [...byIndustry.entries()]
        .map(([industry, agg]) => ({ industry, ...withKpis(agg, 0) }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 25),
      byLandingPage: [...byLandingPage.entries()]
        .map(([landingPage, agg]) => ({ landingPage, ...withKpis(agg, 0) }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 25),
      poorReasons: [...poorReasons.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    },
    trackingSignals,
    dataQuality,
  };
}

export { num };

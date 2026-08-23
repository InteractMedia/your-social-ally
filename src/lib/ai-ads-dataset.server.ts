/**
 * Controlled dataset for the AI Ads Analyst.
 *
 * The AI never touches the database or the Google Ads API directly: this module
 * builds one aggregated, PII-free snapshot (no names, e-mails, phone numbers,
 * click IDs) and that snapshot is the only thing the model ever sees.
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

  const [accountRows, prevAccountRows, structure, perf, prevPerf, keywordRows, termRows] =
    await Promise.all([
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
      gaql(
        cid,
        `SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text,
                ad_group_criterion.keyword.match_type, ad_group_criterion.status, ${METRIC_FIELDS}
         FROM keyword_view WHERE ${dateFilter(start, end)}
         ORDER BY metrics.cost_micros DESC LIMIT ${TOP_N}`,
      ).catch(() => []),
      gaql(
        cid,
        `SELECT campaign.name, search_term_view.search_term, ${METRIC_FIELDS}
         FROM search_term_view WHERE ${dateFilter(start, end)}
         ORDER BY metrics.cost_micros DESC LIMIT ${TOP_N}`,
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

  const campaignStructure = (structure as any[]).map((row) => {
    const c = row.campaign ?? {};
    return {
      id: String(c.id),
      name: c.name ?? String(c.id),
      status: statusLabel(c.status),
      type: channelLabel(c.advertisingChannelType),
      bidStrategy: c.biddingStrategyType ? String(c.biddingStrategyType).replace(/_/g, " ") : null,
      dailyBudget: round(micros(row.campaignBudget?.amountMicros)),
      current: slimMetrics(mapMetrics(curById.get(String(c.id)))),
      previous: slimMetrics(mapMetrics(prevById.get(String(c.id)))),
    };
  });

  /* ---------- leads (aggregated, no PII) ---------- */

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

  const dataQuality = {
    leadsInPeriod: total.leads,
    leadsWithClickId: leadsWithGclid,
    leadsWithCampaignAttribution: leadsWithCampaign,
    unattributedLeads: total.leads - leadsWithCampaign,
    testLeadsExcluded: opts.includeTestLeads ? 0 : testLeadCount,
    keywordRowsAvailable: (keywordRows as any[]).length,
    searchTermRowsAvailable: (termRows as any[]).length,
    leadReadError: leadError?.message ?? null,
    warnings: [] as string[],
  };
  if (total.leads === 0) dataQuality.warnings.push("Geen leads in deze periode — conclusies over CPL/CAC zijn niet mogelijk.");
  if (total.leads > 0 && leadsWithCampaign / total.leads < 0.5)
    dataQuality.warnings.push("Meer dan de helft van de leads heeft geen campagne-attributie.");
  if (totalSpend > 0 && account.current.conversions === 0)
    dataQuality.warnings.push("Spend zonder gemeten conversies in Google Ads — mogelijk trackingprobleem.");
  if ((keywordRows as any[]).length === 0)
    dataQuality.warnings.push("Geen zoekwoorddata beschikbaar (mogelijk geen Search-campagnes).");

  return {
    meta: {
      customerId: cid,
      currency: account.currency,
      accountName: accountRow?.customer?.descriptiveName ?? null,
      period: { start, end, days: prev.days },
      previousPeriod: { start: prev.start, end: prev.end },
      generatedAt: new Date().toISOString(),
      attributionModel: "last_non_direct_click",
    },
    account,
    campaigns: campaignStructure,
    keywords: (keywordRows as any[]).map((r) => ({
      campaign: r.campaign?.name ?? null,
      adGroup: r.adGroup?.name ?? null,
      keyword: r.adGroupCriterion?.keyword?.text ?? null,
      matchType: r.adGroupCriterion?.keyword?.matchType ?? null,
      status: statusLabel(r.adGroupCriterion?.status),
      ...slimMetrics(mapMetrics(r.metrics)),
    })),
    searchTerms: (termRows as any[]).map((r) => ({
      campaign: r.campaign?.name ?? null,
      searchTerm: r.searchTermView?.searchTerm ?? null,
      ...slimMetrics(mapMetrics(r.metrics)),
    })),
    leads: {
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
    dataQuality,
  };
}

export { num };

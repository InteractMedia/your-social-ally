/**
 * Own-performance evidence builder (V1.6C).
 *
 * Layer 1 and 2 of the CRO Intelligence stack: what ZoetBezorgen has actually
 * measured. Every comparison carries the full downstream funnel
 *
 *   visits -> CTA -> form start -> submission -> lead -> qualified -> hot
 *          -> customer -> revenue
 *
 * plus a commercial score, so the strategist can never optimise for raw lead
 * volume while ignoring quality and revenue. Nothing here is interpreted: the
 * builder reports measured numbers and states explicitly which objective the
 * sample actually supports.
 */
import {
  commercialScore,
  decidableObjective,
  emptyDownstreamFunnel,
  revenuePer100Visits,
  type DownstreamFunnel,
} from "./landing-cro-evidence";
import { CUSTOMER_STATUSES, QUALIFIED_STATUSES } from "./leads-shared";
import type { FormFieldConfig } from "./landing-shared";

type Db = any;

const round = (n: number, d = 1) => Number(n.toFixed(d));
const rate = (a: number, b: number) => (b > 0 ? round((a / b) * 100, 1) : null);

export type EvidenceComparison = {
  dimension: string;
  label: string;
  entries: Array<
    DownstreamFunnel & {
      key: string;
      cta_rate_pct: number | null;
      form_start_rate_pct: number | null;
      submit_rate_pct: number | null;
      lead_rate_pct: number | null;
      qualified_share_pct: number | null;
      customer_share_pct: number | null;
      revenue_per_100_visits: number | null;
      commercial_score: number | null;
    }
  >;
  decidable_objective: string;
  decidable_reason: string;
  note?: string;
};

function enrich(key: string, f: DownstreamFunnel) {
  return {
    key,
    ...f,
    revenue: round(f.revenue, 2),
    cta_rate_pct: rate(f.cta_clicks, f.views),
    form_start_rate_pct: rate(f.form_started, f.views),
    submit_rate_pct: rate(f.form_submitted, f.views),
    lead_rate_pct: rate(f.leads, f.views),
    qualified_share_pct: rate(f.qualified, f.leads),
    customer_share_pct: rate(f.customers, f.leads),
    revenue_per_100_visits: revenuePer100Visits(f),
    commercial_score: commercialScore(f),
  };
}

function buildComparison(
  dimension: string,
  label: string,
  map: Map<string, DownstreamFunnel>,
  note?: string,
): EvidenceComparison {
  const total = emptyDownstreamFunnel();
  for (const f of map.values()) {
    total.views += f.views;
    total.cta_clicks += f.cta_clicks;
    total.form_started += f.form_started;
    total.form_submitted += f.form_submitted;
    total.leads += f.leads;
    total.qualified += f.qualified;
    total.hot += f.hot;
    total.customers += f.customers;
    total.revenue += f.revenue;
  }
  const decidable = decidableObjective(total);
  return {
    dimension,
    label,
    entries: [...map.entries()]
      .map(([key, f]) => enrich(key, f))
      .sort((a, b) => (b.commercial_score ?? -1) - (a.commercial_score ?? -1))
      .slice(0, 25),
    decidable_objective: decidable.objective,
    decidable_reason: decidable.reason,
    ...(note ? { note } : {}),
  };
}

/** Bucketed so headline/CTA comparisons stay readable instead of one row per string. */
const lengthBucket = (text: string | null | undefined) => {
  const n = (text ?? "").trim().length;
  if (!n) return "leeg";
  if (n <= 35) return "kort (<=35 tekens)";
  if (n <= 60) return "gemiddeld (36-60)";
  if (n <= 90) return "lang (61-90)";
  return "zeer lang (>90)";
};

export async function buildOwnPerformanceEvidence(opts: {
  db: Db;
  workspaceId: string;
  start: string;
  end: string;
  pageId?: string | null;
}) {
  const { db, workspaceId, start, end } = opts;

  const [{ data: pages }, { data: sections }, { data: forms }, { data: pageProducts }, { data: products }] =
    await Promise.all([
      db
        .from("landing_pages")
        .select(
          "id,name,slug,status,funnel_type,industry_id,current_version_id,template_key,is_test",
        )
        .eq("workspace_id", workspaceId),
      db
        .from("landing_page_sections")
        .select("landing_page_id,block_type,sort_order,enabled,content")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true }),
      db
        .from("landing_page_forms")
        .select("landing_page_id,fields,title,submit_label")
        .eq("workspace_id", workspaceId),
      db
        .from("landing_page_products")
        .select("landing_page_id,product_id")
        .eq("workspace_id", workspaceId),
      db.from("landing_products").select("id,name,category").eq("workspace_id", workspaceId),
    ]);

  const pageRows = ((pages ?? []) as any[]).filter((p) => p.is_test !== true);
  const pageIds = pageRows.map((p) => p.id);
  const pageById = new Map(pageRows.map((p) => [p.id, p]));

  const { data: industries } = await db.from("industries").select("id,name");
  const industryNameById = new Map(((industries ?? []) as any[]).map((i) => [i.id, i.name]));

  /* ------------------------------------------------- page configuration facts */

  const sectionsByPage = new Map<string, any[]>();
  for (const s of (sections ?? []) as any[]) {
    const list = sectionsByPage.get(s.landing_page_id) ?? [];
    list.push(s);
    sectionsByPage.set(s.landing_page_id, list);
  }
  const formByPage = new Map(((forms ?? []) as any[]).map((f) => [f.landing_page_id, f]));
  const productsByPage = new Map<string, string[]>();
  for (const pp of (pageProducts ?? []) as any[]) {
    const list = productsByPage.get(pp.landing_page_id) ?? [];
    list.push(pp.product_id);
    productsByPage.set(pp.landing_page_id, list);
  }
  const productNameById = new Map(((products ?? []) as any[]).map((p) => [p.id, p.name]));

  const configByPage = new Map<
    string,
    {
      hero_layout: string;
      hero_visual: string;
      headline_length: string;
      headline_has_intent_term: boolean;
      cta_label: string;
      cta_style: string;
      block_set: string;
      section_order: string;
      section_count: number;
      form_field_count: number;
      form_required_count: number;
      form_config: string;
      visual_treatment: string;
      product_names: string[];
    }
  >();

  for (const page of pageRows) {
    const list = (sectionsByPage.get(page.id) ?? []).filter((s) => s.enabled !== false);
    const hero = list.find((s) => s.block_type === "hero");
    const design = (hero?.content?.design ?? {}) as any;
    const visual = (hero?.content?.visual ?? {}) as any;
    const formFields = (formByPage.get(page.id)?.fields ?? []) as FormFieldConfig[];
    const treatments = list
      .map((s) => (s.content?.design?.image_treatment as string | undefined) ?? null)
      .filter(Boolean) as string[];

    configByPage.set(page.id, {
      hero_layout: design.layout ?? "onbekend",
      hero_visual: visual.visual_type ?? "geen",
      headline_length: lengthBucket(hero?.content?.title),
      headline_has_intent_term: /zakelijk|bedrijf|relatiegeschenk|personalis/i.test(
        String(hero?.content?.title ?? ""),
      ),
      cta_label: String(hero?.content?.cta_label ?? "onbekend").slice(0, 60),
      cta_style: design.cta_style ?? "onbekend",
      block_set: list.map((s) => s.block_type).sort().join("+") || "leeg",
      section_order: list.map((s) => s.block_type).join(">") || "leeg",
      section_count: list.length,
      form_field_count: formFields.filter((f) => f.state !== "hidden").length,
      form_required_count: formFields.filter((f) => f.state === "required").length,
      form_config: `${formFields.filter((f) => f.state !== "hidden").length} velden / ${formFields.filter((f) => f.state === "required").length} verplicht`,
      visual_treatment: treatments.length
        ? [...new Set(treatments)].sort().join("+")
        : "geen beeldtokens",
      product_names: (productsByPage.get(page.id) ?? [])
        .map((id) => productNameById.get(id))
        .filter(Boolean) as string[],
    });
  }

  /* --------------------------------------------------------------- analytics */

  const { data: events, error: eventsError } = pageIds.length
    ? await db
        .from("landing_page_events")
        .select(
          "landing_page_id,landing_page_version_id,variant_key,event_type,session_id,attribution",
        )
        .in("landing_page_id", pageIds)
        .eq("is_preview", false)
        .eq("is_test", false)
        .gte("created_at", `${start}T00:00:00Z`)
        .lte("created_at", `${end}T23:59:59Z`)
    : { data: [] as any[], error: null };

  const { data: leads, error: leadsError } = await db
    .from("leads")
    .select(
      "id,status,lead_quality,industry_id,landing_page_id,landing_page_version_id,landing_page_variant,revenue,order_value,utm_source,utm_medium,utm_campaign,campaign_name,keyword,search_term,gclid,created_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("is_test", false)
    .gte("created_at", `${start}T00:00:00Z`)
    .lte("created_at", `${end}T23:59:59Z`);

  const sourceOf = (attr: any): string => {
    const utm = attr?.last_non_direct?.utm_source ?? attr?.first_touch?.utm_source;
    if (utm) return String(utm);
    if (attr?.first_touch?.gclid || attr?.last_non_direct?.gclid) return "google_ads";
    return "direct";
  };
  const campaignOf = (attr: any): string =>
    String(
      attr?.last_non_direct?.utm_campaign ?? attr?.first_touch?.utm_campaign ?? "(geen campagne)",
    );
  const intentOf = (attr: any): string =>
    String(
      attr?.last_non_direct?.utm_term ??
        attr?.first_touch?.utm_term ??
        (attr?.first_touch?.gclid ? "(betaald, zoekterm onbekend)" : "(geen zoekintentie)"),
    );

  const dims = {
    page: new Map<string, DownstreamFunnel>(),
    version: new Map<string, DownstreamFunnel>(),
    variant: new Map<string, DownstreamFunnel>(),
    industry: new Map<string, DownstreamFunnel>(),
    source: new Map<string, DownstreamFunnel>(),
    campaign: new Map<string, DownstreamFunnel>(),
    intent: new Map<string, DownstreamFunnel>(),
    hero_layout: new Map<string, DownstreamFunnel>(),
    hero_visual: new Map<string, DownstreamFunnel>(),
    headline_length: new Map<string, DownstreamFunnel>(),
    cta_label: new Map<string, DownstreamFunnel>(),
    cta_style: new Map<string, DownstreamFunnel>(),
    section_order: new Map<string, DownstreamFunnel>(),
    block_set: new Map<string, DownstreamFunnel>(),
    form_config: new Map<string, DownstreamFunnel>(),
    field_count: new Map<string, DownstreamFunnel>(),
    visual_treatment: new Map<string, DownstreamFunnel>(),
    product: new Map<string, DownstreamFunnel>(),
  };

  const touch = (map: Map<string, DownstreamFunnel>, key: string) => {
    const f = map.get(key) ?? emptyDownstreamFunnel();
    map.set(key, f);
    return f;
  };

  const addEvent = (f: DownstreamFunnel, type: string) => {
    if (type === "page_view") f.views += 1;
    else if (type === "cta_click") f.cta_clicks += 1;
    else if (type === "form_started") f.form_started += 1;
    else if (type === "form_submitted" || type === "thank_you") f.form_submitted += 1;
  };

  for (const e of (events ?? []) as any[]) {
    const page = pageById.get(e.landing_page_id);
    if (!page) continue;
    const cfg = configByPage.get(e.landing_page_id);
    const attr = e.attribution ?? {};
    const keys: Array<[Map<string, DownstreamFunnel>, string]> = [
      [dims.page, page.name],
      [dims.version, `${page.name} · versie ${String(e.landing_page_version_id ?? "onbekend").slice(0, 8)}`],
      [dims.variant, `${page.name} · variant ${e.variant_key ?? "A"}`],
      [dims.industry, industryNameById.get(page.industry_id) ?? "geen branche"],
      [dims.source, sourceOf(attr)],
      [dims.campaign, campaignOf(attr)],
      [dims.intent, intentOf(attr)],
    ];
    if (cfg) {
      keys.push(
        [dims.hero_layout, cfg.hero_layout],
        [dims.hero_visual, cfg.hero_visual],
        [dims.headline_length, cfg.headline_length],
        [dims.cta_label, cfg.cta_label],
        [dims.cta_style, cfg.cta_style],
        [dims.section_order, cfg.section_order],
        [dims.block_set, cfg.block_set],
        [dims.form_config, cfg.form_config],
        [dims.field_count, `${cfg.form_field_count} velden`],
        [dims.visual_treatment, cfg.visual_treatment],
      );
      for (const name of cfg.product_names) keys.push([dims.product, name]);
    }
    for (const [map, key] of keys) addEvent(touch(map, key), e.event_type);
  }

  const addLead = (f: DownstreamFunnel, lead: any) => {
    f.leads += 1;
    if (QUALIFIED_STATUSES.includes(lead.status)) f.qualified += 1;
    if (lead.status === "hot") f.hot += 1;
    if (CUSTOMER_STATUSES.includes(lead.status)) {
      f.customers += 1;
      f.revenue += Number(lead.revenue ?? lead.order_value ?? 0);
    }
  };

  const leadRows = (leads ?? []) as any[];
  for (const lead of leadRows) {
    const page = lead.landing_page_id ? pageById.get(lead.landing_page_id) : null;
    const cfg = lead.landing_page_id ? configByPage.get(lead.landing_page_id) : null;
    const keys: Array<[Map<string, DownstreamFunnel>, string]> = [
      [dims.industry, industryNameById.get(lead.industry_id) ?? "geen branche"],
      [dims.source, String(lead.utm_source ?? (lead.gclid ? "google_ads" : "direct"))],
      [dims.campaign, String(lead.utm_campaign ?? lead.campaign_name ?? "(geen campagne)")],
      [
        dims.intent,
        String(lead.search_term ?? lead.keyword ?? (lead.gclid ? "(betaald, zoekterm onbekend)" : "(geen zoekintentie)")),
      ],
    ];
    if (page) {
      keys.push(
        [dims.page, page.name],
        [
          dims.version,
          `${page.name} · versie ${String(lead.landing_page_version_id ?? "onbekend").slice(0, 8)}`,
        ],
        [dims.variant, `${page.name} · variant ${lead.landing_page_variant ?? "A"}`],
      );
    }
    if (cfg) {
      keys.push(
        [dims.hero_layout, cfg.hero_layout],
        [dims.hero_visual, cfg.hero_visual],
        [dims.headline_length, cfg.headline_length],
        [dims.cta_label, cfg.cta_label],
        [dims.cta_style, cfg.cta_style],
        [dims.section_order, cfg.section_order],
        [dims.block_set, cfg.block_set],
        [dims.form_config, cfg.form_config],
        [dims.field_count, `${cfg.form_field_count} velden`],
        [dims.visual_treatment, cfg.visual_treatment],
      );
      for (const name of cfg.product_names) keys.push([dims.product, name]);
    }
    for (const [map, key] of keys) addLead(touch(map, key), lead);
  }

  const comparisons: EvidenceComparison[] = [
    buildComparison("landing_page", "Per landingspagina", dims.page),
    buildComparison("version", "Per gepubliceerde versie", dims.version),
    buildComparison("variant", "Per variant (A/B)", dims.variant),
    buildComparison("industry", "Per branche", dims.industry),
    buildComparison("traffic_source", "Per traffic source", dims.source),
    buildComparison("campaign", "Per campagne", dims.campaign),
    buildComparison("search_intent", "Per zoekintentie", dims.intent),
    buildComparison("hero", "Per hero-layout", dims.hero_layout),
    buildComparison("hero_visual", "Per hero-visualtype", dims.hero_visual),
    buildComparison("headline", "Per headline-lengte", dims.headline_length),
    buildComparison("cta", "Per CTA-copy", dims.cta_label),
    buildComparison("cta_style", "Per CTA-stijl", dims.cta_style),
    buildComparison("section_order", "Per sectievolgorde", dims.section_order),
    buildComparison("blocks", "Per gebruikte blokkenset", dims.block_set),
    buildComparison("form_config", "Per formulierconfiguratie", dims.form_config),
    buildComparison("field_count", "Per aantal formuliervelden", dims.field_count),
    buildComparison(
      "visual_treatment",
      "Per visual treatment",
      dims.visual_treatment,
      "Alleen meetbaar zolang pagina's verschillende beeldtokens gebruiken.",
    ),
    buildComparison("products", "Per product op de pagina", dims.product),
  ];

  const withData = comparisons.filter((c) => c.entries.some((e) => e.views > 0 || e.leads > 0));
  const withoutData = comparisons
    .filter((c) => !withData.includes(c))
    .map((c) => `${c.label}: geen meetbare data in deze periode.`);

  /* -------------------------------------------------- this page vs the rest */

  const thisPage = opts.pageId ? pageById.get(opts.pageId) : null;
  const thisPageFunnel = thisPage ? dims.page.get(thisPage.name) ?? emptyDownstreamFunnel() : null;
  const similarPages = thisPage
    ? pageRows
        .filter((p) => p.id !== thisPage.id && p.funnel_type === thisPage.funnel_type)
        .map((p) => ({
          name: p.name,
          industry: industryNameById.get(p.industry_id) ?? null,
          config: configByPage.get(p.id) ?? null,
          funnel: enrich(p.name, dims.page.get(p.name) ?? emptyDownstreamFunnel()),
        }))
        .filter((p) => p.funnel.views > 0 || p.funnel.leads > 0)
    : [];

  return {
    period: { start, end },
    errors: {
      events: eventsError?.message ?? null,
      leads: leadsError?.message ?? null,
    },
    pageConfigurations: pageRows.map((p) => ({
      page: p.name,
      status: p.status,
      funnel_type: p.funnel_type,
      industry: industryNameById.get(p.industry_id) ?? null,
      ...(configByPage.get(p.id) ?? {}),
    })),
    thisPage: thisPageFunnel
      ? {
          ...enrich(thisPage!.name, thisPageFunnel),
          decidable: decidableObjective(thisPageFunnel),
        }
      : null,
    similarPages,
    comparisons: withData,
    dimensionsWithoutData: withoutData,
    totals: enrich(
      "alle pagina's",
      [...dims.page.values()].reduce((acc, f) => {
        acc.views += f.views;
        acc.cta_clicks += f.cta_clicks;
        acc.form_started += f.form_started;
        acc.form_submitted += f.form_submitted;
        acc.leads += f.leads;
        acc.qualified += f.qualified;
        acc.hot += f.hot;
        acc.customers += f.customers;
        acc.revenue += f.revenue;
        return acc;
      }, emptyDownstreamFunnel()),
    ),
    leadTotalsInPeriod: leadRows.length,
  };
}

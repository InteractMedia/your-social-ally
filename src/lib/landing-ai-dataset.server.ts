/**
 * Controlled, PII-free dataset for the AI Landing Page Strategist (V1.6).
 *
 * The model never touches the database, Google Ads or lead records directly:
 * this module builds one aggregated snapshot. Names, e-mails, phone numbers and
 * click IDs never leave the server. Missing data is reported as missing — the
 * model may never invent performance figures.
 */
import { ZOETBEZORGEN_BRAND } from "./landing-brand";
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  DEFAULT_FORM_FIELDS,
  type FormFieldConfig,
} from "./landing-shared";
import {
  CTA_STYLES,
  EMPHASIS_LEVELS,
  IMAGE_TREATMENTS,
  SECTION_BACKGROUNDS,
  SECTION_DENSITIES,
  SECTION_LAYOUTS,
  SECTION_WIDTHS,
} from "./landing-design-system";
import { CUSTOMER_STATUSES, QUALIFIED_STATUSES } from "./leads-shared";
import type { AdsContext } from "./google-ads-accounts.server";

export type LandingAiDataset = Awaited<ReturnType<typeof buildLandingAiDataset>>["dataset"];

const round = (n: number, d = 2) => Number(n.toFixed(d));

function periodBounds(days: number) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export async function buildLandingAiDataset(opts: {
  ctx: AdsContext;
  workspaceId: string;
  mode: "create" | "optimize";
  pageId?: string | null;
  industryId?: string | null;
  goal?: string | null;
  brief?: string | null;
  periodDays?: number;
}) {
  const db = opts.ctx.supabase;
  const days = opts.periodDays ?? 90;
  const { start, end } = periodBounds(days);

  /* ------------------------------------------------------- page context */

  let page: any = null;
  let currentSections: any[] = [];
  let currentForm: any = null;
  let pageProducts: any[] = [];
  if (opts.pageId) {
    const [{ data: p }, { data: s }, { data: f }, { data: pp }] = await Promise.all([
      db.from("landing_pages").select("*").eq("id", opts.pageId).maybeSingle(),
      db
        .from("landing_page_sections")
        .select("block_type,sort_order,enabled,variant_key,content")
        .eq("landing_page_id", opts.pageId)
        .order("sort_order", { ascending: true }),
      db.from("landing_page_forms").select("*").eq("landing_page_id", opts.pageId).maybeSingle(),
      db
        .from("landing_page_products")
        .select("product_id,sort_order")
        .eq("landing_page_id", opts.pageId),
    ]);
    page = p ?? null;
    currentSections = s ?? [];
    currentForm = f ?? null;
    pageProducts = pp ?? [];
  }

  const industryId = opts.industryId ?? page?.industry_id ?? null;
  let industryName: string | null = null;
  if (industryId) {
    const { data } = await db.from("industries").select("name").eq("id", industryId).maybeSingle();
    industryName = data?.name ?? null;
  }

  /* ------------------------------------------------- content & products */

  const [
    { data: products },
    { data: productImages },
    { data: assets },
    { data: testimonials },
    { data: globals },
    { data: otherPages },
  ] = await Promise.all([
    db
      .from("landing_products")
      .select(
        "id,name,sku,category,short_text,long_text,min_quantity,price_from,personalization_options,occasions,industries,tags,letterbox_friendly,individually_shippable,featured,image_url,active",
      )
      .eq("workspace_id", opts.workspaceId),
    db
      .from("landing_product_images")
      .select("product_id,asset_id,url,alt_text,image_type,is_primary")
      .eq("workspace_id", opts.workspaceId),
    db
      .from("landing_assets")
      .select("id,name,asset_type,alt_text,product_id,industry_id,tags,desktop_ok,mobile_ok,active,approval_status")
      .eq("workspace_id", opts.workspaceId),
    db
      .from("landing_page_testimonials")
      .select("author,role_title,company,quote,enabled")
      .eq("workspace_id", opts.workspaceId),
    db.from("landing_global_content").select("key,content").eq("workspace_id", opts.workspaceId),
    db
      .from("landing_pages")
      .select("id,name,slug,funnel_type,status,industry_id")
      .eq("workspace_id", opts.workspaceId)
      .neq("status", "archived"),
  ]);

  const imagesByProduct = new Map<string, any[]>();
  for (const img of productImages ?? []) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  const productLibrary = (products ?? [])
    .filter((p: any) => p.active !== false)
    .map((p: any) => {
      const images = imagesByProduct.get(p.id) ?? [];
      return {
        product_id: p.id,
        name: p.name,
        sku: p.sku ?? null,
        category: p.category ?? null,
        short_text: p.short_text,
        long_text: p.long_text ?? null,
        min_quantity: p.min_quantity ?? null,
        price_from: p.price_from,
        personalization_options: p.personalization_options ?? [],
        occasions: p.occasions ?? [],
        industries: p.industries ?? [],
        tags: p.tags ?? [],
        letterbox_friendly: p.letterbox_friendly,
        individually_shippable: p.individually_shippable,
        featured: Boolean(p.featured),
        has_image: Boolean(p.image_url) || images.length > 0,
        image_types: [...new Set(images.map((i: any) => i.image_type))],
        image_count: images.length + (p.image_url && !images.length ? 1 : 0),
      };
    });

  /* Beeldbank: only approved, active assets may be referenced by the AI. */
  const assetLibrary = (assets ?? [])
    .filter((a: any) => a.active !== false && a.approval_status === "approved")
    .map((a: any) => ({
      asset_id: a.id,
      name: a.name,
      asset_type: a.asset_type,
      alt_text: a.alt_text,
      product_id: a.product_id,
      industry_id: a.industry_id,
      tags: a.tags ?? [],
      desktop_ok: a.desktop_ok !== false,
      mobile_ok: a.mobile_ok !== false,
    }));


  /* ----------------------------------------------- landing page analytics */

  const pageIds = (otherPages ?? []).map((p: any) => p.id);
  const { data: events } = pageIds.length
    ? await db
        .from("landing_page_events")
        .select("landing_page_id,landing_page_version_id,variant_key,event_type,session_id,attribution")
        .in("landing_page_id", pageIds)
        .eq("is_preview", false)
        .eq("is_test", false)
        .gte("created_at", `${start}T00:00:00Z`)
    : { data: [] as any[] };

  type Funnel = {
    views: number;
    cta_clicks: number;
    form_started: number;
    form_submitted: number;
  };
  const emptyFunnel = (): Funnel => ({ views: 0, cta_clicks: 0, form_started: 0, form_submitted: 0 });
  const byPage = new Map<string, Funnel>();
  const byVariant = new Map<string, Funnel>();
  const bySource = new Map<string, Funnel>();
  const bump = (map: Map<string, Funnel>, key: string, type: string) => {
    const agg = map.get(key) ?? emptyFunnel();
    if (type === "page_view") agg.views += 1;
    if (type === "cta_click") agg.cta_clicks += 1;
    if (type === "form_started") agg.form_started += 1;
    if (type === "form_submitted" || type === "thank_you") agg.form_submitted += 1;
    map.set(key, agg);
  };
  for (const e of (events ?? []) as any[]) {
    const pageKey = e.landing_page_id as string;
    bump(byPage, pageKey, e.event_type);
    bump(byVariant, `${pageKey}::${e.variant_key ?? "A"}`, e.event_type);
    const attr = (e.attribution ?? {}) as any;
    const source =
      attr?.last_non_direct?.utm_source ??
      attr?.first_touch?.utm_source ??
      (attr?.first_touch?.gclid || attr?.last_non_direct?.gclid ? "google_ads" : "direct");
    bump(bySource, String(source ?? "direct"), e.event_type);
  }

  const pageNameById = new Map((otherPages ?? []).map((p: any) => [p.id, p.name]));
  const rate = (a: number, b: number) => (b > 0 ? round((a / b) * 100, 1) : null);
  const funnelRow = (label: string, f: Funnel) => ({
    label,
    ...f,
    cta_rate_pct: rate(f.cta_clicks, f.views),
    submit_rate_pct: rate(f.form_submitted, f.views),
  });

  /* ------------------------------------------------------ leads / revenue */

  const { data: leads } = await db
    .from("leads")
    .select(
      "id,status,lead_quality,industry_id,landing_page_id,revenue_amount,utm_source,utm_campaign,gclid,created_at,is_test",
    )
    .eq("workspace_id", opts.workspaceId)
    .eq("is_test", false)
    .gte("created_at", `${start}T00:00:00Z`);

  const { data: poorReasonRows } = await db
    .from("poor_lead_reasons")
    .select("reason")
    .eq("workspace_id", opts.workspaceId);

  const leadRows = (leads ?? []) as any[];
  const industryAgg = new Map<
    string,
    { leads: number; qualified: number; customers: number; revenue: number }
  >();
  let qualified = 0;
  let customers = 0;
  let revenue = 0;
  let poorLeads = 0;
  let leadsWithGclid = 0;
  for (const l of leadRows) {
    const key = l.industry_id ?? "onbekend";
    const agg = industryAgg.get(key) ?? { leads: 0, qualified: 0, customers: 0, revenue: 0 };
    agg.leads += 1;
    const isQualified = QUALIFIED_STATUSES.includes(l.status);
    const isCustomer = CUSTOMER_STATUSES.includes(l.status);
    if (isQualified) {
      agg.qualified += 1;
      qualified += 1;
    }
    if (isCustomer) {
      agg.customers += 1;
      customers += 1;
      revenue += Number(l.revenue_amount ?? 0);
      agg.revenue += Number(l.revenue_amount ?? 0);
    }
    if (l.lead_quality === "poor") poorLeads += 1;
    if (l.gclid) leadsWithGclid += 1;
    industryAgg.set(key, agg);
  }

  const industryNameById = new Map<string, string>();
  {
    const { data: inds } = await db.from("industries").select("id,name");
    for (const i of (inds ?? []) as any[]) industryNameById.set(i.id, i.name);
  }

  const poorReasonCounts = new Map<string, number>();
  for (const r of (poorReasonRows ?? []) as any[])
    poorReasonCounts.set(r.reason, (poorReasonCounts.get(r.reason) ?? 0) + 1);

  /* --------------------------------------------------------- Google Ads */

  let ads: any = null;
  let adsError: string | null = null;
  try {
    const { buildAdsAnalysisSnapshot } = await import("./ai-ads-dataset.server");
    const snap = await buildAdsAnalysisSnapshot({
      ctx: opts.ctx,
      workspaceId: opts.workspaceId,
      start,
      end,
    });
    ads = {
      period: snap.meta.period,
      account: snap.account,
      campaigns: snap.campaigns.slice(0, 15),
      keywords: snap.googleAds.keywords.slice(0, 25),
      searchTerms: snap.googleAds.searchTerms.slice(0, 25),
      pmaxSearchCategories: snap.googleAds.pmaxSearchInsights.slice(0, 25),
      note: snap.meta.dataDictionary,
    };
  } catch (err) {
    adsError = (err as Error).message.slice(0, 200);
  }

  const adsClicks = Number(ads?.account?.current?.clicks ?? 0);
  const searchSignals =
    (ads?.keywords?.length ?? 0) + (ads?.searchTerms?.length ?? 0) + (ads?.pmaxSearchCategories?.length ?? 0);

  /* -------------------------------------------------------- assemble */

  const pageFunnel = opts.pageId ? byPage.get(opts.pageId) ?? emptyFunnel() : emptyFunnel();

  const currentFormFields: FormFieldConfig[] =
    (currentForm?.fields as FormFieldConfig[] | undefined) ?? DEFAULT_FORM_FIELDS;

  const dataset = {
    meta: {
      generatedAt: new Date().toISOString(),
      period: { start, end, days },
      mode: opts.mode,
      currency: "EUR",
      rules: {
        piiFree: "Deze dataset bevat geen namen, e-mailadressen, telefoonnummers of click-ID's.",
        missingData:
          "Ontbrekende data staat expliciet als leeg of null. Vul nooit ontbrekende cijfers aan met aannames.",
        separation:
          "googleAds = platformmetingen van Google Ads. socialCockpit = onze eigen B2B lead-/klantdata. Nooit door elkaar halen.",
      },
    },
    brand: ZOETBEZORGEN_BRAND,
    request: {
      mode: opts.mode,
      industry: industryName,
      goal: opts.goal ?? null,
      brief: opts.brief ?? null,
    },
    engine: {
      allowedBlockTypes: BLOCK_TYPES.map((b) => ({ block_type: b, label: BLOCK_LABELS[b] })),
      designSystem: {
        layout: SECTION_LAYOUTS,
        background: SECTION_BACKGROUNDS,
        width: SECTION_WIDTHS,
        density: SECTION_DENSITIES,
        image_treatment: IMAGE_TREATMENTS,
        cta_style: CTA_STYLES,
        emphasis: EMPHASIS_LEVELS,
      },
      formFieldsAvailable: currentFormFields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        current_state: f.state,
      })),
      constraints: [
        "Alleen bestaande block_types gebruiken; een nieuw blocktype alleen voorstellen via new_block_type_requests.",
        "Geen HTML, scripts of eigen styling: alleen tekstvelden en design-tokens uit het design system.",
        "Formuliervelden alleen herordenen of op required/optional/hidden zetten; keys en types nooit wijzigen.",
        "CTA-urls beperken tot interne anchors zoals #offerte of #producten.",
      ],
    },
    page: page
      ? {
          id: page.id,
          name: page.name,
          slug: page.slug,
          funnel_type: page.funnel_type,
          status: page.status,
          industry: industryName,
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          template_key: page.template_key,
          currentSections: currentSections.map((s: any) => ({
            block_type: s.block_type,
            sort_order: s.sort_order,
            enabled: s.enabled,
            title: s.content?.title ?? null,
            subtitle: s.content?.subtitle ?? null,
            body: s.content?.body ?? null,
            items: (s.content?.items ?? []).map((i: any) => ({ title: i.title, text: i.text })),
            cta_label: s.content?.cta_label ?? null,
            design: s.content?.design ?? null,
          })),
          currentForm: {
            title: currentForm?.title ?? null,
            intro: currentForm?.intro ?? null,
            submit_label: currentForm?.submit_label ?? null,
            fields: currentFormFields.map((f) => ({ key: f.key, label: f.label, state: f.state })),
          },
          currentProductCount: pageProducts.length,
        }
      : null,
    productLibrary,
    productLibraryEmpty: productLibrary.length === 0,
    assetLibrary,
    assetLibraryEmpty: assetLibrary.length === 0,
    visualNote:
      "Je mag alleen asset_id's uit assetLibrary gebruiken. Bestaat de gewenste visual niet? Laat asset_id leeg en schrijf een concrete visual_brief; de pagina toont dan een expliciete 'AI VISUAL NEEDED'-plek voor onze fotograaf of latere beeldgeneratie.",
    testimonials: (testimonials ?? []).map((t: any) => ({
      role_title: t.role_title,
      company_known: Boolean(t.company),
      quote_length: (t.quote ?? "").length,
      enabled: t.enabled,
    })),
    globalContentKeys: (globals ?? []).map((g: any) => g.key),
    landingAnalytics: {
      thisPage: opts.pageId ? funnelRow(page?.name ?? "deze pagina", pageFunnel) : null,
      byPage: [...byPage.entries()].map(([id, f]) => funnelRow(String(pageNameById.get(id) ?? id), f)),
      byVariant: [...byVariant.entries()].map(([key, f]) => funnelRow(key.split("::")[1] ?? "A", f)),
      byTrafficSource: [...bySource.entries()].map(([src, f]) => funnelRow(src, f)),
      note:
        "Alleen productieverkeer: preview- en testverkeer is uitgesloten. Leeg betekent: nog geen gemeten verkeer.",
    },
    socialCockpit: {
      totals: {
        leads: leadRows.length,
        qualified,
        customers,
        poorLeads,
        revenue: round(revenue),
        leadsWithGoogleClickId: leadsWithGclid,
      },
      byIndustry: [...industryAgg.entries()]
        .map(([id, agg]) => ({
          industry: industryNameById.get(id) ?? "onbekend",
          ...agg,
          revenue: round(agg.revenue),
        }))
        .sort((a, b) => b.leads - a.leads),
      poorLeadReasons: [...poorReasonCounts.entries()].map(([reason, count]) => ({ reason, count })),
      note: "Onze eigen B2B lead-/klantdata. Dit zijn geen Google Ads-conversies.",
    },
    googleAds: ads ?? { unavailable: true, error: adsError },
  };

  const industryLeadHistory = industryName
    ? (dataset.socialCockpit.byIndustry.find((i) => i.industry === industryName)?.leads ?? 0) > 0
    : false;

  /* Content readiness: deterministic facts about what content actually exists. */
  const { buildContentReadiness } = await import("./landing-readiness.server");
  const readinessResult = await buildContentReadiness({
    db,
    workspaceId: opts.workspaceId,
    pageId: opts.pageId ?? null,
  });
  (dataset as Record<string, unknown>)["contentReadiness"] = {
    score: readinessResult.readiness.score,
    items: readinessResult.readiness.items,
    missingVisualsOnPage: readinessResult.missingVisuals,
  };

  return {
    dataset,
    facts: {
      pageViews: pageFunnel.views,
      ctaClicks: pageFunnel.cta_clicks,
      formSubmissions: pageFunnel.form_submitted,
      leads: leadRows.length,
      qualifiedLeads: qualified,
      customers,
      adsClicks,
      searchSignals,
      productsInLibrary: productLibrary.length,
      testimonials: (testimonials ?? []).filter((t: any) => t.enabled !== false).length,
      hasIndustryLeadHistory: industryLeadHistory,
    },
    meta: {
      period: { start, end, days },
      industryName,
      adsAvailable: Boolean(ads),
      adsError,
    },
  };
}

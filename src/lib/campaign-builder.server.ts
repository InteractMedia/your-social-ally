/**
 * Google Ads Campaign Builder V1 (Search) — concept-engine.
 *
 * Server-only. Bouwt een dataset uit bestaande bronnen, laat Claude één
 * Search-campagne als CONCEPT voorstellen en slaat dat op voor handmatige
 * review. Er wordt NOOIT iets naar de Google Ads API geschreven.
 */

import { z } from "zod";

import {
  INITIAL_PRIMARY_BID_EVENT,
  QUOTE_EVENT_BLUEPRINTS,
  quoteBlueprint,
} from "./quote-conversion-architecture";
import {
  BUILDER_PROMPT_VERSION,
  funnelLabel,
  type BuilderProposal,
} from "./campaign-builder-shared";
import {
  applyGuardrails,
  evaluateExecutionEligibility,
  scoreDataUsability,
  ASSET_LIMITS,
  looksTruncated,
  assetTooLong,
  type DataUsability,
  type FinalUrlFacts,
} from "./campaign-builder-guardrails";

import {
  extractJsonObject,
  resolveProvider,
  runAiCompletionWithFallback,
  type AiProvider,
} from "./ai-provider.server";

type Ctx = { supabase: any; userId: string; claims?: { email?: string } };

export type DataSourceEntry = { source: string; used: boolean; detail: string };

const SYSTEM_PROMPT = `Je bent een ervaren Nederlandse B2B search-marketeer. Je ontwerpt één nieuwe Google ADS SEARCH-campagne als CONCEPT.

Harde regels:
- Je hebt GEEN toegang tot Google Ads en voert nooit wijzigingen uit. Je levert uitsluitend een voorstel dat een mens nakijkt.
- Gebruik alleen de meegeleverde dataset. Verzin NOOIT zoekvolumes, CPC's, conversieratio's, CPA of ROAS. Ontbreekt een cijfer, zet het in "missingData" en verlaag je confidence.
- Alleen Search. Geen Performance Max, Display, Shopping of YouTube.
- Is de gekozen funnel zakelijk (offerte of zakelijk cadeauplatform), dan prioriteer je B2B-zoekintentie. Voeg geen brede consumentenkeywords toe; die horen bij negativeKeywords als ze vervuiling kunnen veroorzaken.
- Elke belangrijke keuze (budget, biedstrategie, conversiedoel, elk keyword) krijgt een evidence-object met source uit: OWN_DATA (onze eigen leads/omzet), GOOGLE_ADS_HISTORY (historische keywords/zoektermen/PMax-inzichten), LANDING_PAGE (copy/CTA/formulier), EXTERNAL_KNOWLEDGE (algemene vakkennis), HYPOTHESIS (aanname). Kies HYPOTHESIS wanneer eigen data ontbreekt; noem dat eerlijk.
- PMax-zoekcategorieën zijn clusters, geen exacte zoektermen: gebruik ze als richting, niet als bewijs voor exacte match.
- Advertentietekst: headlines maximaal 30 tekens, descriptions maximaal 90 tekens, sitelinktekst maximaal 25 tekens, sitelinkomschrijving maximaal 35 tekens, callouts maximaal 25 tekens. Schrijf binnen de limiet; NOOIT een tekst afkappen of midden in een woord laten eindigen. Past iets niet, herschrijf het korter. Nederlands, geen uitroeptekens-spam.
- Claims moeten letterlijk door de landingspagina worden gedekt. Gebruik nooit twee varianten van dezelfde belofte naast elkaar (bijvoorbeeld "binnen 24 uur" én "reactie binnen 1 werkdag"): kies de variant die op de pagina staat.
- 2 tot 4 advertentiegroepen, per groep 5-12 keywords, 8-15 headlines en 3-4 descriptions.
- Advertentiegroepen zijn strikt gescheiden intentieclusters. Eén keyword hoort in precies één groep; keywords die meerdere groepen kunnen triggeren laat je weg of zet je in de best passende groep.
- Bij een branchecampagne (er is een branche opgegeven) moet elk keyword expliciete branchecontext bevatten. Sector-neutrale keywords zoals "relatiegeschenk met logo" of "chocolade met eigen wikkel" horen bij een generieke campagne met generieke landingspagina, niet hier.
- Een product plus personalisatie (logo, bedrukken, personaliseren, eigen wikkel) is GEEN bewijs van B2B: die woorden komen ook in consumentzoekopdrachten voor. Classificeer intent alleen als B2B bij een echte zakelijke of branche-aanwijzing, anders MIXED of B2C.
- Negatieve keywords mogen nooit een commercieel woord generiek uitsluiten (bijvoorbeeld "kopen", "prijs", "bestellen", "offerte"): dat blokkeert geldige B2B-zoekopdrachten. Sluit alleen uit wat aantoonbaar irrelevant is, en nooit iets wat in de landingspagina of FAQ als aanbod staat.
- aiConfidence = hoe zeker je bent van je eigen redenering. Dat is iets anders dan datakwaliteit; die beoordeelt het systeem zelf.

Antwoord met UITSLUITEND één JSON-object in dit schema:
{
  "campaignName": string,
  "goal": string,
  "expectedIntent": string,
  "summary": string,
  "dailyBudget": { "amount": number|null, "currency": "EUR", "reasoning": string, "evidence": { "source": string, "note": string } },
  "bidding": { "strategy": "MAXIMIZE_CONVERSIONS"|"MAXIMIZE_CONVERSIONS_TARGET_CPA"|"MAXIMIZE_CONVERSION_VALUE_TARGET_ROAS"|"MANUAL_CPC", "target": number|null, "reasoning": string, "evidence": {...} },
  "conversionGoal": { "name": string, "reasoning": string, "evidence": {...} },
  "adGroups": [ { "name": string, "searchIntent": string, "audienceIntent": "B2B"|"MIXED"|"B2C",
    "keywords": [ { "text": string, "matchType": "EXACT"|"PHRASE"|"BROAD", "intent": "B2B"|"MIXED"|"B2C", "evidence": {...} } ],
    "headlines": [string], "descriptions": [string] } ],
  "negativeKeywords": [ { "text": string, "matchType": "EXACT"|"PHRASE"|"BROAD", "reason": string } ],
  "sitelinks": [ { "text": string, "description": string } ],
  "callouts": [string],
  "risks": [string],
  "missingData": [string],
  "aiConfidence": number
}`;

const evidenceSchema = z
  .object({ source: z.string().default("HYPOTHESIS"), note: z.string().default("") })
  .default({ source: "HYPOTHESIS", note: "" });

const modelSchema = z.object({
  campaignName: z.string().min(3).max(120),
  goal: z.string().default(""),
  expectedIntent: z.string().default(""),
  summary: z.string().default(""),
  dailyBudget: z.object({
    amount: z.number().nullable().default(null),
    currency: z.string().default("EUR"),
    reasoning: z.string().default(""),
    evidence: evidenceSchema,
  }),
  bidding: z.object({
    strategy: z.string().default("MAXIMIZE_CONVERSIONS"),
    target: z.number().nullable().default(null),
    reasoning: z.string().default(""),
    evidence: evidenceSchema,
  }),
  conversionGoal: z.object({
    name: z.string().default(""),
    reasoning: z.string().default(""),
    evidence: evidenceSchema,
  }),
  adGroups: z
    .array(
      z.object({
        name: z.string().min(2),
        searchIntent: z.string().default(""),
        audienceIntent: z.string().default("B2B"),
        keywords: z
          .array(
            z.object({
              text: z.string().min(2),
              matchType: z.string().default("PHRASE"),
              intent: z.string().default("B2B"),
              evidence: evidenceSchema,
            }),
          )
          .default([]),
        headlines: z.array(z.string()).default([]),
        descriptions: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  negativeKeywords: z
    .array(
      z.object({
        text: z.string().min(2),
        matchType: z.string().default("PHRASE"),
        reason: z.string().default(""),
      }),
    )
    .default([]),
  sitelinks: z
    .array(z.object({ text: z.string(), description: z.string().default("") }))
    .default([]),
  callouts: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  missingData: z.array(z.string()).default([]),
  aiConfidence: z.number().min(0).max(100).default(50),
});

/* ------------------------------------------------------------------ dataset */

function trim(value: unknown, max = 400): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Alle beschikbare bronnen ophalen. Ontbrekende bronnen worden benoemd. */
export async function buildBuilderDataset(opts: {
  ctx: Ctx;
  workspaceId: string;
  funnel: string;
  landingPageId: string;
  industryName: string | null;
  locations: string[];
  language: string;
  targetDailyBudget: number | null;
}) {
  const { ctx, workspaceId } = opts;
  const sources: DataSourceEntry[] = [];
  const missing: string[] = [];

  /* landingspagina + copy/CTA/formulier */
  let landing: any = null;
  try {
    const { buildSnapshot } = await import("./landing.server");
    const snap = await buildSnapshot(opts.landingPageId);
    landing = {
      name: snap.page.name,
      slug: snap.page.slug,
      funnel: snap.page.funnel_type,
      industry: snap.page.industry_name,
      url: snap.page.canonical_url ?? snap.page.base_url ?? null,
      seoTitle: snap.page.seo_title,
      seoDescription: snap.page.seo_description,
      sections: snap.sections
        .filter((s: any) => s.enabled)
        .map((s: any) => ({ block: s.block_type, content: trim(s.content, 700) })),
      form: {
        title: snap.form.title,
        submitLabel: snap.form.submit_label,
        fields: (snap.form.fields ?? [])
          .filter((f: any) => f.enabled !== false)
          .map((f: any) => ({ key: f.key, label: f.label, required: f.required === true })),
      },
      products: snap.products.slice(0, 12).map((p: any) => ({
        name: p.name,
        priceFrom: p.price_from,
        personalization: p.personalization_options,
      })),
    };
    sources.push({
      source: "LANDING_PAGE",
      used: true,
      detail: `Landingspagina "${landing.name}" met ${landing.sections.length} secties en ${landing.form.fields.length} actieve formuliervelden.`,
    });
  } catch (err) {
    missing.push(`Landingspagina-inhoud kon niet worden gelezen: ${(err as Error).message}`);
    sources.push({ source: "LANDING_PAGE", used: false, detail: "Niet beschikbaar." });
  }

  /* Google Ads historie: campagnes, keywords, zoektermen, PMax, conversieacties */
  let ads: any = null;
  let adsError: string | null = null;
  try {
    const { buildAdsAnalysisSnapshot } = await import("./ai-ads-dataset.server");
    const end = new Date();
    const start = new Date(end.getTime() - 89 * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const snapshot = await buildAdsAnalysisSnapshot({
      ctx: { supabase: ctx.supabase, userId: ctx.userId },
      workspaceId,
      start: iso(start),
      end: iso(end),
    });
    ads = {
      meta: snapshot.meta,
      account: snapshot.account,
      campaigns: snapshot.campaigns,
      keywords: snapshot.googleAds.keywords.slice(0, 60),
      searchTerms: snapshot.googleAds.searchTerms.slice(0, 60),
      pmaxSearchInsights: snapshot.googleAds.pmaxSearchInsights.slice(0, 40),
      conversionActions: snapshot.googleAds.conversionActionConfig,
      b2b: snapshot.socialCockpitB2B,
      dataQuality: snapshot.dataQuality,
    };
    const q = snapshot.dataQuality;
    sources.push({
      source: "GOOGLE_ADS_HISTORY",
      used: true,
      detail: `Laatste 90 dagen: ${snapshot.campaigns.length} campagnes, ${q.keywordRowsAvailable} zoekwoordrijen, ${q.searchTermRowsAvailable} zoektermrijen, ${q.pmaxSearchInsightRowsAvailable} PMax-zoekcategorieën.`,
    });
    if (!q.keywordRowsAvailable)
      missing.push("Geen historische Search-zoekwoorden (er draaide geen Search-campagne).");
    if (!q.searchTermRowsAvailable) missing.push("Geen historische zoektermen beschikbaar.");
    if (!q.pmaxSearchInsightRowsAvailable) missing.push("Geen PMax search insights beschikbaar.");
    sources.push({
      source: "OWN_DATA",
      used: q.leadsInPeriod > 0,
      detail:
        q.leadsInPeriod > 0
          ? `${q.leadsInPeriod} SocialCockpit-leads in de periode, ${snapshot.socialCockpitB2B.total.customers} klanten.`
          : "Geen leads in de periode — geen eigen CPL/CPQL/CAC-onderbouwing mogelijk.",
    });
    if (!q.leadsInPeriod)
      missing.push("Geen eigen leads/omzet in de periode: budget en CPA blijven hypothese.");
  } catch (err) {
    adsError = (err as Error).message;
    missing.push(`Google Ads-data niet beschikbaar: ${adsError}`);
    sources.push({ source: "GOOGLE_ADS_HISTORY", used: false, detail: `Fout: ${adsError}` });
    sources.push({ source: "OWN_DATA", used: false, detail: "Niet meegenomen (geen Ads-context)." });
  }

  /* conversieconfiguratie in SocialCockpit */
  const { data: mappings } = await ctx.supabase
    .from("google_conversion_mappings")
    .select("internal_event_name, google_conversion_action_name, enabled, primary_signal, value_source")
    .eq("workspace_id", workspaceId);
  const conversionMappings = mappings ?? [];
  sources.push({
    source: "CONVERSION_CONFIG",
    used: conversionMappings.length > 0,
    detail: conversionMappings.length
      ? `${conversionMappings.length} funnel-events gekoppeld aan Google conversion actions.`
      : "Geen conversiekoppelingen ingesteld.",
  });
  if (!conversionMappings.length)
    missing.push("Geen conversiekoppeling ingesteld — conversiedoel is een aanname.");

  /**
   * Offerte Conversion Architecture V1: bij de offertefunnel is de primaire
   * biedconversie generiek vastgezet op "Offerte - Aanvraag". Qualified en Klant
   * worden volledig gemeten maar bieden in de startfase niet mee; verschuiven
   * gebeurt alleen na expliciete goedkeuring van de gebruiker.
   */
  const quoteArchitecture =
    opts.funnel === "quote"
      ? {
          primaryBidEvent: INITIAL_PRIMARY_BID_EVENT,
          primaryConversionActionName: quoteBlueprint(INITIAL_PRIMARY_BID_EVENT)?.googleActionName ?? "Offerte - Aanvraag",
          measuredNotBidding: QUOTE_EVENT_BLUEPRINTS.filter(
            (b) => b.initialBidding !== "primary",
          ).map((b) => b.googleActionName),
          rule:
            "Gebruik altijd deze generieke offerte-conversies; maak nooit branche-specifieke " +
            "conversieacties. Branche, campagne, landingspagina en variant zijn dimensies van de lead.",
        }
      : null;

  /* CRO/evidence-kennis, alleen relevante regels */
  const { data: evidenceRows } = await ctx.supabase
    .from("cro_evidence")
    .select("principle, topic, evidence_level, recommended_application, audience")
    .eq("active", true)
    .limit(20);
  const croEvidence = evidenceRows ?? [];
  sources.push({
    source: "CRO_EVIDENCE",
    used: croEvidence.length > 0,
    detail: croEvidence.length ? `${croEvidence.length} evidence-regels meegegeven.` : "Geen evidence-regels.",
  });

  /* leadkwaliteit per branche (eigen data) */
  let industryLeads: any[] = [];
  if (opts.industryName) {
    const { data } = await ctx.supabase
      .from("leads")
      .select("status, lead_quality, became_customer, revenue, order_value, search_term, keyword")
      .eq("workspace_id", workspaceId)
      .eq("is_test", false)
      .eq("industry_name", opts.industryName)
      .limit(500);
    industryLeads = data ?? [];
  }
  const industrySummary = opts.industryName
    ? {
        industry: opts.industryName,
        leads: industryLeads.length,
        customers: industryLeads.filter((l) => l.became_customer).length,
        revenue: industryLeads.reduce((s, l) => s + Number(l.revenue ?? l.order_value ?? 0), 0),
        observedSearchTerms: [
          ...new Set(
            industryLeads
              .map((l) => l.search_term ?? l.keyword)
              .filter((v): v is string => Boolean(v)),
          ),
        ].slice(0, 30),
      }
    : null;
  if (opts.industryName && industryLeads.length === 0)
    missing.push(`Geen eigen leads voor branche ${opts.industryName}.`);

  const dataset = {
    request: {
      funnel: opts.funnel,
      funnelLabel: funnelLabel(opts.funnel),
      industry: opts.industryName,
      locations: opts.locations,
      language: opts.language,
      targetDailyBudget: opts.targetDailyBudget,
    },
    landing,
    googleAds: ads,
    conversionMappings,
    quoteArchitecture,
    industrySummary,
    croEvidence,
    missingData: missing,
  };

  return { dataset, sources, missing, adsError };
}

/* ------------------------------------------------------ data confidence */

/** Zet de dataset om naar bruikbaarheidssignalen (V1.1). */
export function datasetUsability(dataset: any, funnel: string): DataUsability {
  const q = dataset.googleAds?.dataQuality ?? {};
  const b2b = dataset.googleAds?.b2b?.total ?? {};
  const keywordRows: any[] = dataset.googleAds?.keywords ?? [];
  const industry = dataset.industrySummary;
  const funnelPrefix = funnel === "quote" ? "quote" : "platform";

  return {
    ownLeads: Number(industry?.leads ?? q.leadsInPeriod ?? 0),
    qualifiedLeads: Number(b2b.qualifiedLeads ?? 0),
    customers: Number(industry?.customers ?? b2b.customers ?? 0),
    revenue: Number(industry?.revenue ?? b2b.revenue ?? 0),
    keywordConversions: keywordRows.reduce(
      (sum, r) => sum + Number(r.conversions ?? r?.metrics?.conversions ?? 0),
      0,
    ),
    searchTermRows: Number(q.searchTermRowsAvailable ?? 0),
    cpcDataRows: keywordRows.filter((r) => Number(r.averageCpc ?? r.avgCpc ?? 0) > 0).length,
    cpaKnown: Number(b2b.cpql ?? 0) > 0,
    landingContent: Boolean(dataset.landing),
    conversionMappingForFunnel: (dataset.conversionMappings ?? []).some((m: any) =>
      String(m.internal_event_name ?? "").startsWith(funnelPrefix),
    ),
    pmaxCategories: Number(q.pmaxSearchInsightRowsAvailable ?? 0),
    historicKeywordRows: Number(q.keywordRowsAvailable ?? 0),
  };
}

/**
 * Deterministisch, los van AI-confidence. V1.1 weegt BRUIKBAARHEID, niet de
 * aanwezigheid van datasets: PMax-categorieën, een paar historische keywords of
 * alleen een conversieconfiguratie leiden nooit tot een hoge score.
 */
export function scoreDataConfidence(
  dataset: any,
  funnel = "quote",
): { score: number; band: string; reasons: string[]; usability: DataUsability } {
  const usability = datasetUsability(dataset, funnel);
  const scored = scoreDataUsability(usability);
  return { ...scored, usability };
}

/* --------------------------------------------------------------- normalize */

const MATCH = new Set(["EXACT", "PHRASE", "BROAD"]);
const INTENT = new Set(["B2B", "MIXED", "B2C"]);

function normEvidence(e: { source: string; note: string }) {
  const source = (e.source ?? "").toUpperCase();
  const allowed = ["OWN_DATA", "GOOGLE_ADS_HISTORY", "LANDING_PAGE", "EXTERNAL_KNOWLEDGE", "HYPOTHESIS"];
  return { source: allowed.includes(source) ? source : "HYPOTHESIS", note: e.note ?? "" };
}

/** Zet het modelantwoord om naar de bewerkbare conceptstructuur (alles aan). */
export function toProposal(
  parsed: z.infer<typeof modelSchema>,
  ctx: { funnel: string; landingUrl: string; locations: string[]; language: string },
): BuilderProposal {
  return {
    campaignName: parsed.campaignName,
    funnel: ctx.funnel,
    goal: parsed.goal,
    landingPageUrl: ctx.landingUrl,
    locations: ctx.locations,
    language: ctx.language,
    dailyBudget: {
      amount: parsed.dailyBudget.amount,
      currency: parsed.dailyBudget.currency || "EUR",
      reasoning: parsed.dailyBudget.reasoning,
      evidence: normEvidence(parsed.dailyBudget.evidence),
    },
    bidding: {
      strategy: parsed.bidding.strategy,
      target: parsed.bidding.target,
      reasoning: parsed.bidding.reasoning,
      evidence: normEvidence(parsed.bidding.evidence),
    },
    conversionGoal: {
      name: parsed.conversionGoal.name,
      reasoning: parsed.conversionGoal.reasoning,
      evidence: normEvidence(parsed.conversionGoal.evidence),
    },
    adGroups: parsed.adGroups.map((g) => ({
      name: g.name,
      searchIntent: g.searchIntent,
      audienceIntent: INTENT.has(g.audienceIntent.toUpperCase()) ? g.audienceIntent.toUpperCase() : "MIXED",
      enabled: true,
      keywords: g.keywords.map((k) => ({
        text: k.text,
        matchType: MATCH.has(k.matchType.toUpperCase()) ? k.matchType.toUpperCase() : "PHRASE",
        intent: INTENT.has(k.intent.toUpperCase()) ? k.intent.toUpperCase() : "MIXED",
        evidence: normEvidence(k.evidence),
        enabled: true,
      })),
      // V1.1: NOOIT afkappen. Te lange teksten worden door de guardrails
      // herschreven of uitgezet, nooit geknipt.
      headlines: g.headlines.map((text) => ({ text: text.trim(), enabled: true })),
      descriptions: g.descriptions.map((text) => ({ text: text.trim(), enabled: true })),
    })),
    negativeKeywords: parsed.negativeKeywords.map((n) => ({
      text: n.text,
      matchType: MATCH.has(n.matchType.toUpperCase()) ? n.matchType.toUpperCase() : "PHRASE",
      reason: n.reason,
      enabled: true,
    })),
    sitelinks: parsed.sitelinks.map((s) => ({
      text: s.text.trim(),
      description: (s.description ?? "").trim(),
      enabled: true,
    })),
    callouts: parsed.callouts.map((text) => ({ text: text.trim(), enabled: true })),
    expectedIntent: parsed.expectedIntent,
    risks: parsed.risks,
    summary: parsed.summary,
  };
}

/* ------------------------------------------------- final URL / guardrails */

/** Corpus van landingspagina-copy (incl. FAQ) voor negative-safety checks. */
export function landingCopyCorpus(landing: any): string {
  if (!landing) return "";
  const parts = [
    landing.seoTitle,
    landing.seoDescription,
    ...(landing.sections ?? []).map((s: any) => s.content),
    landing.form?.title,
    landing.form?.submitLabel,
    ...(landing.form?.fields ?? []).map((f: any) => f.label),
    ...(landing.products ?? []).map((p: any) => `${p.name} ${p.personalization ?? ""}`),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** Controleert de final URL echt: absolute HTTPS, HTTP 200, host en noindex. */
export async function checkFinalUrl(url: string | null): Promise<{
  httpStatus: number | null;
  noindex: boolean | null;
  finalHostMatches: boolean | null;
}> {
  if (!url || !/^https:\/\//i.test(url))
    return { httpStatus: null, noindex: null, finalHostMatches: null };
  try {
    const res = await fetch(url, { redirect: "follow" });
    let noindex: boolean | null = null;
    const header = res.headers.get("x-robots-tag") ?? "";
    if (/noindex/i.test(header)) noindex = true;
    if (res.ok) {
      const html = await res.text();
      const meta = /<meta[^>]+name=["']robots["'][^>]*>/i.exec(html)?.[0] ?? "";
      noindex = noindex === true ? true : /noindex/i.test(meta);
    }
    let finalHostMatches: boolean | null = null;
    try {
      finalHostMatches = new URL(res.url || url).host === new URL(url).host;
    } catch {
      finalHostMatches = null;
    }
    return { httpStatus: res.status, noindex, finalHostMatches };
  } catch {
    return { httpStatus: null, noindex: null, finalHostMatches: null };
  }
}

/**
 * Bepaalt of een concept ooit uitvoerbaar mag heten. Draft, preview of een
 * relatieve URL leidt altijd tot BLOCKED_FOR_CREATION. Daarnaast moet de
 * productieversie bekend zijn, tracking live bewezen zijn en de juiste
 * conversieactie voor de funnel actief gekoppeld staan.
 */
export async function evaluateDraftExecution(opts: {
  ctx: Ctx;
  workspaceId: string;
  landingPageId: string | null;
  landingStatus: string | null;
  url: string | null;
  funnel?: string | null;
  /** Het (guardrailed) voorstel, voor netwerk-, locatie-, bieddoel- en tekstchecks. */
  proposal?: BuilderProposal | null;
}): Promise<{ eligibility: string; blockers: string[]; checkedAt: string }> {

  const { httpStatus, noindex, finalHostMatches } = await checkFinalUrl(opts.url);

  let trackingValidated = false;
  let productionVersionId: string | null = null;
  if (opts.landingPageId) {
    const { data: pageRow } = await opts.ctx.supabase
      .from("landing_pages")
      .select("current_version_id")
      .eq("id", opts.landingPageId)
      .maybeSingle();
    productionVersionId = pageRow?.current_version_id ?? null;

    // Tracking is pas bewezen als er op de live (niet-preview) pagina zowel
    // paginabezoeken als een formulierverzending zijn gemeten. Interne
    // testaanvragen mogen dat bewijs leveren; ze blijven buiten de KPI's.
    const [{ count: views }, { count: submits }] = await Promise.all([
      opts.ctx.supabase
        .from("landing_page_events")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", opts.workspaceId)
        .eq("landing_page_id", opts.landingPageId)
        .eq("is_preview", false)
        .eq("event_type", "page_view"),
      opts.ctx.supabase
        .from("landing_page_events")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", opts.workspaceId)
        .eq("landing_page_id", opts.landingPageId)
        .eq("is_preview", false)
        .in("event_type", ["form_submitted", "thank_you"]),
    ]);
    trackingValidated = Number(views ?? 0) > 0 && Number(submits ?? 0) > 0;
  }

  const conversionEvent = opts.funnel === "platform" ? "platform_application" : "quote_request";
  const { data: mapping } = await opts.ctx.supabase
    .from("google_conversion_mappings")
    .select("google_conversion_action_id,google_conversion_action_name,enabled")
    .eq("workspace_id", opts.workspaceId)
    .eq("internal_event_name", conversionEvent)
    .eq("enabled", true)
    .maybeSingle();

  const p = opts.proposal ?? null;
  const truncatedActiveAssets: string[] = [];
  if (p) {
    const check = (text: string, limit: number) => {
      if (assetTooLong(text, limit) || looksTruncated(text, limit)) truncatedActiveAssets.push(text);
    };
    for (const g of p.adGroups ?? []) {
      if (!g.enabled) continue;
      g.headlines.filter((h) => h.enabled).forEach((h) => check(h.text, ASSET_LIMITS.headline));
      g.descriptions.filter((d) => d.enabled).forEach((d) => check(d.text, ASSET_LIMITS.description));
    }
    (p.callouts ?? []).filter((c) => c.enabled).forEach((c) => check(c.text, ASSET_LIMITS.callout));
    (p.sitelinks ?? [])
      .filter((s) => s.enabled)
      .forEach((s) => {
        check(s.text, ASSET_LIMITS.sitelinkText);
        check(s.description ?? "", ASSET_LIMITS.sitelinkDescription);
      });
  }

  const facts: FinalUrlFacts = {
    landingStatus: opts.landingStatus,
    url: opts.url,
    httpStatus,
    noindex,
    trackingValidated,
    finalHostMatches,
    conversionActionId: mapping?.google_conversion_action_id ?? null,
    conversionActionName: mapping?.google_conversion_action_name ?? null,
    productionVersionId,
    proposalConversionActionId: p?.conversionGoal?.actionId ?? null,
    network: (p as any)?.network ?? null,
    locationOption: (p as any)?.locationOption ?? null,
    truncatedActiveAssets,
  };
  const res = evaluateExecutionEligibility(facts);
  return { ...res, checkedAt: new Date().toISOString() };
}



/**
 * V1.1: hervalideert een bestaand concept volledig deterministisch — zonder
 * nieuwe AI-run en zonder ook maar iets naar Google Ads te schrijven.
 */
export async function revalidateDraftForWorkspace(opts: {
  ctx: Ctx;
  workspaceId: string;
  draftId: string;
}) {
  const { ctx, workspaceId } = opts;
  const { data: row } = await ctx.supabase
    .from("search_campaign_drafts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", opts.draftId)
    .maybeSingle();
  if (!row) return { ok: false as const, error: "Concept niet gevonden." };

  const { data: page } = await ctx.supabase
    .from("landing_pages")
    .select("id, name, slug, status, base_url, canonical_url")
    .eq("id", row.landing_page_id)
    .maybeSingle();

  const { dataset, sources, missing } = await buildBuilderDataset({
    ctx,
    workspaceId,
    funnel: row.funnel,
    landingPageId: row.landing_page_id,
    industryName: row.industry_name,
    locations: row.locations ?? [],
    language: row.language,
    targetDailyBudget: row.target_daily_budget,
  });

  const { proposal, report } = applyGuardrails(row.proposal as BuilderProposal, {
    industryName: row.industry_name,
    isIndustryCampaign: Boolean(row.industry_name),
    landingCopy: landingCopyCorpus(dataset.landing),
  });

  // Er bestaat maar één authoritative final URL: de gepubliceerde production-URL.
  if (row.landing_page_url && /^https:\/\//i.test(row.landing_page_url)) {
    proposal.landingPageUrl = row.landing_page_url;
  }

  // Het primaire bieddoel volgt de actieve conversiekoppeling van de funnel.
  const bidEvent = row.funnel === "platform" ? "platform_application" : "quote_request";
  const { data: bidMapping } = await ctx.supabase
    .from("google_conversion_mappings")
    .select("google_conversion_action_id,google_conversion_action_name")
    .eq("workspace_id", workspaceId)
    .eq("internal_event_name", bidEvent)
    .eq("enabled", true)
    .maybeSingle();
  if (bidMapping?.google_conversion_action_id) {
    proposal.conversionGoal = {
      ...proposal.conversionGoal,
      name: bidMapping.google_conversion_action_name ?? proposal.conversionGoal.name,
      actionId: bidMapping.google_conversion_action_id,
    };
  }

  const confidence = scoreDataConfidence(dataset, row.funnel);
  const execution = await evaluateDraftExecution({
    ctx,
    workspaceId,
    landingPageId: row.landing_page_id,
    landingStatus: page?.status ?? null,
    url: row.landing_page_url,
    funnel: row.funnel,
    proposal,
  });


  const finalProposal = {
    ...proposal,
    guardrails: report as unknown as Record<string, unknown>,
    execution,
    dataConfidenceBand: confidence.band,
  };


  const { error } = await ctx.supabase
    .from("search_campaign_drafts")
    .update({
      proposal: finalProposal,
      data_confidence: confidence.score,
      data_confidence_reasons: confidence.reasons,
      data_sources: sources,
      missing_data: [...new Set([...(row.missing_data ?? []), ...missing])],
      status: execution.eligibility === "ALLOWED" ? row.status : row.status === "APPROVED_FOR_CREATION" ? "REVIEWED" : row.status,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", opts.draftId);
  if (error) return { ok: false as const, error: error.message };

  return {
    ok: true as const,
    error: null as string | null,
    report,
    execution,
    dataConfidence: confidence.score,
    dataConfidenceBand: confidence.band,
  };
}

/* -------------------------------------------------------------------- run */


export async function runSearchConceptForWorkspace(opts: {
  ctx: Ctx;
  workspaceId: string;
  funnel: string;
  landingPageId: string;
  industryId: string | null;
  locations: string[];
  language: string;
  targetDailyBudget: number | null;
  provider: AiProvider;
  model: string;
}) {
  const { ctx, workspaceId } = opts;

  const { data: page } = await ctx.supabase
    .from("landing_pages")
    .select("id, name, slug, status, funnel_type, base_url, canonical_url, industry_id")
    .eq("id", opts.landingPageId)
    .maybeSingle();
  if (!page) return { ok: false as const, draftId: null, error: "Landingspagina niet gevonden." };

  let industryName: string | null = null;
  const industryId = opts.industryId ?? page.industry_id ?? null;
  if (industryId) {
    const { data: ind } = await ctx.supabase
      .from("industries")
      .select("name")
      .eq("id", industryId)
      .maybeSingle();
    industryName = ind?.name ?? null;
  }

  const { dataset, sources, missing } = await buildBuilderDataset({
    ctx,
    workspaceId,
    funnel: opts.funnel,
    landingPageId: opts.landingPageId,
    industryName,
    locations: opts.locations,
    language: opts.language,
    targetDailyBudget: opts.targetDailyBudget,
  });

  const resolved = resolveProvider(opts.provider, opts.model);
  const landingUrl =
    page.canonical_url ??
    (page.base_url ? `${String(page.base_url).replace(/\/$/, "")}/${page.slug}` : `/${page.slug}`);

  const userMessage = `TAAK: ontwerp één nieuwe Google Search-campagne als CONCEPT voor deze funnel en landingspagina.

DATASET (JSON):
${JSON.stringify(dataset, null, 1)}

Landingspagina-URL voor de advertenties: ${landingUrl}
Locaties: ${opts.locations.join(", ") || "niet opgegeven"}
Taal: ${opts.language}
Gewenst startbudget per dag: ${opts.targetDailyBudget ?? "niet opgegeven"}

Antwoord met uitsluitend het JSON-object volgens het schema.`;

  let completion;
  try {
    completion = await runAiCompletionWithFallback({
      provider: resolved.provider,
      model: resolved.model,
      system: SYSTEM_PROMPT,
      user: userMessage,
      temperature: 0.3,
      maxTokens: 12000,
    });
  } catch (err) {
    return { ok: false as const, draftId: null, error: (err as Error).message };
  }

  let parsed: z.infer<typeof modelSchema>;
  try {
    parsed = modelSchema.parse(extractJsonObject(completion.text));
  } catch (err) {
    return {
      ok: false as const,
      draftId: null,
      error: `AI-antwoord kon niet worden gelezen: ${(err as Error).message}`,
    };
  }

  const rawProposal = toProposal(parsed, {
    funnel: opts.funnel,
    landingUrl,
    locations: opts.locations,
    language: opts.language,
  });

  // V1.1: deterministische guardrails over het AI-voorstel.
  const { proposal: guarded, report } = applyGuardrails(rawProposal, {
    industryName,
    isIndustryCampaign: Boolean(industryName),
    landingCopy: landingCopyCorpus(dataset.landing),
  });
  const execution = await evaluateDraftExecution({
    ctx,
    workspaceId,
    landingPageId: page.id,
    landingStatus: (page as any).status ?? null,
    url: landingUrl,
    funnel: opts.funnel,
    proposal: guarded,
  });

  const dataConfidence = scoreDataConfidence(dataset, opts.funnel);
  const proposal: BuilderProposal = {
    ...guarded,
    guardrails: report as unknown as Record<string, unknown>,
    execution,
    dataConfidenceBand: dataConfidence.band,
  };
  const missingData = [...new Set([...missing, ...parsed.missingData, ...report.claimFindings])];

  const { data: inserted, error } = await ctx.supabase
    .from("search_campaign_drafts")
    .insert({
      workspace_id: workspaceId,
      created_by: ctx.userId,
      funnel: opts.funnel,
      landing_page_id: page.id,
      landing_page_name: page.name,
      landing_page_url: landingUrl,
      industry_id: industryId,
      industry_name: industryName,
      locations: opts.locations,
      language: opts.language,
      target_daily_budget: opts.targetDailyBudget,
      status: "AI_CONCEPT",
      provider: completion.provider,
      model: completion.model,
      prompt_version: BUILDER_PROMPT_VERSION,
      fallback_reason: completion.fallbackReason ?? resolved.fallbackReason,
      input_tokens: completion.inputTokens,
      output_tokens: completion.outputTokens,
      estimated_cost_usd: completion.estimatedCostUsd,
      runtime_ms: completion.runtimeMs,
      ai_confidence: Math.round(parsed.aiConfidence <= 1 ? parsed.aiConfidence * 100 : parsed.aiConfidence),
      data_confidence: dataConfidence.score,
      data_confidence_reasons: dataConfidence.reasons,
      data_sources: sources,
      missing_data: missingData,
      proposal,
      original_proposal: proposal,
      dataset_meta: {
        generatedAt: new Date().toISOString(),
        customerId: dataset.googleAds?.meta?.customerId ?? null,
        period: dataset.googleAds?.meta?.period ?? null,
        landingSections: dataset.landing?.sections?.length ?? 0,
      },
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, draftId: null, error: error.message };

  return {
    ok: true as const,
    draftId: inserted.id as string,
    error: null as string | null,
    fallbackReason: completion.fallbackReason ?? resolved.fallbackReason,
    provider: completion.provider,
    model: completion.model,
  };
}

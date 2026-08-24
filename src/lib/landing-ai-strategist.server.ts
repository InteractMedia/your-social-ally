/**
 * AI Landing Page Strategist & Designer (V1.6) — server engine.
 *
 * Hard boundaries:
 *  - The model only produces configuration for the existing block/template
 *    engine: block types, text fields, design tokens and form field states.
 *  - No HTML, scripts or styling ever comes from the model.
 *  - Nothing is published. Applying a proposal always creates a NEW draft page;
 *    the existing page and its versions are never overwritten.
 *  - Google Ads and offline conversions are never touched here.
 */
import { z } from "zod";

import { gradeDecision, type CroEvidenceRow } from "./landing-cro-evidence";
import { enforceApplicabilityOnDecision } from "./landing-evidence-applicability";

import {
  extractJsonObject,
  resolveProvider,
  runAiCompletionWithFallback,
  type AiProvider,
} from "./ai-provider.server";
import { buildLandingAiDataset } from "./landing-ai-dataset.server";
import {
  aiProposalSchema,
  computeDataConfidence,
  LANDING_AI_DEFAULT_MODEL,
  LANDING_AI_PROMPT_VERSION,
  type AiProposalPayload,
  type LandingAiMode,
} from "./landing-ai-shared";
import { BLOCK_TYPES, DEFAULT_FORM_FIELDS, type FormFieldConfig } from "./landing-shared";

type Ctx = { supabase: any; userId: string; claims?: { email?: string } };

/* ------------------------------------------------------------- prompts */

const ROLE = `Je bent een senior B2B conversiestrateeg en landingspaginaontwerper voor ZoetBezorgen (zakelijke snoep- en chocoladegeschenken, Nederland).
Je werkt data-gedreven en commercieel. Je schrijft Nederlandse B2B-copy: concreet, menselijk, zonder overdreven marketingtaal.

Absolute regels:
- Verzin NOOIT cijfers, klantnamen, reviews, prijzen, aantallen of garanties. Gebruik alleen feiten uit de dataset (brand, productLibrary, testimonials).
- Ontbrekende data benoem je expliciet in missing_data. Nooit opvullen met aannames.
- googleAds = platformdata van Google Ads. socialCockpit = onze eigen B2B lead-/klantdata. Nooit door elkaar halen of optellen.
- Je hebt geen toegang tot Google Ads-wijzigingen, budgetten of conversieuploads. Adviseer daar niets over.
- Je output is uitsluitend geldige JSON zonder toelichting eromheen.

EVIDENCE-DISCIPLINE (V1.6C) — bepalend voor elke keuze:
- Werk de bronnen in deze volgorde af: (1) eigen gemeten data van deze pagina/variant, (2) gemeten data van vergelijkbare eigen pagina's of branches, (3) de externe CRO/UX-kennisbank in croEvidence.externalEvidence, (4) je eigen expertise als hypothese.
- Je mag stap 4 alleen gebruiken als 1-3 niets zeggen over die keuze, en je labelt dat dan als ai_hypothesis.
- Verzin geen evidence en verwijs nooit naar onderzoek dat niet in croEvidence.externalEvidence staat. Externe evidence citeer je via evidence_refs met de id uit die lijst.
- Commerciële hiërarchie: omzet/klanten > gekwalificeerde leads > leads > formulierinzendingen > CTA-clicks. Een verbetering die meer leads oplevert maar minder gekwalificeerde leads of omzet, is GEEN verbetering; zeg dat dan expliciet.
- Optimaliseer op de hoogste laag die croEvidence.ownPerformance daadwerkelijk kan meten (zie decidable_objective per vergelijking). Kan die laag niet gemeten worden, benoem dat als meetbeperking.
- Zonder eigen meetdata bestaat er geen zekerheid: gebruik dan WEAK of HYPOTHESIS en stel een A/B-test voor.`;

const RESEARCH_SYSTEM = `${ROLE}

FASE 1 — STRATEGIE.
Bepaal, op basis van de dataset, de commerciële strategie voor deze landingspagina.
Denk als iemand die de bezoeker kent: wie is het, met welke aanleiding komt hij, wat moet hij binnen 5 seconden begrijpen, wat houdt hem tegen, en welk bewijs neemt de twijfel weg.
Gebruik zoekintentiedata (keywords, zoektermen, PMax-categorieën) voor message match; classificeer intentie zelf als B2B of B2C waar relevant en zeg het als je het niet zeker weet.

Antwoord met exact dit JSON-object:
{
  "audience": "wie is de bezoeker en in welke rol/koopfase",
  "visit_intent": "waarom komt hij op deze pagina",
  "pains": ["..."],
  "core_proposition": "de belofte die bovenaan de pagina moet staan",
  "key_proof": ["welk bewijs, alleen wat aantoonbaar bestaat"],
  "primary_cta": "de gewenste actie",
  "objections": ["bezwaren die de pagina moet wegnemen"],
  "recommended_structure": ["blokvolgorde met korte reden per blok"],
  "mobile_priorities": ["wat mobiel eerst zichtbaar moet zijn"],
  "missing_data": ["welke data/content ontbreekt om dit sterker te maken"],
  "evidence_notes": ["per strategische keuze: welke bronlaag (eigen data / vergelijkbare eigen data / externe evidence / hypothese) je gebruikte en wat de gemeten cijfers zeggen"],
  "measurement_limits": ["welke commerciële laag we nu NIET kunnen meten en wat dat betekent voor de zekerheid"],
  "confidence": 0-100
}`;

const BUILD_SYSTEM = `${ROLE}

FASE 2 — PAGINA-ONTWERP.
Bouw de landingspagina in onze block-engine op basis van de strategie uit fase 1.

CRO-principes die je moet toepassen:
- Boodschap boven de fold sluit aan op de zoekintentie (message match).
- Eén duidelijke primaire actie; alle CTA's vragen hetzelfde.
- Bewijs en risicoverlaging dicht bij elke CTA-zone.
- Bezwaren wegnemen vóór het formulier.
- Scanbaar: korte koppen, korte alinea's, opsommingen.
- Zo weinig mogelijk formulierfrictie: alleen velden die de vervolgstap echt nodig heeft; de rest optioneel of hidden.
- Mobiel-first: eerst propositie, dan bewijs, dan CTA.

Ontwerpregels:
- Gebruik alleen block_types uit engine.allowedBlockTypes. Mist er een blok dat je echt nodig hebt? Zet dat in new_block_type_requests en werk verder met bestaande blokken.
- Per sectie mag je design-tokens kiezen uit engine.designSystem (layout, background, width, density, image_treatment, cta_style, emphasis). Varieer bewust zodat de pagina niet één grijze kolom wordt, maar blijf rustig en merkconform.
- cta_url alleen interne anchors zoals "#offerte" of "#producten".
- Producten alleen kiezen uit productLibrary via product_id. Is de bibliotheek leeg, kies dan geen producten en zet dat in missing_data.
- Formuliervelden: alleen keys uit engine.formFieldsAvailable, en per veld state required/optional/hidden. Bepaal ook de beste volgorde (de volgorde van de array is de weergaveorder). Verzin geen nieuwe velden.
- Geen HTML, markdown-tabellen, scripts of CSS in tekstvelden.

VISUAL-FIRST REGIE (verplicht):
- Je bent ook art director. Elke sectie die visueel iets moet doen krijgt een "visual"-object in content. Denk in beeld, niet alleen in tekst.
- visual_type kiezen uit: product_cutout, product_group, personalized_product, product_lifestyle, business_context, industry_context, personalization_example, customer_logo, testimonial, illustration, decorative, none.
- Per visual: purpose (welk bezwaar of belofte bewijst dit beeld), composition (concreet: onderwerp, kadrering, licht, sfeer), desktop_position en mobile_position, aspect_ratio, background_treatment.
- asset_id mag je ALLEEN vullen met een bestaande asset_id uit assetLibrary die past bij visual_type. Bestaat die niet, laat asset_id leeg (null) en schrijf een concrete visual_brief die een fotograaf of beeldgenerator direct kan uitvoeren.
- product_ids in visual alleen uit productLibrary.
- Een sectie zonder beeldbehoefte krijgt visual_type "none" met visual_required false. Gebruik dat spaarzaam: een sterke B2B-pagina is visueel, niet één tekstkolom.
- Zeg in missing_data expliciet welke visuals ontbreken om de pagina echt commercieel sterk te maken.

Antwoord met exact dit JSON-object (geen extra velden):
{
  "strategy": { ...exact het strategie-object uit fase 1... },
  "page": {
    "name": "voorstel paginanaam",
    "seo_title": "max 60 tekens",
    "seo_description": "max 155 tekens",
    "sections": [
      { "block_type": "hero", "enabled": true, "reason": "waarom dit blok hier",
        "content": { "title": "...", "subtitle": "...", "body": "...", "cta_label": "...", "cta_url": "#offerte",
                     "secondary_cta_label": "...", "secondary_cta_url": "#producten", "image_alt": "...",
                     "items": [{ "title": "...", "text": "...", "badge": "..." }],
                     "design": { "layout": "...", "background": "...", "width": "...", "density": "...",
                                 "image_treatment": "...", "cta_style": "...", "emphasis": "...",
                                 "media_intent": "...", "mobile_note": "..." },
                     "visual": { "visual_required": true, "visual_type": "...", "purpose": "...",
                                 "composition": "...", "desktop_position": "...", "mobile_position": "...",
                                 "aspect_ratio": "...", "background_treatment": "...",
                                 "product_ids": ["..."], "asset_id": null, "visual_brief": "..." } } }
    ]
  },
  "form": { "title": "...", "intro": "...", "submit_label": "...", "success_title": "...", "success_body": "...",
            "fields": [{ "key": "company", "state": "required", "label": "...", "help": "...", "placeholder": "..." }],
            "reason": "waarom deze veldopbouw" },
  "products": [{ "product_id": "...", "reason": "..." }],
  "rationale": [{ "topic": "...", "reason": "onderbouwing met verwijzing naar de data" }],
  "visual_direction": { "overall": "...", "photography_needs": ["..."], "trust_placement": "...",
                        "desktop_composition": "...", "mobile_composition": "...", "product_count": 0 },
  "new_block_type_requests": [{ "name": "...", "purpose": "..." }],
  "experiments": [{ "name": "...", "hypothesis": "...", "primary_metric": "gekwalificeerde leads per 100 bezoeken",
                    "proposed_change": "...", "target_block": "hero", "expected_direction": "positief",
                    "variant_a": "wat de huidige/controle-variant toont", "variant_b": "wat de testvariant toont",
                    "guardrail_metric": "welke metric niet mag verslechteren, bv. leadkwaliteit",
                    "min_sample_size": 0 }],
  "decisions": [{ "decision_area": "hero|headline|cta|form|page_structure|social_proof|pricing_transparency|visual|mobile|offer|trust|copy_tone",
                  "decision": "de gemaakte keuze",
                  "evidence_source": "own_performance_data|similar_own_data|external_evidence|ai_hypothesis",
                  "evidence_level": "STRONG|MODERATE|WEAK|HYPOTHESIS",
                  "sample_size": 0, "metric": "welke metric dit bewijst",
                  "observed_result": "de gemeten uitkomst, of leeg als er niets gemeten is",
                  "applicability": "waarom dit hier geldt (of waarom overdraagbaarheid onzeker is)",
                  "confidence": 0-100, "reasoning_summary": "korte onderbouwing",
                  "evidence_refs": ["id uit croEvidence.externalEvidence"],
                  "ab_test_recommended": true }],
  "ai_confidence": 0-100
}`;

const EVIDENCE_ADDENDUM = `
EVIDENCE-VERPLICHTING BIJ HET ONTWERP:
- Elke commerciële keuze krijgt een decisions-item. Minimaal: hero, headline, cta, form, page_structure, social_proof en visual.
- sample_size is het werkelijke aantal waarnemingen achter je claim (bezoeken, leads, klanten). Weet je het niet, zet 0 en gebruik HYPOTHESIS.
- Wij hergraderen je evidence_level server-side op basis van de echte steekproef. Overdrijven wordt automatisch teruggezet, dus wees eerlijk.
- Alles wat WEAK of HYPOTHESIS is, krijgt een bijbehorend experiment met variant_a, variant_b, primary_metric (commercieel, niet CTA-clicks als er iets hogers meetbaar is), guardrail_metric en min_sample_size.
- Zet in missing_data expliciet welke bronlaag ontbrak (bijvoorbeeld: "geen eigen conversiedata op deze pagina; keuzes zijn hypotheses").`;

const researchSchema = z.object({
  audience: z.string(),
  visit_intent: z.string(),
  pains: z.array(z.string()).default([]),
  core_proposition: z.string(),
  key_proof: z.array(z.string()).default([]),
  primary_cta: z.string(),
  objections: z.array(z.string()).default([]),
  recommended_structure: z.array(z.string()).default([]),
  mobile_priorities: z.array(z.string()).default([]),
  missing_data: z.array(z.string()).default([]),
  confidence: z.number(),
});

/* ---------------------------------------------------------------- runner */

export async function runLandingStrategist(args: {
  ctx: Ctx;
  workspaceId: string;
  mode: LandingAiMode;
  pageId?: string | null;
  industryId?: string | null;
  goal?: string | null;
  brief?: string | null;
  provider?: AiProvider;
  model?: string;
  periodDays?: number;
}) {
  const db = args.ctx.supabase;
  const requestedProvider: AiProvider = args.provider ?? "anthropic";
  const requestedModel = args.model ?? LANDING_AI_DEFAULT_MODEL;
  const { provider, model, fallbackReason: preflightFallback } = resolveProvider(
    requestedProvider,
    requestedModel,
  );

  const built = await buildLandingAiDataset({
    ctx: { supabase: db, userId: args.ctx.userId },
    workspaceId: args.workspaceId,
    mode: args.mode,
    pageId: args.pageId ?? null,
    industryId: args.industryId ?? null,
    goal: args.goal ?? null,
    brief: args.brief ?? null,
    periodDays: args.periodDays,
  });

  const { data: run, error: runError } = await db
    .from("landing_ai_runs")
    .insert({
      workspace_id: args.workspaceId,
      user_id: args.ctx.userId,
      landing_page_id: args.pageId ?? null,
      industry_id: args.industryId ?? built.meta.industryName ? args.industryId ?? null : null,
      mode: args.mode,
      provider,
      model,
      prompt_version: LANDING_AI_PROMPT_VERSION,
      goal: args.goal ?? null,
      brief: args.brief ?? null,
      status: "running",
      dataset: built.dataset as never,
      dataset_meta: built.meta as never,
    })
    .select("id")
    .single();
  if (runError) throw new Error(runError.message);

  const datasetJson = JSON.stringify(built.dataset);
  let totalIn = 0;
  let totalOut = 0;
  let totalCost = 0;
  let totalMs = 0;
  let fallbackReason = preflightFallback;
  let rawPhase2: string | null = null;

  try {
    /* fase 1 — strategie */
    const phase1 = await runAiCompletionWithFallback({
      provider,
      model,
      system: RESEARCH_SYSTEM,
      user: `Modus: ${args.mode === "create" ? "nieuwe landingspagina" : "optimalisatie van bestaande pagina"}\nDoel: ${args.goal ?? "meer gekwalificeerde offerteaanvragen"}\nBriefing: ${args.brief ?? "(geen)"}\n\nDATASET:\n${datasetJson}`,
      maxTokens: 4000,
      temperature: 0.3,
    });
    totalIn += phase1.inputTokens ?? 0;
    totalOut += phase1.outputTokens ?? 0;
    totalCost += phase1.estimatedCostUsd ?? 0;
    totalMs += phase1.runtimeMs;
    fallbackReason = fallbackReason ?? phase1.fallbackReason;
    const strategy = researchSchema.parse(extractJsonObject(phase1.text));

    /* fase 2 — pagina-ontwerp */
    const phase2 = await runAiCompletionWithFallback({
      provider: phase1.provider,
      model: phase1.model,
      system: `${BUILD_SYSTEM}\n${EVIDENCE_ADDENDUM}\n\nCOMPACTHEID: houd tekstvelden kort en bondig (titels max ~10 woorden, body max ~40 woorden, reasons max ~25 woorden). Schrijf geen lange alinea's; de renderer toont ze letterlijk.`,
      user: `STRATEGIE (fase 1):\n${JSON.stringify(strategy)}\n\nDATASET:\n${datasetJson}`,
      maxTokens: 24000,
      temperature: 0.4,
    });
    totalIn += phase2.inputTokens ?? 0;
    totalOut += phase2.outputTokens ?? 0;
    totalCost += phase2.estimatedCostUsd ?? 0;
    totalMs += phase2.runtimeMs;
    fallbackReason = fallbackReason ?? phase2.fallbackReason;

    rawPhase2 = phase2.text.slice(0, 200000);
    const parsed = aiProposalSchema.parse(dropNulls(extractJsonObject(phase2.text)));
    const sanitized = sanitizeProposal(parsed, built.dataset, strategy);
    const dataConfidence = computeDataConfidence(built.facts);

    const title =
      sanitized.page.name?.slice(0, 120) ||
      `${args.mode === "create" ? "Nieuwe pagina" : "Optimalisatie"} — ${built.meta.industryName ?? "algemeen"}`;

    const { data: proposal, error: proposalError } = await db
      .from("landing_ai_proposals")
      .insert({
        workspace_id: args.workspaceId,
        run_id: run.id,
        landing_page_id: args.pageId ?? null,
        industry_id: args.industryId ?? null,
        mode: args.mode,
        title,
        status: "proposed",
        strategy: sanitized.strategy as never,
        page_plan: sanitized.page as never,
        form_plan: sanitized.form as never,
        product_plan: sanitized.products as never,
        rationale: sanitized.rationale as never,
        visual_direction: sanitized.visual_direction as never,
        missing_data: [
          ...sanitized.strategy.missing_data,
          ...dataConfidence.missing.map((m) => `Ontbrekend in dataset: ${m}`),
        ] as never,
        ai_confidence: Math.round(sanitized.ai_confidence),
        data_confidence: dataConfidence.score,
        data_confidence_reasons: dataConfidence.reasons as never,
        performance_data_used: dataConfidence.used as never,
      })
      .select("id")
      .single();
    if (proposalError) throw new Error(proposalError.message);

    if (sanitized.experiments.length) {
      await db.from("landing_ai_experiments").insert(
        sanitized.experiments.map((e) => ({
          workspace_id: args.workspaceId,
          proposal_id: proposal.id,
          landing_page_id: args.pageId ?? null,
          name: e.name,
          hypothesis: e.hypothesis,
          primary_metric: e.primary_metric,
          proposed_change: {
            change: e.proposed_change,
            variant_a: e.variant_a ?? null,
            variant_b: e.variant_b ?? null,
          } as never,
          variant_a: e.variant_a ?? null,
          variant_b: e.variant_b ?? null,
          guardrail_metric: e.guardrail_metric ?? null,
          min_sample_size: e.min_sample_size ?? null,
          target_block: e.target_block ?? null,
          expected_direction: e.expected_direction,
          status: "proposed",
        })),
      );
    }

    /* Evidence per decision — re-graded server-side so the AI can never present
     * an untested best practice as proven for ZoetBezorgen. V1.8B: evidence refs
     * are additionally checked for applicability to this funnel/audience/area;
     * an item that excludes the current context can never back the claim. */
    let funnelType = "quote_request";
    if (args.pageId) {
      const { data: pageRow } = await db
        .from("landing_pages")
        .select("funnel_type")
        .eq("id", args.pageId)
        .maybeSingle();
      if (pageRow?.funnel_type) funnelType = pageRow.funnel_type;
    }
    const { data: evidenceRows } = await db.from("cro_evidence").select("*").eq("active", true);
    const evidenceById = new Map<string, CroEvidenceRow>(
      ((evidenceRows ?? []) as CroEvidenceRow[]).map((e) => [e.id, e]),
    );

    const gradedDecisions = sanitized.decisions.map((d, index) => {
      const graded = gradeDecision({
        decision_area: d.decision_area ?? "page_structure",
        decision: d.decision,
        evidence_source: d.evidence_source ?? "ai_hypothesis",
        evidence_level: d.evidence_level,
        sample_size: d.sample_size ?? null,
        metric: d.metric ?? null,
        observed_result: d.observed_result ?? null,
        applicability: d.applicability ?? null,
        confidence: d.confidence,
        reasoning_summary: d.reasoning_summary ?? null,
        evidence_refs: d.evidence_refs ?? [],
        ab_test_recommended: d.ab_test_recommended,
      });
      const enforced = enforceApplicabilityOnDecision(graded, evidenceById, {
        funnelType,
        audience: "b2b",
        decisionArea: graded.decision_area,
      });
      return { graded: enforced.decision, index };
    });

    if (gradedDecisions.length) {
      const { error: decisionsError } = await db.from("landing_ai_decisions").insert(
        gradedDecisions.map(({ graded, index }) => ({
          workspace_id: args.workspaceId,
          run_id: run.id,
          proposal_id: proposal.id,
          decision_area: graded.decision_area,
          decision: graded.decision,
          evidence_source: graded.evidence_source,
          evidence_level: graded.evidence_level,
          sample_size: graded.sample_size,
          metric: graded.metric,
          observed_result: graded.observed_result,
          applicability: graded.applicability,
          confidence: graded.confidence,
          reasoning_summary: graded.reasoning_summary,
          evidence_refs: (graded.evidence_refs ?? []) as never,
          ab_test_recommended: graded.ab_test_recommended,
          downgraded_from: graded.downgraded_from ?? null,
          downgrade_reason: graded.downgrade_reason ?? null,
          sort_order: index,
        })),
      );
      if (decisionsError) console.error("[landing-ai] decisions insert failed", decisionsError.message);
    }

    /* V1.8B: decision coverage is mandatory. Missing commercial decisions are
     * reconstructed deterministically from the stored plan (no new AI call). */
    try {
      const { ensureDecisionCoverage } = await import("./landing-decision-coverage.server");
      await ensureDecisionCoverage({
        db,
        workspaceId: args.workspaceId,
        proposalId: proposal.id,
      });
    } catch (coverageErr) {
      console.error("[landing-ai] decision coverage failed", (coverageErr as Error).message);
    }

    await db
      .from("landing_ai_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        input_tokens: totalIn || null,
        output_tokens: totalOut || null,
        estimated_cost_usd: totalCost || null,
        runtime_ms: totalMs,
        provider: phase1.provider,
        model: phase1.model,
        fallback_reason: fallbackReason,
      })
      .eq("id", run.id);

    return {
      ok: true as const,
      runId: run.id,
      proposalId: proposal.id,
      provider: phase1.provider,
      model: phase1.model,
      fallbackReason,
      runtimeMs: totalMs,
      inputTokens: totalIn,
      outputTokens: totalOut,
      estimatedCostUsd: Number(totalCost.toFixed(5)),
      aiConfidence: Math.round(sanitized.ai_confidence),
      dataConfidence,
      sectionCount: sanitized.page.sections.length,
      newBlockTypeRequests: sanitized.new_block_type_requests,
      error: null as string | null,
    };
  } catch (err) {
    const message = (err as Error).message.slice(0, 800);
    await db
      .from("landing_ai_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message,
        raw_output: rawPhase2,
        runtime_ms: totalMs,
        input_tokens: totalIn || null,
        output_tokens: totalOut || null,
      })
      .eq("id", run.id);
    return { ok: false as const, runId: run.id, error: message };
  }
}

/* ------------------------------------------------------------ sanitizing */

/** Models happily emit null for "not applicable"; the schema treats that as absent. */
function dropNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropNulls);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null) continue;
      out[k] = dropNulls(v);
    }
    return out;
  }
  return value;
}

const stripMarkup = (v?: string) =>
  v == null ? v : v.replace(/<[^>]*>/g, "").replace(/\{\{|\}\}/g, "").trim();

/** Removes anything the engine may not render and drops invented references. */
function sanitizeProposal(
  parsed: AiProposalPayload,
  dataset: any,
  strategy: z.infer<typeof researchSchema>,
): AiProposalPayload {
  const allowedProducts = new Set<string>(
    (dataset.productLibrary ?? []).map((p: any) => String(p.product_id)),
  );
  const allowedFieldKeys = new Set<string>(
    (dataset.engine?.formFieldsAvailable ?? []).map((f: any) => String(f.key)),
  );
  /* Only approved assets from the Beeldbank may ever be referenced. */
  const allowedAssets = new Map<string, string>(
    (dataset.assetLibrary ?? []).map((a: any) => [String(a.asset_id), String(a.asset_type)]),
  );

  const sections = parsed.page.sections
    .filter((s) => (BLOCK_TYPES as readonly string[]).includes(s.block_type))
    .map((s) => ({
      ...s,
      content: {
        ...s.content,
        title: stripMarkup(s.content.title),
        subtitle: stripMarkup(s.content.subtitle),
        body: stripMarkup(s.content.body),
        cta_url: s.content.cta_url?.startsWith("#") ? s.content.cta_url : "#offerte",
        secondary_cta_url: s.content.secondary_cta_url?.startsWith("#")
          ? s.content.secondary_cta_url
          : undefined,
        items: (s.content.items ?? []).map((i) => ({
          title: stripMarkup(i.title),
          text: stripMarkup(i.text),
          badge: stripMarkup(i.badge),
        })),
        visual: sanitizeVisual(s.content.visual, allowedAssets, allowedProducts),
      },
    }));

  return {
    ...parsed,
    strategy: { ...parsed.strategy, ...strategy, confidence: Math.round(strategy.confidence) },
    page: { ...parsed.page, sections },
    form: {
      ...parsed.form,
      fields: parsed.form.fields.filter((f) => allowedFieldKeys.has(f.key)),
    },
    products: parsed.products.filter((p) => allowedProducts.has(p.product_id)),
  };
}


/**
 * A visual may only point at content that really exists. An unknown asset_id
 * becomes a missing visual with a brief, so the page shows an honest visual gap
 * instead of a broken image.
 */
function sanitizeVisual(
  visual: any,
  allowedAssets: Map<string, string>,
  allowedProducts: Set<string>,
) {
  if (!visual) return undefined;
  const assetId =
    visual.asset_id && allowedAssets.has(String(visual.asset_id)) ? String(visual.asset_id) : null;
  const type = visual.visual_type ?? "product_lifestyle";
  const required = type !== "none" && visual.visual_required !== false;
  return {
    visual_required: required,
    visual_type: type,
    purpose: stripMarkup(visual.purpose) || undefined,
    composition: stripMarkup(visual.composition) || undefined,
    desktop_position: visual.desktop_position ?? "right",
    mobile_position: visual.mobile_position ?? "above",
    aspect_ratio: visual.aspect_ratio ?? "4:3",
    background_treatment: stripMarkup(visual.background_treatment) || undefined,
    product_ids: (visual.product_ids ?? []).filter((id: string) => allowedProducts.has(id)),
    asset_id: assetId,
    asset_status: assetId ? ("existing" as const) : ("missing" as const),
    visual_brief: stripMarkup(visual.visual_brief) || undefined,
  };
}

/* -------------------------------------------------------------- applying */

/**
 * Turns a proposal into a NEW draft page (never overwriting the source) and
 * writes the AI sections, form and product selection into that draft.
 */
export async function applyLandingProposal(args: {
  ctx: Ctx;
  workspaceId: string;
  proposalId: string;
  nameOverride?: string | null;
  slugOverride?: string | null;
}) {
  const db = args.ctx.supabase;
  const { data: proposal } = await db
    .from("landing_ai_proposals")
    .select("*")
    .eq("id", args.proposalId)
    .eq("workspace_id", args.workspaceId)
    .maybeSingle();
  if (!proposal) throw new Error("AI-voorstel niet gevonden");

  const plan = proposal.page_plan as any;
  const formPlan = proposal.form_plan as any;
  const productPlan = (proposal.product_plan ?? []) as any[];

  const { duplicatePage, createPageWithTemplate } = await import("./landing.server");

  const baseName =
    args.nameOverride ?? `${plan?.name ?? proposal.title} (AI-concept)`.slice(0, 120);
  const stamp = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, "");
  let newPageId: string;

  if (proposal.landing_page_id) {
    const { data: source } = await db
      .from("landing_pages")
      .select("slug")
      .eq("id", proposal.landing_page_id)
      .maybeSingle();
    newPageId = await duplicatePage({
      workspaceId: args.workspaceId,
      userId: args.ctx.userId,
      sourceId: proposal.landing_page_id,
      name: baseName,
      slug: args.slugOverride ?? `${source?.slug ?? "pagina"}-ai-${stamp}`,
    });
  } else {
    newPageId = await createPageWithTemplate({
      workspaceId: args.workspaceId,
      userId: args.ctx.userId,
      name: baseName,
      slug: args.slugOverride ?? `ai-concept-${stamp}`,
      funnel: "quote",
      industryId: proposal.industry_id ?? null,
    });
  }

  const dbAdmin = db;

  /* sections: replace the draft content with the AI plan */
  await dbAdmin.from("landing_page_sections").delete().eq("landing_page_id", newPageId);
  const sections = (plan?.sections ?? []) as any[];
  if (sections.length) {
    const { data: insertedSections } = await dbAdmin
      .from("landing_page_sections")
      .insert(
        sections.map((s, index) => {
          /* Resolve a planned existing asset to a real image URL so the
             renderer shows the image instead of a missing-visual placeholder. */
          const content = { ...((s.content ?? {}) as Record<string, any>) };
          const assetId = (content.visual as any)?.asset_id;
          if (assetId && !content.image_url) {
            content.image_url = `/api/public/landing-asset/${assetId}`;
          }
          return {
            workspace_id: args.workspaceId,
            landing_page_id: newPageId,
            block_type: s.block_type,
            sort_order: index,
            enabled: s.enabled !== false,
            use_global: false,
            global_key: null,
            variant_key: "A",
            content: content as never,
          };
        }),
      )
      .select("id,block_type,sort_order,content");

    /* Every planned visual without an existing asset becomes a visual brief. */
    const briefRows = (insertedSections ?? [])
      .map((section: any) => ({ section, visual: section.content?.visual }))
      .filter(({ visual }: any) => visual && visual.visual_type !== "none" && !visual.asset_id)
      .map(({ section, visual }: any) => ({
        workspace_id: args.workspaceId,
        landing_page_id: newPageId,
        section_id: section.id,
        block_type: section.block_type,
        proposal_id: args.proposalId,
        title: `${section.block_type} — ${visual.visual_type}`.slice(0, 200),
        visual_type: visual.visual_type,
        purpose: visual.purpose ?? null,
        composition: visual.composition ?? null,
        desktop_position: visual.desktop_position ?? null,
        mobile_position: visual.mobile_position ?? null,
        aspect_ratio: visual.aspect_ratio ?? null,
        background_treatment: visual.background_treatment ?? null,
        product_ids: visual.product_ids ?? [],
        brief_text: visual.visual_brief ?? null,
        asset_status: "missing",
        generation_status: "not_started",
        approval_status: "pending",
        created_by: args.ctx.userId,
      }));
    if (briefRows.length) {
      await dbAdmin.from("landing_visual_briefs").insert(briefRows as never);
    }
  }

  /* form: keep keys/types from the current config, apply AI states + order */
  const { data: currentForm } = await dbAdmin
    .from("landing_page_forms")
    .select("*")
    .eq("landing_page_id", newPageId)
    .maybeSingle();
  const baseFields: FormFieldConfig[] =
    (currentForm?.fields as FormFieldConfig[] | undefined) ?? DEFAULT_FORM_FIELDS;
  const planned = (formPlan?.fields ?? []) as any[];
  const orderedKeys = planned.map((f) => f.key);
  const nextFields: FormFieldConfig[] = [
    ...orderedKeys
      .map((key) => baseFields.find((f) => f.key === key))
      .filter(Boolean)
      .map((f) => {
        const p = planned.find((x) => x.key === f!.key);
        return {
          ...f!,
          state: (["required", "optional", "hidden"].includes(p?.state) ? p.state : f!.state) as
            | "required"
            | "optional"
            | "hidden",
          label: p?.label ? String(p.label).slice(0, 160) : f!.label,
          help: p?.help ? String(p.help).slice(0, 300) : f!.help,
          placeholder: p?.placeholder ? String(p.placeholder).slice(0, 200) : f!.placeholder,
        };
      }),
    ...baseFields.filter((f) => !orderedKeys.includes(f.key)),
  ];

  await dbAdmin
    .from("landing_page_forms")
    .update({
      title: formPlan?.title ?? currentForm?.title,
      intro: formPlan?.intro ?? currentForm?.intro,
      submit_label: formPlan?.submit_label ?? currentForm?.submit_label,
      success_title: formPlan?.success_title ?? currentForm?.success_title,
      success_body: formPlan?.success_body ?? currentForm?.success_body,
      fields: nextFields as never,
    })
    .eq("landing_page_id", newPageId);

  /* products */
  if (productPlan.length) {
    await dbAdmin.from("landing_page_products").delete().eq("landing_page_id", newPageId);
    await dbAdmin.from("landing_page_products").insert(
      productPlan.map((p, index) => ({
        workspace_id: args.workspaceId,
        landing_page_id: newPageId,
        product_id: p.product_id,
        sort_order: index,
        overrides: {} as never,
      })),
    );
  }

  /* page meta — draft only, never published */
  await dbAdmin
    .from("landing_pages")
    .update({
      seo_title: plan?.seo_title ?? null,
      seo_description: plan?.seo_description ?? null,
      status: "draft",
      canonical_url: null,
    })
    .eq("id", newPageId);

  await db
    .from("landing_ai_proposals")
    .update({
      status: "applied",
      applied_page_id: newPageId,
      applied_at: new Date().toISOString(),
      applied_by: args.ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.proposalId);

  const { data: newPage } = await db
    .from("landing_pages")
    .select("id,name,slug,funnel_type")
    .eq("id", newPageId)
    .maybeSingle();

  return { pageId: newPageId, page: newPage, sections: sections.length };
}

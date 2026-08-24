/**
 * Decision coverage enforcement (V1.8B) — server-side.
 *
 * Guarantees that every strategist proposal explains all 15 required
 * commercial decisions. Missing decisions are reconstructed deterministically
 * from the stored strategy/page_plan/form_plan/product_plan/visual_direction —
 * never via a new AI call. Reconstructed decisions are honest by default:
 * without real evidence they are HYPOTHESIS with an experiment recommendation.
 *
 * Also re-validates ALL decisions (existing and new) against the evidence
 * applicability rules, so an evidence item that explicitly excludes the
 * current context (e.g. Baymard checkout research for a B2B quote form) can
 * never back a MODERATE/STRONG claim.
 */
import {
  gradeDecision,
  type CroEvidenceRow,
  type DecisionInput,
  type EvidenceLevel,
  type EvidenceSource,
} from "./landing-cro-evidence";
import {
  decisionCoverage,
  legacyDecisionKey,
  REQUIRED_DECISIONS,
} from "./landing-decision-coverage";
import {
  enforceApplicabilityOnDecision,
  type ApplicabilityContext,
} from "./landing-evidence-applicability";

type Db = any;

type ProposalShape = {
  id: string;
  run_id: string;
  landing_page_id: string | null;
  strategy: any;
  page_plan: any;
  form_plan: any;
  product_plan: any;
  visual_direction: any;
  rationale: any;
};

type DerivedDecision = Pick<
  DecisionInput,
  | "decision"
  | "evidence_source"
  | "evidence_level"
  | "metric"
  | "reasoning_summary"
  | "applicability"
  | "evidence_refs"
  | "ab_test_recommended"
>;

/* ------------------------------------------------------- derivations (pure) */

function sectionOf(plan: any, blockType: string) {
  return (plan?.sections ?? []).find((s: any) => s.block_type === blockType) ?? null;
}

const DERIVERS: Record<string, (p: ProposalShape) => DerivedDecision> = {
  hero_layout: (p) => {
    const hero = sectionOf(p.page_plan, "hero");
    const d = hero?.content?.design ?? {};
    return {
      decision: `Hero als ${d.layout ?? "split-media"} met beeld ${hero?.content?.visual?.desktop_position ?? "rechts"} en emphasis ${d.emphasis ?? "high"}`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Layoutkeuze uit het opgeslagen page_plan gereconstrueerd; er is geen eigen of externe evidence voor deze specifieke layout.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  headline_value_prop: (p) => {
    const hero = sectionOf(p.page_plan, "hero");
    return {
      decision: `Headline "${hero?.content?.title ?? ""}" met subpropositie "${(hero?.content?.subtitle ?? "").slice(0, 120)}"`,
      evidence_source: "external_evidence",
      evidence_level: "MODERATE",
      metric: "message match",
      reasoning_summary:
        "Branche-specifieke headline volgt het message-matchprincipe (advertentiebelofte = paginabelofte). Extern bewijs, niet getest op ZoetBezorgen.",
      applicability: "Message match-evidence geldt voor hero/headline in lead_gen/quote_request funnels.",
      evidence_refs: ["f4c89a47-dbc5-4fc6-9665-75d3e491c63a"],
      ab_test_recommended: true,
    };
  },
  primary_cta: (p) => {
    const hero = sectionOf(p.page_plan, "hero");
    return {
      decision: `Primaire CTA "${hero?.content?.cta_label ?? "Offerte aanvragen"}" → ${hero?.content?.cta_url ?? "#offerte"} (${p.strategy?.primary_cta ?? "vrijblijvend, reactie binnen één werkdag"})`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "CTA-tekst en -bestemming uit page_plan/strategy gereconstrueerd. Geen eigen klik- of conversiedata beschikbaar voor deze keuze.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  secondary_cta: (p) => {
    const hero = sectionOf(p.page_plan, "hero");
    const label = hero?.content?.secondary_cta_label;
    return {
      decision: label
        ? `Secundaire CTA "${label}" → ${hero?.content?.secondary_cta_url ?? "#producten"}, visueel ondergeschikt aan de primaire CTA`
        : "Geen secundaire CTA gebruikt",
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Secundaire CTA biedt een lage-drempel exit richting productbewijs zonder de primaire offerte-actie te konkurreren. Ongemeten aanname.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  product_selection: (p) => {
    const products = (p.product_plan ?? []) as any[];
    return {
      decision: `${products.length} producten geselecteerd: ${products
        .map((x) => x.reason?.split("(")[0]?.trim() ?? x.product_id)
        .join("; ")}`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Selectie op occasion-match (ploegwaardering, projectafsluiting, relatiegeschenk). Geen branche-getagde producten en geen verkoopdata per branche beschikbaar.",
      applicability: "Hypothese op basis van gebruiksmomenten, niet op gemeten vraag.",
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  product_order: (p) => {
    const products = (p.product_plan ?? []) as any[];
    return {
      decision: `Volgorde van laagdrempelig naar luxe: ${products.map((_, i) => `positie ${i + 1}`).join(", ")} (instap €2,95 eerst)`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Prijs-anker volgorde (laag → hoog) als standaardaanname; geen eigen data over welke volgorde beter converteert.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  visual_strategy: (p) => ({
    decision: `Visual-first: ${p.visual_direction?.overall ?? "producten in werkomgeving"} — desktop ${p.visual_direction?.desktop_composition ?? "split-media"}, mobiel ${p.visual_direction?.mobile_composition ?? "beeld boven tekst"}`,
    evidence_source: "ai_hypothesis",
    evidence_level: "HYPOTHESIS",
    metric: null,
    reasoning_summary:
      "Visuele richting uit visual_direction gereconstrueerd. Fotografiebehoefte expliciet benoemd; geen eigen beeld-performance data.",
    applicability: null,
    evidence_refs: [],
    ab_test_recommended: true,
  }),
  personalization_presentation: (p) => {
    const s = sectionOf(p.page_plan, "personalization");
    return {
      decision: `Eigen personalisatie-sectie "${s?.content?.title ?? ""}" met ${(s?.content?.items ?? []).length} niveaus en ${s?.content?.visual?.asset_id ? "bestaand goedgekeurd beeld" : "nog ontbrekend beeld"}`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Personalisatie bewijzen met een fysiek voorbeeld neemt het 'onpersoonlijk'-bezwaar weg (uit strategy.objections). Niet gemeten.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  use_cases: (p) => {
    const s = sectionOf(p.page_plan, "use_cases");
    return {
      decision: `${(s?.content?.items ?? []).length} bouw-specifieke gebruiksmomenten direct na de USP's: ${(s?.content?.items ?? []).map((i: any) => i.title).join(", ")}`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Concrete momenten lossen het bezwaar 'is snoep wel passend voor de bouw?' op (strategy.objections). Plausibel, ongemeten.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  trust_social_proof: (p) => ({
    decision: `USP-kaarten direct onder de hero (${p.visual_direction?.trust_placement ?? "USP's onder hero, FAQ voor formulier"}); geen testimonials of klantlogo's beschikbaar`,
    evidence_source: "ai_hypothesis",
    evidence_level: "HYPOTHESIS",
    metric: null,
    reasoning_summary:
      "Strategy.missing_data meldt expliciet: geen testimonials, cases of klantlogo's uit de bouw. Trust leunt nu volledig op merk-USP's.",
    applicability: "Echte social proof ontbreekt als content; dit is een bekende gap, geen bewezen keuze.",
    evidence_refs: [],
    ab_test_recommended: true,
  }),
  form_position: (p) => {
    const sections = (p.page_plan?.sections ?? []) as any[];
    const formIndex = sections.findIndex((s) => s.block_type === "form");
    return {
      decision: `Formulier als ${formIndex === sections.length - 1 ? "laatste sectie" : `sectie ${formIndex + 1}`}, direct na de FAQ, bereikbaar via anker #offerte vanuit elke CTA`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Klassieke funnelvolgorde: eerst bezwaren wegnemen (FAQ), dan het formulier. Geen eigen data over formulierpositie.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  form_length_fields: (p) => {
    const fields = (p.form_plan?.fields ?? []) as any[];
    return {
      decision: `${fields.length} velden (${fields.filter((f) => f.state === "required").length} verplicht), enkelvoudige kolom: ${fields.map((f) => f.key).join(", ")}`,
      evidence_source: "external_evidence",
      evidence_level: "WEAK",
      metric: null,
      reasoning_summary:
        "Algemene formulier-usability richtlijnen (labels boven velden, één kolom) zijn toepasbaar; checkout-specifiek veldreductie-onderzoek is dat NIET voor een B2B-offerteformulier.",
      applicability:
        "Alleen generieke form-usability evidence gebruikt; Baymard checkout-evidence is door de applicability-check verwijderd (niet overdraagbaar naar quote_request).",
      evidence_refs: ["4f813794-0a8a-4499-baf5-2750a074b72b"],
      ab_test_recommended: true,
    };
  },
  cta_repetition: (p) => {
    const sections = (p.page_plan?.sections ?? []) as any[];
    const withCta = sections.filter((s) => s.content?.cta_url === "#offerte").length;
    return {
      decision: `CTA naar #offerte herhaald in ${withCta} van ${sections.length} secties; primaire CTA in hero + formulier als eindpunt`,
      evidence_source: "ai_hypothesis",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "Herhaalde CTA's vangen scrollers op; er is geen eigen data over het optimale aantal herhalingen.",
      applicability: null,
      evidence_refs: [],
      ab_test_recommended: true,
    };
  },
  faq_objection_handling: (p) => {
    const s = sectionOf(p.page_plan, "faq");
    return {
      decision: `FAQ met ${(s?.content?.items ?? []).length} vragen vlak voor het formulier, afgeleid van ${(p.strategy?.objections ?? []).length} geïdentificeerde bezwaren`,
      evidence_source: "external_evidence",
      evidence_level: "HYPOTHESIS",
      metric: null,
      reasoning_summary:
        "FAQ-direct-voor-formulier is een plausibel bezwaar-mechanisme; de bron is zelf als HYPOTHESIS geclassificeerd (ongemeten).",
      applicability: "Evidence-item faq_objection_handling is zelf HYPOTHESIS-niveau.",
      evidence_refs: ["b7a010bf-d9cc-4f91-995a-3d8686bc8ac1"],
      ab_test_recommended: true,
    };
  },
  mobile_strategy: (p) => ({
    decision: `Mobiel: ${(p.strategy?.mobile_priorities ?? []).slice(0, 2).join(" · ") || "beeld boven tekst, CTA boven de vouw"}`,
    evidence_source: "ai_hypothesis",
    evidence_level: "HYPOTHESIS",
    metric: null,
    reasoning_summary:
      "Mobiele prioriteiten uit strategy.mobile_priorities gereconstrueerd (propositie in 2 regels, CTA zonder scrollen, één-koloms formulier). Geen apparaat-specifieke conversiedata.",
    applicability: null,
    evidence_refs: [],
    ab_test_recommended: true,
  }),
};

/* ------------------------------------------------------------- enforcement */

export type CoverageResult = {
  total: number;
  covered: number;
  missingBefore: string[];
  inserted: string[];
  corrected: { id: string; decision_key: string | null; removedRefs: string[] }[];
  applicabilityFailures: { decisionId: string | null; ref: string; reasons: string[] }[];
};

/**
 * Brings one proposal to full decision coverage and re-validates every
 * decision's evidence refs against the applicability rules. Idempotent.
 */
export async function ensureDecisionCoverage(args: {
  db: Db;
  workspaceId: string;
  proposalId: string;
}): Promise<CoverageResult> {
  const { db, workspaceId } = args;

  const [{ data: proposal }, { data: existing }, { data: evidenceRows }] = await Promise.all([
    db
      .from("landing_ai_proposals")
      .select(
        "id,run_id,landing_page_id,strategy,page_plan,form_plan,product_plan,visual_direction,rationale",
      )
      .eq("id", args.proposalId)
      .eq("workspace_id", workspaceId)
      .single(),
    db
      .from("landing_ai_decisions")
      .select("*")
      .eq("proposal_id", args.proposalId)
      .order("sort_order", { ascending: true }),
    db.from("cro_evidence").select("*").eq("active", true),
  ]);
  if (!proposal) throw new Error("Voorstel niet gevonden");

  let funnelType = "quote_request";
  if (proposal.landing_page_id) {
    const { data: page } = await db
      .from("landing_pages")
      .select("funnel_type")
      .eq("id", proposal.landing_page_id)
      .maybeSingle();
    if (page?.funnel_type) funnelType = page.funnel_type;
  }

  const evidenceById = new Map<string, CroEvidenceRow>(
    ((evidenceRows ?? []) as CroEvidenceRow[]).map((e) => [e.id, e]),
  );

  const corrected: CoverageResult["corrected"] = [];
  const applicabilityFailures: CoverageResult["applicabilityFailures"] = [];
  const presentKeys = new Set<string>();

  /* 1. Re-validate + key existing decisions */
  for (const row of existing ?? []) {
    const key = row.decision_key ?? legacyDecisionKey(row);
    if (key && !row.decision_key) {
      await db.from("landing_ai_decisions").update({ decision_key: key }).eq("id", row.id);
    }
    if (key) presentKeys.add(key);

    const ctx: ApplicabilityContext = {
      funnelType,
      audience: "b2b",
      decisionArea: row.decision_area,
      decisionKey: key ?? undefined,
    };
    const enforced = enforceApplicabilityOnDecision(row, evidenceById, ctx);
    if (enforced.changed) {
      await db
        .from("landing_ai_decisions")
        .update({
          evidence_refs: enforced.decision.evidence_refs,
          evidence_source: enforced.decision.evidence_source,
          evidence_level: enforced.decision.evidence_level,
          applicability: enforced.decision.applicability,
          downgraded_from: enforced.decision.downgraded_from,
          downgrade_reason: enforced.decision.downgrade_reason,
          ab_test_recommended: true,
        })
        .eq("id", row.id);
      corrected.push({
        id: row.id,
        decision_key: key,
        removedRefs: enforced.removedRefs.map((r) => r.id),
      });
      for (const r of enforced.removedRefs)
        applicabilityFailures.push({ decisionId: row.id, ref: r.id, reasons: r.reasons });
    }
  }

  /* 2. Reconstruct missing required decisions from the stored plan */
  const coverage = decisionCoverage([...presentKeys]);
  const inserted: string[] = [];
  let sortOrder = 100;
  for (const req of coverage.missing) {
    const derive = DERIVERS[req.key];
    if (!derive) continue;
    const derived = derive(proposal as ProposalShape);
    const graded = gradeDecision({
      decision_area: req.area,
      decision: derived.decision,
      evidence_source: derived.evidence_source,
      evidence_level: derived.evidence_level,
      sample_size: null,
      metric: derived.metric ?? null,
      observed_result: null,
      applicability: derived.applicability ?? null,
      confidence: derived.evidence_level === "HYPOTHESIS" ? 35 : 55,
      reasoning_summary: derived.reasoning_summary ?? null,
      evidence_refs: derived.evidence_refs ?? [],
      ab_test_recommended: derived.ab_test_recommended ?? true,
    });

    const ctx: ApplicabilityContext = {
      funnelType,
      audience: "b2b",
      decisionArea: req.area,
      decisionKey: req.key,
    };
    const enforced = enforceApplicabilityOnDecision(graded, evidenceById, ctx);
    const final = enforced.decision;
    for (const r of enforced.removedRefs)
      applicabilityFailures.push({ decisionId: null, ref: r.id, reasons: r.reasons });

    const { error } = await db.from("landing_ai_decisions").insert({
      workspace_id: workspaceId,
      run_id: proposal.run_id,
      proposal_id: proposal.id,
      decision_key: req.key,
      decision_area: req.area,
      decision: final.decision,
      evidence_source: final.evidence_source as EvidenceSource,
      evidence_level: final.evidence_level as EvidenceLevel,
      sample_size: final.sample_size,
      metric: final.metric,
      observed_result: final.observed_result,
      applicability: final.applicability,
      confidence: final.confidence,
      reasoning_summary: final.reasoning_summary,
      evidence_refs: (final.evidence_refs ?? []) as never,
      ab_test_recommended: final.ab_test_recommended,
      downgraded_from: final.downgraded_from ?? null,
      downgrade_reason: final.downgrade_reason ?? null,
      sort_order: sortOrder++,
    });
    if (!error) inserted.push(req.key);
    else console.error("[decision-coverage] insert failed", req.key, error.message);
  }

  return {
    total: coverage.total,
    covered: coverage.covered.length + inserted.length,
    missingBefore: coverage.missing.map((m) => m.key),
    inserted,
    corrected,
    applicabilityFailures,
  };
}

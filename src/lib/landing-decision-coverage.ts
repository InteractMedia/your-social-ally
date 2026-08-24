/**
 * Decision coverage contract (V1.8B) — client-safe.
 *
 * Every strategist run must explain ALL important commercial choices, not just
 * the ones the model happened to document. These 15 decision keys are
 * mandatory; missing ones are reconstructed deterministically from the stored
 * strategy/page_plan (never via a new AI call) and marked HYPOTHESIS when no
 * real evidence exists.
 */
import type { DecisionArea } from "./landing-cro-evidence";

export type RequiredDecision = {
  key: string;
  area: DecisionArea;
  label: string;
};

export const REQUIRED_DECISIONS: RequiredDecision[] = [
  { key: "hero_layout", area: "hero", label: "Hero-layout" },
  { key: "headline_value_prop", area: "headline", label: "Headline / value proposition" },
  { key: "primary_cta", area: "cta", label: "Primaire CTA" },
  { key: "secondary_cta", area: "cta", label: "Secundaire CTA" },
  { key: "product_selection", area: "products", label: "Productselectie" },
  { key: "product_order", area: "products", label: "Productvolgorde" },
  { key: "visual_strategy", area: "visual_treatment", label: "Visual strategy" },
  { key: "personalization_presentation", area: "visual_treatment", label: "Personalisatie-presentatie" },
  { key: "use_cases", area: "page_structure", label: "Use cases" },
  { key: "trust_social_proof", area: "proof", label: "Trust / social proof" },
  { key: "form_position", area: "form", label: "Formulierpositie" },
  { key: "form_length_fields", area: "form_fields", label: "Formulierlengte / veldkeuze" },
  { key: "cta_repetition", area: "cta", label: "CTA-herhaling" },
  { key: "faq_objection_handling", area: "objections", label: "FAQ / bezwaarafhandeling" },
  { key: "mobile_strategy", area: "mobile", label: "Mobiele strategie" },
  /* V1.9 — creatieve kwaliteit is een verplichte beslislaag. */
  { key: "hero_visual_impact", area: "hero", label: "Hero visuele impact" },
  { key: "composition_rhythm", area: "page_structure", label: "Compositie & ritme" },
  { key: "brand_distinctiveness", area: "visual_treatment", label: "Merkonderscheid" },
];

export const REQUIRED_DECISION_COUNT = REQUIRED_DECISIONS.length;

/**
 * Maps a legacy decision (no decision_key, from before V1.8B) to the required
 * key it most likely covers, based on its area and text.
 */
export function legacyDecisionKey(decision: {
  decision_area: string;
  decision: string;
}): string | null {
  const text = `${decision.decision_area} ${decision.decision}`.toLowerCase();
  if (decision.decision_area === "hero") return "hero_layout";
  if (decision.decision_area === "headline") return "headline_value_prop";
  if (decision.decision_area === "form_fields") return "form_length_fields";
  if (decision.decision_area === "form") {
    return /positie|plaats|onderaan|anchor/.test(text) ? "form_position" : "form_length_fields";
  }
  if (decision.decision_area === "page_structure") {
    return /beeld|visual|foto|image/.test(text) ? "visual_strategy" : "use_cases";
  }
  if (decision.decision_area === "visual_treatment" || decision.decision_area === "visual")
    return "visual_strategy";
  if (decision.decision_area === "proof" || decision.decision_area === "social_proof")
    return "trust_social_proof";
  if (decision.decision_area === "objections") return "faq_objection_handling";
  if (decision.decision_area === "mobile") return "mobile_strategy";
  if (decision.decision_area === "products") return "product_selection";
  if (decision.decision_area === "cta") return "primary_cta";
  return null;
}

export type CoverageReport = {
  total: number;
  covered: string[];
  missing: RequiredDecision[];
};

export function decisionCoverage(presentKeys: string[]): CoverageReport {
  const present = new Set(presentKeys);
  const covered = REQUIRED_DECISIONS.filter((d) => present.has(d.key)).map((d) => d.key);
  const missing = REQUIRED_DECISIONS.filter((d) => !present.has(d.key));
  return { total: REQUIRED_DECISION_COUNT, covered, missing };
}

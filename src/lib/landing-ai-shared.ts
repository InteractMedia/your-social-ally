/**
 * Client-safe contract for the AI Landing Page Strategist & Designer (V1.6).
 *
 * The strategist is a separate system from the AI Ads Analyst: its own prompt,
 * its own tables, its own confidence model. It may only produce configuration
 * for the existing block/template engine — never markup, scripts or styling.
 */
import { z } from "zod";

import { BLOCK_TYPES } from "./landing-shared";
import {
  CTA_STYLES,
  EMPHASIS_LEVELS,
  IMAGE_TREATMENTS,
  SECTION_BACKGROUNDS,
  SECTION_DENSITIES,
  SECTION_LAYOUTS,
  SECTION_WIDTHS,
} from "./landing-design-system";

export const LANDING_AI_PROMPT_VERSION = "landing-strategist-v1.6";

/** Best available Claude model for strategy + copy. Independent of Ads Analyst. */
export const LANDING_AI_DEFAULT_MODEL = "claude-sonnet-4-5";

export const LANDING_AI_MODES = ["create", "optimize"] as const;
export type LandingAiMode = (typeof LANDING_AI_MODES)[number];

export const LANDING_AI_MODE_LABELS: Record<LandingAiMode, string> = {
  create: "Maak landingspagina met AI",
  optimize: "Optimaliseer huidige pagina",
};

/* ---------------------------------------------------------------- schemas */

const shortText = z.string().trim().max(400);
const longText = z.string().trim().max(6000);

export const aiSectionDesignSchema = z.object({
  layout: z.enum(SECTION_LAYOUTS).optional(),
  background: z.enum(SECTION_BACKGROUNDS).optional(),
  width: z.enum(SECTION_WIDTHS).optional(),
  density: z.enum(SECTION_DENSITIES).optional(),
  image_treatment: z.enum(IMAGE_TREATMENTS).optional(),
  cta_style: z.enum(CTA_STYLES).optional(),
  emphasis: z.enum(EMPHASIS_LEVELS).optional(),
  media_intent: z.string().trim().max(500).optional(),
  mobile_note: z.string().trim().max(500).optional(),
});

export const aiSectionSchema = z.object({
  block_type: z.enum(BLOCK_TYPES),
  enabled: z.boolean().default(true),
  content: z.object({
    title: shortText.optional(),
    subtitle: z.string().trim().max(1000).optional(),
    body: longText.optional(),
    image_alt: shortText.optional(),
    cta_label: z.string().trim().max(120).optional(),
    cta_url: z.string().trim().max(200).optional(),
    secondary_cta_label: z.string().trim().max(120).optional(),
    secondary_cta_url: z.string().trim().max(200).optional(),
    items: z
      .array(
        z.object({
          title: shortText.optional(),
          text: z.string().trim().max(2000).optional(),
          badge: z.string().trim().max(60).optional(),
        }),
      )
      .max(12)
      .optional(),
    design: aiSectionDesignSchema.optional(),
  }),
  reason: z.string().trim().max(500).optional(),
});

export const aiFormFieldSchema = z.object({
  key: z.string().trim().max(60),
  state: z.enum(["required", "optional", "hidden"]),
  label: z.string().trim().max(160).optional(),
  help: z.string().trim().max(300).optional(),
  placeholder: z.string().trim().max(200).optional(),
});

export const aiProposalSchema = z.object({
  strategy: z.object({
    audience: longText,
    visit_intent: longText,
    pains: z.array(shortText).max(10).default([]),
    core_proposition: longText,
    key_proof: z.array(shortText).max(10).default([]),
    primary_cta: shortText,
    objections: z.array(shortText).max(10).default([]),
    recommended_structure: z.array(shortText).max(20).default([]),
    missing_data: z.array(shortText).max(20).default([]),
    mobile_priorities: z.array(shortText).max(10).default([]),
    confidence: z.number().int().min(0).max(100),
  }),
  page: z.object({
    name: shortText.optional(),
    seo_title: z.string().trim().max(200).optional(),
    seo_description: z.string().trim().max(400).optional(),
    sections: z.array(aiSectionSchema).min(3).max(16),
  }),
  form: z.object({
    title: shortText.optional(),
    intro: z.string().trim().max(1000).optional(),
    submit_label: z.string().trim().max(120).optional(),
    success_title: shortText.optional(),
    success_body: z.string().trim().max(1000).optional(),
    fields: z.array(aiFormFieldSchema).max(40).default([]),
    reason: z.string().trim().max(800).optional(),
  }),
  products: z
    .array(
      z.object({
        product_id: z.string().trim().max(60),
        reason: shortText.optional(),
      }),
    )
    .max(12)
    .default([]),
  rationale: z
    .array(z.object({ topic: shortText, reason: z.string().trim().max(800) }))
    .max(12)
    .default([]),
  visual_direction: z.object({
    overall: longText,
    photography_needs: z.array(shortText).max(10).default([]),
    trust_placement: shortText.optional(),
    desktop_composition: longText.optional(),
    mobile_composition: longText.optional(),
    product_count: z.number().int().min(0).max(20).optional(),
  }),
  new_block_type_requests: z
    .array(z.object({ name: shortText, purpose: z.string().trim().max(600) }))
    .max(5)
    .default([]),
  experiments: z
    .array(
      z.object({
        name: shortText,
        hypothesis: z.string().trim().max(800),
        primary_metric: shortText,
        proposed_change: z.string().trim().max(1000),
        target_block: z.string().trim().max(60).optional(),
        expected_direction: z.enum(["positief", "neutraal", "onbekend"]).default("onbekend"),
      }),
    )
    .max(6)
    .default([]),
  ai_confidence: z.number().int().min(0).max(100),
});

export type AiProposalPayload = z.infer<typeof aiProposalSchema>;

/* ------------------------------------------------------------- confidence */

export type DataConfidence = {
  score: number;
  level: "low" | "medium" | "high";
  reasons: string[];
  used: string[];
  missing: string[];
};

export function confidenceLevel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export const CONFIDENCE_LEVEL_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "Laag",
  medium: "Gemiddeld",
  high: "Hoog",
};

/**
 * Deterministic, server-side data confidence — never taken from the model.
 * Strategy confidence can be high while data confidence is low (new industry).
 */
export function computeDataConfidence(facts: {
  pageViews: number;
  ctaClicks: number;
  formSubmissions: number;
  leads: number;
  qualifiedLeads: number;
  customers: number;
  adsClicks: number;
  searchSignals: number;
  productsInLibrary: number;
  testimonials: number;
  hasIndustryLeadHistory: boolean;
}): DataConfidence {
  let score = 5;
  const reasons: string[] = [];
  const used: string[] = [];
  const missing: string[] = [];

  if (facts.pageViews >= 500) {
    score += 25;
    used.push(`Landingpage-analytics (${facts.pageViews} bezoeken)`);
  } else if (facts.pageViews >= 100) {
    score += 15;
    used.push(`Landingpage-analytics (${facts.pageViews} bezoeken, beperkt volume)`);
  } else if (facts.pageViews > 0) {
    score += 6;
    reasons.push(`Slechts ${facts.pageViews} paginabezoeken: te weinig voor conversieconclusies.`);
    used.push(`Landingpage-analytics (${facts.pageViews} bezoeken)`);
  } else {
    reasons.push("Geen paginabezoeken gemeten: geen eigen conversiedata beschikbaar.");
    missing.push("Landingpage-analytics (bezoeken, CTA-kliks, formulierstarts)");
  }

  if (facts.formSubmissions >= 25) {
    score += 15;
    used.push(`${facts.formSubmissions} formulierinzendingen`);
  } else if (facts.formSubmissions > 0) {
    score += 5;
    reasons.push(`Slechts ${facts.formSubmissions} inzendingen: conversieratio's zijn indicatief.`);
    used.push(`${facts.formSubmissions} formulierinzendingen`);
  } else {
    missing.push("Formulierinzendingen op deze pagina");
  }

  if (facts.leads >= 30) {
    score += 20;
    used.push(`${facts.leads} B2B-leads`);
  } else if (facts.leads > 0) {
    score += 8;
    reasons.push(`Slechts ${facts.leads} leads in de dataset: leadkwaliteitspatronen zijn zwak.`);
    used.push(`${facts.leads} B2B-leads`);
  } else {
    reasons.push("Geen B2B-leads in de dataset.");
    missing.push("B2B-leads met branche- en campagne-attributie");
  }

  if (facts.customers > 0) {
    score += 10;
    used.push(`${facts.customers} klanten (omzetdata)`);
  } else {
    missing.push("Klanten/omzet per pagina of branche");
  }

  if (facts.qualifiedLeads > 0) used.push(`${facts.qualifiedLeads} qualified leads`);
  else missing.push("Qualified leads (leadkwaliteit)");

  if (facts.adsClicks >= 100) {
    score += 10;
    used.push(`Google Ads-verkeer (${facts.adsClicks} clicks)`);
  } else if (facts.adsClicks > 0) {
    score += 4;
    used.push(`Google Ads-verkeer (${facts.adsClicks} clicks, laag volume)`);
  } else {
    missing.push("Google Ads-verkeer in de gekozen periode");
  }

  if (facts.searchSignals > 0) {
    score += 10;
    used.push(`${facts.searchSignals} zoekintentiesignalen (zoekwoorden/zoektermen/PMax-categorieën)`);
  } else {
    reasons.push("Geen zoekintentiedata: message match is gebaseerd op aannames.");
    missing.push("Zoekwoorden / zoektermen / PMax-zoekcategorieën");
  }

  if (facts.productsInLibrary > 0) {
    score += 5;
    used.push(`${facts.productsInLibrary} producten in de bibliotheek`);
  } else {
    reasons.push("Productbibliotheek is leeg: er kan geen productbewijs worden ingezet.");
    missing.push("Productbibliotheek (foto's, prijzen, personalisatieopties)");
  }

  if (facts.testimonials > 0) used.push(`${facts.testimonials} testimonials`);
  else missing.push("Testimonials / klantlogo's (social proof)");

  if (!facts.hasIndustryLeadHistory)
    reasons.push("Geen historische leaddata voor deze branche: brancheconclusies zijn hypotheses.");

  const capped = Math.max(0, Math.min(100, score));
  return { score: capped, level: confidenceLevel(capped), reasons, used, missing };
}

/* ------------------------------------------------------------------ rows */

export type LandingAiProposalRow = {
  id: string;
  run_id: string;
  landing_page_id: string | null;
  industry_id: string | null;
  mode: string;
  title: string;
  status: string;
  strategy: Record<string, unknown>;
  page_plan: Record<string, unknown>;
  form_plan: Record<string, unknown>;
  product_plan: unknown[];
  rationale: unknown[];
  visual_direction: Record<string, unknown>;
  missing_data: unknown[];
  ai_confidence: number;
  data_confidence: number;
  data_confidence_reasons: unknown[];
  performance_data_used: unknown[];
  applied_page_id: string | null;
  applied_at: string | null;
  created_at: string;
};

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

/**
 * Tolerant primitives. A single Claude run costs minutes, so the contract
 * repairs cosmetic deviations (too-long text, a paraphrased enum value)
 * instead of rejecting the whole proposal. Structure stays strict.
 */
const clampedText = (max: number) =>
  z.preprocess((v) => {
    if (typeof v === "number" || typeof v === "boolean") v = String(v);
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length > max ? t.slice(0, max) : t;
  }, z.string().max(max));

function tolerantEnum<T extends readonly [string, ...string[]]>(values: T, fallback?: T[number]) {
  const map = (v: unknown) => {
    if (typeof v !== "string") return fallback;
    const s = v.trim().toLowerCase();
    return (
      values.find((o) => o.toLowerCase() === s) ??
      values.find((o) => s.startsWith(o.toLowerCase()) || s.includes(o.toLowerCase())) ??
      fallback
    );
  };
  return fallback === undefined
    ? z.preprocess(map, z.enum(values).optional())
    : z.preprocess(map, z.enum(values).default(fallback));
}

const score = (fallback = 50) =>
  z.preprocess((v) => {
    const n = typeof v === "string" ? Number.parseFloat(v.replace(/[^0-9.]/g, "")) : v;
    if (typeof n !== "number" || Number.isNaN(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
  }, z.number().int().min(0).max(100));

const shortText = clampedText(400);
const longText = clampedText(6000);

export const aiSectionDesignSchema = z.object({
  layout: tolerantEnum(SECTION_LAYOUTS),
  background: tolerantEnum(SECTION_BACKGROUNDS),
  width: tolerantEnum(SECTION_WIDTHS),
  density: tolerantEnum(SECTION_DENSITIES),
  image_treatment: tolerantEnum(IMAGE_TREATMENTS),
  cta_style: tolerantEnum(CTA_STYLES),
  emphasis: tolerantEnum(EMPHASIS_LEVELS),
  media_intent: clampedText(500).optional(),
  mobile_note: clampedText(500).optional(),
});


/**
 * Structured visual plan per section (V1.6B). The AI directs the imagery:
 * type, purpose, composition, positioning, ratio and a concrete brief. It may
 * only reference existing assets/products from the dataset; anything else stays
 * a brief with asset_status "missing" so the page shows an explicit visual gap
 * instead of silently rendering a text-only section.
 */
export const aiSectionVisualSchema = z.object({
  visual_required: z.preprocess(
    (v) => (typeof v === "boolean" ? v : true),
    z.boolean().default(true),
  ),
  visual_type: tolerantEnum(VISUAL_TYPES, "product_lifestyle"),
  purpose: clampedText(600).optional(),
  composition: clampedText(1200).optional(),
  desktop_position: tolerantEnum(VISUAL_POSITIONS, "right"),
  mobile_position: tolerantEnum(VISUAL_POSITIONS, "above"),
  aspect_ratio: tolerantEnum(ASPECT_RATIOS, "4:3"),
  background_treatment: clampedText(400).optional(),
  product_ids: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []),
    z.array(z.string()).default([]),
  ),
  asset_id: z.preprocess((v) => (typeof v === "string" ? v : null), z.string().nullable()),
  visual_brief: clampedText(2000).optional(),
});

export const aiSectionSchema = z.object({
  block_type: z.enum(BLOCK_TYPES),
  enabled: z.preprocess((v) => (typeof v === "boolean" ? v : true), z.boolean().default(true)),
  content: z.object({
    title: shortText.optional(),
    subtitle: clampedText(1000).optional(),
    body: longText.optional(),
    image_alt: shortText.optional(),
    cta_label: clampedText(120).optional(),
    cta_url: clampedText(200).optional(),
    secondary_cta_label: clampedText(120).optional(),
    secondary_cta_url: clampedText(200).optional(),
    items: z
      .array(
        z.object({
          title: shortText.optional(),
          text: clampedText(2000).optional(),
          badge: clampedText(60).optional(),
        }),
      )
      .optional(),
    design: aiSectionDesignSchema.optional(),
    visual: aiSectionVisualSchema.optional(),
  }),
  reason: clampedText(500).optional(),
});

export const aiFormFieldSchema = z.object({
  key: clampedText(60),
  state: tolerantEnum(["required", "optional", "hidden"] as const, "optional"),
  label: clampedText(160).optional(),
  help: clampedText(300).optional(),
  placeholder: clampedText(200).optional(),
});

/** Drops sections whose block_type is not renderable instead of failing the run. */
const sectionsArray = z.preprocess(
  (v) =>
    Array.isArray(v)
      ? v.filter(
          (s) =>
            s &&
            typeof s === "object" &&
            (BLOCK_TYPES as readonly string[]).includes((s as { block_type?: string }).block_type ?? ""),
        )
      : v,
  z.array(aiSectionSchema).min(3),
);

export const aiProposalSchema = z.object({
  strategy: z.object({
    audience: longText,
    visit_intent: longText,
    pains: z.array(shortText).default([]),
    core_proposition: longText,
    key_proof: z.array(shortText).default([]),
    primary_cta: shortText,
    objections: z.array(shortText).default([]),
    recommended_structure: z.array(shortText).default([]),
    missing_data: z.array(shortText).default([]),
    mobile_priorities: z.array(shortText).default([]),
    confidence: score(),
  }),
  page: z.object({
    name: shortText.optional(),
    seo_title: clampedText(200).optional(),
    seo_description: clampedText(400).optional(),
    sections: sectionsArray,
  }),
  form: z.object({
    title: shortText.optional(),
    intro: clampedText(1000).optional(),
    submit_label: clampedText(120).optional(),
    success_title: shortText.optional(),
    success_body: clampedText(1000).optional(),
    fields: z.array(aiFormFieldSchema).default([]),
    reason: clampedText(800).optional(),
  }),
  products: z
    .array(
      z.object({
        product_id: clampedText(60),
        reason: shortText.optional(),
      }),
    )
    .default([]),
  rationale: z.array(z.object({ topic: shortText, reason: clampedText(800) })).default([]),
  visual_direction: z.object({
    overall: longText,
    photography_needs: z.array(shortText).default([]),
    trust_placement: shortText.optional(),
    desktop_composition: longText.optional(),
    mobile_composition: longText.optional(),
    product_count: z
      .preprocess((v) => {
        const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
        return typeof n === "number" && !Number.isNaN(n) ? Math.max(0, Math.min(20, n)) : undefined;
      }, z.number().int().min(0).max(20).optional())
      .optional(),
  }),
  new_block_type_requests: z
    .array(z.object({ name: shortText, purpose: clampedText(600) }))
    .default([]),
  experiments: z
    .array(
      z.object({
        name: shortText,
        hypothesis: clampedText(800),
        primary_metric: shortText,
        proposed_change: clampedText(1000),
        target_block: clampedText(60).optional(),
        expected_direction: tolerantEnum(
          ["positief", "neutraal", "onbekend"] as const,
          "onbekend",
        ),
      }),
    )
    .default([]),
  ai_confidence: score(),
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

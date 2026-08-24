/**
 * Creative Quality Score (V1.9) — client-safe, deterministisch.
 *
 * Beoordeelt een (geplande) landingspagina op 8 creatieve dimensies, elk 0-100.
 * De score is reproduceerbaar (geen AI) en fungeert als quality gate: een
 * voorstel is pas CREATIVE_READY als alle drempels gehaald zijn.
 */
import type { LandingSection } from "./landing-shared";
import { analyzeVisualRhythm } from "./landing-visual-rhythm";

export type CreativeDimension =
  | "conversion_clarity"
  | "visual_impact"
  | "product_desirability"
  | "brand_distinctiveness"
  | "personalization_visibility"
  | "trust_credibility"
  | "mobile_composition"
  | "visual_rhythm";

export const CREATIVE_DIMENSION_LABELS: Record<CreativeDimension, string> = {
  conversion_clarity: "Conversiehelderheid",
  visual_impact: "Visuele impact",
  product_desirability: "Productbegeerte",
  brand_distinctiveness: "Merkonderscheid",
  personalization_visibility: "Personalisatie-zichtbaarheid",
  trust_credibility: "Vertrouwen & bewijs",
  mobile_composition: "Mobiele compositie",
  visual_rhythm: "Visueel ritme",
};

/** Drempels voor CREATIVE_READY (V1.9-specificatie). */
export const CREATIVE_READY_THRESHOLDS: Partial<Record<CreativeDimension, number>> = {
  conversion_clarity: 80,
  visual_impact: 75,
  product_desirability: 75,
  visual_rhythm: 75,
  brand_distinctiveness: 70,
};

export type CreativeQualityResult = {
  dimensions: Record<CreativeDimension, number>;
  overall: number;
  creativeReady: boolean;
  failedThresholds: { dimension: CreativeDimension; score: number; required: number }[];
  notes: string[];
};

type ProductLite = { image_url?: string | null; price_from?: number | null; images?: unknown[] };

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function hasVisual(s: LandingSection): boolean {
  const v = s.content?.visual;
  if (!v) return Boolean(s.content?.image_url);
  return v.visual_type !== "none" && v.visual_required !== false;
}

/**
 * Beoordeelt secties + gekoppelde producten. `products` zijn de voor de pagina
 * geselecteerde producten (met image_url/price_from), indien bekend.
 */
export function scoreCreativeQuality(
  sections: LandingSection[],
  products: ProductLite[] = [],
): CreativeQualityResult {
  const enabled = sections.filter((s) => s.enabled !== false);
  const notes: string[] = [];
  const byType = (t: string) => enabled.filter((s) => s.block_type === t);

  /* 1. Conversiehelderheid — één duidelijke actie, herhaald, met formulier. */
  const ctaSections = enabled.filter((s) => Boolean(s.content?.cta_label));
  const formPresent = byType("form").length > 0;
  const heroCta = Boolean(byType("hero")[0]?.content?.cta_label);
  let conversion = 30;
  if (heroCta) conversion += 25;
  if (ctaSections.length >= 2) conversion += 20;
  if (ctaSections.length >= 3) conversion += 10;
  if (formPresent) conversion += 15;
  if (!heroCta) notes.push("Hero heeft geen primaire CTA.");
  if (!formPresent) notes.push("Geen formulierblok aanwezig.");

  /* 2. Visuele impact — hero-beeld, grote momenten, compositievariatie. */
  const hero = byType("hero")[0];
  const heroVisual = hero ? hasVisual(hero) : false;
  const heroComposition = hero?.content?.design?.composition;
  const layeredHero =
    heroComposition === "layered_hero" || heroComposition === "collage_hero";
  const visualCount = enabled.filter(hasVisual).length;
  const compositions = new Set(
    enabled.map((s) => s.content?.design?.composition ?? "default"),
  );
  let impact = 20;
  if (heroVisual) impact += 25;
  if (layeredHero) impact += 15;
  if (visualCount >= 3) impact += 15;
  if (visualCount >= 5) impact += 10;
  if (compositions.size >= 3) impact += 15;
  if (!heroVisual) notes.push("Hero zonder visual: eerste indruk is zwak.");

  /* 3. Productbegeerte — echte producten, met beeld, prijs en presentatie. */
  const productSection = byType("products")[0];
  const withImage = products.filter((p) => p.image_url || (p.images?.length ?? 0) > 0).length;
  const withPrice = products.filter((p) => p.price_from != null).length;
  const productComposition = productSection?.content?.design?.composition;
  let desirability = 10;
  if (products.length > 0) desirability += 20;
  if (products.length >= 3) desirability += 10;
  if (withImage > 0) desirability += 25 * Math.min(1, withImage / Math.max(1, products.length));
  if (withPrice > 0) desirability += 10;
  if (productComposition === "oversized_showcase" || productComposition === "staggered_grid")
    desirability += 15;
  if (productSection && hasVisual(productSection)) desirability += 10;
  if (products.length === 0) notes.push("Geen producten geselecteerd voor de pagina.");

  /* 4. Merkonderscheid — afwijking van de grijze standaardkolom. */
  const nonPlainBackgrounds = enabled.filter(
    (s) => (s.content?.design?.background ?? "plain") !== "plain",
  ).length;
  const nonDefaultCompositions = enabled.filter(
    (s) => (s.content?.design?.composition ?? "default") !== "default",
  ).length;
  let distinctiveness = 20;
  if (nonPlainBackgrounds >= 2) distinctiveness += 20;
  if (nonPlainBackgrounds >= 4) distinctiveness += 10;
  if (nonDefaultCompositions >= 2) distinctiveness += 20;
  if (nonDefaultCompositions >= 4) distinctiveness += 10;
  if (layeredHero) distinctiveness += 10;
  if (nonDefaultCompositions === 0)
    notes.push("Geen enkele creatieve compositie gebruikt — generiek templategevoel.");

  /* 5. Personalisatie-zichtbaarheid — de kern-USP moet je zien. */
  const personalization = byType("personalization")[0];
  let personalizationScore = 10;
  if (personalization) {
    personalizationScore += 30;
    if (hasVisual(personalization)) personalizationScore += 25;
    if (personalization.content?.design?.composition === "before_after") personalizationScore += 25;
    if ((personalization.content?.items?.length ?? 0) >= 2) personalizationScore += 10;
  } else {
    notes.push("Geen personalisatie-sectie: de sterkste merk-USP is onzichtbaar.");
  }

  /* 6. Vertrouwen & bewijs. */
  let trust = 20;
  if (byType("testimonials").length > 0) trust += 25;
  if (byType("social_proof").length > 0) trust += 20;
  if (byType("faq").length > 0) trust += 20;
  if (byType("why_us").length > 0 || byType("usps").length > 0) trust += 15;

  /* 7. Mobiele compositie — bewuste mobiele keuzes gedocumenteerd. */
  const withMobileNote = enabled.filter((s) => Boolean(s.content?.design?.mobile_note)).length;
  const heroMobile = hero?.content?.visual?.mobile_position;
  let mobile = 30;
  if (heroMobile === "above") mobile += 25;
  if (withMobileNote >= 2) mobile += 20;
  if (withMobileNote >= 4) mobile += 10;
  if (formPresent) mobile += 15;

  /* 8. Visueel ritme — uit de rhythm-scorer. */
  const rhythm = analyzeVisualRhythm(sections);

  const dimensions: Record<CreativeDimension, number> = {
    conversion_clarity: clamp(conversion),
    visual_impact: clamp(impact),
    product_desirability: clamp(desirability),
    brand_distinctiveness: clamp(distinctiveness),
    personalization_visibility: clamp(personalizationScore),
    trust_credibility: clamp(trust),
    mobile_composition: clamp(mobile),
    visual_rhythm: rhythm.score,
  };

  const values = Object.values(dimensions);
  const overall = clamp(values.reduce((a, b) => a + b, 0) / values.length);

  const failedThresholds = (
    Object.entries(CREATIVE_READY_THRESHOLDS) as [CreativeDimension, number][]
  )
    .filter(([dim, required]) => dimensions[dim] < required)
    .map(([dim, required]) => ({ dimension: dim, score: dimensions[dim], required }));

  return {
    dimensions,
    overall,
    creativeReady: failedThresholds.length === 0,
    failedThresholds,
    notes: [...notes, ...rhythm.violations.map((v) => v.detail)],
  };
}

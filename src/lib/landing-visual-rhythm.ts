/**
 * Visual Rhythm Score (V1.9) — client-safe, deterministisch.
 *
 * Analyseert de sectievolgorde van een (geplande) landingspagina op visueel
 * ritme: afwisseling tussen tekst en beeld, schaalvariatie, grote visuele
 * momenten en boven-de-vouw-impact. Geen AI — pure heuristiek, zodat de score
 * reproduceerbaar is en als quality gate kan dienen.
 */
import type { LandingSection } from "./landing-shared";

export type RhythmViolation = {
  rule: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

export type VisualRhythmResult = {
  score: number; // 0-100
  violations: RhythmViolation[];
  facts: {
    sectionCount: number;
    visualSections: number;
    textOnlySections: number;
    distinctLayouts: number;
    highEmphasisSections: number;
    bigVisualMoments: number;
  };
};

const CARD_LAYOUTS = new Set(["cards", "grid_2", "grid_3", "grid_4", "list"]);
const CARD_BLOCKS = new Set(["usps", "how_it_works", "use_cases", "products", "testimonials"]);

function hasVisual(s: LandingSection): boolean {
  const v = s.content?.visual;
  if (!v) return Boolean(s.content?.image_url);
  return v.visual_type !== "none" && v.visual_required !== false;
}

/**
 * Berekent het visuele ritme van een sectielijst. Werkt zowel op geplande
 * secties uit een AI-voorstel als op opgeslagen paginasecties.
 */
export function analyzeVisualRhythm(sections: LandingSection[]): VisualRhythmResult {
  const enabled = sections.filter((s) => s.enabled !== false);
  const facts = {
    sectionCount: enabled.length,
    visualSections: enabled.filter(hasVisual).length,
    textOnlySections: enabled.filter((s) => !hasVisual(s)).length,
    distinctLayouts: new Set(enabled.map((s) => s.content?.design?.layout ?? "stacked")).size,
    highEmphasisSections: enabled.filter((s) => s.content?.design?.emphasis === "high").length,
    bigVisualMoments: enabled.filter(
      (s) =>
        hasVisual(s) &&
        (s.content?.design?.emphasis === "high" ||
          s.content?.design?.layout === "media_full" ||
          s.block_type === "hero"),
    ).length,
  };

  const violations: RhythmViolation[] = [];

  /* 1. Hero moet visueel zijn — de eerste indruk bepaalt het hele ritme. */
  const hero = enabled.find((s) => s.block_type === "hero");
  if (!hero) {
    violations.push({ rule: "hero_present", detail: "Geen hero-sectie op de pagina.", severity: "high" });
  } else if (!hasVisual(hero)) {
    violations.push({
      rule: "hero_visual",
      detail: "Hero heeft geen visual: de boven-de-vouw-impact is zwak.",
      severity: "high",
    });
  }

  /* 2. Nooit meer dan 1 tekst-only sectie achter elkaar. */
  let run = 0;
  let worstRun = 0;
  for (const s of enabled) {
    run = hasVisual(s) ? 0 : run + 1;
    worstRun = Math.max(worstRun, run);
  }
  if (worstRun >= 3) {
    violations.push({
      rule: "text_run",
      detail: `${worstRun} tekst-only secties achter elkaar — de pagina wordt een grijze kolom.`,
      severity: "high",
    });
  } else if (worstRun === 2) {
    violations.push({
      rule: "text_run",
      detail: "2 tekst-only secties achter elkaar — voeg een visuele adempauze toe.",
      severity: "medium",
    });
  }

  /* 3. Nooit meer dan 2 kaart-gebaseerde secties achter elkaar (card-first). */
  let cardRun = 0;
  let worstCardRun = 0;
  for (const s of enabled) {
    const layout = s.content?.design?.layout ?? (CARD_BLOCKS.has(s.block_type) ? "cards" : "stacked");
    cardRun = CARD_LAYOUTS.has(layout) ? cardRun + 1 : 0;
    worstCardRun = Math.max(worstCardRun, cardRun);
  }
  if (worstCardRun >= 3) {
    violations.push({
      rule: "card_run",
      detail: `${worstCardRun} kaart/grid-secties achter elkaar — card-first design, visueel generiek.`,
      severity: "high",
    });
  }

  /* 4. Layout-variatie: minimaal 3 verschillende layouts bij 6+ secties. */
  if (facts.sectionCount >= 6 && facts.distinctLayouts < 3) {
    violations.push({
      rule: "layout_variety",
      detail: `Slechts ${facts.distinctLayouts} verschillende layouts — te eentonig.`,
      severity: "medium",
    });
  }

  /* 5. Schaalvariatie: minimaal 1 high-emphasis sectie. */
  if (facts.sectionCount >= 5 && facts.highEmphasisSections === 0) {
    violations.push({
      rule: "scale_variety",
      detail: "Geen enkele sectie met emphasis 'high' — geen visuele pieken in de pagina.",
      severity: "medium",
    });
  }

  /* 6. Grote visuele momenten: minimaal 2 bij een volwaardige pagina. */
  if (facts.sectionCount >= 6 && facts.bigVisualMoments < 2) {
    violations.push({
      rule: "big_moments",
      detail: "Minder dan 2 grote visuele momenten (hero, media_full of high-emphasis met beeld).",
      severity: "medium",
    });
  }

  /* 7. Producten zichtbaar in de eerste helft. */
  const half = Math.ceil(enabled.length / 2);
  const firstHalf = enabled.slice(0, half);
  const productEarly = firstHalf.some(
    (s) => s.block_type === "products" || (s.content?.visual?.product_ids?.length ?? 0) > 0,
  );
  if (enabled.length >= 5 && !productEarly) {
    violations.push({
      rule: "product_early",
      detail: "Geen productbeeld of productsectie in de eerste helft van de pagina.",
      severity: "medium",
    });
  }

  /* 8. Personalisatie zichtbaar — kernpropositie van het merk. */
  const personalization = enabled.find((s) => s.block_type === "personalization");
  if (!personalization) {
    violations.push({
      rule: "personalization",
      detail: "Geen personalisatie-sectie — de sterkste merk-USP ontbreekt visueel.",
      severity: "medium",
    });
  } else if (!hasVisual(personalization)) {
    violations.push({
      rule: "personalization_visual",
      detail: "Personalisatie-sectie zonder beeld — toon het verschil standaard vs. gepersonaliseerd.",
      severity: "medium",
    });
  }

  /* Score: start 100, trek af per ernst. */
  const penalty = violations.reduce(
    (sum, v) => sum + (v.severity === "high" ? 18 : v.severity === "medium" ? 9 : 4),
    0,
  );
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return { score, violations, facts };
}

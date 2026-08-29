/**
 * Campaign Builder — vaste business/product-exclusions (client-safe, deterministisch).
 *
 * Hier staat centraal welke productintenties wij NIET aanbieden. Deze termen
 * mogen altijd als negatieve keywords worden gebruikt, ook als ze commerciële
 * intentie bevatten: het aanbod ontbreekt simpelweg. De AI mag ze nooit
 * verwijderen of uitzetten; de guardrails dwingen ze deterministisch af.
 *
 * Wijzigt het assortiment? Pas uitsluitend deze lijst aan; prompt, guardrails
 * en concepten volgen automatisch.
 */

export type BusinessExclusion = {
  /** De zoekterm zoals die als negative keyword wordt toegevoegd. */
  text: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  /** Waarom wij dit niet aanbieden — komt in het concept als reden te staan. */
  reason: string;
  /** Extra schrijfwijzen/varianten die dezelfde exclusion dekken. */
  variants?: string[];
};

/** Wat wij momenteel niet aanbieden. Eén plek, één waarheid. */
export const BUSINESS_EXCLUSIONS: BusinessExclusion[] = [
  {
    text: "vegan",
    matchType: "BROAD",
    reason: "Geen vegan assortiment: dit product bieden wij momenteel niet aan.",
    variants: ["vegan", "vegansnoep", "veganistisch", "veganistische", "plantaardig", "plantaardige"],
  },
  {
    text: "suikervrij",
    matchType: "BROAD",
    reason: "Geen suikervrij assortiment: dit product bieden wij momenteel niet aan.",
    variants: ["suikervrij", "suikervrije", "zonder suiker", "sugarfree", "sugar free"],
  },
  {
    text: "biologisch",
    matchType: "BROAD",
    reason: "Geen biologisch assortiment: dit product bieden wij momenteel niet aan.",
    variants: ["biologisch", "biologische", "bio", "organic"],
  },
];

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u00c0-\u017f\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Alle termen (hoofdterm + varianten) die een vaste exclusion dekken. */
export function businessExclusionTerms(): string[] {
  return BUSINESS_EXCLUSIONS.flatMap((e) => [e.text, ...(e.variants ?? [])]).map(norm);
}

/** Is dit negative keyword een vaste business exclusion (dus beschermd)? */
export function matchBusinessExclusion(text: string): BusinessExclusion | null {
  const n = norm(text);
  if (!n) return null;
  const toks = n.split(" ");
  return (
    BUSINESS_EXCLUSIONS.find((e) =>
      [e.text, ...(e.variants ?? [])].some((term) => {
        const t = norm(term);
        return n === t || toks.includes(t) || n.includes(t);
      }),
    ) ?? null
  );
}

/** Promptblok zodat de AI de exclusions kent en ze niet weglaat. */
export function businessExclusionPromptBlock(): string {
  const lines = BUSINESS_EXCLUSIONS.map(
    (e) => `  · "${e.text}" (${e.matchType}) — ${e.reason}`,
  ).join("\n");
  return `Vaste business/product-exclusions (niet-aangeboden productintenties). Neem deze ALTIJD op in negativeKeywords en verwijder of verzwak ze nooit, ook niet als ze commerciële intentie lijken te hebben:
${lines}
Gebruik deze termen ook nooit in keywords, headlines, descriptions, sitelinks of callouts.`;
}

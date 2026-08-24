/**
 * Content readiness check for a landing page (V1.6B).
 *
 * Pure and deterministic: the AI never scores itself. Missing content never
 * blocks generation — it is reported so Claude knows exactly what it may use.
 */

export const READINESS_LEVELS = ["READY", "PARTIAL", "MISSING"] as const;
export type ReadinessLevel = (typeof READINESS_LEVELS)[number];

export const READINESS_CATEGORIES = [
  "product_data",
  "product_visuals",
  "personalization_examples",
  "usps",
  "testimonials",
  "customer_logos",
  "industry_visuals",
  "performance_data",
] as const;
export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

export const READINESS_LABELS: Record<ReadinessCategory, string> = {
  product_data: "Productdata",
  product_visuals: "Productvisuals",
  personalization_examples: "Personalisatievoorbeelden",
  usps: "USP's",
  testimonials: "Testimonials",
  customer_logos: "Klantlogo's",
  industry_visuals: "Branchevisuals",
  performance_data: "Performance-data",
};

export type ReadinessFacts = {
  activeProducts: number;
  productsWithImage: number;
  productsWithPersonalizationOptions: number;
  personalizationAssets: number;
  productAssets: number;
  customerLogoAssets: number;
  industryAssets: number;
  usps: number;
  testimonials: number;
  pageViews: number;
  leads: number;
};

export type ReadinessItem = {
  category: ReadinessCategory;
  label: string;
  level: ReadinessLevel;
  detail: string;
  advice: string | null;
};

const LEVEL_SCORE: Record<ReadinessLevel, number> = { READY: 100, PARTIAL: 50, MISSING: 0 };

function level(ready: boolean, partial: boolean): ReadinessLevel {
  return ready ? "READY" : partial ? "PARTIAL" : "MISSING";
}

export function computeContentReadiness(f: ReadinessFacts) {
  const items: ReadinessItem[] = [
    {
      category: "product_data",
      label: READINESS_LABELS.product_data,
      level: level(f.activeProducts >= 4, f.activeProducts > 0),
      detail: `${f.activeProducts} actieve producten in de bibliotheek`,
      advice:
        f.activeProducts >= 4 ? null : "Voeg minimaal 4 actieve producten toe met naam en korte tekst.",
    },
    {
      category: "product_visuals",
      label: READINESS_LABELS.product_visuals,
      level: level(
        f.activeProducts > 0 && f.productsWithImage >= Math.min(4, f.activeProducts),
        f.productsWithImage > 0 || f.productAssets > 0,
      ),
      detail: `${f.productsWithImage} van ${f.activeProducts} producten hebben beeld · ${f.productAssets} productassets in de beeldbank`,
      advice:
        f.productsWithImage >= Math.min(4, f.activeProducts) && f.activeProducts > 0
          ? null
          : "Upload per product minimaal één vrijstaande foto.",
    },
    {
      category: "personalization_examples",
      label: READINESS_LABELS.personalization_examples,
      level: level(f.personalizationAssets >= 2, f.personalizationAssets > 0 || f.productsWithPersonalizationOptions > 0),
      detail: `${f.personalizationAssets} personalisatiebeelden · ${f.productsWithPersonalizationOptions} producten met personalisatieopties`,
      advice:
        f.personalizationAssets >= 2
          ? null
          : "Upload 2 beelden van een product met logo/huisstijl (type personalisatievoorbeeld).",
    },
    {
      category: "usps",
      label: READINESS_LABELS.usps,
      level: level(f.usps >= 4, f.usps > 0),
      detail: `${f.usps} vastgelegde USP's`,
      advice: f.usps >= 4 ? null : "Vul de merk-USP's aan in de merkcontext.",
    },
    {
      category: "testimonials",
      label: READINESS_LABELS.testimonials,
      level: level(f.testimonials >= 2, f.testimonials > 0),
      detail: `${f.testimonials} actieve testimonials`,
      advice: f.testimonials >= 2 ? null : "Lever 2 klantquotes met naam, functie en bedrijf aan.",
    },
    {
      category: "customer_logos",
      label: READINESS_LABELS.customer_logos,
      level: level(f.customerLogoAssets >= 4, f.customerLogoAssets > 0),
      detail: `${f.customerLogoAssets} klantlogo's in de beeldbank`,
      advice:
        f.customerLogoAssets >= 4 ? null : "Upload 4–6 klantlogo's waarvoor je gebruiksrecht hebt.",
    },
    {
      category: "industry_visuals",
      label: READINESS_LABELS.industry_visuals,
      level: level(f.industryAssets >= 1, false),
      detail: `${f.industryAssets} branche-/contextbeelden`,
      advice: f.industryAssets >= 1 ? null : "Upload één branchefoto per prioriteitsbranche.",
    },
    {
      category: "performance_data",
      label: READINESS_LABELS.performance_data,
      level: level(f.pageViews >= 200 && f.leads >= 5, f.pageViews > 0 || f.leads > 0),
      detail: `${f.pageViews} paginaweergaven · ${f.leads} leads gemeten`,
      advice:
        f.pageViews >= 200 && f.leads >= 5
          ? null
          : "Nog te weinig gemeten verkeer/leads voor harde conclusies.",
    },
  ];

  const score = Math.round(
    items.reduce((sum, i) => sum + LEVEL_SCORE[i.level], 0) / (items.length || 1),
  );

  return {
    score,
    items,
    missing: items.filter((i) => i.level === "MISSING").map((i) => i.label),
    partial: items.filter((i) => i.level === "PARTIAL").map((i) => i.label),
    blocksGeneration: false as const,
  };
}

export type ContentReadiness = ReturnType<typeof computeContentReadiness>;

/* ------------------------------------------- per-product readiness (V1.7) */

export const PRODUCT_READINESS_LEVELS = ["complete", "partial", "insufficient"] as const;
export type ProductReadinessLevel = (typeof PRODUCT_READINESS_LEVELS)[number];

export const PRODUCT_READINESS_LABELS: Record<ProductReadinessLevel, string> = {
  complete: "Compleet",
  partial: "Gedeeltelijk",
  insufficient: "Onvoldoende",
};

export type ProductReadinessInput = {
  name: string;
  category: string | null;
  short_text: string | null;
  images: { image_type: string }[];
};

export type ProductReadinessCheck = { key: string; label: string; ok: boolean };

/**
 * Deterministic per-product readiness: what does the AI Strategist actually
 * have to work with for this product? Never scored by AI.
 */
export function computeProductReadiness(p: ProductReadinessInput): {
  level: ProductReadinessLevel;
  checks: ProductReadinessCheck[];
} {
  const types = new Set(p.images.map((i) => i.image_type));
  const checks: ProductReadinessCheck[] = [
    {
      key: "data",
      label: "Productgegevens (naam, categorie, korte tekst)",
      ok: Boolean(p.name?.trim()) && Boolean(p.category?.trim()) && Boolean(p.short_text?.trim()),
    },
    { key: "cutout", label: "Vrijstaande foto", ok: types.has("product_cutout") },
    {
      key: "personalized",
      label: "Gepersonaliseerd voorbeeld",
      ok: types.has("personalized_product"),
    },
    { key: "lifestyle", label: "Sfeerfoto", ok: types.has("product_lifestyle") },
  ];
  const okCount = checks.filter((c) => c.ok).length;
  const level: ProductReadinessLevel =
    okCount === checks.length
      ? "complete"
      : okCount === 0 || !checks[0]!.ok
        ? "insufficient"
        : "partial";
  return { level, checks };
}

/**
 * ZoetBezorgen Landing Design System (V1.6).
 *
 * Central, configurable design contract for the Landing Page Engine. The AI
 * Landing Page Strategist may only pick from the variants defined here — it can
 * never invent a new brand, raw HTML or arbitrary styling. Changing a token
 * value here updates every page that uses that variant.
 */

export const SECTION_LAYOUTS = [
  "stacked",
  "split_media_right",
  "split_media_left",
  "cards",
  "grid_2",
  "grid_3",
  "grid_4",
  "list",
  "banner",
  "media_full",
] as const;
export type SectionLayout = (typeof SECTION_LAYOUTS)[number];

export const SECTION_BACKGROUNDS = [
  "plain",
  "tinted",
  "card",
  "warm",
  "contrast",
  "bordered",
  "cream",
  "blush",
  "ink",
] as const;
export type SectionBackground = (typeof SECTION_BACKGROUNDS)[number];

export const SECTION_WIDTHS = ["narrow", "default", "wide", "full"] as const;
export type SectionWidth = (typeof SECTION_WIDTHS)[number];

export const SECTION_DENSITIES = ["compact", "default", "spacious"] as const;
export type SectionDensity = (typeof SECTION_DENSITIES)[number];

export const IMAGE_TREATMENTS = ["rounded", "framed", "overlap", "bleed", "none"] as const;
export type ImageTreatment = (typeof IMAGE_TREATMENTS)[number];

export const CTA_STYLES = ["solid", "outline", "soft"] as const;
export type CtaStyle = (typeof CTA_STYLES)[number];

export const EMPHASIS_LEVELS = ["normal", "high"] as const;
export type EmphasisLevel = (typeof EMPHASIS_LEVELS)[number];

/**
 * Creative compositions (V1.9) — hoe een sectie haar content en beeld
 * choreografeert. "default" is de neutrale vorm; alle andere varianten zijn
 * bewust anti-card-first en geven de pagina ritme en schaalcontrast.
 */
export const SECTION_COMPOSITIONS = [
  "default",
  "layered_hero",
  "collage_hero",
  "editorial_split",
  "oversized_showcase",
  "asymmetric_grid",
  "staggered_grid",
  "before_after",
  "large_quote",
  "trust_strip",
  "visual_cta",
  "floating_products",
  /* V1.9C — premium visual treatments */
  "full_bleed_hero",
  "cutout_hero",
  "masonry_showcase",
  "split_unequal",
  "statement_intro",
  "usp_strip",
  "steps_strip",
  "industry_story",
  "editorial_cta",
  "premium_form",
  /* V2.0 — ZoetBezorgen Conversion Design System (POC → productie) */
  "candy_hero_collage",
  "candy_hero_editorial",
  "industry_story_split",
  "industry_story_moments",
  "product_showcase_featured",
  "product_showcase_trio",
  /* V2.1 — conversie-upgrade (polaroid-wand, speelse stappen, logo-cloud) */
  "product_showcase_polaroids",
  "steps_dots",
  "testimonial_cards",
  "logo_cloud_stats",
] as const;
export type SectionComposition = (typeof SECTION_COMPOSITIONS)[number];

/** Structured, safe visual direction stored per section. */
export type SectionDesign = {
  layout?: SectionLayout;
  background?: SectionBackground;
  width?: SectionWidth;
  density?: SectionDensity;
  image_treatment?: ImageTreatment;
  cta_style?: CtaStyle;
  emphasis?: EmphasisLevel;
  /** Creatieve compositie-variant (V1.9). */
  composition?: SectionComposition;
  /** Briefing for the photographer/designer — never rendered as markup. */
  media_intent?: string;
  /** Short note on the mobile priority for this section. */
  mobile_note?: string;
};

/* --------------------------------------------------------------- tokens */

export const LANDING_DESIGN_TOKENS = {
  typography: {
    h1: "text-3xl font-semibold tracking-tight md:text-5xl",
    h1_high: "text-4xl font-semibold tracking-tight md:text-6xl",
    h2: "text-2xl font-semibold tracking-tight md:text-3xl",
    h2_high: "text-3xl font-semibold tracking-tight md:text-4xl",
    h3: "text-sm font-semibold",
    lead: "text-muted-foreground text-lg leading-relaxed",
    body: "text-muted-foreground leading-relaxed",
  },
  spacing: {
    compact: "px-5 py-9 md:px-8 md:py-12",
    default: "px-5 py-14 md:px-8 md:py-20",
    spacious: "px-5 py-20 md:px-8 md:py-28",
  },
  widths: {
    narrow: "max-w-3xl",
    default: "max-w-5xl",
    wide: "max-w-6xl",
    full: "max-w-none",
  },
  backgrounds: {
    plain: "bg-background",
    tinted: "bg-primary/5",
    card: "bg-card/40",
    warm: "bg-gradient-to-br from-primary/10 via-background to-background",
    contrast: "bg-foreground/[0.04]",
    bordered: "border-border/60 border-y bg-card/30",
    cream: "bg-zb-cream text-zb-ink",
    blush: "bg-zb-blush text-zb-ink",
    ink: "bg-zb-ink text-zb-cream",
  },
  radius: { card: "rounded-xl", media: "rounded-2xl", pill: "rounded-full" },
  cards: {
    default: "bg-background rounded-xl border p-4",
    elevated: "bg-background rounded-xl border p-5 shadow-sm",
    quiet: "rounded-xl border border-border/60 p-4",
  },
  images: {
    rounded: "rounded-2xl object-cover",
    framed: "rounded-2xl border border-border/70 object-cover p-1.5 bg-card",
    overlap: "rounded-2xl object-cover shadow-xl md:-mb-10",
    bleed: "rounded-none object-cover",
    none: "hidden",
  },
  buttons: {
    solid:
      "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-2xl px-6 text-sm font-semibold transition-colors",
    outline:
      "border border-border text-foreground hover:bg-accent inline-flex h-11 items-center justify-center rounded-2xl px-6 text-sm font-semibold transition-colors",
    soft:
      "bg-primary/10 text-primary hover:bg-primary/15 inline-flex h-11 items-center justify-center rounded-2xl px-6 text-sm font-semibold transition-colors",
  },
  grids: {
    stacked: "grid gap-4",
    cards: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
    grid_2: "grid gap-5 sm:grid-cols-2",
    grid_3: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
    grid_4: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
    list: "grid gap-3",
    banner: "grid gap-4",
    media_full: "grid gap-6",
    split_media_right: "grid items-center gap-10 md:grid-cols-2",
    split_media_left: "grid items-center gap-10 md:grid-cols-2",
  },
  form: {
    shell: "bg-background rounded-2xl border p-5 md:p-7",
    trust: "text-muted-foreground text-xs",
  },
} as const;

export const DEFAULT_SECTION_DESIGN: Required<
  Pick<SectionDesign, "layout" | "background" | "width" | "density" | "image_treatment" | "cta_style" | "emphasis" | "composition">
> = {
  layout: "stacked",
  background: "plain",
  width: "default",
  density: "default",
  image_treatment: "rounded",
  cta_style: "solid",
  emphasis: "normal",
  composition: "default",
};

const T = LANDING_DESIGN_TOKENS;

/** Resolves a section's design tokens into safe, pre-approved class strings. */
export function resolveSectionDesign(design?: SectionDesign | null) {
  const d = { ...DEFAULT_SECTION_DESIGN, ...(design ?? {}) };
  const layout = (SECTION_LAYOUTS as readonly string[]).includes(d.layout) ? d.layout : "stacked";
  const composition = (SECTION_COMPOSITIONS as readonly string[]).includes(d.composition)
    ? d.composition
    : "default";
  return {
    ...d,
    layout: layout as SectionLayout,
    composition: composition as SectionComposition,
    sectionClass: `${T.backgrounds[d.background] ?? T.backgrounds.plain} ${
      T.spacing[d.density] ?? T.spacing.default
    }`,
    innerClass: `mx-auto w-full ${T.widths[d.width] ?? T.widths.default}`,
    gridClass: T.grids[layout as keyof typeof T.grids] ?? T.grids.stacked,
    imageClass: T.images[d.image_treatment] ?? T.images.rounded,
    buttonClass: T.buttons[d.cta_style] ?? T.buttons.solid,
    headingClass: d.emphasis === "high" ? T.typography.h2_high : T.typography.h2,
    heroHeadingClass: d.emphasis === "high" ? T.typography.h1_high : T.typography.h1,
    isSplit: layout === "split_media_right" || layout === "split_media_left",
    mediaFirst: layout === "split_media_left",
  };
}

/** Human labels for the manager UI. */
export const DESIGN_LABELS = {
  layout: {
    stacked: "Gestapeld",
    split_media_right: "Split — beeld rechts",
    split_media_left: "Split — beeld links",
    cards: "Cards",
    grid_2: "Grid 2 kolommen",
    grid_3: "Grid 3 kolommen",
    grid_4: "Grid 4 kolommen",
    list: "Lijst",
    banner: "Banner",
    media_full: "Beeld volle breedte",
  } satisfies Record<SectionLayout, string>,
  background: {
    plain: "Neutraal",
    tinted: "Zacht getint",
    card: "Card",
    warm: "Warm verloop",
    contrast: "Contrast",
    bordered: "Met randen",
    cream: "ZB cream",
    blush: "ZB blush",
    ink: "ZB inkt (donker)",
  } satisfies Record<SectionBackground, string>,
  composition: {
    default: "Standaard",
    layered_hero: "Gelaagde hero (beeld als basis)",
    collage_hero: "Collage-hero (meerdere beelden)",
    editorial_split: "Editorial split (magazine)",
    oversized_showcase: "Oversized product-showcase",
    asymmetric_grid: "Asymmetrisch grid",
    staggered_grid: "Versprongen grid",
    before_after: "Voor / na (personalisatie)",
    large_quote: "Grote quote",
    trust_strip: "Trust-strip",
    visual_cta: "Visuele CTA-banner",
    floating_products: "Zwevende producten",
    full_bleed_hero: "Full-bleed hero (beeld over volle breedte)",
    cutout_hero: "Cutout-hero (product breekt over sectie)",
    masonry_showcase: "Masonry product-showcase",
    split_unequal: "Split ongelijk (40/60)",
    statement_intro: "Statement-intro (grote typografie)",
    usp_strip: "USP-strip (compact)",
    steps_strip: "Stappen-strip (compact)",
    industry_story: "Branche-verhaal (visueel)",
    editorial_cta: "Editorial CTA (full-bleed)",
    premium_form: "Premium formulier (beeld + benefits)",
    candy_hero_collage: "CandyHero — collage (boogfoto + polaroid)",
    candy_hero_editorial: "CandyHero — editorial (full-bleed sfeer)",
    industry_story_split: "IndustryStory — split (boogfoto + quote)",
    industry_story_moments: "IndustryStory — versprongen momenten",
    product_showcase_featured: "ProductShowcase — featured product",
    product_showcase_trio: "ProductShowcase — trio (overlappend)",
    product_showcase_polaroids: "ProductShowcase — polaroid-wand + featured",
    steps_dots: "Stappen — speelse stippen (cadeauplatform-stijl)",
    testimonial_cards: "Testimonials — speelse kaarten",
    logo_cloud_stats: "Logo-cloud + stats (social proof)",
  } satisfies Record<SectionComposition, string>,
};

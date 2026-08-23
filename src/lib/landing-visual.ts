/**
 * Visual-first contract for the Landing Page Engine (V1.6B).
 *
 * Every section can carry a structured visual plan. The plan is data — never
 * markup — and describes what image belongs there, why, and where it sits on
 * desktop and mobile. When the required image does not exist yet, the section
 * keeps its image slot and shows an explicit "AI VISUAL NEEDED" placeholder in
 * draft/preview only; production never renders a technical placeholder.
 */

/* ------------------------------------------------------------ visual types */

export const VISUAL_TYPES = [
  "product_cutout",
  "product_group",
  "personalized_product",
  "product_lifestyle",
  "business_context",
  "industry_context",
  "personalization_example",
  "customer_logo",
  "testimonial",
  "illustration",
  "decorative",
  "none",
] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];

export const VISUAL_TYPE_LABELS: Record<VisualType, string> = {
  product_cutout: "Product vrijstaand",
  product_group: "Meerdere producten samen",
  personalized_product: "Gepersonaliseerd product",
  product_lifestyle: "Sfeerfoto met product",
  business_context: "Zakelijke context",
  industry_context: "Branchecontext",
  personalization_example: "Personalisatievoorbeeld",
  customer_logo: "Klantlogo",
  testimonial: "Testimonialfoto",
  illustration: "Illustratie",
  decorative: "Decoratief",
  none: "Geen beeld",
};

/** Asset types of the central image library (no "none" — an asset always is something). */
export const ASSET_TYPES = VISUAL_TYPES.filter((t) => t !== "none") as readonly Exclude<
  VisualType,
  "none"
>[];
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_SOURCES = ["upload", "ai", "external"] as const;
export type AssetSource = (typeof ASSET_SOURCES)[number];

export const ASSET_SOURCE_LABELS: Record<AssetSource, string> = {
  upload: "Upload",
  ai: "AI-gegenereerd",
  external: "Extern",
};

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: "Wacht op goedkeuring",
  approved: "Goedgekeurd",
  rejected: "Afgekeurd",
};

/** Future AI image generation — modelled now, never triggered automatically. */
export const GENERATION_STATUSES = [
  "not_started",
  "queued",
  "generating",
  "generated",
  "failed",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

/* --------------------------------------------------- product image variants */

export const PRODUCT_IMAGE_TYPES = [
  "product_cutout",
  "product_lifestyle",
  "personalized_product",
  "detail",
  "packaging",
] as const;
export type ProductImageType = (typeof PRODUCT_IMAGE_TYPES)[number];

export const PRODUCT_IMAGE_TYPE_LABELS: Record<ProductImageType, string> = {
  product_cutout: "Vrijstaande productfoto",
  product_lifestyle: "Sfeerfoto",
  personalized_product: "Gepersonaliseerd voorbeeld",
  detail: "Detailfoto",
  packaging: "Packaging",
};

/* ------------------------------------------------------------ section plan */

export const VISUAL_POSITIONS = [
  "left",
  "right",
  "above",
  "below",
  "background",
  "full_width",
  "inline",
] as const;
export type VisualPosition = (typeof VISUAL_POSITIONS)[number];

export const VISUAL_POSITION_LABELS: Record<VisualPosition, string> = {
  left: "Links",
  right: "Rechts",
  above: "Boven de tekst",
  below: "Onder de tekst",
  background: "Achtergrond",
  full_width: "Volle breedte",
  inline: "In de content",
};

export const ASPECT_RATIOS = ["4:3", "3:2", "1:1", "16:9", "3:4", "9:16"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const ASPECT_RATIO_CLASS: Record<AspectRatio, string> = {
  "4:3": "aspect-4/3",
  "3:2": "aspect-3/2",
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "3:4": "aspect-3/4",
  "9:16": "aspect-9/16",
};

export const ASSET_STATUSES = ["missing", "existing", "generated"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Structured visual plan stored inside a section's content JSON. */
export type SectionVisual = {
  visual_required?: boolean;
  visual_type?: VisualType;
  purpose?: string;
  composition?: string;
  desktop_position?: VisualPosition;
  mobile_position?: VisualPosition;
  aspect_ratio?: AspectRatio;
  background_treatment?: string;
  product_ids?: string[];
  /** Only set when an existing, approved asset was selected. */
  asset_id?: string | null;
  asset_status?: AssetStatus;
  /** Human/AI briefing for the photographer, designer or future image generator. */
  visual_brief?: string;
};

export function visualIsPlanned(visual?: SectionVisual | null): boolean {
  return Boolean(visual?.visual_required && visual.visual_type !== "none");
}

/** A planned visual with no resolved image is a blocking content gap. */
export function visualIsMissing(visual: SectionVisual | undefined | null, imageUrl?: string | null) {
  return visualIsPlanned(visual) && !imageUrl;
}

export function aspectClass(ratio?: AspectRatio | string | null) {
  return ASPECT_RATIO_CLASS[(ratio ?? "4:3") as AspectRatio] ?? "aspect-4/3";
}

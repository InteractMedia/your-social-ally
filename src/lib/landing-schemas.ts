/** Client-safe validation schemas for the Landing Page Engine. */
import { z } from "zod";

import {
  CTA_STYLES,
  EMPHASIS_LEVELS,
  IMAGE_TREATMENTS,
  SECTION_BACKGROUNDS,
  SECTION_DENSITIES,
  SECTION_LAYOUTS,
  SECTION_WIDTHS,
} from "./landing-design-system";
import {
  APPROVAL_STATUSES,
  ASPECT_RATIOS,
  ASSET_SOURCES,
  ASSET_STATUSES,
  ASSET_TYPES,
  GENERATION_STATUSES,
  PRODUCT_IMAGE_TYPES,
  VISUAL_POSITIONS,
  VISUAL_TYPES,
} from "./landing-visual";

const uuid = z.string().uuid();

export const funnelEnum = z.enum(["quote", "platform"]);

export const sectionDesignSchema = z.object({
  layout: z.enum(SECTION_LAYOUTS).optional(),
  background: z.enum(SECTION_BACKGROUNDS).optional(),
  width: z.enum(SECTION_WIDTHS).optional(),
  density: z.enum(SECTION_DENSITIES).optional(),
  image_treatment: z.enum(IMAGE_TREATMENTS).optional(),
  cta_style: z.enum(CTA_STYLES).optional(),
  emphasis: z.enum(EMPHASIS_LEVELS).optional(),
  media_intent: z.string().max(500).optional(),
  mobile_note: z.string().max(500).optional(),
});

export const sectionVisualSchema = z.object({
  visual_required: z.boolean().optional(),
  visual_type: z.enum(VISUAL_TYPES).optional(),
  purpose: z.string().max(600).optional(),
  composition: z.string().max(1200).optional(),
  desktop_position: z.enum(VISUAL_POSITIONS).optional(),
  mobile_position: z.enum(VISUAL_POSITIONS).optional(),
  aspect_ratio: z.enum(ASPECT_RATIOS).optional(),
  background_treatment: z.string().max(400).optional(),
  product_ids: z.array(uuid).max(12).optional(),
  asset_id: uuid.nullable().optional(),
  asset_status: z.enum(ASSET_STATUSES).optional(),
  visual_brief: z.string().max(2000).optional(),
});

export const blockContentSchema = z.object({
  design: sectionDesignSchema.optional(),
  visual: sectionVisualSchema.optional(),
  title: z.string().max(300).optional(),
  subtitle: z.string().max(1000).optional(),
  body: z.string().max(8000).optional(),
  image_url: z.string().max(1000).optional(),
  image_alt: z.string().max(300).optional(),
  mobile_image_url: z.string().max(1000).optional(),
  image_url_2: z.string().max(1000).optional(),
  image_alt_2: z.string().max(300).optional(),
  image_url_3: z.string().max(1000).optional(),
  image_alt_3: z.string().max(300).optional(),
  image_url_4: z.string().max(1000).optional(),
  image_alt_4: z.string().max(300).optional(),
  image_badge: z.string().max(120).optional(),
  badge: z.string().max(120).optional(),
  footnote: z.string().max(600).optional(),
  gallery: z
    .array(
      z.object({
        url: z.string().max(1000),
        alt: z.string().max(300).optional(),
        caption: z.string().max(300).optional(),
      }),
    )
    .max(30)
    .optional(),
  logos: z
    .array(z.object({ url: z.string().max(1000), alt: z.string().max(300).optional() }))
    .max(40)
    .optional(),
  stats: z
    .array(z.object({ value: z.string().max(60), label: z.string().max(160) }))
    .max(12)
    .optional(),
  cta_label: z.string().max(120).optional(),
  cta_url: z.string().max(500).optional(),
  secondary_cta_label: z.string().max(120).optional(),
  secondary_cta_url: z.string().max(500).optional(),
  items: blockItemsSchema,
  secondary_items: blockItemsSchema,
});

export const fieldConfigSchema = z.object({
  key: z.string().min(1).max(60).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(160),
  type: z.enum([
    "text",
    "email",
    "tel",
    "url",
    "number",
    "date",
    "select",
    "multiselect",
    "boolean",
    "textarea",
  ]),
  state: z.enum(["required", "optional", "hidden", "disabled"]),
  placeholder: z.string().max(200).optional(),
  help: z.string().max(300).optional(),
  options: z.array(z.string().max(120)).max(40).optional(),
  custom: z.boolean().optional(),
});

export const createPageInput = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  funnel: funnelEnum,
  industry_id: uuid.optional().nullable(),
  base_url: z.string().max(300).optional().nullable(),
});

export const duplicatePageInput = z.object({
  source_id: uuid,
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  industry_id: uuid.optional().nullable(),
});

export const updatePageInput = z.object({
  id: uuid,
  name: z.string().min(2).max(200).optional(),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(["draft", "published", "paused", "archived"]).optional(),
  industry_id: uuid.optional().nullable(),
  base_url: z.string().max(300).optional().nullable(),
  canonical_url: z.string().max(500).optional().nullable(),
  noindex: z.boolean().optional(),
  seo_title: z.string().max(200).optional().nullable(),
  seo_description: z.string().max(400).optional().nullable(),
  og_title: z.string().max(200).optional().nullable(),
  og_description: z.string().max(400).optional().nullable(),
  og_image_url: z.string().max(1000).optional().nullable(),
  notify_channel: z.enum(["none", "webhook"]).optional().nullable(),
  notify_target: z.string().max(500).optional().nullable(),
  is_test: z.boolean().optional(),
  /** V2.2 — instelbare merk-/lintkleuren per pagina. */
  theme: z
    .object({
      hazard_color_1: z.string().max(40).optional().nullable(),
      hazard_color_2: z.string().max(40).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const sectionUpdateInput = z.object({
  id: uuid,
  page_id: uuid,
  content: blockContentSchema.optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
  use_global: z.boolean().optional(),
  global_key: z.string().max(100).optional().nullable(),
});

export const sectionAddInput = z.object({
  page_id: uuid,
  block_type: z.string().min(2).max(60),
});

export const sectionReorderInput = z.object({
  page_id: uuid,
  order: z.array(uuid).max(50),
});

export const formUpdateInput = z.object({
  page_id: uuid,
  title: z.string().max(200).optional().nullable(),
  intro: z.string().max(1000).optional().nullable(),
  submit_label: z.string().min(2).max(120),
  success_title: z.string().min(2).max(200),
  success_body: z.string().min(2).max(1000),
  fields: z.array(fieldConfigSchema).min(1).max(40),
});

export const productInput = z.object({
  id: uuid.optional(),
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/).optional(),
  image_url: z.string().max(1000).optional().nullable(),
  image_alt: z.string().max(300).optional().nullable(),
  short_text: z.string().max(1000).optional().nullable(),
  price_from: z.number().nonnegative().optional().nullable(),
  personalization_options: z.array(z.string().max(120)).max(20).optional(),
  cta_label: z.string().max(120).optional().nullable(),
  cta_url: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
});

export const pageProductInput = z.object({
  page_id: uuid,
  product_ids: z.array(uuid).max(30),
});

export const testimonialInput = z.object({
  id: uuid.optional(),
  page_id: uuid,
  author: z.string().min(2).max(160),
  role_title: z.string().max(160).optional().nullable(),
  company: z.string().max(160).optional().nullable(),
  quote: z.string().min(5).max(2000),
  image_url: z.string().max(1000).optional().nullable(),
  enabled: z.boolean().optional(),
});

export const pageIdInput = z.object({ id: uuid });

export const publishInput = z.object({
  id: uuid,
  note: z.string().max(500).optional().nullable(),
  /** Explicit override for the missing-required-visuals gate (V1.8B). */
  allow_missing_visuals: z.boolean().optional(),
});

export const rollbackInput = z.object({ id: uuid, version_id: uuid });

export const analyticsInput = z.object({
  id: uuid,
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/* -------------------------------------------------- public (unauthenticated) */

export const publicPageInput = z.object({
  funnel: funnelEnum,
  slug: z.string().min(1).max(200),
  preview_token: z.string().max(100).optional().nullable(),
  variant_key: z.string().max(20).optional().nullable(),
});

export const publicEventInput = z.object({
  page_id: uuid,
  version_id: uuid.optional().nullable(),
  variant_key: z.string().max(20).optional().nullable(),
  session_id: z.string().min(6).max(100),
  event_type: z.enum(["page_view", "cta_click", "form_started", "form_submitted", "thank_you"]),
  path: z.string().max(500).optional().nullable(),
  attribution: z.record(z.string(), z.unknown()).optional().nullable(),
  is_preview: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

/* ------------------------------------------- product library (V1.6B) */

export const productLibraryInput = z.object({
  id: uuid.optional(),
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/).optional(),
  sku: z.string().max(80).optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  short_text: z.string().max(1000).optional().nullable(),
  long_text: z.string().max(6000).optional().nullable(),
  min_quantity: z.number().int().min(1).max(1000000).optional().nullable(),
  price_from: z.number().nonnegative().optional().nullable(),
  personalization_options: z.array(z.string().max(120)).max(20).optional(),
  occasions: z.array(z.string().max(120)).max(20).optional(),
  industries: z.array(z.string().max(120)).max(30).optional(),
  tags: z.array(z.string().max(60)).max(30).optional(),
  letterbox_friendly: z.boolean().optional().nullable(),
  individually_shippable: z.boolean().optional().nullable(),
  featured: z.boolean().optional(),
  product_url: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  cta_label: z.string().max(120).optional().nullable(),
  cta_url: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

/** Quick-entry flow: name + images + a few hard facts, nothing else required. */
export const quickProductInput = z.object({
  name: z.string().min(2).max(200),
  product_url: z.string().max(500).optional().nullable(),
  min_quantity: z.number().int().min(1).max(1000000).optional().nullable(),
  price_from: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string().min(4).max(1000),
        storage_path: z.string().max(500).optional().nullable(),
        image_type: z.enum(PRODUCT_IMAGE_TYPES).optional(),
        alt_text: z.string().max(300).optional().nullable(),
        mime_type: z.string().max(120).optional().nullable(),
      }),
    )
    .max(8)
    .optional(),
});

export const productImageInput = z.object({
  product_id: uuid,
  asset_id: uuid.optional().nullable(),
  url: z.string().min(4).max(1000),
  storage_path: z.string().max(500).optional().nullable(),
  image_type: z.enum(PRODUCT_IMAGE_TYPES).default("product_cutout"),
  alt_text: z.string().max(300).optional().nullable(),
  is_primary: z.boolean().optional(),
  mime_type: z.string().max(120).optional().nullable(),
});

export const idInput = z.object({ id: uuid });

export const productImageMutateInput = z.object({
  id: uuid,
  is_primary: z.boolean().optional(),
  image_type: z.enum(PRODUCT_IMAGE_TYPES).optional(),
  alt_text: z.string().max(300).optional().nullable(),
});

/**
 * Fields the AI Metadata Assistant may propose. Hard product facts (price,
 * minimum quantity, shipping) are deliberately absent: AI never invents them.
 */
export const PRODUCT_SUGGESTION_FIELDS = [
  "short_text",
  "long_text",
  "category",
  "tags",
  "industries",
  "occasions",
  "personalization_options",
  "image_alt",
] as const;
export type ProductSuggestionField = (typeof PRODUCT_SUGGESTION_FIELDS)[number];

export const productSuggestApplyInput = z.object({
  id: uuid,
  fields: z.array(z.enum(PRODUCT_SUGGESTION_FIELDS)).min(1),
});

/* --------------------------------------------- asset library (V1.6B) */

export const assetInput = z.object({
  id: uuid.optional(),
  name: z.string().min(2).max(200),
  url: z.string().min(4).max(1000).optional(),
  storage_path: z.string().max(500).optional().nullable(),
  asset_type: z.enum(ASSET_TYPES),
  alt_text: z.string().max(300).optional().nullable(),
  product_id: uuid.optional().nullable(),
  industry_id: uuid.optional().nullable(),
  tags: z.array(z.string().max(60)).max(30).optional(),
  desktop_ok: z.boolean().optional(),
  mobile_ok: z.boolean().optional(),
  source: z.enum(ASSET_SOURCES).optional(),
  approval_status: z.enum(APPROVAL_STATUSES).optional(),
  active: z.boolean().optional(),
  mime_type: z.string().max(120).optional().nullable(),
  visual_brief_id: uuid.optional().nullable(),
});

/* --------------------------------------------- visual briefs (V1.6B) */

export const visualBriefInput = z.object({
  id: uuid.optional(),
  landing_page_id: uuid.optional().nullable(),
  section_id: uuid.optional().nullable(),
  block_type: z.string().max(60).optional().nullable(),
  proposal_id: uuid.optional().nullable(),
  title: z.string().min(2).max(200),
  visual_type: z.enum(VISUAL_TYPES),
  purpose: z.string().max(600).optional().nullable(),
  composition: z.string().max(1200).optional().nullable(),
  desktop_position: z.enum(VISUAL_POSITIONS).optional().nullable(),
  mobile_position: z.enum(VISUAL_POSITIONS).optional().nullable(),
  aspect_ratio: z.enum(ASPECT_RATIOS).optional().nullable(),
  background_treatment: z.string().max(400).optional().nullable(),
  product_ids: z.array(uuid).max(12).optional(),
  brief_text: z.string().max(4000).optional().nullable(),
  asset_status: z.enum(ASSET_STATUSES).optional(),
  asset_id: uuid.optional().nullable(),
  generation_status: z.enum(GENERATION_STATUSES).optional(),
  approval_status: z.enum(APPROVAL_STATUSES).optional(),
});

export const sectionVisualUpdateInput = z.object({
  section_id: uuid,
  page_id: uuid,
  visual: sectionVisualSchema,
  image_url: z.string().max(1000).optional().nullable(),
  image_alt: z.string().max(300).optional().nullable(),
});

export const uploadUrlInput = z.object({
  filename: z.string().min(1).max(200),
  mime_type: z.string().max(120).optional().nullable(),
});

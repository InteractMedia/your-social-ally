/** Client-safe validation schemas for the Landing Page Engine. */
import { z } from "zod";

const uuid = z.string().uuid();

export const funnelEnum = z.enum(["quote", "platform"]);

export const blockContentSchema = z.object({
  title: z.string().max(300).optional(),
  subtitle: z.string().max(1000).optional(),
  body: z.string().max(8000).optional(),
  image_url: z.string().max(1000).optional(),
  image_alt: z.string().max(300).optional(),
  mobile_image_url: z.string().max(1000).optional(),
  cta_label: z.string().max(120).optional(),
  cta_url: z.string().max(500).optional(),
  secondary_cta_label: z.string().max(120).optional(),
  secondary_cta_url: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        title: z.string().max(300).optional(),
        text: z.string().max(3000).optional(),
        badge: z.string().max(60).optional(),
      }),
    )
    .max(30)
    .optional(),
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

export const publishInput = z.object({ id: uuid, note: z.string().max(500).optional().nullable() });

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

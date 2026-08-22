import { z } from "zod";

export const periodInput = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listLeadsInput = periodInput.extend({
  funnel: z.string().optional(),
  leadType: z.string().optional(),
  industryId: z.string().optional(),
  platform: z.string().optional(),
  campaignId: z.string().optional(),
  status: z.string().optional(),
  quality: z.string().optional(),
  poorReason: z.string().optional(),
  search: z.string().optional(),
});

export const createLeadInput = z.object({
  funnel_type: z.enum(["platform", "quote"]),
  company_name: z.string().min(1).max(300),
  contact_name: z.string().max(200).optional(),
  email: z.string().max(320).optional(),
  phone: z.string().max(60).optional(),
  website: z.string().max(300).optional(),
  company_size: z.string().max(100).optional(),
  kvk_number: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  industry_id: z.string().uuid().optional(),
  landing_page_id: z.string().uuid().optional(),
  landing_page: z.string().max(500).optional(),
  platform: z.string().max(100).optional(),
  source: z.string().max(200).optional(),
  medium: z.string().max(200).optional(),
  campaign_name: z.string().max(300).optional(),
  campaign_id: z.string().max(100).optional(),
  ad_group_name: z.string().max(300).optional(),
  keyword: z.string().max(300).optional(),
  search_term: z.string().max(300).optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(300).optional(),
  utm_content: z.string().max(300).optional(),
  utm_term: z.string().max(300).optional(),
  gclid: z.string().max(300).optional(),
  gbraid: z.string().max(300).optional(),
  wbraid: z.string().max(300).optional(),
  expected_value: z.number().optional(),
});

export const idInput = z.object({ id: z.string().uuid() });

export const statusInput = idInput.extend({ status: z.string().min(2).max(50) });

export const qualityInput = idInput.extend({
  quality: z.enum(["unknown", "poor", "qualified", "hot"]),
  /** Reason key from public.poor_lead_reasons — required when quality is "poor". */
  poorReasonKey: z.string().min(1).max(100).optional(),
  poorReasonNotes: z.string().max(2000).optional(),
});

export const poorReasonInput = z.object({
  label: z.string().min(2).max(160),
  requires_notes: z.boolean().optional(),
});

export const customerInput = idInput.extend({
  revenue: z.number().nonnegative(),
  gross_margin: z.number().optional(),
  customer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const notesInput = idInput.extend({ notes: z.string().max(5000) });

export const attributionInput = idInput.extend({
  platform: z.string().max(100).optional().nullable(),
  campaign_name: z.string().max(300).optional().nullable(),
  campaign_id: z.string().max(100).optional().nullable(),
  ad_group_name: z.string().max(300).optional().nullable(),
  keyword: z.string().max(300).optional().nullable(),
  search_term: z.string().max(300).optional().nullable(),
  landing_page: z.string().max(500).optional().nullable(),
  gclid: z.string().max(300).optional().nullable(),
});

export const industryInput = z.object({ name: z.string().min(2).max(120) });

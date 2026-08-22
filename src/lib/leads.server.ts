/**
 * Server-only helpers for the B2B Lead Manager: ingest normalisation,
 * attribution derivation and activity logging.
 * Never imported from client code.
 */
import { z } from "zod";

import type { Json } from "@/integrations/supabase/types";

import { ATTRIBUTION_MODEL, CONVERSION_EVENT_FOR_STATUS } from "./leads-shared";

export const attributionSchema = z
  .object({
    source: z.string().max(200).optional().nullable(),
    medium: z.string().max(200).optional().nullable(),
    platform: z.string().max(100).optional().nullable(),
    campaign_id: z.string().max(100).optional().nullable(),
    campaign_name: z.string().max(300).optional().nullable(),
    ad_group_id: z.string().max(100).optional().nullable(),
    ad_group_name: z.string().max(300).optional().nullable(),
    ad_id: z.string().max(100).optional().nullable(),
    ad_name: z.string().max(300).optional().nullable(),
    keyword: z.string().max(300).optional().nullable(),
    search_term: z.string().max(300).optional().nullable(),
    match_type: z.string().max(50).optional().nullable(),
    landing_page: z.string().max(500).optional().nullable(),
    landing_page_slug: z.string().max(200).optional().nullable(),
    landing_page_variant: z.string().max(100).optional().nullable(),
    referrer: z.string().max(500).optional().nullable(),
    utm_source: z.string().max(200).optional().nullable(),
    utm_medium: z.string().max(200).optional().nullable(),
    utm_campaign: z.string().max(300).optional().nullable(),
    utm_content: z.string().max(300).optional().nullable(),
    utm_term: z.string().max(300).optional().nullable(),
    gclid: z.string().max(300).optional().nullable(),
    gbraid: z.string().max(300).optional().nullable(),
    wbraid: z.string().max(300).optional().nullable(),
    li_fat_id: z.string().max(300).optional().nullable(),
    ttclid: z.string().max(300).optional().nullable(),
    fbclid: z.string().max(300).optional().nullable(),
    click_ids: z.record(z.string(), z.string()).optional().nullable(),
    first_touch: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .partial();

export const ingestSchema = attributionSchema.extend({
  company_name: z.string().min(1).max(300),
  contact_name: z.string().max(200).optional().nullable(),
  email: z.string().max(320).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  company_domain: z.string().max(300).optional().nullable(),
  company_size: z.string().max(100).optional().nullable(),
  kvk_number: z.string().max(50).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  industry_slug: z.string().max(200).optional().nullable(),
  industry_name: z.string().max(200).optional().nullable(),
  expected_value: z.number().optional().nullable(),
  received_at: z.string().optional().nullable(),
  raw: z.record(z.string(), z.unknown()).optional().nullable(),
  /** Stable identity of the record in the external application. */
  external_source: z.string().min(1).max(100).optional().nullable(),
  external_id: z.string().min(1).max(200).optional().nullable(),
  /** Idempotency key for this specific external event/retry. */
  external_event_id: z.string().min(1).max(200).optional().nullable(),
  order_id: z.string().max(200).optional().nullable(),
  order_value: z.number().nonnegative().optional().nullable(),
  revenue: z.number().nonnegative().optional().nullable(),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export type IngestPayload = z.infer<typeof ingestSchema>;

/**
 * Last non-direct click attribution: an ad click id wins, then explicit
 * platform/source, then UTM's, then referrer. Unknown stays NULL — never invented.
 */
export function derivePlatform(p: IngestPayload): string | null {
  if (p.platform) return p.platform;
  if (p.gclid || p.gbraid || p.wbraid) return "google_ads";
  if (p.li_fat_id) return "linkedin_ads";
  if (p.ttclid) return "tiktok_ads";
  if (p.fbclid) return "meta_ads";
  const src = (p.utm_source || p.source || "").toLowerCase();
  if (!src) return null;
  if (src.includes("google")) return p.utm_medium === "cpc" ? "google_ads" : "google";
  if (src.includes("linkedin")) return "linkedin";
  if (src.includes("tiktok")) return "tiktok";
  if (src.includes("facebook") || src.includes("instagram") || src.includes("meta")) return "meta";
  return src;
}

export function normalizeLead(
  p: IngestPayload,
  opts: {
    leadType: string;
    funnelType: string;
    status: string;
    ingestSource: string;
    /** Tenant that owns this lead — required, leads can never be ownerless. */
    workspaceId: string;
    industryId?: string | null;
    landingPageId?: string | null;
    userId?: string | null;
  },
) {
  const clickIds: Record<string, string> = { ...(p.click_ids ?? {}) };
  for (const key of ["gclid", "gbraid", "wbraid", "li_fat_id", "ttclid", "fbclid"] as const) {
    const value = p[key];
    if (value) clickIds[key] = value;
  }
  return {
    workspace_id: opts.workspaceId,
    user_id: opts.userId ?? null,
    lead_type: opts.leadType,
    funnel_type: opts.funnelType,
    status: opts.status,
    lead_quality: "unknown",
    received_at: p.received_at || new Date().toISOString(),
    company_name: p.company_name.trim(),
    contact_name: p.contact_name || null,
    email: p.email || null,
    phone: p.phone || null,
    website: p.website || null,
    company_domain: p.company_domain || domainFromWebsite(p.website) || domainFromEmail(p.email),
    company_size: p.company_size || null,
    kvk_number: p.kvk_number || null,
    notes: p.notes || null,
    industry_id: opts.industryId ?? null,
    industry_name: p.industry_name || null,
    source: p.source || p.utm_source || null,
    medium: p.medium || p.utm_medium || null,
    platform: derivePlatform(p),
    campaign_id: p.campaign_id || null,
    campaign_name: p.campaign_name || p.utm_campaign || null,
    ad_group_id: p.ad_group_id || null,
    ad_group_name: p.ad_group_name || null,
    ad_id: p.ad_id || null,
    ad_name: p.ad_name || null,
    keyword: p.keyword || p.utm_term || null,
    search_term: p.search_term || null,
    match_type: p.match_type || null,
    landing_page: p.landing_page || p.landing_page_slug || null,
    landing_page_id: opts.landingPageId ?? null,
    landing_page_variant: p.landing_page_variant || null,
    referrer: p.referrer || null,
    utm_source: p.utm_source || null,
    utm_medium: p.utm_medium || null,
    utm_campaign: p.utm_campaign || null,
    utm_content: p.utm_content || null,
    utm_term: p.utm_term || null,
    gclid: p.gclid || null,
    gbraid: p.gbraid || null,
    wbraid: p.wbraid || null,
    li_fat_id: p.li_fat_id || null,
    ttclid: p.ttclid || null,
    fbclid: p.fbclid || null,
    click_ids: clickIds,
    attribution_model: ATTRIBUTION_MODEL,
    first_touch: (p.first_touch ?? null) as Json,
    raw: (p.raw ?? null) as Json,
    expected_value: p.expected_value ?? null,
    ingest_source: opts.ingestSource,
    external_source: p.external_source || null,
    external_id: p.external_id || null,
  };
}

function domainFromWebsite(website?: string | null) {
  if (!website) return null;
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return null;
  }
}

function domainFromEmail(email?: string | null) {
  if (!email || !email.includes("@")) return null;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const free = ["gmail.com", "hotmail.com", "outlook.com", "live.nl", "icloud.com", "yahoo.com"];
  return domain && !free.includes(domain) ? domain : null;
}

/** Conversion event key for a status, or null when the status is not a conversion. */
export function conversionEventForStatus(status: string): string | null {
  return CONVERSION_EVENT_FOR_STATUS[status] ?? null;
}

/** Server-side timing-safe-ish secret compare. */
export function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

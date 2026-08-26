/**
 * Server-only quote/platform form handling for the Landing Page Engine.
 *
 * A submission always becomes a lead in the existing SocialCockpit lead model
 * (no second CRM). Idempotency, spam protection and validation happen here;
 * the public client only posts values and its stored attribution.
 */
import { type SubmitPayload } from "./landing-submit-schema";
import { CONVERSION_EVENT_FOR_STATUS } from "./leads-shared";
import { normalizeLead } from "./leads.server";
import { hashIp, recordEvent, resolvePublicPage } from "./landing.server";
import type { FormFieldConfig, LandingFunnel } from "./landing-shared";



const ATTR_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "ttclid",
  "li_fat_id",
] as const;

function str(v: unknown, max = 500): string | null {
  if (v === null || v === undefined) return null;
  const s = Array.isArray(v) ? v.join(", ") : String(v);
  const trimmed = s.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function pickAttribution(attr: Record<string, unknown> | null | undefined) {
  const first = (attr?.["first_touch"] ?? {}) as Record<string, unknown>;
  const last = (attr?.["last_non_direct"] ?? {}) as Record<string, unknown>;
  const out: Record<string, string | null> = {};
  for (const key of ATTR_KEYS) out[key] = str(last[key] ?? first[key], 300);
  return {
    values: out,
    referrer: str(last["referrer"] ?? first["referrer"], 500),
    firstTouch: first,
    firstLandingAt: str(attr?.["first_landing_at"], 40),
    utmId: str(last["utm_id"] ?? first["utm_id"], 200),
  };
}

/** Validates supplied values against the page's own field configuration. */
function validateValues(fields: FormFieldConfig[], values: SubmitPayload["values"]) {
  const missing: string[] = [];
  const clean: Record<string, string | null> = {};
  for (const field of fields) {
    if (field.state === "hidden" || field.state === "disabled") continue;
    const raw = values[field.key];
    const value = field.type === "boolean" ? (raw === true || raw === "true" ? "ja" : raw === false || raw === "false" ? "nee" : null) : str(raw, field.type === "textarea" ? 5000 : 500);
    if (field.state === "required" && !value) missing.push(field.label);
    if (field.type === "email" && value && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value)) {
      missing.push(`${field.label} (ongeldig)`);
      continue;
    }
    clean[field.key] = value;
  }
  return { missing, clean };
}

export async function handleLandingSubmit(payload: SubmitPayload, request?: Request) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const page = await resolvePublicPage({
    funnel: payload.funnel as LandingFunnel,
    slug: payload.slug,
    previewToken: payload.preview_token ?? null,
  });
  if (!page) return { ok: false as const, error: "page_not_available" };

  const { data: pageRow } = await db
    .from("landing_pages")
    .select(
      "workspace_id,industry_id,notify_channel,notify_target,notify_email,notify_test_email,is_test,base_url",
    )
    .eq("id", page.id)
    .single();
  const workspaceId = pageRow?.workspace_id;
  if (!workspaceId) return { ok: false as const, error: "page_not_available" };

  const isTest = payload.is_test === true || pageRow?.is_test === true || page.is_preview;
  const ipHash = await hashIp(
    request?.headers.get("cf-connecting-ip") ??
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null,
  );

  const logRejected = async (reason: string) => {
    await db.from("landing_form_submissions").insert({
      workspace_id: workspaceId,
      landing_page_id: page.id,
      landing_page_version_id: page.version_id,
      variant_key: payload.variant_key || "A",
      session_id: payload.session_id,
      external_event_id: `${payload.submission_id}-${reason}`,
      status: "rejected",
      reject_reason: reason,
      ip_hash: ipHash,
      payload: { reason } as never,
      is_test: isTest,
    });
  };

  // --- spam & bot protection (server-side only, invisible to real users) ---
  if (payload.hp) {
    await logRejected("honeypot");
    return { ok: true as const, deduplicated: false, spam: true, success: page.form };
  }
  if ((payload.elapsed_ms ?? 99999) < 1500) {
    await logRejected("too_fast");
    return { ok: true as const, deduplicated: false, spam: true, success: page.form };
  }
  if (ipHash) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await db
      .from("landing_form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("status", "accepted")
      .gte("created_at", since);
    if ((count ?? 0) >= 5) {
      await logRejected("rate_limited");
      return { ok: false as const, error: "rate_limited" };
    }
  }

  const { missing, clean } = validateValues(page.form.fields, payload.values);
  if (missing.length) return { ok: false as const, error: "invalid_payload", missing };

  // --- idempotency: same submission id (double click / retry) = same lead ---
  const { data: existingSubmission } = await db
    .from("landing_form_submissions")
    .select("id,lead_id")
    .eq("workspace_id", workspaceId)
    .eq("external_event_id", payload.submission_id)
    .maybeSingle();
  if (existingSubmission) {
    return { ok: true as const, deduplicated: true, leadId: existingSubmission.lead_id };
  }

  // --- duplicate detection: same company/email on this page within 30 min ---
  const email = clean["email"];
  if (email) {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: dupe } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("landing_page_id", page.id)
      .eq("email", email)
      .gte("received_at", since)
      .maybeSingle();
    if (dupe) {
      await db.from("landing_form_submissions").insert({
        workspace_id: workspaceId,
        landing_page_id: page.id,
        landing_page_version_id: page.version_id,
        variant_key: payload.variant_key || "A",
        session_id: payload.session_id,
        external_event_id: payload.submission_id,
        lead_id: dupe.id,
        status: "duplicate",
        reject_reason: "recent_duplicate",
        ip_hash: ipHash,
        payload: clean as never,
        is_test: isTest,
      });
      return { ok: true as const, deduplicated: true, leadId: dupe.id };
    }
  }

  const attribution = pickAttribution(payload.attribution ?? null);
  const status = payload.funnel === "quote" ? "quote_request" : "application";
  const leadType = payload.funnel === "quote" ? "offerte" : "cadeauplatform";

  const row = normalizeLead(
    {
      company_name: clean["company_name"] || clean["contact_name"] || "Onbekend bedrijf",
      contact_name: clean["contact_name"],
      email: clean["email"],
      phone: clean["phone"],
      website: clean["website"],
      notes: clean["message"],
      industry_name: page.industry_name,
      landing_page: page.slug,
      landing_page_slug: page.slug,
      landing_page_variant: payload.variant_key || "A",
      referrer: attribution.referrer,
      external_source: "landing_engine",
      external_id: payload.submission_id,
      is_test: isTest,
      ...attribution.values,
      first_touch: attribution.firstTouch as Record<string, unknown>,
      raw: { values: clean, attribution: payload.attribution ?? null } as Record<string, unknown>,
    } as never,
    {
      leadType,
      funnelType: payload.funnel,
      status,
      ingestSource: "landing_engine",
      workspaceId,
      industryId: pageRow?.industry_id ?? null,
      landingPageId: page.id,
    },
  );

  const nowIso = new Date().toISOString();
  const { data: lead, error } = await db
    .from("leads")
    .insert({
      ...row,
      landing_page_version_id: page.version_id,
      landing_page_slug: page.slug,
      first_landing_at: attribution.firstLandingAt ?? nowIso,
      status_history: [{ status, at: nowIso, by: "landing_engine" }] as never,
      quote_details: {
        quantity: clean["quantity"] ?? null,
        requested_delivery_date: clean["delivery_date"] ?? null,
        budget: clean["budget"] ?? null,
        interests: clean["interests"] ?? null,
        personalization: clean["personalization"] ?? null,
        utm_id: attribution.utmId,
        custom: Object.fromEntries(
          Object.entries(clean).filter(
            ([k]) =>
              ![
                "company_name",
                "contact_name",
                "email",
                "phone",
                "website",
                "message",
                "quantity",
                "delivery_date",
                "budget",
                "interests",
                "personalization",
              ].includes(k),
          ),
        ),
      } as never,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[landing] lead insert failed", { message: error.message });
    return { ok: false as const, error: "submit_failed" };
  }

  await db.from("landing_form_submissions").insert({
    workspace_id: workspaceId,
    landing_page_id: page.id,
    landing_page_version_id: page.version_id,
    variant_key: payload.variant_key || "A",
    session_id: payload.session_id,
    external_event_id: payload.submission_id,
    lead_id: lead.id,
    status: "accepted",
    ip_hash: ipHash,
    payload: clean as never,
    is_test: isTest,
  });

  await db.from("lead_activities").insert({
    lead_id: lead.id,
    actor_label: "landing_engine",
    event_type: "lead_received",
    description: `Aanvraag via landingspagina ${page.slug}`,
    meta: {
      landing_page_id: page.id,
      landing_page_version_id: page.version_id,
      variant_key: payload.variant_key || "A",
      is_test: isTest,
    } as never,
  });

  // Prepared for the existing Google Data Manager architecture — never uploaded
  // automatically; approval stays manual in /ads/google/conversions.
  const conversionEvent = CONVERSION_EVENT_FOR_STATUS[status];
  if (conversionEvent) {
    await db.from("lead_conversion_events").insert({
      lead_id: lead.id,
      conversion_event: conversionEvent,
      google_upload_status: "pending",
    });
  }

  await recordEvent({
    pageId: page.id,
    versionId: page.version_id,
    variantKey: payload.variant_key,
    sessionId: payload.session_id,
    eventType: "form_submitted",
    isPreview: page.is_preview,
    attribution: (payload.attribution ?? {}) as Record<string, unknown>,
  });

  await notifyNewLead({
    channel: pageRow?.notify_channel ?? null,
    target: pageRow?.notify_target ?? null,
    page: page.name,
    slug: page.slug,
    company: clean["company_name"],
    leadId: lead.id,
    isTest,
  });

  return { ok: true as const, deduplicated: false, leadId: lead.id };
}

/**
 * Provider-independent notification. Only an explicitly configured webhook
 * (Slack/Teams/Zapier/e-mail relay) is used — no half-working mail setup.
 */
async function notifyNewLead(args: {
  channel: string | null;
  target: string | null;
  page: string;
  slug: string;
  company: string | null;
  leadId: string;
  isTest: boolean;
}) {
  if (!args.channel || !args.target || args.channel === "none") return;
  if (args.channel !== "webhook" || !/^https:\/\//.test(args.target)) return;
  try {
    await fetch(args.target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `Nieuwe ${args.isTest ? "TEST-" : ""}aanvraag via ${args.page} (${args.slug}): ${
          args.company ?? "onbekend bedrijf"
        }`,
        lead_id: args.leadId,
        landing_page: args.slug,
        is_test: args.isTest,
      }),
    });
  } catch (e) {
    console.error("[landing] notify failed", { message: e instanceof Error ? e.message : "unknown" });
  }
}

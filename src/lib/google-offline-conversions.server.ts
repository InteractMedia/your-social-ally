/**
 * Server-only Google Ads offline conversion tracking (V1.3).
 *
 * Responsibilities:
 *  - eligibility evaluation (test leads, click identifier, mapping, value)
 *  - the upload queue (workspace scoped)
 *  - the actual uploadClickConversions API call + retries
 *  - audit logging
 *
 * This module NEVER changes campaigns, budgets, bids, keywords or ads.
 */
import { adsPost, apiMessage, gaql, GoogleAdsApiError } from "./google-ads.server";
import { resolveCustomerId } from "./google-ads-accounts.server";
import { MAX_UPLOAD_ATTEMPTS, type UploadMode, type ValueSource } from "./google-conversions-shared";

export type Actor = { userId: string; email?: string | null };

type MappingRow = {
  id: string;
  internal_event_name: string;
  google_conversion_action_id: string | null;
  google_conversion_action_name: string | null;
  enabled: boolean;
  upload_value: boolean;
  value_source: ValueSource;
  fixed_value: number | null;
  currency: string;
  primary_signal: boolean;
};

type EventRow = {
  id: string;
  lead_id: string;
  conversion_event: string;
  conversion_timestamp: string;
  value: number | null;
  currency: string | null;
  google_upload_status: string | null;
  google_upload_attempts: number | null;
  google_upload_error: string | null;
  google_upload_reason: string | null;
  google_upload_timestamp: string | null;
  google_conversion_action_id: string | null;
  google_conversion_action_name: string | null;
  google_conversion_value: number | null;
  google_conversion_currency: string | null;
  google_request_reference: string | null;
  click_identifier_type: string | null;
  approved_at: string | null;
};

type LeadRow = {
  id: string;
  workspace_id: string;
  company_name: string;
  is_test: boolean;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  revenue: number | null;
  order_value: number | null;
  expected_value: number | null;
  campaign_name: string | null;
  platform: string | null;
};

const LEAD_FIELDS =
  "id,workspace_id,company_name,is_test,gclid,gbraid,wbraid,revenue,order_value,expected_value,campaign_name,platform";
const EVENT_FIELDS =
  "id,lead_id,conversion_event,conversion_timestamp,value,currency,google_upload_status,google_upload_attempts,google_upload_error,google_upload_reason,google_upload_timestamp,google_conversion_action_id,google_conversion_action_name,google_conversion_value,google_conversion_currency,google_request_reference,click_identifier_type,approved_at";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------------------------------------------ mapping */

export async function listMappings(
  supabase: any,
  workspaceId: string,
): Promise<Record<string, MappingRow>> {
  const { data, error } = await supabase
    .from("google_conversion_mappings")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
  const out: Record<string, MappingRow> = {};
  for (const row of (data ?? []) as MappingRow[]) out[row.internal_event_name] = row;
  return out;
}

/** Live conversion actions of the workspace's Google Ads account (never invented). */
export async function fetchConversionActions(ctx: { supabase: any; userId: string }) {
  const cid = await resolveCustomerId(ctx);
  const rows = await gaql(
    cid,
    `SELECT conversion_action.id, conversion_action.name, conversion_action.category,
            conversion_action.type, conversion_action.status
     FROM conversion_action WHERE conversion_action.status = 'ENABLED'`,
  );
  return {
    customerId: cid,
    actions: (rows as any[]).map((r) => {
      const a = r.conversionAction ?? {};
      return {
        id: String(a.id),
        name: a.name as string,
        category: a.category ? String(a.category).replace(/_/g, " ") : null,
        type: a.type ? String(a.type).replace(/_/g, " ") : null,
        /** Only UPLOAD_CLICKS actions can receive offline click conversions. */
        supportsOfflineUpload: a.type === "UPLOAD_CLICKS",
      };
    }),
  };
}

/* -------------------------------------------------------------- eligibility */

export type Eligibility =
  | {
      ok: true;
      clickType: "gclid" | "gbraid" | "wbraid";
      clickId: string;
      actionId: string;
      actionName: string | null;
      value: number | null;
      currency: string;
    }
  | { ok: false; status: "not_eligible" | "disabled"; reason: string };

/** Pure decision function — no side effects, safe to unit test. */
export function evaluateEligibility(
  event: { conversion_event: string; value: number | null },
  lead: LeadRow,
  mapping: MappingRow | undefined,
): Eligibility {
  // 1. Hard test protection — server side, before anything else.
  if (lead.is_test) return { ok: false, status: "not_eligible", reason: "test_event" };

  // 2. Mapping must exist and be enabled.
  if (!mapping) return { ok: false, status: "disabled", reason: "mapping_missing" };
  if (!mapping.enabled) return { ok: false, status: "disabled", reason: "mapping_disabled" };
  if (!mapping.google_conversion_action_id)
    return { ok: false, status: "not_eligible", reason: "conversion_action_missing" };

  // 3. A real click identifier stored on the lead — never invented.
  const clickType = (["gclid", "gbraid", "wbraid"] as const).find((k) => lead[k]);
  if (!clickType) return { ok: false, status: "not_eligible", reason: "missing_click_identifier" };

  // 4. Value according to the configured mode.
  let value: number | null = null;
  const currency = mapping.currency || "EUR";
  if (mapping.upload_value && mapping.value_source === "fixed") {
    if (mapping.fixed_value == null)
      return { ok: false, status: "not_eligible", reason: "missing_value" };
    value = Number(mapping.fixed_value);
  } else if (mapping.upload_value && mapping.value_source === "dynamic") {
    const dynamic = event.value ?? lead.revenue ?? lead.order_value ?? null;
    if (dynamic == null || Number(dynamic) <= 0) {
      if (mapping.fixed_value != null) value = Number(mapping.fixed_value);
      else return { ok: false, status: "not_eligible", reason: "missing_value" };
    } else {
      value = Number(dynamic);
    }
  }

  return {
    ok: true,
    clickType,
    clickId: String(lead[clickType]),
    actionId: mapping.google_conversion_action_id,
    actionName: mapping.google_conversion_action_name,
    value,
    currency,
  };
}

/**
 * Google Ads conversion time: the moment the BUSINESS event happened (not the
 * ad click), formatted as "yyyy-mm-dd hh:mm:ss+00:00" (UTC offset explicit).
 */
export function conversionDateTime(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+00:00`
  );
}

/* --------------------------------------------------------------- the queue */

export type QueueItem = {
  id: string;
  leadId: string;
  company: string;
  event: string;
  occurredAt: string;
  status: string;
  reason: string | null;
  error: string | null;
  actionId: string | null;
  actionName: string | null;
  clickType: string | null;
  clickMasked: string | null;
  value: number | null;
  currency: string | null;
  uploadedAt: string | null;
  attempts: number;
  isTest: boolean;
  campaign: string | null;
  eligible: boolean;
};

const STATUS_GROUPS: Record<string, string[]> = {
  pending: ["pending", "processing"],
  uploaded: ["uploaded"],
  failed: ["failed"],
  skipped: ["not_eligible", "disabled"],
};

/**
 * Workspace-scoped queue. Uses the caller's RLS client so a user can never see
 * conversion events of another workspace.
 */
export async function listQueue(
  supabase: any,
  workspaceId: string,
  tab: keyof typeof STATUS_GROUPS,
  limit = 200,
): Promise<QueueItem[]> {
  const mappings = await listMappings(supabase, workspaceId);

  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select(LEAD_FIELDS)
    .eq("workspace_id", workspaceId);
  if (leadError) throw new Error(leadError.message);
  const leadById = new Map<string, LeadRow>((leads ?? []).map((l: LeadRow) => [l.id, l]));
  if (leadById.size === 0) return [];

  const { data: events, error } = await supabase
    .from("lead_conversion_events")
    .select(EVENT_FIELDS)
    .in("lead_id", [...leadById.keys()])
    .in("google_upload_status", STATUS_GROUPS[tab] ?? STATUS_GROUPS["pending"]!)
    .order("conversion_timestamp", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const { maskClickId } = await import("./google-conversions-shared");

  return ((events ?? []) as EventRow[]).flatMap((e) => {
    const lead = leadById.get(e.lead_id);
    if (!lead) return [];
    const verdict = evaluateEligibility(e, lead, mappings[e.conversion_event]);
    const mapping = mappings[e.conversion_event];
    return [
      {
        id: e.id,
        leadId: lead.id,
        company: lead.company_name,
        event: e.conversion_event,
        occurredAt: e.conversion_timestamp,
        status: e.google_upload_status ?? "pending",
        reason: e.google_upload_reason ?? (verdict.ok ? null : verdict.reason),
        error: e.google_upload_error,
        actionId: e.google_conversion_action_id ?? mapping?.google_conversion_action_id ?? null,
        actionName:
          e.google_conversion_action_name ?? mapping?.google_conversion_action_name ?? null,
        clickType: e.click_identifier_type ?? (verdict.ok ? verdict.clickType : null),
        clickMasked: verdict.ok ? maskClickId(verdict.clickId) : null,
        value: e.google_conversion_value ?? (verdict.ok ? verdict.value : null),
        currency: e.google_conversion_currency ?? (verdict.ok ? verdict.currency : null),
        uploadedAt: e.google_upload_timestamp,
        attempts: e.google_upload_attempts ?? 0,
        isTest: lead.is_test,
        campaign: lead.campaign_name,
        eligible: verdict.ok,
      },
    ];
  });
}

/* ------------------------------------------------------------------ upload */

const RETRY_MINUTES = [5, 15, 45, 120, 360];

function classifyFailure(status: number, body: string): { reason: string; retryable: boolean } {
  if (status === 401 || status === 403) return { reason: "api_auth_error", retryable: false };
  if (status === 429 || status >= 500) return { reason: "api_unavailable", retryable: true };
  if (/CONVERSION_PRECEDES|INVALID_CONVERSION_DATE|EXPIRED_CLICK|TOO_RECENT/i.test(body))
    return { reason: "invalid_conversion_time", retryable: false };
  return { reason: "api_error", retryable: false };
}

async function logUpload(row: Record<string, unknown>) {
  const db = await admin();
  const { error } = await db.from("google_conversion_upload_log").insert(row as never);
  if (error) console.error("[OfflineConv] audit log failed", error.message);
}

export type UploadOutcome = {
  eventId: string;
  status: "uploaded" | "failed" | "not_eligible" | "disabled";
  reason?: string | null;
  message?: string | null;
};

/**
 * Uploads a single conversion event. `dryRun` performs every check and logs the
 * outcome, but never calls the Google Ads API (used by automated tests).
 */
export async function uploadConversionEvent(args: {
  ctx: { supabase: any; userId: string };
  workspaceId: string;
  eventId: string;
  actor: Actor;
  mode: UploadMode;
  dryRun?: boolean;
}): Promise<UploadOutcome> {
  const db = await admin();
  const { eventId, workspaceId, actor, mode } = args;

  const { data: event, error: eventError } = await db
    .from("lead_conversion_events")
    .select(EVENT_FIELDS)
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) return { eventId, status: "failed", reason: "event_not_found" };
  const e = event as unknown as EventRow;

  // Idempotency: an uploaded event is never uploaded again.
  if (e.google_upload_status === "uploaded") {
    return { eventId, status: "uploaded", reason: "already_uploaded" };
  }

  const { data: lead } = await db
    .from("leads")
    .select(LEAD_FIELDS)
    .eq("id", e.lead_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!lead) return { eventId, status: "failed", reason: "lead_not_in_workspace" };
  const l = lead as unknown as LeadRow;

  const mappings = await listMappings(db, workspaceId);
  const verdict = evaluateEligibility(e, l, mappings[e.conversion_event]);

  if (!verdict.ok) {
    await db
      .from("lead_conversion_events")
      .update({
        google_upload_status: verdict.status,
        google_upload_reason: verdict.reason,
        google_upload_error: null,
      } as never)
      .eq("id", eventId);
    await logUpload({
      workspace_id: workspaceId,
      lead_id: l.id,
      conversion_event_id: eventId,
      internal_event_name: e.conversion_event,
      mode,
      result: verdict.status,
      error_code: verdict.reason,
      approved_by: actor.userId,
      approved_by_email: actor.email ?? null,
    });
    return { eventId, status: verdict.status, reason: verdict.reason };
  }

  const conversionTime = conversionDateTime(e.conversion_timestamp);
  if (!conversionTime) {
    await db
      .from("lead_conversion_events")
      .update({
        google_upload_status: "not_eligible",
        google_upload_reason: "invalid_conversion_time",
      } as never)
      .eq("id", eventId);
    return { eventId, status: "not_eligible", reason: "invalid_conversion_time" };
  }

  const attempts = (e.google_upload_attempts ?? 0) + 1;
  await db
    .from("lead_conversion_events")
    .update({
      google_upload_status: "processing",
      google_upload_attempts: attempts,
      click_identifier_type: verdict.clickType,
      google_conversion_action_id: verdict.actionId,
      google_conversion_action_name: verdict.actionName,
      google_conversion_value: verdict.value,
      google_conversion_currency: verdict.value == null ? null : verdict.currency,
      approved_by: actor.userId,
      approved_at: new Date().toISOString(),
    } as never)
    .eq("id", eventId);

  let cid: string;
  try {
    cid = await resolveCustomerId(args.ctx);
  } catch {
    await db
      .from("lead_conversion_events")
      .update({
        google_upload_status: "not_eligible",
        google_upload_reason: "no_google_account",
      } as never)
      .eq("id", eventId);
    return { eventId, status: "not_eligible", reason: "no_google_account" };
  }

  const conversion: Record<string, unknown> = {
    conversionAction: `customers/${cid}/conversionActions/${verdict.actionId}`,
    conversionDateTime: conversionTime,
  };
  conversion[verdict.clickType] = verdict.clickId;
  if (verdict.value != null) {
    conversion["conversionValue"] = verdict.value;
    conversion["currencyCode"] = verdict.currency;
  }

  if (args.dryRun) {
    await db
      .from("lead_conversion_events")
      .update({
        google_upload_status: "pending",
        google_upload_reason: "dry_run",
      } as never)
      .eq("id", eventId);
    await logUpload({
      workspace_id: workspaceId,
      lead_id: l.id,
      conversion_event_id: eventId,
      internal_event_name: e.conversion_event,
      google_conversion_action_id: verdict.actionId,
      google_conversion_action_name: verdict.actionName,
      customer_id: cid,
      click_identifier_type: verdict.clickType,
      value: verdict.value,
      currency: verdict.value == null ? null : verdict.currency,
      conversion_time: conversionTime,
      mode,
      result: "dry_run",
      approved_by: actor.userId,
      approved_by_email: actor.email ?? null,
    });
    return { eventId, status: "not_eligible", reason: "dry_run" };
  }

  let res: Awaited<ReturnType<typeof adsPost>>;
  try {
    res = await adsPost(`customers/${cid}:uploadClickConversions`, {
      conversions: [conversion],
      partialFailure: true,
      validateOnly: false,
    });
  } catch (err) {
    const retryable = (err as GoogleAdsApiError).status !== 412;
    await failEvent(eventId, attempts, "api_unavailable", (err as Error).message, retryable);
    return { eventId, status: "failed", reason: "api_unavailable", message: (err as Error).message };
  }

  const partialFailure = res.json?.partialFailureError ?? null;
  if (!res.ok || partialFailure) {
    const body = partialFailure ? JSON.stringify(partialFailure) : res.raw;
    const { reason, retryable } = classifyFailure(res.ok ? 400 : res.status, body);
    const message = res.ok
      ? (partialFailure?.message ?? "partial failure")
      : apiMessage(res.raw, res.status);
    await failEvent(eventId, attempts, reason, message, retryable);
    await logUpload({
      workspace_id: workspaceId,
      lead_id: l.id,
      conversion_event_id: eventId,
      internal_event_name: e.conversion_event,
      google_conversion_action_id: verdict.actionId,
      google_conversion_action_name: verdict.actionName,
      customer_id: cid,
      click_identifier_type: verdict.clickType,
      value: verdict.value,
      currency: verdict.value == null ? null : verdict.currency,
      conversion_time: conversionTime,
      mode,
      result: "failed",
      error_code: reason,
      error_message: message.slice(0, 1000),
      api_response: (partialFailure ?? null) as never,
      approved_by: actor.userId,
      approved_by_email: actor.email ?? null,
    });
    return { eventId, status: "failed", reason, message };
  }

  const reference = res.json?.results?.[0]?.gclid
    ? `${res.json.results[0].conversionAction ?? ""}`
    : (res.json?.results?.[0]?.conversionAction ?? null);

  await db
    .from("lead_conversion_events")
    .update({
      google_upload_status: "uploaded",
      uploaded_to_google: true,
      google_upload_timestamp: new Date().toISOString(),
      google_upload_error: null,
      google_upload_reason: null,
      google_next_retry_at: null,
      google_request_reference: reference,
    } as never)
    .eq("id", eventId);

  await logUpload({
    workspace_id: workspaceId,
    lead_id: l.id,
    conversion_event_id: eventId,
    internal_event_name: e.conversion_event,
    google_conversion_action_id: verdict.actionId,
    google_conversion_action_name: verdict.actionName,
    customer_id: cid,
    click_identifier_type: verdict.clickType,
    value: verdict.value,
    currency: verdict.value == null ? null : verdict.currency,
    conversion_time: conversionTime,
    mode,
    result: "uploaded",
    api_response: (res.json ?? null) as never,
    approved_by: actor.userId,
    approved_by_email: actor.email ?? null,
  });

  return { eventId, status: "uploaded" };
}

async function failEvent(
  eventId: string,
  attempts: number,
  reason: string,
  message: string,
  retryable: boolean,
) {
  const db = await admin();
  const canRetry = retryable && attempts < MAX_UPLOAD_ATTEMPTS;
  const backoff = RETRY_MINUTES[Math.min(attempts - 1, RETRY_MINUTES.length - 1)]!;
  await db
    .from("lead_conversion_events")
    .update({
      google_upload_status: canRetry ? "pending" : "failed",
      google_upload_reason: reason,
      google_upload_error: message.slice(0, 2000),
      google_next_retry_at: canRetry
        ? new Date(Date.now() + backoff * 60_000).toISOString()
        : null,
    } as never)
    .eq("id", eventId);
}

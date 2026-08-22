/**
 * Server-only helpers for externally driven lead updates (e.g. the ZoetBezorgen
 * cadeauplatform app). All access is scoped by the workspace that the ingest
 * credential belongs to; attribution is never overwritten with empty values.
 */
import { z } from "zod";

import {
  CONVERSION_EVENT_FOR_STATUS,
  CUSTOMER_STATUSES,
  PLATFORM_STATUSES,
  STATUS_LABELS,
} from "./leads-shared";
import { resolveIngestWorkspace } from "./workspaces.server";

const ATTRIBUTION_KEYS = [
  "source",
  "medium",
  "platform",
  "campaign_id",
  "campaign_name",
  "ad_group_id",
  "ad_group_name",
  "ad_id",
  "ad_name",
  "keyword",
  "search_term",
  "match_type",
  "landing_page",
  "landing_page_variant",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "li_fat_id",
  "ttclid",
  "fbclid",
] as const;

const attributionUpdate = z
  .object(
    Object.fromEntries(
      ATTRIBUTION_KEYS.map((k) => [k, z.string().min(1).max(500).optional()]),
    ) as Record<(typeof ATTRIBUTION_KEYS)[number], z.ZodOptional<z.ZodString>>,
  )
  .partial();

export const statusUpdateSchema = z
  .object({
    external_source: z.string().min(1).max(100).optional(),
    external_id: z.string().min(1).max(200).optional(),
    lead_id: z.string().uuid().optional(),
    status: z.enum(PLATFORM_STATUSES),
    external_event_id: z.string().min(1).max(200).optional(),
    occurred_at: z.string().optional(),
    /** Optional customer value for first_order / active_customer events. */
    order_id: z.string().max(200).optional(),
    order_value: z.number().nonnegative().optional(),
    revenue: z.number().nonnegative().optional(),
    order_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** Only explicitly supplied, non-empty values may change attribution. */
    attribution: attributionUpdate.optional(),
    notes: z.string().max(5000).optional(),
    /** Admin correction: allows a backwards status move. */
    allow_status_correction: z.boolean().optional(),
  })
  .refine((v) => v.lead_id || (v.external_source && v.external_id), {
    message: "lead_id or external_source + external_id is required",
  });

export type StatusUpdatePayload = z.infer<typeof statusUpdateSchema>;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function readIngestToken(request: Request): string | null {
  const token =
    request.headers.get("x-lead-ingest-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return token || null;
}

/** Keeps only non-empty values so existing data is never wiped. */
export function nonEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Records an external event id once. Returns false when this exact event was
 * already processed (retry) so callers can skip side effects.
 */
export async function claimExternalEvent(args: {
  workspaceId: string;
  externalSource: string;
  externalEventId: string;
  eventType: string;
  leadId?: string | null;
  status?: string | null;
  payload?: unknown;
}): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("lead_external_events").insert({
    workspace_id: args.workspaceId,
    external_source: args.externalSource,
    external_event_id: args.externalEventId,
    event_type: args.eventType,
    lead_id: args.leadId ?? null,
    status: args.status ?? null,
    payload: (args.payload ?? null) as never,
  });
  if (error) {
    // 23505 = unique violation → already processed.
    if ((error as { code?: string }).code === "23505") return false;
    throw new Error(error.message);
  }
  return true;
}

const ORDER = PLATFORM_STATUSES as readonly string[];

/** Validates a platform funnel status transition. */
export function validateTransition(
  current: string,
  next: string,
  allowCorrection: boolean,
): { ok: true } | { ok: false; reason: string } {
  const from = ORDER.indexOf(current);
  const to = ORDER.indexOf(next);
  if (to < 0) return { ok: false, reason: "unknown_status" };
  if (from < 0) return { ok: false, reason: "lead_not_in_platform_funnel" };
  if (to < from && !allowCorrection) return { ok: false, reason: "backwards_transition" };
  return { ok: true };
}

/**
 * Secured status update for an existing lead, driven by the external app.
 * The workspace comes from the ingest credential — never from the payload.
 */
export async function handleLeadStatusUpdate(request: Request, ingestSource: string) {
  const token = readIngestToken(request);
  if (!token) return json({ error: "unauthorized" }, 401);

  let workspaceId: string;
  try {
    const resolved = await resolveIngestWorkspace(token);
    if (!resolved) return json({ error: "unauthorized" }, 401);
    workspaceId = resolved.workspaceId;
  } catch (e) {
    console.error("[lead-status] credential resolve failed", {
      message: e instanceof Error ? e.message : "unknown error",
    });
    return json({ error: "unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid_payload", issues: parsed.error.issues.map((i) => i.path.join(".")) },
      422,
    );
  }
  const p = parsed.data;
  const externalSource = p.external_source ?? ingestSource;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Workspace isolation: the lookup is always constrained to the token's workspace.
    let query = supabaseAdmin
      .from("leads")
      .select(
        "id,status,funnel_type,workspace_id,external_source,external_id,external_order_id,revenue,order_value,first_order_date",
      )
      .eq("workspace_id", workspaceId);
    query = p.lead_id
      ? query.eq("id", p.lead_id)
      : query.eq("external_source", externalSource).eq("external_id", p.external_id!);
    const { data: lead, error: leadError } = await query.maybeSingle();
    if (leadError) throw new Error(leadError.message);
    if (!lead) return json({ error: "lead_not_found" }, 404);

    if (lead.funnel_type !== "platform") {
      return json({ error: "lead_not_in_platform_funnel" }, 409);
    }
    const transition = validateTransition(
      lead.status,
      p.status,
      p.allow_status_correction === true,
    );
    if (!transition.ok) {
      return json({ error: transition.reason, current_status: lead.status }, 409);
    }

    // Idempotency: the same external event id is processed exactly once.
    if (p.external_event_id) {
      const fresh = await claimExternalEvent({
        workspaceId,
        externalSource,
        externalEventId: p.external_event_id,
        eventType: "status_update",
        leadId: lead.id,
        status: p.status,
        payload: p,
      });
      if (!fresh) {
        return json({ ok: true, id: lead.id, status: lead.status, deduplicated: true }, 200);
      }
    }

    const occurredAt = p.occurred_at ?? new Date().toISOString();
    const statusChanged = lead.status !== p.status;

    const update: Record<string, unknown> = {
      ...nonEmpty((p.attribution ?? {}) as Record<string, unknown>),
      status: p.status,
    };
    if (p.notes) update["notes"] = p.notes;
    if (CUSTOMER_STATUSES.includes(p.status)) update["became_customer"] = true;

    // Customer value: only booked once per external order id.
    const duplicateOrder = Boolean(
      p.order_id && lead.external_order_id && p.order_id === lead.external_order_id,
    );
    if (!duplicateOrder) {
      if (p.order_id) update["external_order_id"] = p.order_id;
      if (typeof p.order_value === "number") update["order_value"] = p.order_value;
      if (typeof p.revenue === "number") update["revenue"] = p.revenue;
      if (p.order_date) {
        update["order_date_tmp"] = undefined;
        update["first_order_date"] = p.order_date;
        update["customer_date"] = p.order_date;
      }
    }
    delete update["order_date_tmp"];

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update(update as never)
      .eq("id", lead.id)
      .eq("workspace_id", workspaceId);
    if (updateError) throw new Error(updateError.message);

    if (statusChanged) {
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: lead.id,
        actor_label: externalSource,
        event_type: "status_changed",
        description: `Status gewijzigd naar ${STATUS_LABELS[p.status] ?? p.status} via ${externalSource}`,
        meta: {
          source: externalSource,
          from: lead.status,
          to: p.status,
          occurred_at: occurredAt,
          external_event_id: p.external_event_id ?? null,
        } as never,
      });
    }

    const conversionEvent = statusChanged ? CONVERSION_EVENT_FOR_STATUS[p.status] : null;
    if (conversionEvent) {
      const { data: existing } = await supabaseAdmin
        .from("lead_conversion_events")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("conversion_event", conversionEvent)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("lead_conversion_events").insert({
          lead_id: lead.id,
          conversion_event: conversionEvent,
          conversion_timestamp: occurredAt,
          value: duplicateOrder ? null : (p.revenue ?? p.order_value ?? null),
        });
      }
    }

    return json({ ok: true, id: lead.id, status: p.status, deduplicated: false }, 200);
  } catch (e) {
    console.error("[lead-status] failed", {
      message: e instanceof Error ? e.message : "unknown error",
    });
    return json({ error: "status_update_failed" }, 500);
  }
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { requireUserWorkspace } from "./workspaces.server";

const mappingInput = z.object({
  internal_event_name: z.string().min(2).max(100),
  google_conversion_action_id: z.string().max(50).nullable().optional(),
  google_conversion_action_name: z.string().max(300).nullable().optional(),
  enabled: z.boolean(),
  value_source: z.enum(["none", "fixed", "dynamic"]),
  fixed_value: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).default("EUR"),
  primary_signal: z.boolean().optional(),
});

const idsInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

async function workspaceOf(context: any) {
  return requireUserWorkspace(
    context.supabase,
    context.userId,
    (context.claims as { email?: string } | undefined)?.email ?? null,
  );
}

/** Mapping configuration + the live conversion actions of the linked account. */
export const getOfflineConversionConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { listMappings, fetchConversionActions } = await import(
      "./google-offline-conversions.server"
    );

    const [mappings, wsRes] = await Promise.all([
      listMappings(ctx.supabase, workspaceId),
      ctx.supabase
        .from("workspaces")
        .select("offline_conversion_mode, offline_conversion_currency, name")
        .eq("id", workspaceId)
        .maybeSingle(),
    ]);

    let actions: any[] = [];
    let customerId: string | null = null;
    let error: string | null = null;
    try {
      const live = await fetchConversionActions(ctx);
      actions = live.actions;
      customerId = live.customerId;
    } catch (err) {
      error = (err as Error).message;
      console.error("[OfflineConv] conversion actions failed", error);
    }

    return {
      workspaceId,
      mode: (wsRes.data?.offline_conversion_mode ?? "manual") as "manual" | "automatic",
      currency: wsRes.data?.offline_conversion_currency ?? "EUR",
      mappings: Object.values(mappings),
      actions,
      customerId,
      error,
    };
  });

/** Creates or updates one mapping row (workspace scoped through RLS). */
export const saveOfflineMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mappingInput.parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { error } = await ctx.supabase.from("google_conversion_mappings").upsert(
      {
        workspace_id: workspaceId,
        internal_event_name: data.internal_event_name,
        google_conversion_action_id: data.google_conversion_action_id || null,
        google_conversion_action_name: data.google_conversion_action_name || null,
        enabled: data.enabled,
        upload_value: data.value_source !== "none",
        value_source: data.value_source,
        fixed_value: data.value_source === "none" ? null : (data.fixed_value ?? null),
        currency: data.currency,
        primary_signal: data.primary_signal ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,internal_event_name" },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

/** Manual approval vs automatic upload. */
export const setOfflineUploadMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: z.enum(["manual", "automatic"]) }).parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { error } = await ctx.supabase
      .from("workspaces")
      .update({ offline_conversion_mode: data.mode })
      .eq("id", workspaceId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

/** Queue tab: pending / submitted / uploaded / failed / skipped. */
export const getOfflineConversionQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ tab: z.enum(["pending", "submitted", "uploaded", "failed", "skipped"]) })
      .parse(d),
  )

  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { listQueue, fetchConversionActions } = await import(
      "./google-offline-conversions.server"
    );
    // Preflight: the queue judges every event against the LIVE conversion actions.
    let liveActions: any[] | null = null;
    let actionsError: string | null = null;
    try {
      liveActions = (await fetchConversionActions(ctx)).actions;
    } catch (err) {
      actionsError = (err as Error).message;
    }
    try {
      const items = await listQueue(ctx.supabase, workspaceId, data.tab, 200, liveActions);
      return { ok: true as const, items, error: null as string | null, actionsError };
    } catch (err) {
      console.error("[OfflineConv] queue failed", (err as Error).message);
      return { ok: false as const, items: [], error: (err as Error).message, actionsError };
    }
  });


/** Counters for the Google Ads dashboard block. */
export const getOfflineConversionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { listQueue } = await import("./google-offline-conversions.server");
    try {
      const [pending, submitted, uploaded, failed] = await Promise.all([
        listQueue(ctx.supabase, workspaceId, "pending"),
        listQueue(ctx.supabase, workspaceId, "submitted"),
        listQueue(ctx.supabase, workspaceId, "uploaded"),
        listQueue(ctx.supabase, workspaceId, "failed"),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      return {
        ok: true as const,
        pending: pending.length,
        submitted: submitted.length,
        uploadedToday: uploaded.filter((i) => (i.uploadedAt ?? "").slice(0, 10) === today).length,
        failed: failed.length,
        error: null as string | null,
      };
    } catch (err) {
      return {
        ok: false as const,
        pending: 0,
        submitted: 0,
        uploadedToday: 0,
        failed: 0,
        error: (err as Error).message,
      };
    }
  });

/**
 * Asks Google what happened to the events it accepted earlier. Only a SUCCESS
 * status marks a conversion as really uploaded.
 */
export const refreshOfflineConversionStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { refreshSubmittedStatuses } = await import("./google-offline-conversions.server");
    try {
      const result = await refreshSubmittedStatuses(workspaceId);
      return { ok: true as const, ...result, error: null as string | null };
    } catch (err) {
      return {
        ok: false as const,
        checked: 0,
        confirmed: 0,
        failed: 0,
        pendingStill: 0,
        error: (err as Error).message,
      };
    }
  });

/**
 * Explicit user approval → the ONLY path that sends conversions to Google.
 * The frontend never talks to Google directly.

 * from the UI. The frontend never talks to Google directly.
 */
export const approveOfflineConversions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idsInput.parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { uploadConversionEvent } = await import("./google-offline-conversions.server");
    const email = (ctx.claims as { email?: string } | undefined)?.email ?? null;

    const results = [];
    for (const id of data.ids) {
      try {
        results.push(
          await uploadConversionEvent({
            ctx,
            workspaceId,
            eventId: id,
            actor: { userId: ctx.userId, email },
            mode: "manual",
          }),
        );
      } catch (err) {
        console.error("[OfflineConv] upload crashed", (err as Error).message);
        results.push({
          eventId: id,
          status: "failed" as const,
          reason: "api_error",
          message: (err as Error).message,
        });
      }
    }
    return {
      ok: true as const,
      submitted: results.filter((r) => r.status === "submitted").length,
      uploaded: results.filter((r) => r.status === "uploaded").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter(
        (r) => !["uploaded", "submitted", "failed"].includes(r.status),
      ).length,
      results,
    };

  });

/** Skip: never uploaded, kept for the audit trail. */
export const skipOfflineConversions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idsInput.parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { data: leads } = await ctx.supabase
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (leadIds.length === 0) return { ok: true as const, skipped: 0 };

    const { data: updated, error } = await ctx.supabase
      .from("lead_conversion_events")
      .update({
        google_upload_status: "not_eligible",
        google_upload_reason: "skipped_by_user",
        approved_by: ctx.userId,
        approved_at: new Date().toISOString(),
      })
      .in("id", data.ids)
      .in("lead_id", leadIds)
      // An event Google already accepted can never be skipped afterwards.
      .not("google_upload_status", "in", "(uploaded,submitted,processing)")

      .select("id");
    if (error) return { ok: false as const, skipped: 0, error: error.message };
    return { ok: true as const, skipped: updated?.length ?? 0 };
  });

/** Per-lead overview for /leads/:id. */
export const getLeadOfflineConversions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const { data: events, error } = await ctx.supabase
      .from("lead_conversion_events")
      .select(
        "id,conversion_event,conversion_timestamp,google_upload_status,google_upload_reason,google_upload_timestamp,google_conversion_action_name,google_conversion_value,google_conversion_currency,click_identifier_type,google_upload_error,google_request_id,google_transaction_id,google_processing_status,google_processing_checked_at,google_upload_method",
      )
      .eq("lead_id", data.leadId)
      .order("conversion_timestamp", { ascending: true });
    if (error) return { ok: false as const, events: [], leadClickType: null, error: error.message };
    // Voor nog niet geüploade events is click_identifier_type leeg; toon dan het
    // click-ID dat op de lead staat (prioriteit gclid → gbraid → wbraid).
    const { data: lead } = await ctx.supabase
      .from("leads")
      .select("gclid,gbraid,wbraid")
      .eq("id", data.leadId)
      .maybeSingle();
    const leadClickType =
      (["gclid", "gbraid", "wbraid"] as const).find((k) => lead?.[k]) ?? null;
    return { ok: true as const, events: events ?? [], leadClickType, error: null as string | null };
  });


/** Audit trail of upload decisions (newest first). */
export const getOfflineUploadLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { data, error } = await ctx.supabase
      .from("google_conversion_upload_log")
      .select(
        "id,created_at,internal_event_name,google_conversion_action_name,click_identifier_type,value,currency,result,error_code,error_message,mode,approved_by_email,lead_id,upload_method,google_request_id,google_transaction_id,processing_status",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { ok: false as const, entries: [], error: error.message };
    return { ok: true as const, entries: data ?? [], error: null as string | null };
  });

/**
 * Validate-only check against Google Ads with a synthetic conversion.
 * validateOnly is always true here — this can never record a conversion.
 */
export const runOfflineValidateOnly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        actionId: z.string().regex(/^[0-9]+$/),
        withValue: z.boolean().default(false),
        currency: z.string().length(3).default("EUR"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    await workspaceOf(ctx);
    const { validateOnlyCheck } = await import("./google-offline-conversions.server");
    try {
      const result = await validateOnlyCheck({
        ctx,
        actionId: data.actionId,
        withValue: data.withValue,
        currency: data.currency,
      });
      return { ok: true as const, result, error: null as string | null };
    } catch (err) {
      return { ok: false as const, result: null, error: (err as Error).message };
    }
  });

/**
 * Offerte Conversion Architecture V1 — read-only rapport.
 * Vergelijkt de gewenste generieke offerte-structuur met de mappings in
 * SocialCockpit en de live conversieacties in Google Ads. Schrijft NIETS
 * naar Google en verschuift nooit automatisch het biedmodel.
 */
export const getQuoteConversionArchitecture = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const workspaceId = await workspaceOf(ctx);
    const { fetchConversionActions } = await import("./google-offline-conversions.server");
    const { QUOTE_EVENT_BLUEPRINTS, adviseBidShift, INITIAL_PRIMARY_BID_EVENT } = await import(
      "./quote-conversion-architecture"
    );

    const [{ data: mappings }, { data: ws }] = await Promise.all([
      ctx.supabase
        .from("google_conversion_mappings")
        .select(
          "internal_event_name,google_conversion_action_id,google_conversion_action_name,enabled,value_source,fixed_value,currency,primary_signal",
        )
        .eq("workspace_id", workspaceId),
      ctx.supabase
        .from("workspaces")
        .select("offline_conversion_mode")
        .eq("id", workspaceId)
        .maybeSingle(),
    ]);

    let actions: any[] = [];
    let actionsError: string | null = null;
    try {
      actions = (await fetchConversionActions(ctx)).actions;
    } catch (err) {
      actionsError = (err as Error).message;
    }

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: leadIds } = await ctx.supabase
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_test", false);
    const ids = (leadIds ?? []).map((l: { id: string }) => l.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: events } = await ctx.supabase
        .from("lead_conversion_events")
        .select("conversion_event,google_upload_status,conversion_timestamp")
        .in("lead_id", ids)
        .gte("conversion_timestamp", since);
      counts = (events ?? []).reduce((acc: Record<string, number>, e: any) => {
        if (e.google_upload_status !== "uploaded") return acc;
        acc[e.conversion_event] = (acc[e.conversion_event] ?? 0) + 1;
        return acc;
      }, {});
    }

    const events = QUOTE_EVENT_BLUEPRINTS.map((b) => {
      const mapping = (mappings ?? []).find((m: any) => m.internal_event_name === b.key) ?? null;
      const live =
        actions.find((a) => a.name === b.googleActionName) ??
        (mapping?.google_conversion_action_id
          ? actions.find((a) => a.id === String(mapping.google_conversion_action_id))
          : undefined) ??
        null;
      return {
        key: b.key,
        label: b.label,
        description: b.description,
        googleActionName: b.googleActionName,
        createCategory: b.createCategory,
        countingType: b.countingType,
        valueSource: b.valueSource,
        initialBidding: b.initialBidding,
        mapping,
        existsInGoogle: Boolean(live),
        liveAction: live,
        supportsOfflineUpload: live?.supportsOfflineUpload ?? false,
        uploadedLast30Days: counts[b.key] ?? 0,
        blockers: [
          !live ? "google_action_missing" : null,
          live && !live.supportsOfflineUpload ? "conversion_action_wrong_type" : null,
          !mapping ? "mapping_missing" : mapping.enabled ? null : "mapping_disabled",
        ].filter(Boolean) as string[],
      };
    });

    const advice = adviseBidShift({
      currentPrimary: INITIAL_PRIMARY_BID_EVENT,
      uploadedRequests: counts["quote_request"] ?? 0,
      uploadedQualified: counts["quote_qualified"] ?? 0,
      uploadedWon: counts["quote_won"] ?? 0,
    });

    return {
      ok: true as const,
      uploadMode: (ws?.offline_conversion_mode ?? "manual") as "manual" | "automatic",
      primaryBidEvent: INITIAL_PRIMARY_BID_EVENT,
      events,
      advice,
      legacyQuoteActions: actions
        .filter((a) => /offerte/i.test(a.name ?? ""))
        .map((a) => ({ id: a.id, name: a.name, type: a.type, category: a.category })),
      actionsError,
    };
  });

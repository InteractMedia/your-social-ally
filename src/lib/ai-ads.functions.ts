import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const settingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["anthropic", "lovable"]),
  model: z.string().min(2).max(80),
  defaultPeriodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  minConfidence: z.number().int().min(0).max(100),
  budgetChangeMaxPct: z.number().int().min(1).max(50),
});

/** AI settings + which providers the server can actually use. */
export const getAiAdsSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { providerAvailability } = await import("./ai-provider.server");
    const { DEFAULT_AI_SETTINGS } = await import("./ai-analyst-shared");

    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const { data } = await ctx.supabase
      .from("ai_analysis_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const settings = data
      ? {
          enabled: data.enabled,
          provider: data.provider as "anthropic" | "lovable",
          model: data.model,
          defaultPeriodDays: data.default_period_days,
          minConfidence: data.min_confidence,
          budgetChangeMaxPct: data.budget_change_max_pct,
          autoExecute: false as const,
        }
      : DEFAULT_AI_SETTINGS;

    return { settings, availability: providerAvailability(), workspaceId };
  });

export const updateAiAdsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => settingsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const { error } = await ctx.supabase.from("ai_analysis_settings").upsert(
      {
        workspace_id: workspaceId,
        enabled: data.enabled,
        provider: data.provider,
        model: data.model,
        default_period_days: data.defaultPeriodDays,
        min_confidence: data.minConfidence,
        budget_change_max_pct: data.budgetChangeMaxPct,
        auto_execute: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

/** Runs a full analysis. Never writes anything to Google Ads. */
export const runAiAdsAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        start: dateStr,
        end: dateStr,
        customerId: z.string().optional(),
        isTest: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { runAdsAnalysisForWorkspace } = await import("./ai-ads-analyst.server");

    try {
      const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
      const { data: settings } = await ctx.supabase
        .from("ai_analysis_settings")
        .select("enabled, provider, model, budget_change_max_pct")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (settings && settings.enabled === false) {
        return {
          ok: false as const,
          runId: null,
          adviceCount: 0,
          summary: "",
          fallbackReason: null,
          error: "AI Ads Analyst staat uit in je instellingen.",
        };
      }

      return await runAdsAnalysisForWorkspace({
        ctx,
        workspaceId,
        start: data.start,
        end: data.end,
        customerId: data.customerId ?? null,
        provider: (settings?.provider ?? "anthropic") as "anthropic" | "lovable",
        model: settings?.model ?? "claude-sonnet-4-5",
        budgetMaxPct: settings?.budget_change_max_pct ?? 20,
        isTest: data.isTest,
      });
    } catch (err) {
      const message = (err as Error).message;
      console.error("[AiAnalyst] start failed", message);
      return {
        ok: false as const,
        runId: null,
        adviceCount: 0,
        summary: "",
        fallbackReason: null,
        error: message,
      };
    }
  });

/** Advice inbox: advice list + last runs + counters. */
export const listAiAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z.enum(["new", "approved", "rejected", "expired", "all"]).default("new"),
        includeTest: z.boolean().default(false),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    let query = ctx.supabase
      .from("ai_advice")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("confidence_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);
    if (!data.includeTest) query = query.eq("is_test", false);

    const [{ data: advice, error }, counts, { data: runs }] = await Promise.all([
      query,
      ctx.supabase
        .from("ai_advice")
        .select("status")
        .eq("workspace_id", workspaceId)
        .eq("is_test", false)
        .limit(2000),
      ctx.supabase
        .from("ai_analysis_runs")
        .select(
          "id, status, period_start, period_end, advice_count, model_provider, model_name, estimated_cost_usd, runtime_ms, input_tokens, output_tokens, data_quality, snapshot, error, created_at, completed_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const tally = { new: 0, approved: 0, rejected: 0, expired: 0, total: 0 };
    for (const row of (counts?.data ?? []) as { status: string }[]) {
      tally.total += 1;
      if (row.status in tally) (tally as any)[row.status] += 1;
    }

    return {
      ok: !error,
      error: error?.message ?? null,
      advice: (advice ?? []) as any[],
      runs: (runs ?? []) as any[],
      counts: tally,
    };
  });

/** Approve or reject a single advice. Approval stores intent only (V1.4A). */
export const reviewAiAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        adviceId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        rejectionReason: z.string().max(60).optional(),
        rejectionNotes: z.string().max(1000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    if (data.decision === "rejected" && !data.rejectionReason) {
      return { ok: false as const, error: "Kies een reden bij het afwijzen." };
    }

    const { data: row, error } = await ctx.supabase
      .from("ai_advice")
      .update({
        status: data.decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: ctx.userId,
        rejection_reason: data.decision === "rejected" ? data.rejectionReason : null,
        rejection_notes: data.decision === "rejected" ? (data.rejectionNotes ?? null) : null,
      })
      .eq("id", data.adviceId)
      .eq("workspace_id", workspaceId)
      .eq("status", "new")
      .select("id, advice_type, title, run_id, execution_eligibility, data_confidence_level")
      .maybeSingle();

    if (error) return { ok: false as const, error: error.message };
    if (!row) return { ok: false as const, error: "Advies is al beoordeeld of niet gevonden." };

    await ctx.supabase.from("ai_advice_audit").insert({
      workspace_id: workspaceId,
      advice_id: row.id,
      run_id: row.run_id,
      action: data.decision === "approved" ? "advice_approved" : "advice_rejected",
      actor_id: ctx.userId,
      detail: {
        advice_type: row.advice_type,
        title: row.title,
        rejection_reason: data.rejectionReason ?? null,
        rejection_notes: data.rejectionNotes ?? null,
        execution_eligibility: row.execution_eligibility ?? null,
        data_confidence_level: row.data_confidence_level ?? null,
        note:
          row.execution_eligibility === "ALLOWED"
            ? "V1.4A: goedkeuring legt intentie vast, er wordt niets in Google Ads gewijzigd."
            : "V1.4A: goedkeuring legt intentie vast. Server-side uitvoerbaarheid is niet ALLOWED, dus een latere uitvoerlaag mag dit advies niet uitvoeren.",
      },
    });

    return { ok: true as const, error: null as string | null };
  });

/** Audit trail for one advice (or the workspace when no id is given). */
export const listAiAdviceAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ adviceId: z.string().uuid().optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    let query = ctx.supabase
      .from("ai_advice_audit")
      .select("id, advice_id, run_id, action, detail, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.adviceId) query = query.eq("advice_id", data.adviceId);

    const { data: rows, error } = await query;
    return { ok: !error, error: error?.message ?? null, entries: (rows ?? []) as any[] };
  });

/**
 * Past de deterministische guardrail-engine opnieuw toe op bestaande adviezen,
 * zonder de AI opnieuw aan te roepen en zonder iets in Google Ads te wijzigen.
 */
export const reevaluateAiAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        runId: z.string().uuid().optional(),
        includeTest: z.boolean().default(false),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { buildAdsAnalysisSnapshot } = await import("./ai-ads-dataset.server");
    const { buildDecisionFacts, evaluateExecutionEligibility } = await import(
      "./ai-execution-guardrails"
    );

    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    let query = ctx.supabase
      .from("ai_advice")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.runId) query = query.eq("run_id", data.runId);
    if (!data.includeTest) query = query.eq("is_test", false);

    const { data: rows, error } = await query;
    if (error) return { ok: false as const, error: error.message, results: [] as any[] };

    const factsCache = new Map<string, any>();
    const results: any[] = [];

    for (const row of (rows ?? []) as any[]) {
      const key = `${row.analysis_period_start}|${row.analysis_period_end}`;
      let facts = factsCache.get(key);
      if (!facts) {
        const snapshot = await buildAdsAnalysisSnapshot({
          ctx,
          workspaceId,
          start: row.analysis_period_start,
          end: row.analysis_period_end,
          customerId: null,
        });
        facts = buildDecisionFacts(snapshot);
        factsCache.set(key, facts);
      }

      const decision = evaluateExecutionEligibility(
        {
          adviceType: row.advice_type,
          confidenceScore: row.confidence_score,
          title: row.title,
          summary: row.summary,
          reasoning: row.reasoning,
          proposedAction: row.proposed_action,
          proposedPayload: row.proposed_payload,
          evidence: row.evidence,
          dataMissing: row.data_missing,
        },
        facts,
      );

      await ctx.supabase
        .from("ai_advice")
        .update({
          data_confidence_score: decision.dataConfidenceScore,
          data_confidence_level: decision.dataConfidenceLevel,
          execution_eligibility: decision.executionEligibility,
          execution_block_reason: decision.reasonCode,
          execution_block_reason_label: decision.reasonLabel,
          execution_blockers: decision.blockers,
          guardrail_version: decision.guardrailVersion,
          decision_facts: facts,
          guardrail_evaluated_at: new Date().toISOString(),
          actionable: row.actionable && decision.executionEligibility !== "BLOCKED",
        })
        .eq("id", row.id)
        .eq("workspace_id", workspaceId);

      results.push({
        id: row.id,
        adviceType: row.advice_type,
        title: row.title,
        aiConfidence: row.confidence_score,
        dataConfidence: decision.dataConfidenceScore,
        dataConfidenceLevel: decision.dataConfidenceLevel,
        executionEligibility: decision.executionEligibility,
        reasonCode: decision.reasonCode,
        reason: decision.reasonLabel,
        contradiction: decision.contradiction,
        blockers: decision.blockers.map((b: any) => b.code),
      });
    }

    await ctx.supabase.from("ai_advice_audit").insert({
      workspace_id: workspaceId,
      run_id: data.runId ?? null,
      action: "guardrails_reevaluated",
      actor_id: ctx.userId,
      detail: {
        advice_count: results.length,
        note: "Deterministische guardrails opnieuw toegepast zonder nieuwe AI-analyse; 0 wijzigingen in Google Ads.",
        results,
      },
    });

    return { ok: true as const, error: null as string | null, results };
  });

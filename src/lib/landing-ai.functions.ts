import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { LANDING_AI_DEFAULT_MODEL, LANDING_AI_MODES } from "./landing-ai-shared";

const uuid = z.string().uuid();

/** Runs the AI Landing Page Strategist. Never publishes, never touches Google Ads. */
export const runLandingAiStrategist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        mode: z.enum(LANDING_AI_MODES),
        pageId: uuid.optional().nullable(),
        industryId: uuid.optional().nullable(),
        goal: z.string().max(400).optional().nullable(),
        brief: z.string().max(4000).optional().nullable(),
        provider: z.enum(["anthropic", "lovable"]).default("anthropic"),
        model: z.string().min(2).max(80).default(LANDING_AI_DEFAULT_MODEL),
        periodDays: z.union([z.literal(30), z.literal(90), z.literal(180)]).default(90),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { runLandingStrategist } = await import("./landing-ai-strategist.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    try {
      return await runLandingStrategist({
        ctx,
        workspaceId,
        mode: data.mode,
        pageId: data.pageId ?? null,
        industryId: data.industryId ?? null,
        goal: data.goal ?? null,
        brief: data.brief ?? null,
        provider: data.provider,
        model: data.model,
        periodDays: data.periodDays,
      });
    } catch (err) {
      return { ok: false as const, runId: null, error: (err as Error).message.slice(0, 500) };
    }
  });

export const listLandingAiProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ pageId: uuid.optional().nullable() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    let query = ctx.supabase
      .from("landing_ai_proposals")
      .select(
        "id,run_id,landing_page_id,industry_id,mode,title,status,ai_confidence,data_confidence,applied_page_id,applied_at,created_at,missing_data",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.pageId) query = query.eq("landing_page_id", data.pageId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { proposals: rows ?? [] };
  });

export const getLandingAiProposal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const { data: proposal, error } = await ctx.supabase
      .from("landing_ai_proposals")
      .select("*")
      .eq("id", data.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!proposal) return { proposal: null, run: null, experiments: [] };

    const [{ data: run }, { data: experiments }] = await Promise.all([
      ctx.supabase
        .from("landing_ai_runs")
        .select(
          "id,provider,model,prompt_version,status,mode,goal,brief,input_tokens,output_tokens,estimated_cost_usd,runtime_ms,fallback_reason,dataset_meta,created_at,completed_at",
        )
        .eq("id", proposal.run_id)
        .maybeSingle(),
      ctx.supabase
        .from("landing_ai_experiments")
        .select("*")
        .eq("proposal_id", proposal.id)
        .order("created_at", { ascending: true }),
    ]);
    return { proposal, run, experiments: experiments ?? [] };
  });

/** Applies a proposal as a NEW draft page. The source page stays untouched. */
export const applyLandingAiProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        proposalId: uuid,
        name: z.string().min(2).max(120).optional().nullable(),
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .min(2)
          .max(80)
          .optional()
          .nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { applyLandingProposal } = await import("./landing-ai-strategist.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    try {
      const result = await applyLandingProposal({
        ctx,
        workspaceId,
        proposalId: data.proposalId,
        nameOverride: data.name ?? null,
        slugOverride: data.slug ?? null,
      });
      return { ok: true as const, ...result, error: null as string | null };
    } catch (err) {
      return { ok: false as const, pageId: null, error: (err as Error).message.slice(0, 400) };
    }
  });

export const discardLandingAiProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ proposalId: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const { error } = await ctx.supabase
      .from("landing_ai_proposals")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", data.proposalId)
      .eq("workspace_id", workspaceId);
    return { ok: !error, error: error?.message ?? null };
  });

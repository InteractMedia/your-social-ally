/**
 * Server functions for the CRO Intelligence layer (V1.6C):
 *  - managing the external CRO/UX knowledge base;
 *  - reading back the evidence per AI decision ("Waarom deze pagina?");
 *  - inspecting which evidence sources the strategist actually has.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { EVIDENCE_LEVELS } from "./landing-cro-evidence";

const uuid = z.string().uuid();

const evidenceInput = z.object({
  id: uuid.optional(),
  principle: z.string().min(10).max(1000),
  topic: z.string().min(2).max(120),
  applies_to: z.array(z.string().max(60)).max(20).default([]),
  source_name: z.string().max(200).optional().nullable(),
  source_url: z.string().max(500).optional().nullable(),
  published_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  evidence_level: z.enum(EVIDENCE_LEVELS),
  context: z.string().max(2000).optional().nullable(),
  limitations: z.string().max(2000).optional().nullable(),
  recommended_application: z.string().max(2000).optional().nullable(),
  metric: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().max(60)).max(20).default([]),
  active: z.boolean().default(true),
});

export const listCroEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const { data, error } = await ctx.supabase
      .from("cro_evidence")
      .select("*")
      .order("evidence_level", { ascending: true })
      .order("topic", { ascending: true });
    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  });

export const upsertCroEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => evidenceInput.parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const row = {
      workspace_id: workspaceId,
      principle: data.principle,
      topic: data.topic,
      applies_to: data.applies_to,
      source_name: data.source_name ?? null,
      source_url: data.source_url ?? null,
      published_at: data.published_at ?? null,
      evidence_level: data.evidence_level,
      context: data.context ?? null,
      limitations: data.limitations ?? null,
      recommended_application: data.recommended_application ?? null,
      metric: data.metric ?? null,
      tags: data.tags,
      active: data.active,
    };

    if (data.id) {
      const { error } = await ctx.supabase
        .from("cro_evidence")
        .update(row)
        .eq("id", data.id)
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }

    const { data: created, error } = await ctx.supabase
      .from("cro_evidence")
      .insert({ ...row, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: created.id as string };
  });

export const deleteCroEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const { error } = await ctx.supabase
      .from("cro_evidence")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Decisions + experiments behind one proposal — powers "Waarom deze pagina?". */
export const listProposalDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ proposalId: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const { data: rows, error } = await ctx.supabase
      .from("landing_ai_decisions")
      .select("*")
      .eq("proposal_id", data.proposalId)
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { decisions: rows ?? [] };
  });

/**
 * Evidence coverage report: which layers the strategist can actually draw on
 * today and where the gaps are. Read-only; runs no AI.
 */
export const getEvidenceCoverage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ periodDays: z.union([z.literal(30), z.literal(90), z.literal(180)]).default(90) }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { buildOwnPerformanceEvidence } = await import("./landing-performance-evidence.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const end = new Date();
    const start = new Date(end.getTime() - (data.periodDays - 1) * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const evidence = await buildOwnPerformanceEvidence({
      db: ctx.supabase,
      workspaceId,
      start: iso(start),
      end: iso(end),
    });

    const { data: kb } = await ctx.supabase
      .from("cro_evidence")
      .select("id,evidence_level,workspace_id,active");

    const kbRows = ((kb ?? []) as any[]).filter((r) => r.active !== false);
    const byLevel = kbRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.evidence_level] = (acc[r.evidence_level] ?? 0) + 1;
      return acc;
    }, {});

    return {
      period: evidence.period,
      ownData: {
        totals: evidence.totals,
        measurableDimensions: evidence.comparisons.map((c) => ({
          label: c.label,
          entries: c.entries.length,
          decidable_objective: c.decidable_objective,
          decidable_reason: c.decidable_reason,
        })),
        gaps: evidence.dimensionsWithoutData,
        leadsInPeriod: evidence.leadTotalsInPeriod,
        errors: evidence.errors,
      },
      knowledgeBase: {
        total: kbRows.length,
        byLevel,
        workspaceOwned: kbRows.filter((r) => r.workspace_id).length,
        shared: kbRows.filter((r) => !r.workspace_id).length,
      },
    };
  });

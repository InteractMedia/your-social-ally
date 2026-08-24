/**
 * Decision coverage repair (V1.8B): brings an existing proposal to full
 * 15/15 decision coverage and re-validates all evidence refs against the
 * applicability rules. Deterministic — never calls an AI provider.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const repairLandingAiDecisions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ proposalId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { ensureDecisionCoverage } = await import("./landing-decision-coverage.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const result = await ensureDecisionCoverage({
      db: ctx.supabase,
      workspaceId,
      proposalId: data.proposalId,
    });
    return result;
  });

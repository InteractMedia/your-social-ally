/**
 * Google Ads Execution V1 — serverfuncties voor de gecontroleerde aanmaak.
 *
 * Flow: AI_CONCEPT → REVIEWED → APPROVED_FOR_CREATION → CREATE_IN_GOOGLE → CREATED.
 * Alleen de laatste stap schrijft naar Google Ads, en uitsluitend nadat een mens
 * in SocialCockpit expliciet op de aanmaakknop heeft gedrukt.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ id: z.string().uuid() });
const createSchema = z.object({
  id: z.string().uuid(),
  /** Moet exact de campagnenaam zijn: bevestiging dat de mens dit echt wil. */
  confirmCampaignName: z.string().min(1),
});

/** Definitieve samenvatting/diff van wat er in Google Ads wordt aangemaakt. */
export const previewDraftCreation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => idSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { buildCreationPlan } = await import("./campaign-creation.server");
    const { resolveCustomerId } = await import("./google-ads-accounts.server");

    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const { data: row } = await ctx.supabase
      .from("search_campaign_drafts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "Concept niet gevonden.", plan: null };

    let customerId = "";
    let customerName: string | null = null;
    try {
      customerId = await resolveCustomerId(ctx, row.google_customer_id);
      const { data: acc } = await ctx.supabase
        .from("google_ads_accounts")
        .select("descriptive_name")
        .eq("customer_id", customerId)
        .maybeSingle();
      customerName = acc?.descriptive_name ?? null;
    } catch (err) {
      return { ok: false as const, error: (err as Error).message, plan: null };
    }

    const plan = buildCreationPlan({ draft: row as any, customerId, customerName });
    return { ok: true as const, error: null as string | null, plan };
  });

/**
 * Voert het goedgekeurde concept uit in Google Ads. De campagne wordt GEPAUZEERD
 * aangemaakt; activeren blijft een aparte handmatige stap in Google Ads.
 */
export const createDraftInGoogleAds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { buildCreationPlan, createCampaignInGoogle } = await import("./campaign-creation.server");
    const { resolveCustomerId } = await import("./google-ads-accounts.server");

    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const { data: row } = await ctx.supabase
      .from("search_campaign_drafts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "Concept niet gevonden.", campaignId: null };

    const customerId = await resolveCustomerId(ctx, row.google_customer_id);
    const plan = buildCreationPlan({ draft: row as any, customerId });

    if (data.confirmCampaignName.trim() !== plan.campaignName.trim()) {
      return { ok: false as const, error: "Bevestiging komt niet overeen met de campagnenaam.", campaignId: null };
    }
    if (plan.blockers.length > 0) {
      return { ok: false as const, error: `Aanmaak geblokkeerd: ${plan.blockers.join(" ")}`, campaignId: null };
    }

    const now = new Date().toISOString();
    const { data: logRow } = await ctx.supabase
      .from("google_ads_change_log")
      .insert({
        workspace_id: workspaceId,
        source: "campaign_builder",
        draft_id: row.id,
        customer_id: customerId,
        entity_type: "campaign",
        entity_name: plan.campaignName,
        change_type: "CREATE_CAMPAIGN",
        proposal: plan as any,
        data_used: {
          data_confidence: row.data_confidence,
          data_confidence_reasons: row.data_confidence_reasons,
          data_sources: row.data_sources,
        },
        ai_reasoning: (row.proposal as any)?.summary ?? null,
        old_value: null,
        new_value: { campaignName: plan.campaignName, status: "PAUSED", dailyBudget: plan.dailyBudget },
        approved_by: ctx.userId,
        approved_at: now,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    await ctx.supabase
      .from("search_campaign_drafts")
      .update({ status: "CREATE_IN_GOOGLE", creation_plan: plan as any, creation_error: null, creation_started_at: now, approved_by: ctx.userId, updated_at: now })
      .eq("workspace_id", workspaceId)
      .eq("id", row.id);

    try {
      const outcome = await createCampaignInGoogle({ plan, proposal: row.proposal as any });
      const done = new Date().toISOString();

      await ctx.supabase
        .from("search_campaign_drafts")
        .update({
          status: "CREATED",
          google_customer_id: customerId,
          google_campaign_id: outcome.campaignId,
          google_campaign_name: plan.campaignName,
          google_resource_names: outcome.resourceNames,
          creation_result: { steps: outcome.steps },
          creation_error: null,
          created_in_google_at: done,
          updated_at: done,
        })
        .eq("workspace_id", workspaceId)
        .eq("id", row.id);

      if (logRow?.id) {
        await ctx.supabase
          .from("google_ads_change_log")
          .update({
            status: "executed",
            entity_id: outcome.campaignId,
            google_result: { campaignId: outcome.campaignId, steps: outcome.steps },
            executed_at: done,
          })
          .eq("id", logRow.id);
      }

      return {
        ok: true as const,
        error: null as string | null,
        campaignId: outcome.campaignId,
        steps: outcome.steps,
      };
    } catch (err) {
      const message = (err as Error).message;
      const failedAt = new Date().toISOString();
      await ctx.supabase
        .from("search_campaign_drafts")
        .update({ status: "APPROVED_FOR_CREATION", creation_error: message, updated_at: failedAt })
        .eq("workspace_id", workspaceId)
        .eq("id", row.id);
      if (logRow?.id) {
        await ctx.supabase
          .from("google_ads_change_log")
          .update({ status: "failed", google_error: message, executed_at: failedAt })
          .eq("id", logRow.id);
      }
      return { ok: false as const, error: message, campaignId: null };
    }
  });

/** Auditlog van alle Google Ads-schrijfacties uit SocialCockpit. */
export const listGoogleAdsChangeLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ draftId: z.string().uuid().optional(), adviceId: z.string().uuid().optional(), limit: z.number().min(1).max(200).default(50) })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    let query = ctx.supabase
      .from("google_ads_change_log")
      .select(
        "id, source, draft_id, advice_id, customer_id, entity_type, entity_id, entity_name, change_type, ai_reasoning, old_value, new_value, approved_by, approved_at, status, google_result, google_error, executed_at, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.draftId) query = query.eq("draft_id", data.draftId);
    if (data.adviceId) query = query.eq("advice_id", data.adviceId);

    const { data: rows, error } = await query;
    if (error) return { ok: false as const, error: error.message, rows: [] };
    return { ok: true as const, error: null as string | null, rows: rows ?? [] };
  });

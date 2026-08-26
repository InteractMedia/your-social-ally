/**
 * Campaign Builder V1 — serverfuncties.
 *
 * Uitsluitend concepten: geen enkele functie hier schrijft naar Google Ads.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const runSchema = z.object({
  funnel: z.enum(["quote", "platform"]),
  landingPageId: z.string().uuid(),
  industryId: z.string().uuid().nullable().optional(),
  locations: z.array(z.string().min(2).max(80)).min(1).max(10),
  language: z.string().min(2).max(10).default("nl"),
  targetDailyBudget: z.number().min(1).max(10000).nullable().optional(),
});

const saveSchema = z.object({
  id: z.string().uuid(),
  proposal: z.record(z.string(), z.unknown()),
});

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["AI_CONCEPT", "REVIEWED", "APPROVED_FOR_CREATION"]),
});

/** Keuzelijsten voor de builder: funnels, landingspagina's, branches, AI-status. */
export const getBuilderOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { providerAvailability } = await import("./ai-provider.server");
    const { DEFAULT_AI_SETTINGS } = await import("./ai-analyst-shared");

    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const [{ data: pages }, { data: industries }, { data: settings }] = await Promise.all([
      ctx.supabase
        .from("landing_pages")
        .select("id, name, slug, funnel_type, status, industry_id, is_test")
        .eq("workspace_id", workspaceId)
        .eq("active", true)
        .order("updated_at", { ascending: false }),
      ctx.supabase.from("industries").select("id, name").eq("active", true).order("sort_order"),
      ctx.supabase
        .from("ai_analysis_settings")
        .select("provider, model")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
    ]);

    return {
      workspaceId,
      pages: pages ?? [],
      industries: industries ?? [],
      provider: (settings?.provider ?? DEFAULT_AI_SETTINGS.provider) as "anthropic" | "lovable",
      model: settings?.model ?? DEFAULT_AI_SETTINGS.model,
      availability: providerAvailability(),
    };
  });

/** Laat de AI één Search-campagneconcept opstellen. Wijzigt niets in Google Ads. */
export const runSearchConcept = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => runSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const { runSearchConceptForWorkspace } = await import("./campaign-builder.server");
    const { DEFAULT_AI_SETTINGS } = await import("./ai-analyst-shared");

    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);
    const { data: settings } = await ctx.supabase
      .from("ai_analysis_settings")
      .select("provider, model")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    try {
      return await runSearchConceptForWorkspace({
        ctx,
        workspaceId,
        funnel: data.funnel,
        landingPageId: data.landingPageId,
        industryId: data.industryId ?? null,
        locations: data.locations,
        language: data.language,
        targetDailyBudget: data.targetDailyBudget ?? null,
        provider: (settings?.provider ?? DEFAULT_AI_SETTINGS.provider) as "anthropic" | "lovable",
        model: settings?.model ?? DEFAULT_AI_SETTINGS.model,
      });
    } catch (err) {
      return { ok: false as const, draftId: null, error: (err as Error).message };
    }
  });

export const listSearchDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const { data, error } = await ctx.supabase
      .from("search_campaign_drafts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { drafts: [], error: error.message };
    return { drafts: data ?? [], error: null as string | null };
  });

export const getSearchDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const { data: row, error } = await ctx.supabase
      .from("search_campaign_drafts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) return { draft: null, error: error.message };
    return { draft: row ?? null, error: row ? null : "Concept niet gevonden." };
  });

/** Slaat de handmatig bewerkte versie van het concept op. */
export const saveSearchDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => saveSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const { error } = await ctx.supabase
      .from("search_campaign_drafts")
      .update({ proposal: data.proposal, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

/**
 * Zet de reviewstatus. APPROVED_FOR_CREATION betekent uitsluitend "goedgekeurd
 * concept": er wordt in V1 niets in Google Ads aangemaakt.
 */
export const setSearchDraftStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => statusSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const now = new Date().toISOString();
    const { error } = await ctx.supabase
      .from("search_campaign_drafts")
      .update({
        status: data.status,
        reviewed_at: data.status === "AI_CONCEPT" ? null : now,
        approved_at: data.status === "APPROVED_FOR_CREATION" ? now : null,
        updated_at: now,
      })
      .eq("workspace_id", workspaceId)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null, executed: false as const };
  });

export const deleteSearchDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { requireUserWorkspace } = await import("./workspaces.server");
    const workspaceId = await requireUserWorkspace(ctx.supabase, ctx.userId, ctx.claims?.email);

    const { error } = await ctx.supabase
      .from("search_campaign_drafts")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null as string | null };
  });

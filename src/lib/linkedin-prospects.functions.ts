import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSearchUrls } from "./linkedin-search-url";
import { parseProspectLines } from "./linkedin-paste";
import {
  LINKEDIN_LIMITS,
  PROSPECT_STATUSES,
  type IcpProfileRow,
  type ProspectRow,
  type QuotaSummary,
  type SearchUrl,
} from "./linkedin-prospects-shared";
import { requireUserWorkspace } from "./workspaces.server";

const PROFILE_COLUMNS =
  "id,name,industry,company_size,region,occasion,job_titles,keywords,exclusions,ai_company_profile,ai_decision_maker,ai_rationale,search_urls,created_at";
const PROSPECT_COLUMNS =
  "id,profile_id,full_name,headline,company_name,job_title,linkedin_url,status,invite_message,invited_at,responded_at,notes,created_at";

function email(context: { claims?: unknown }) {
  return (context.claims as { email?: string } | undefined)?.email ?? null;
}

/** Doelgroepprofielen + prospects + quota in één keer. */
export const getProspectDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId, email(context));

    const [profilesRes, prospectsRes] = await Promise.all([
      context.supabase
        .from("linkedin_icp_profiles")
        .select(PROFILE_COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("linkedin_prospects")
        .select(PROSPECT_COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (prospectsRes.error) throw new Error(prospectsRes.error.message);

    const prospects = (prospectsRes.data ?? []) as unknown as ProspectRow[];
    return {
      profiles: (profilesRes.data ?? []).map((p) => ({
        ...p,
        search_urls: (p.search_urls ?? []) as unknown as SearchUrl[],
      })) as unknown as IcpProfileRow[],
      prospects,
      quota: computeQuota(prospects),
      limits: LINKEDIN_LIMITS,
    };
  });

function computeQuota(rows: ProspectRow[]): QuotaSummary {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  const weekday = (startOfDay.getDay() + 6) % 7; // maandag = 0
  startOfWeek.setDate(startOfWeek.getDate() - weekday);

  let today = 0;
  let week = 0;
  let pending = 0;
  let accepted = 0;
  let declined = 0;

  for (const r of rows) {
    if (r.invited_at) {
      const d = new Date(r.invited_at);
      if (d >= startOfDay) today += 1;
      if (d >= startOfWeek) week += 1;
    }
    if (r.status === "invited") pending += 1;
    if (r.status === "accepted") accepted += 1;
    if (r.status === "declined") declined += 1;
  }
  const answered = accepted + declined;
  return {
    today,
    week,
    pending,
    accepted,
    declined,
    acceptanceRate: answered > 0 ? Math.round((accepted / answered) * 1000) / 10 : null,
    dayRemaining: Math.max(0, LINKEDIN_LIMITS.perDay - today),
    weekRemaining: Math.max(0, LINKEDIN_LIMITS.perWeek - week),
  };
}

const icpInput = z.object({
  industry: z.string().trim().max(120).optional(),
  companySize: z.string().trim().max(80).optional(),
  region: z.string().trim().max(120).optional(),
  occasion: z.string().trim().max(200).optional(),
  keywords: z.string().trim().max(400).optional(),
  jobTitles: z.string().trim().max(400).optional(),
});

/** Laat AI een doelgroepprofiel maken en sla het met zoeklinks op. */
export const createIcpProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => icpInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId, email(context));
    const { generateIcpProfile } = await import("./linkedin-prospects.server");
    const ai = await generateIcpProfile(data);

    const jobTitles = ai.jobTitles.length
      ? ai.jobTitles
      : (data.jobTitles ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const keywords = ai.keywords.length
      ? ai.keywords
      : (data.keywords ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    const searchUrls = buildSearchUrls({
      jobTitles,
      keywords,
      exclusions: ai.exclusions,
      industry: data.industry ?? null,
      region: data.region ?? null,
    });

    const { data: row, error } = await context.supabase
      .from("linkedin_icp_profiles")
      .insert({
        workspace_id: workspaceId,
        user_id: context.userId,
        name: ai.name,
        industry: data.industry || null,
        company_size: data.companySize || null,
        region: data.region || null,
        occasion: data.occasion || null,
        job_titles: jobTitles,
        keywords,
        exclusions: ai.exclusions,
        ai_company_profile: ai.companyProfile,
        ai_decision_maker: ai.decisionMaker,
        ai_rationale: ai.rationale,
        search_urls: searchUrls,
      })
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return { profile: row as unknown as IcpProfileRow };
  });

export const deleteIcpProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("linkedin_icp_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const addInput = z.object({
  profileId: z.string().uuid().nullable().optional(),
  raw: z.string().min(1).max(20000),
});

/** Prospects uit een geplakte lijst toevoegen. */
export const addProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId, email(context));
    const parsed = parseProspectLines(data.raw).slice(0, 200);
    if (parsed.length === 0) throw new Error("Geen bruikbare regels gevonden.");

    const { data: rows, error } = await context.supabase
      .from("linkedin_prospects")
      .insert(
        parsed.map((p) => ({
          workspace_id: workspaceId,
          user_id: context.userId,
          profile_id: data.profileId ?? null,
          full_name: p.full_name,
          job_title: p.job_title,
          company_name: p.company_name,
          linkedin_url: p.linkedin_url,
          status: "suggested" as const,
        })),
      )
      .select(PROSPECT_COLUMNS);
    if (error) throw new Error(error.message);
    return { prospects: (rows ?? []) as unknown as ProspectRow[] };
  });

const statusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(PROSPECT_STATUSES),
});

export const updateProspectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusInput.parse(d))
  .handler(async ({ context, data }) => {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "invited") patch.invited_at = now;
    if (data.status === "accepted" || data.status === "declined") patch.responded_at = now;
    if (data.status === "suggested") {
      patch.invited_at = null;
      patch.responded_at = null;
    }
    const { data: row, error } = await context.supabase
      .from("linkedin_prospects")
      .update(patch)
      .eq("id", data.id)
      .select(PROSPECT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return { prospect: row as unknown as ProspectRow };
  });

export const deleteProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("linkedin_prospects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** AI-uitnodigingstekst (max 300 tekens) voor één prospect. */
export const generateProspectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: prospect, error } = await context.supabase
      .from("linkedin_prospects")
      .select(PROSPECT_COLUMNS)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    let profileContext: string | null = null;
    if (prospect.profile_id) {
      const { data: prof } = await context.supabase
        .from("linkedin_icp_profiles")
        .select("name,ai_decision_maker,occasion")
        .eq("id", prospect.profile_id)
        .maybeSingle();
      if (prof) {
        profileContext = [prof.name, prof.occasion, prof.ai_decision_maker].filter(Boolean).join(" — ");
      }
    }

    const { generateInviteMessage } = await import("./linkedin-prospects.server");
    const message = await generateInviteMessage({
      fullName: prospect.full_name,
      jobTitle: prospect.job_title,
      companyName: prospect.company_name,
      headline: prospect.headline,
      profileContext,
    });

    const { data: row, error: upErr } = await context.supabase
      .from("linkedin_prospects")
      .update({ invite_message: message })
      .eq("id", data.id)
      .select(PROSPECT_COLUMNS)
      .single();
    if (upErr) throw new Error(upErr.message);
    return { prospect: row as unknown as ProspectRow };
  });

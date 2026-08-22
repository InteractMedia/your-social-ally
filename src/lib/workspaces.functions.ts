import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { generateIngestToken, hashIngestToken, requireUserWorkspace } from "./workspaces.server";

const labelInput = z.object({ label: z.string().min(2).max(120) });
const keyIdInput = z.object({ id: z.string().uuid() });

/** Current workspace (tenant) of the signed-in user, provisioned on first use. */
export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await requireUserWorkspace(
      context.supabase,
      context.userId,
      (context.claims as { email?: string } | undefined)?.email ?? null,
    );
    const [wsRes, membersRes, keysRes] = await Promise.all([
      context.supabase.from("workspaces").select("id,name,slug,is_default,created_at").eq("id", workspaceId).maybeSingle(),
      context.supabase.from("workspace_members").select("id,user_id,role").eq("workspace_id", workspaceId),
      context.supabase
        .from("workspace_ingest_keys")
        .select("id,label,token_prefix,active,last_used_at,created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
    ]);
    if (wsRes.error) throw new Error(wsRes.error.message);
    return {
      workspace: wsRes.data,
      memberCount: membersRes.data?.length ?? 0,
      role: membersRes.data?.find((m) => m.user_id === context.userId)?.role ?? "member",
      ingestKeys: keysRes.data ?? [],
    };
  });

/** Creates a workspace-bound ingest credential. The token is returned once. */
export const createIngestKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => labelInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(
      context.supabase,
      context.userId,
      (context.claims as { email?: string } | undefined)?.email ?? null,
    );
    const token = generateIngestToken();
    const { data: row, error } = await context.supabase
      .from("workspace_ingest_keys")
      .insert({
        workspace_id: workspaceId,
        label: data.label.trim(),
        token_prefix: token.slice(0, 12),
        token_hash: await hashIngestToken(token),
        created_by: context.userId,
      })
      .select("id,label,token_prefix,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { key: row, token };
  });

export const revokeIngestKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => keyIdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("workspace_ingest_keys")
      .update({ active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

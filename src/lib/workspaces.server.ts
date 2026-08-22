/**
 * Server-only workspace/tenant helpers.
 *
 * Ownership model: every lead belongs to a workspace (tenant). Users get access
 * through public.workspace_members; ingest credentials get access through
 * public.workspace_ingest_keys (only a SHA-256 hash of the token is stored).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export const INGEST_TOKEN_PREFIX = "sci_";

/** SHA-256 hex hash, Web Crypto (Worker-safe). */
export async function hashIngestToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generates a new opaque ingest token (shown to the user once). */
export function generateIngestToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return (
    INGEST_TOKEN_PREFIX +
    [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Resolves the workspace a caller-supplied ingest token belongs to.
 * Falls back to the default workspace for the legacy LEAD_INGEST_SECRET so
 * existing integrations keep working. Returns null when nothing matches.
 */
export async function resolveIngestWorkspace(
  token: string | null,
): Promise<{ workspaceId: string; keyId: string | null } | null> {
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const hash = await hashIngestToken(token);
  const { data: key } = await supabaseAdmin
    .from("workspace_ingest_keys")
    .select("id,workspace_id,active")
    .eq("token_hash", hash)
    .eq("active", true)
    .maybeSingle();
  if (key?.workspace_id) {
    await supabaseAdmin
      .from("workspace_ingest_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", key.id);
    return { workspaceId: key.workspace_id, keyId: key.id };
  }

  // Legacy shared secret → default workspace.
  const legacy = process.env.LEAD_INGEST_SECRET;
  if (legacy && secretEquals(token, legacy)) {
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("is_default", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ws?.id) return { workspaceId: ws.id, keyId: null };
  }
  return null;
}

function secretEquals(provided: string, expected: string) {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * Returns the workspace the signed-in user works in, creating a personal
 * workspace on first use so no data can ever be stored without an owner.
 */
export async function requireUserWorkspace(
  supabase: SupabaseClient<Database>,
  userId: string,
  email?: string | null,
): Promise<string> {
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id,role,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (membership?.workspace_id) return membership.workspace_id;

  // First sign-in for this user: provision a workspace with service role.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const base = (email?.split("@")[0] || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${base || "workspace"}-${userId.slice(0, 8)}`;
  const { data: ws, error: wsError } = await supabaseAdmin
    .from("workspaces")
    .insert({ name: email || "Mijn workspace", slug, created_by: userId })
    .select("id")
    .single();
  if (wsError) throw new Error(wsError.message);
  const { error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
  if (memberError) throw new Error(memberError.message);
  return ws.id;
}

/** Leeslaag voor interne notificaties: lijst, ongelezen-teller en markeren. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppNotification } from "./notifications-shared";
import { requireUserWorkspace } from "./workspaces.server";

const listInput = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  onlyUnread: z.boolean().optional(),
});

const markInput = z.object({ id: z.string().uuid() });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(
      context.supabase,
      context.userId,
      (context.claims as { email?: string } | undefined)?.email ?? null,
    );
    let query = context.supabase
      .from("notifications")
      .select("id,category,severity,title,body,entity_type,entity_id,link_path,is_test,read_at,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 20);
    if (data.onlyUnread) query = query.is("read_at", null);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { count, error: countError } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("read_at", null);
    if (countError) throw new Error(countError.message);

    return {
      notifications: (rows ?? []) as AppNotification[],
      unread: count ?? 0,
    };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => markInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString(), read_by: context.userId })
      .eq("id", data.id)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await requireUserWorkspace(
      context.supabase,
      context.userId,
      (context.claims as { email?: string } | undefined)?.email ?? null,
    );
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString(), read_by: context.userId })
      .eq("workspace_id", workspaceId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

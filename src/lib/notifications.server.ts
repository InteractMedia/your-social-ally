/**
 * Server-only schrijflaag voor interne SocialCockpit-notificaties.
 *
 * Eén generieke insert voor alle bronnen (leads, conversies, AI-advies), zodat
 * nieuwe notificatietypes alleen een category + link hoeven mee te geven.
 * Testleads/preview-verkeer mag standaard nooit een melding produceren; de
 * aanroeper beslist dat expliciet.
 */
import type { NotificationSeverity } from "./notifications-shared";

export type CreateNotificationInput = {
  workspaceId: string;
  category: string;
  title: string;
  body?: string | null;
  severity?: NotificationSeverity;
  entityType?: string | null;
  entityId?: string | null;
  linkPath?: string | null;
  /** Voorkomt dubbele meldingen bij retries; uniek per workspace. */
  dedupeKey?: string | null;
  isTest?: boolean;
  meta?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("notifications").insert({
    workspace_id: input.workspaceId,
    category: input.category,
    severity: input.severity ?? "info",
    title: input.title.slice(0, 300),
    body: input.body ? input.body.slice(0, 1000) : null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    link_path: input.linkPath ?? null,
    dedupe_key: input.dedupeKey ?? null,
    is_test: input.isTest ?? false,
    meta: (input.meta ?? {}) as never,
  });
  if (error && error.code !== "23505") {
    console.error("[notifications] insert mislukt", { message: error.message });
    return { ok: false as const };
  }
  return { ok: true as const };
}

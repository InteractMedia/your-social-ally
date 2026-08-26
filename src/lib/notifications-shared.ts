/**
 * Client-safe types en labels voor het interne notificatiesysteem.
 *
 * Categorieën zijn bewust generiek zodat later ook conversie-, AI- en
 * kwalificatiemeldingen door dezelfde laag lopen.
 */
export const NOTIFICATION_CATEGORIES = [
  "lead_quote",
  "lead_platform",
  "lead_hot",
  "lead_qualified",
  "google_conversion_failed",
  "ai_advice_approval",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  lead_quote: "Offerteaanvraag",
  lead_platform: "Platform-aanmelding",
  lead_hot: "Hot lead",
  lead_qualified: "Qualified lead",
  google_conversion_failed: "Google-conversie mislukt",
  ai_advice_approval: "AI-advies wacht op goedkeuring",
  system: "Systeem",
};

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type AppNotification = {
  id: string;
  category: string;
  severity: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  link_path: string | null;
  is_test: boolean;
  read_at: string | null;
  created_at: string;
};

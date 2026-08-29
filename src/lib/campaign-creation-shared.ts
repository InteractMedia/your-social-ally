/**
 * Google Ads Execution V1 — client-safe model voor de aanmaakstap.
 *
 * Uitvoeringsregel: Claude mag voorstellen, nooit zelfstandig uitvoeren. Elke
 * schrijfactie richting Google Ads vereist expliciete menselijke goedkeuring in
 * SocialCockpit en wordt volledig gelogd.
 */

export const CREATION_STATUSES = ["CREATE_IN_GOOGLE", "CREATED"] as const;

export type CreationPlanStep = {
  /** Korte omschrijving van de stap, in gewone taal. */
  label: string;
  /** Wat er nu in Google Ads staat (leeg bij een nieuwe campagne). */
  before: string;
  /** Wat er wordt aangemaakt of gezet. */
  after: string;
};

export type CreationPlan = {
  campaignName: string;
  customerId: string;
  customerName: string | null;
  finalUrl: string;
  locations: string[];
  language: string;
  dailyBudget: number | null;
  currency: string;
  biddingStrategy: string;
  biddingTarget: number | null;
  conversionGoalName: string;
  conversionActionId: string | null;
  network: { searchNetwork: boolean; searchPartners: boolean; displayNetwork: boolean };
  locationOption: string;
  adGroups: {
    name: string;
    keywords: { text: string; matchType: string }[];
    headlines: string[];
    descriptions: string[];
  }[];
  negativeKeywords: { text: string; matchType: string }[];
  sitelinks: { text: string; description: string }[];
  callouts: string[];
  steps: CreationPlanStep[];
  blockers: string[];
  warnings: string[];
  startStatus: "PAUSED" | "ENABLED";
};

export type ChangeLogRow = {
  id: string;
  source: string;
  draft_id: string | null;
  advice_id: string | null;
  customer_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  change_type: string;
  ai_reasoning: string | null;
  old_value: unknown;
  new_value: unknown;
  approved_by: string | null;
  approved_at: string | null;
  status: string;
  google_result: unknown;
  google_error: string | null;
  executed_at: string | null;
  created_at: string;
};

export const CHANGE_LOG_STATUS_LABELS: Record<string, string> = {
  pending: "In behandeling",
  executed: "Uitgevoerd",
  failed: "Mislukt",
  skipped: "Overgeslagen",
};

export function changeLogStatusLabel(status: string): string {
  return CHANGE_LOG_STATUS_LABELS[status] ?? status;
}

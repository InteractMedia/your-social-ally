/**
 * Client-safe shared model for the AI Ads Analyst (V1.4A).
 *
 * V1.4A is analysis-only: advice is stored and reviewed inside SocialCockpit.
 * Approving an advice never writes to Google Ads in this phase.
 */

export const PROMPT_VERSION = "ads-analyst-v1.4a";

export const ADVICE_TYPES = [
  "NEGATIVE_KEYWORD",
  "PAUSE_KEYWORD",
  "INCREASE_BUDGET",
  "DECREASE_BUDGET",
  "PAUSE_CAMPAIGN",
  "NEW_SEARCH_CAMPAIGN",
  "NEW_AD_GROUP",
  "NEW_KEYWORD",
  "NEW_AD_COPY",
  "LANDING_PAGE_IMPROVEMENT",
  "NEW_INDUSTRY_LANDING_PAGE",
  "BID_STRATEGY_REVIEW",
  "TARGETING_REVIEW",
  "TRACKING_ISSUE",
  "DATA_QUALITY_ISSUE",
  "NO_ACTION",
] as const;

export type AdviceType = (typeof ADVICE_TYPES)[number];

export const ADVICE_TYPE_LABELS: Record<AdviceType, string> = {
  NEGATIVE_KEYWORD: "Negatief zoekwoord",
  PAUSE_KEYWORD: "Zoekwoord pauzeren",
  INCREASE_BUDGET: "Budget verhogen",
  DECREASE_BUDGET: "Budget verlagen",
  PAUSE_CAMPAIGN: "Campagne pauzeren",
  NEW_SEARCH_CAMPAIGN: "Nieuwe searchcampagne",
  NEW_AD_GROUP: "Nieuwe advertentiegroep",
  NEW_KEYWORD: "Nieuw zoekwoord",
  NEW_AD_COPY: "Nieuwe advertentietekst",
  LANDING_PAGE_IMPROVEMENT: "Landingspagina verbeteren",
  NEW_INDUSTRY_LANDING_PAGE: "Branche-landingspagina",
  BID_STRATEGY_REVIEW: "Biedstrategie herzien",
  TARGETING_REVIEW: "Targeting herzien",
  TRACKING_ISSUE: "Trackingprobleem",
  DATA_QUALITY_ISSUE: "Datakwaliteit",
  NO_ACTION: "Geen actie nodig",
};

/**
 * Execution V1: de adviestypes die SocialCockpit na menselijke goedkeuring zelf
 * in Google Ads kan uitvoeren. Al het andere blijft advies.
 */
export const EXECUTABLE_ADVICE_TYPES: AdviceType[] = [
  "NEGATIVE_KEYWORD",
  "PAUSE_KEYWORD",
  "NEW_KEYWORD",
  "INCREASE_BUDGET",
  "DECREASE_BUDGET",
  "PAUSE_CAMPAIGN",
];

export function isExecutableAdviceType(type: string): boolean {
  return (EXECUTABLE_ADVICE_TYPES as string[]).includes(type);
}

/** Advice types that never propose a Google Ads change, only insight. */

export const INSIGHT_ONLY_TYPES: AdviceType[] = [
  "TRACKING_ISSUE",
  "DATA_QUALITY_ISSUE",
  "NO_ACTION",
  "LANDING_PAGE_IMPROVEMENT",
  "NEW_INDUSTRY_LANDING_PAGE",
  "BID_STRATEGY_REVIEW",
  "TARGETING_REVIEW",
];

export const ADVICE_STATUSES = [
  "new",
  "approved",
  "rejected",
  "expired",
  "executed",
  "execution_failed",
] as const;

export type AdviceStatus = (typeof ADVICE_STATUSES)[number];

export const ADVICE_STATUS_LABELS: Record<AdviceStatus, string> = {
  new: "Nieuw",
  approved: "Goedgekeurd",
  rejected: "Afgewezen",
  expired: "Verlopen",
  executed: "Uitgevoerd",
  execution_failed: "Uitvoering mislukt",
};

export type ConfidenceLevel = "low" | "medium" | "high";

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  low: "LAAG",
  medium: "MEDIUM",
  high: "HOOG",
};

export const RISK_LABELS: Record<string, string> = {
  low: "Laag risico",
  medium: "Gemiddeld risico",
  high: "Hoog risico",
};

/** Confidence score → level, so score and level can never contradict. */
export function confidenceLevelFor(score: number): ConfidenceLevel {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

export const REJECTION_REASONS = [
  { key: "missing_context", label: "AI begrijpt context niet" },
  { key: "not_enough_data", label: "Te weinig data" },
  { key: "strategic_choice", label: "Strategische keuze" },
  { key: "not_relevant", label: "Niet relevant" },
  { key: "wrong_conclusion", label: "Verkeerde conclusie" },
  { key: "other", label: "Anders" },
] as const;

export const REJECTION_REASON_LABELS: Record<string, string> =
  Object.fromEntries(REJECTION_REASONS.map((r) => [r.key, r.label]));

export const ANALYSIS_PERIOD_OPTIONS = [7, 30, 90] as const;
export type AnalysisPeriodDays = (typeof ANALYSIS_PERIOD_OPTIONS)[number];

/** Providers the AI layer can run on. Model choice stays configurable. */
export const AI_PROVIDERS = [
  { key: "anthropic", label: "Claude (Anthropic)", defaultModel: "claude-sonnet-4-5" },
  { key: "lovable", label: "Lovable AI (fallback)", defaultModel: "google/gemini-3-flash-preview" },
] as const;

export type AiProviderKey = (typeof AI_PROVIDERS)[number]["key"];

export const CLAUDE_MODEL_OPTIONS = [
  "claude-sonnet-4-5",
  "claude-opus-4-1",
  "claude-haiku-4-5",
];

export const LOVABLE_MODEL_OPTIONS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "openai/gpt-5",
];

export type AiSettings = {
  enabled: boolean;
  provider: AiProviderKey;
  model: string;
  defaultPeriodDays: number;
  minConfidence: number;
  budgetChangeMaxPct: number;
  autoExecute: false;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  defaultPeriodDays: 30,
  minConfidence: 70,
  budgetChangeMaxPct: 20,
  autoExecute: false,
};

export type AdviceRow = {
  id: string;
  run_id: string | null;
  advice_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  title: string;
  summary: string;
  reasoning: string | null;
  proposed_action: string | null;
  proposed_payload: unknown;
  expected_impact: string | null;
  confidence_score: number;
  confidence_level: string;
  risk_level: string;
  evidence: unknown;
  data_available: unknown;
  data_missing: unknown;
  actionable: boolean;
  guardrail_notes: string | null;
  data_confidence_score?: number | null;
  data_confidence_level?: string | null;
  execution_eligibility?: string | null;
  execution_block_reason?: string | null;
  execution_block_reason_label?: string | null;
  execution_blockers?: unknown;
  guardrail_version?: string | null;
  decision_facts?: unknown;
  analysis_period_start: string | null;
  analysis_period_end: string | null;
  model_provider: string;
  model_name: string;
  prompt_version: string;
  status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  rejection_notes: string | null;
  is_test: boolean;
  created_at: string;
};

export function adviceTypeLabel(type: string): string {
  return ADVICE_TYPE_LABELS[type as AdviceType] ?? type.replace(/_/g, " ");
}

/** Tone per advice type for badges in the advice inbox. */
export function adviceTone(type: string): string {
  switch (type) {
    case "NEGATIVE_KEYWORD":
    case "PAUSE_KEYWORD":
    case "PAUSE_CAMPAIGN":
    case "DECREASE_BUDGET":
      return "bg-destructive/15 text-destructive";
    case "TRACKING_ISSUE":
    case "DATA_QUALITY_ISSUE":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "NO_ACTION":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-primary/15 text-primary";
  }
}

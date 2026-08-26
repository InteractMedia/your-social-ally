/**
 * Google Ads Campaign Builder V1 — client-safe types en labels.
 *
 * V1 maakt uitsluitend CONCEPTEN voor Search-campagnes. Er wordt nooit iets in
 * Google Ads aangemaakt of gewijzigd; ook APPROVED_FOR_CREATION voert niets uit.
 */

export const BUILDER_PROMPT_VERSION = "search-builder-v1";

export const BUILDER_FUNNELS = [
  { key: "quote", label: "Offerte" },
  { key: "platform", label: "Cadeauplatform" },
] as const;
export type BuilderFunnel = (typeof BUILDER_FUNNELS)[number]["key"];

export function funnelLabel(key: string): string {
  return BUILDER_FUNNELS.find((f) => f.key === key)?.label ?? key;
}

export const DRAFT_STATUSES = ["AI_CONCEPT", "REVIEWED", "APPROVED_FOR_CREATION"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  AI_CONCEPT: "AI concept",
  REVIEWED: "Nagekeken",
  APPROVED_FOR_CREATION: "Goedgekeurd voor aanmaak",
};

export const APPROVED_NOTICE =
  "Goedgekeurd concept — Google Ads-aanmaak nog niet actief in V1.";

/** Waar een keuze op berust. Nooit door elkaar halen met AI-confidence. */
export const EVIDENCE_SOURCES = [
  "OWN_DATA",
  "GOOGLE_ADS_HISTORY",
  "LANDING_PAGE",
  "EXTERNAL_KNOWLEDGE",
  "HYPOTHESIS",
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  OWN_DATA: "Eigen data",
  GOOGLE_ADS_HISTORY: "Google Ads historie",
  LANDING_PAGE: "Landingspagina",
  EXTERNAL_KNOWLEDGE: "Externe kennis",
  HYPOTHESIS: "Hypothese",
};

export const EVIDENCE_SOURCE_TONE: Record<EvidenceSource, string> = {
  OWN_DATA: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  GOOGLE_ADS_HISTORY: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  LANDING_PAGE: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  EXTERNAL_KNOWLEDGE: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  HYPOTHESIS: "bg-muted text-muted-foreground",
};

export function evidenceLabel(source: string): string {
  return EVIDENCE_SOURCE_LABELS[source as EvidenceSource] ?? "Hypothese";
}

export function evidenceTone(source: string): string {
  return EVIDENCE_SOURCE_TONE[source as EvidenceSource] ?? EVIDENCE_SOURCE_TONE.HYPOTHESIS;
}

export const MATCH_TYPES = ["EXACT", "PHRASE", "BROAD"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  EXACT: "Exact",
  PHRASE: "Woordgroep",
  BROAD: "Breed",
};

export const AUDIENCE_INTENTS = ["B2B", "MIXED", "B2C"] as const;
export type AudienceIntent = (typeof AUDIENCE_INTENTS)[number];

export const AUDIENCE_INTENT_LABELS: Record<AudienceIntent, string> = {
  B2B: "Zakelijk (B2B)",
  MIXED: "Gemengd",
  B2C: "Consument (B2C)",
};

export const BIDDING_STRATEGIES = [
  "MAXIMIZE_CONVERSIONS",
  "MAXIMIZE_CONVERSIONS_TARGET_CPA",
  "MAXIMIZE_CONVERSION_VALUE_TARGET_ROAS",
  "MANUAL_CPC",
] as const;
export type BiddingStrategy = (typeof BIDDING_STRATEGIES)[number];

export const BIDDING_STRATEGY_LABELS: Record<BiddingStrategy, string> = {
  MAXIMIZE_CONVERSIONS: "Maximaliseer conversies",
  MAXIMIZE_CONVERSIONS_TARGET_CPA: "Maximaliseer conversies met doel-CPA",
  MAXIMIZE_CONVERSION_VALUE_TARGET_ROAS: "Maximaliseer conversiewaarde met doel-ROAS",
  MANUAL_CPC: "Handmatige CPC",
};

export type EvidenceNote = {
  source: EvidenceSource | string;
  note: string;
};

export type BuilderKeyword = {
  text: string;
  matchType: MatchType | string;
  intent: AudienceIntent | string;
  evidence: EvidenceNote;
  enabled: boolean;
};

export type BuilderAsset = { text: string; enabled: boolean };

export type BuilderAdGroup = {
  name: string;
  searchIntent: string;
  audienceIntent: AudienceIntent | string;
  enabled: boolean;
  keywords: BuilderKeyword[];
  headlines: BuilderAsset[];
  descriptions: BuilderAsset[];
};

export type BuilderNegative = {
  text: string;
  matchType: MatchType | string;
  reason: string;
  enabled: boolean;
};

export type BuilderProposal = {
  campaignName: string;
  funnel: string;
  goal: string;
  landingPageUrl: string;
  locations: string[];
  language: string;
  dailyBudget: { amount: number | null; currency: string; reasoning: string; evidence: EvidenceNote };
  bidding: { strategy: BiddingStrategy | string; target: number | null; reasoning: string; evidence: EvidenceNote };
  conversionGoal: { name: string; reasoning: string; evidence: EvidenceNote };
  adGroups: BuilderAdGroup[];
  negativeKeywords: BuilderNegative[];
  sitelinks: { text: string; description: string; enabled: boolean }[];
  callouts: BuilderAsset[];
  expectedIntent: string;
  risks: string[];
  summary: string;
};

export type SearchCampaignDraftRow = {
  id: string;
  funnel: string;
  landing_page_id: string | null;
  landing_page_name: string | null;
  landing_page_url: string | null;
  industry_id: string | null;
  industry_name: string | null;
  locations: string[];
  language: string;
  target_daily_budget: number | null;
  status: DraftStatus;
  provider: string;
  model: string;
  prompt_version: string;
  fallback_reason: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  runtime_ms: number | null;
  ai_confidence: number;
  data_confidence: number;
  data_confidence_reasons: string[];
  data_sources: { source: string; used: boolean; detail: string }[];
  missing_data: string[];
  proposal: BuilderProposal;
  dataset_meta: Record<string, unknown>;
  error: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Alleen wat aan staat telt mee in de samenvatting van een concept. */
export function draftTotals(proposal: BuilderProposal | null | undefined) {
  const groups = (proposal?.adGroups ?? []).filter((g) => g.enabled);
  const keywords = groups.flatMap((g) => g.keywords.filter((k) => k.enabled));
  return {
    adGroups: groups.length,
    keywords: keywords.length,
    negatives: (proposal?.negativeKeywords ?? []).filter((n) => n.enabled).length,
    headlines: groups.flatMap((g) => g.headlines.filter((h) => h.enabled)).length,
    descriptions: groups.flatMap((g) => g.descriptions.filter((d) => d.enabled)).length,
    b2bKeywords: keywords.filter((k) => k.intent === "B2B").length,
  };
}

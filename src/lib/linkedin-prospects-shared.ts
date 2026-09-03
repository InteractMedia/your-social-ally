/**
 * Gedeelde types en LinkedIn-limieten voor de Prospect Radar.
 * LinkedIn heeft géén API om connectieverzoeken te versturen — deze module
 * bereidt alles voor, het versturen doe je handmatig in LinkedIn zelf.
 */

export const PROSPECT_STATUSES = [
  "suggested",
  "invited",
  "accepted",
  "declined",
  "no_response",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  suggested: "Suggestie",
  invited: "Uitgenodigd",
  accepted: "Geaccepteerd",
  declined: "Afgewezen",
  no_response: "Geen reactie",
};

/** Veilige richtlijnen (LinkedIn publiceert geen harde cijfers). */
export const LINKEDIN_LIMITS = {
  perDay: 20,
  perWeek: 100,
  maxPending: 3000,
  minAcceptanceRate: 35,
  inviteMessageMaxChars: 300,
} as const;

export type QuotaSummary = {
  today: number;
  week: number;
  pending: number;
  accepted: number;
  declined: number;
  acceptanceRate: number | null;
  dayRemaining: number;
  weekRemaining: number;
};

export type IcpProfileRow = {
  id: string;
  name: string;
  industry: string | null;
  company_size: string | null;
  region: string | null;
  occasion: string | null;
  job_titles: string[];
  keywords: string[];
  exclusions: string[];
  ai_company_profile: string | null;
  ai_decision_maker: string | null;
  ai_rationale: string | null;
  search_urls: SearchUrl[];
  created_at: string;
};

export type SearchUrl = { label: string; url: string; kind: "people" | "companies" | "sales_navigator" };

export type ProspectRow = {
  id: string;
  profile_id: string | null;
  full_name: string;
  headline: string | null;
  company_name: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  status: ProspectStatus;
  invite_message: string | null;
  invited_at: string | null;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
};

export function quotaTone(q: QuotaSummary): "ok" | "warn" | "stop" {
  if (q.today >= LINKEDIN_LIMITS.perDay || q.week >= LINKEDIN_LIMITS.perWeek) return "stop";
  if (q.today >= LINKEDIN_LIMITS.perDay - 5 || q.week >= LINKEDIN_LIMITS.perWeek - 20) return "warn";
  if (q.acceptanceRate !== null && q.acceptanceRate < LINKEDIN_LIMITS.minAcceptanceRate) return "warn";
  return "ok";
}

/**
 * Client-safe shared model for the B2B Lead Manager.
 * Labels are Dutch; keys are stable identifiers stored in the database.
 */

export type FunnelType = "platform" | "quote";
export type LeadType = "cadeauplatform" | "offerte";
export type LeadQuality = "unknown" | "poor" | "qualified" | "hot";

export const FUNNEL_LABELS: Record<FunnelType, string> = {
  platform: "Cadeauplatform",
  quote: "Offerte",
};

export const LEAD_TYPE_LABELS: Record<string, string> = {
  cadeauplatform: "Cadeauplatform",
  offerte: "Offerte",
};

export const LEAD_TYPE_BY_FUNNEL: Record<FunnelType, LeadType> = {
  platform: "cadeauplatform",
  quote: "offerte",
};

export const PLATFORM_STATUSES = [
  "application",
  "approved",
  "activated",
  "first_order",
  "active_customer",
] as const;

export const QUOTE_STATUSES = [
  "quote_request",
  "qualified",
  "hot",
  "quote_sent",
  "customer_won",
  "customer_lost",
] as const;

export type LeadStatus = (typeof PLATFORM_STATUSES)[number] | (typeof QUOTE_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  application: "Aanvraag",
  approved: "Goedgekeurd",
  activated: "Geactiveerd",
  first_order: "Eerste bestelling",
  active_customer: "Actieve klant",
  quote_request: "Offerteaanvraag",
  qualified: "Qualified",
  hot: "Hot",
  quote_sent: "Offerte uitgebracht",
  customer_won: "Klant geworden",
  customer_lost: "Verloren",
};

export const QUALITY_LABELS: Record<LeadQuality, string> = {
  unknown: "Nog niet beoordeeld",
  poor: "Slecht",
  qualified: "Qualified",
  hot: "Hot",
};

/** Ordered funnel steps used for the funnel visualisation and analytics. */
export function funnelSteps(funnel: FunnelType): readonly string[] {
  return funnel === "platform" ? PLATFORM_STATUSES : QUOTE_STATUSES.slice(0, 5);
}

export function statusesForFunnel(funnel: FunnelType): readonly string[] {
  return funnel === "platform" ? PLATFORM_STATUSES : QUOTE_STATUSES;
}

export function funnelForStatus(status: string): FunnelType {
  return (PLATFORM_STATUSES as readonly string[]).includes(status) ? "platform" : "quote";
}

/** Statuses that mean "this lead became a paying customer". */
export const CUSTOMER_STATUSES = ["customer_won", "first_order", "active_customer"];

/** Statuses that count as qualified-or-better in KPI's. */
export const QUALIFIED_STATUSES = [
  "qualified",
  "hot",
  "quote_sent",
  "customer_won",
  "approved",
  "activated",
  "first_order",
  "active_customer",
];

/** Offline conversion events we prepare for Google Ads uploads (phase V1.3). */
export const CONVERSION_EVENTS = [
  "quote_request",
  "qualified_lead",
  "customer_won",
  "platform_application",
  "platform_approved",
  "platform_activated",
  "platform_first_order",
  "platform_active_customer",
] as const;

/**
 * Statussen die een uploadbaar Google-conversie-event opleveren.
 * Interne funnel-statussen (approved, activated, active_customer) staan hier
 * bewust NIET in: die blijven volledig beschikbaar voor Lead Manager,
 * funnelanalyse en AI, maar gaan nooit naar Google Ads.
 */
export const CONVERSION_EVENT_FOR_STATUS: Record<string, string> = {
  quote_request: "quote_request",
  qualified: "qualified_lead",
  customer_won: "customer_won",
  application: "platform_application",
  first_order: "platform_first_order",
};

export type LeadRow = {
  id: string;
  received_at: string;
  created_at: string;
  lead_type: string;
  funnel_type: string;
  status: string;
  lead_quality: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry_id: string | null;
  industry_name: string | null;
  platform: string | null;
  source: string | null;
  campaign_name: string | null;
  campaign_id: string | null;
  landing_page: string | null;
  revenue: number | null;
  order_value: number | null;
  became_customer: boolean;
};

/** KPI helpers — definitions fixed by spec. */
export const safeDiv = (a: number, b: number) => (b > 0 ? a / b : null);
export const cpl = (spend: number, leads: number) => safeDiv(spend, leads);
export const cpql = (spend: number, qualified: number) => safeDiv(spend, qualified);
export const cac = (spend: number, customers: number) => safeDiv(spend, customers);
export const qualifiedRate = (qualified: number, leads: number) => {
  const v = safeDiv(qualified, leads);
  return v === null ? null : v * 100;
};
export const customerRate = (customers: number, leads: number) => {
  const v = safeDiv(customers, leads);
  return v === null ? null : v * 100;
};
export const roas = (revenue: number, spend: number) => safeDiv(revenue, spend);

export const ATTRIBUTION_MODEL = "last_non_direct_click";

/** Inclusive date range → timestamptz bounds for received_at filters. */
export function periodBounds(start: string, end: string) {
  const endDate = new Date(`${end}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return { from: `${start}T00:00:00.000Z`, to: endDate.toISOString() };
}

/**
 * Server-only Google Ads helpers.
 * All credentials stay here (LOVABLE_API_KEY + GOOGLE_ADS_API_KEY are read inside
 * the request handler); nothing in this file may be imported from client code.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_ads";
const API_VERSION = "v25";

export class GoogleAdsApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.status = status;
  }
}

function headers() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const adsKey = process.env.GOOGLE_ADS_API_KEY;
  if (!lovableKey) throw new GoogleAdsApiError("Serverconfiguratie ontbreekt (API-sleutel).", 500);
  if (!adsKey)
    throw new GoogleAdsApiError(
      "Google Ads is niet gekoppeld aan dit project. Koppel Google Ads via Instellingen.",
      412,
    );
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": adsKey,
    "Content-Type": "application/json",
  };
}

export function defaultCustomerId(): string | null {
  const raw = process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (!raw) return null;
  return raw.replace(/[^0-9]/g, "");
}

/** Run a read-only GAQL query against a Google Ads customer account. */
export async function gaql<T = Record<string, any>>(
  customerId: string,
  query: string,
  opts?: { loginCustomerId?: string | null },
): Promise<T[]> {
  const cid = customerId.replace(/[^0-9]/g, "");
  if (!cid) throw new GoogleAdsApiError("Geen Google Ads klantaccount geselecteerd.", 412);

  const h: Record<string, string> = headers();
  if (opts?.loginCustomerId) h["login-customer-id"] = opts.loginCustomerId.replace(/[^0-9]/g, "");

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${GATEWAY}/${API_VERSION}/customers/${cid}/googleAds:search`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ query }),
    });
  } catch (err) {
    console.error("[GoogleAds] network error", { cid, query, err });
    throw new GoogleAdsApiError(`Google Ads niet bereikbaar: ${(err as Error).message}`, 503);
  }

  const text = await res.text();
  if (!res.ok) {
    console.error("[GoogleAds] query failed", { cid, status: res.status, query, body: text.slice(0, 800) });
    throw new GoogleAdsApiError(extractApiMessage(text, res.status), res.status);
  }

  let json: { results?: T[] };
  try {
    json = JSON.parse(text) as { results?: T[] };
  } catch {
    throw new GoogleAdsApiError("Onleesbaar antwoord van Google Ads.", 502);
  }
  console.log("[GoogleAds] ok", {
    cid,
    ms: Date.now() - started,
    rows: json.results?.length ?? 0,
    query: query.replace(/\s+/g, " ").slice(0, 120),
  });
  return json.results ?? [];
}

/**
 * Raw mutate/POST call against the Google Ads REST API (used for offline
 * conversion uploads). Returns the parsed body plus the HTTP status so callers
 * can distinguish retryable from permanent failures.
 */
export async function adsPost<T = any>(
  path: string,
  body: unknown,
  opts?: { loginCustomerId?: string | null },
): Promise<{ ok: boolean; status: number; json: T | null; raw: string }> {
  const h: Record<string, string> = headers();
  if (opts?.loginCustomerId) h["login-customer-id"] = opts.loginCustomerId.replace(/[^0-9]/g, "");

  let res: Response;
  try {
    res = await fetch(`${GATEWAY}/${API_VERSION}/${path.replace(/^\//, "")}`, {
      method: "POST",
      headers: h,
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[GoogleAds] post network error", { path, err });
    throw new GoogleAdsApiError(`Google Ads niet bereikbaar: ${(err as Error).message}`, 503);
  }
  const raw = await res.text();
  let json: T | null = null;
  try {
    json = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    console.error("[GoogleAds] post failed", { path, status: res.status, body: raw.slice(0, 800) });
  }
  return { ok: res.ok, status: res.status, json, raw };
}

export function apiMessage(body: string, status: number) {
  return extractApiMessage(body, status);
}

function extractApiMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);
    const err = Array.isArray(parsed) ? parsed[0]?.error : parsed?.error;
    const errors: any[] = err?.details?.[0]?.errors ?? [];
    const parts = errors
      .map((e) => {
        const code = e?.errorCode ? Object.entries(e.errorCode)[0] : null;
        const field = (e?.location?.fieldPathElements ?? [])
          .map((f: any) => f?.fieldName)
          .filter(Boolean)
          .join(".");
        const bits = [e?.message, code ? `${code[0]}=${code[1]}` : null, field ? `veld: ${field}` : null]
          .filter(Boolean)
          .join(" | ");
        return bits;
      })
      .filter(Boolean);
    const detail = parts.length ? parts.join(" // ") : err?.message ?? (typeof parsed === "string" ? parsed : null);
    if (detail) return `Google Ads API [${status}]: ${detail}`;
  } catch {
    /* fall through */
  }
  return `Google Ads API [${status}]: ${body.slice(0, 300) || "onbekende fout"}`;
}

/* ---------- value helpers ---------- */

export const micros = (v: unknown): number => (v == null ? 0 : Number(v) / 1_000_000);
export const num = (v: unknown): number => (v == null ? 0 : Number(v));

export type Metrics = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number; // percentage
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  costPerConversion: number;
  conversionRate: number; // percentage
  /** Google Ads "alle conversies": ook secundaire acties die niet meebieden. */
  allConversions: number;
  allConversionsValue: number;
};

export function mapMetrics(m: Record<string, any> | undefined): Metrics {
  const spend = micros(m?.costMicros);
  const clicks = num(m?.clicks);
  const conversions = num(m?.conversions);
  return {
    spend,
    impressions: num(m?.impressions),
    clicks,
    ctr: num(m?.ctr) * 100,
    avgCpc: micros(m?.averageCpc),
    conversions,
    conversionsValue: num(m?.conversionsValue),
    costPerConversion: conversions > 0 ? spend / conversions : 0,
    conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    allConversions: num(m?.allConversions),
    allConversionsValue: num(m?.allConversionsValue),
  };
}

export const METRIC_FIELDS = [
  "metrics.cost_micros",
  "metrics.impressions",
  "metrics.clicks",
  "metrics.ctr",
  "metrics.average_cpc",
  "metrics.conversions",
  "metrics.conversions_value",
  "metrics.all_conversions",
  "metrics.all_conversions_value",
].join(", ");

/** Safe GAQL date filter from ISO yyyy-mm-dd strings. */
export function dateFilter(start: string, end: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(start) || !iso.test(end)) throw new GoogleAdsApiError("Ongeldige periode.", 400);
  return `segments.date BETWEEN '${start}' AND '${end}'`;
}

export function channelLabel(type: string | undefined): string {
  switch (type) {
    case "SEARCH":
      return "Search";
    case "PERFORMANCE_MAX":
      return "Performance Max";
    case "DISPLAY":
      return "Display";
    case "VIDEO":
      return "Video";
    case "SHOPPING":
      return "Shopping";
    case "DEMAND_GEN":
      return "Demand Gen";
    case "MULTI_CHANNEL":
      return "App/Multi-channel";
    case "SMART":
      return "Smart";
    case "LOCAL":
    case "LOCAL_SERVICES":
      return "Local";
    default:
      return type ? type.replace(/_/g, " ") : "Onbekend";
  }
}

export function statusLabel(status: string | undefined): "actief" | "gepauzeerd" | "verwijderd" | "onbekend" {
  switch (status) {
    case "ENABLED":
      return "actief";
    case "PAUSED":
      return "gepauzeerd";
    case "REMOVED":
      return "verwijderd";
    default:
      return "onbekend";
  }
}

/* ---------- campagnegezondheid (serving issues) ---------- */

export type HealthSeverity = "ok" | "warn" | "error";

export type CampaignHealthReason = { code: string; label: string; hint: string | null };

export type CampaignHealth = {
  primaryStatus: string | null;
  label: string;
  severity: HealthSeverity;
  reasons: CampaignHealthReason[];
};

const PRIMARY_STATUS_LABELS: Record<string, { label: string; severity: HealthSeverity }> = {
  ELIGIBLE: { label: "Actief en levert", severity: "ok" },
  PENDING: { label: "Nog niet gestart", severity: "warn" },
  LEARNING: { label: "Leerfase", severity: "ok" },
  LIMITED: { label: "Beperkt — levert minder dan mogelijk", severity: "warn" },
  MISCONFIGURED: { label: "Verkeerd ingesteld", severity: "error" },
  NOT_ELIGIBLE: { label: "Komt niet in aanmerking om te leveren", severity: "error" },
  PAUSED: { label: "Gepauzeerd", severity: "warn" },
  REMOVED: { label: "Verwijderd", severity: "error" },
  ENDED: { label: "Beëindigd", severity: "warn" },
};

const REASON_LABELS: Record<string, { label: string; hint: string | null }> = {
  CAMPAIGN_REMOVED: { label: "Campagne is verwijderd.", hint: null },
  CAMPAIGN_PAUSED: { label: "Campagne staat op gepauzeerd.", hint: "Activeer de campagne om te leveren." },
  CAMPAIGN_PENDING: { label: "Campagne start later.", hint: null },
  CAMPAIGN_ENDED: { label: "Einddatum van de campagne is verstreken.", hint: null },
  CAMPAIGN_DRAFT: { label: "Campagne is nog een concept.", hint: null },
  BIDDING_STRATEGY_MISCONFIGURED: { label: "Biedstrategie is verkeerd ingesteld.", hint: null },
  BIDDING_STRATEGY_LIMITED: { label: "Biedstrategie wordt beperkt.", hint: null },
  BIDDING_STRATEGY_LEARNING: { label: "Biedstrategie zit in de leerfase.", hint: null },
  BIDDING_STRATEGY_CONSTRAINED: { label: "Biedstrategie wordt beperkt door de doelen.", hint: null },
  BUDGET_CONSTRAINED: { label: "Budget beperkt de weergaven.", hint: null },
  BUDGET_MISCONFIGURED: { label: "Budget is verkeerd ingesteld.", hint: null },
  SEARCH_VOLUME_LIMITED: { label: "Te weinig zoekvolume.", hint: null },
  AD_GROUPS_PAUSED: { label: "Alle advertentiegroepen staan op gepauzeerd.", hint: null },
  NO_AD_GROUPS: { label: "Campagne heeft geen advertentiegroepen.", hint: null },
  KEYWORDS_PAUSED: { label: "Alle keywords staan op gepauzeerd.", hint: null },
  NO_KEYWORDS: { label: "Campagne heeft geen keywords.", hint: null },
  AD_GROUP_ADS_PAUSED: { label: "Alle advertenties staan op gepauzeerd.", hint: null },
  NO_AD_GROUP_ADS: { label: "Campagne heeft geen advertenties.", hint: null },
  HAS_ADS_LIMITED_BY_POLICY: { label: "Advertenties worden beperkt door beleid.", hint: null },
  HAS_ADS_DISAPPROVED: { label: "Advertenties zijn afgekeurd.", hint: null },
  MOST_ADS_UNDER_REVIEW: { label: "De meeste advertenties zijn nog in beoordeling.", hint: null },
  MISSING_LEAD_FORM_EXTENSION: { label: "Leadformulier-extensie ontbreekt.", hint: null },
  MISSING_CALL_EXTENSION: { label: "Telefoon-extensie ontbreekt.", hint: null },
  LEAD_FORM_EXTENSION_UNDER_REVIEW: { label: "Leadformulier is in beoordeling.", hint: null },
  LEAD_FORM_EXTENSION_DISAPPROVED: { label: "Leadformulier is afgekeurd.", hint: null },
  CALL_EXTENSION_UNDER_REVIEW: { label: "Telefoon-extensie is in beoordeling.", hint: null },
  CALL_EXTENSION_DISAPPROVED: { label: "Telefoon-extensie is afgekeurd.", hint: null },
  NO_MOBILE_APPLICATION_AD_GROUP_CRITERIA: { label: "Geen app-targeting ingesteld.", hint: null },
  CAMPAIGN_GROUP_PAUSED: { label: "Campagnegroep staat op gepauzeerd.", hint: null },
  CAMPAIGN_GROUP_ALL_GROUP_BUDGETS_ENDED: { label: "Alle budgetten van de campagnegroep zijn beëindigd.", hint: null },
  APP_NOT_RELEASED: { label: "App is niet gepubliceerd.", hint: null },
  APP_PARTIALLY_RELEASED: { label: "App is slechts deels gepubliceerd.", hint: null },
  HAS_ASSET_GROUPS_DISAPPROVED: { label: "Assetgroepen zijn afgekeurd.", hint: null },
  HAS_ASSET_GROUPS_LIMITED_BY_POLICY: { label: "Assetgroepen worden beperkt door beleid.", hint: null },
  MOST_ASSET_GROUPS_UNDER_REVIEW: { label: "De meeste assetgroepen zijn in beoordeling.", hint: null },
  NO_ASSET_GROUPS: { label: "Campagne heeft geen assetgroepen.", hint: null },
  ASSET_GROUPS_PAUSED: { label: "Alle assetgroepen staan op gepauzeerd.", hint: null },
};

export const MISSING_PRIMARY_CONVERSION_REASON: CampaignHealthReason = {
  code: "MISSING_PRIMARY_CONVERSION_ACTION",
  label: "Er ontbreekt een primaire conversieactie voor uw doel.",
  hint: "Zonder primaire (biedbare) conversieactie optimaliseert Google niet op conversies. Zet in Google Ads bij Doelen minimaal één conversieactie op primair.",
};

export function campaignHealth(
  primaryStatus: string | undefined | null,
  reasons: unknown,
  extra: CampaignHealthReason[] = [],
): CampaignHealth {
  const key = primaryStatus ? String(primaryStatus) : null;
  const meta = (key && PRIMARY_STATUS_LABELS[key]) || { label: key ? key.replace(/_/g, " ") : "Onbekend", severity: "warn" as HealthSeverity };
  const list: CampaignHealthReason[] = (Array.isArray(reasons) ? reasons : [])
    .map((r) => String(r))
    .map((code) => ({ code, ...(REASON_LABELS[code] ?? { label: code.replace(/_/g, " ").toLowerCase(), hint: null }) }));
  const all = [...list, ...extra];
  let severity = meta.severity;
  if (extra.length > 0 && severity === "ok") severity = "warn";
  return { primaryStatus: key, label: meta.label, severity, reasons: all };
}

/**
 * Ontbreekt er een primaire (biedbare) conversieactie in het account?
 * Dit is precies de waarschuwing die Google Ads bij de campagne toont.
 */
export async function hasPrimaryConversionAction(customerId: string): Promise<boolean | null> {
  try {
    const rows = await gaql(
      customerId,
      `SELECT conversion_action.id, conversion_action.primary_for_goal, conversion_action.status
       FROM conversion_action
       WHERE conversion_action.status = 'ENABLED' AND conversion_action.primary_for_goal = TRUE`,
    );
    return rows.length > 0;
  } catch (err) {
    console.error("[GoogleAds] primary conversion check failed", (err as Error).message);
    return null;
  }
}

/**
 * Per campagne: ontbreekt er een primaire (biedbare) conversieactie voor de
 * conversiedoelen van díe campagne? Dit is de waarschuwing die Google Ads bij
 * de campagne zelf toont, ook als het account elders wél primaire acties heeft.
 * Geeft een Set met campagne-id's die de waarschuwing hebben, of null als de
 * check niet uitgevoerd kon worden.
 */
export async function campaignsMissingPrimaryConversion(
  customerId: string,
  campaignIds?: string[],
): Promise<Map<string, string[]> | null> {
  try {
    const primaryRows = await gaql(
      customerId,
      `SELECT conversion_action.category, conversion_action.primary_for_goal, conversion_action.status
       FROM conversion_action
       WHERE conversion_action.status = 'ENABLED' AND conversion_action.primary_for_goal = TRUE`,
    );
    const primaryCategories = new Set(
      (primaryRows as any[]).map((r) => String(r.conversionAction?.category ?? "")).filter(Boolean),
    );

    const filter =
      campaignIds && campaignIds.length > 0 && campaignIds.length <= 200
        ? ` WHERE campaign.id IN (${campaignIds.map((id) => id.replace(/[^0-9]/g, "")).filter(Boolean).join(",")})`
        : "";
    const goalRows = await gaql(
      customerId,
      `SELECT campaign.id, campaign_conversion_goal.category, campaign_conversion_goal.biddable
       FROM campaign_conversion_goal${filter}`,
    );

    const biddableByCampaign = new Map<string, Set<string>>();
    for (const row of goalRows as any[]) {
      const id = String(row.campaign?.id ?? "");
      const goal = row.campaignConversionGoal ?? {};
      if (!id) continue;
      if (!biddableByCampaign.has(id)) biddableByCampaign.set(id, new Set());
      if (goal.biddable === true && goal.category) {
        biddableByCampaign.get(id)!.add(String(goal.category));
      }
    }

    const missing = new Map<string, string[]>();
    for (const [id, categories] of biddableByCampaign) {
      const uncovered = [...categories].filter((c) => !primaryCategories.has(c));
      if (categories.size === 0 || uncovered.length > 0) missing.set(id, uncovered.sort());
    }
    return missing;
  } catch (err) {
    console.error("[GoogleAds] campaign conversion goal check failed", (err as Error).message);
    return null;
  }
}

const GOAL_CATEGORY_LABELS: Record<string, string> = {
  DEFAULT: "Overig",
  PAGE_VIEW: "Paginaweergave",
  SIGNUP: "Aanmelding",
  SUBMIT_LEAD_FORM: "Leadformulier",
  CONTACT: "Contact",
  BOOK_APPOINTMENT: "Afspraak",
  REQUEST_QUOTE: "Offerteaanvraag",
  GET_DIRECTIONS: "Routebeschrijving",
  OUTBOUND_CLICK: "Uitgaande klik",
  ADD_TO_CART: "Toevoegen aan winkelwagen",
  BEGIN_CHECKOUT: "Start afrekenen",
  PURCHASE: "Aankoop",
  SUBSCRIBE_PAID: "Betaald abonnement",
  PHONE_CALL_LEAD: "Telefonische lead",
  DOWNLOAD: "Download",
  ENGAGEMENT: "Interactie",
  UNKNOWN: "Onbekend",
};

/** Waarschuwing met de concrete doelen die nog geen primaire conversieactie hebben. */
export function missingPrimaryConversionReason(categories: string[]): CampaignHealthReason {
  if (categories.length === 0) return MISSING_PRIMARY_CONVERSION_REASON;
  const names = categories.map((c) => GOAL_CATEGORY_LABELS[c] ?? c.replace(/_/g, " ").toLowerCase());
  return {
    ...MISSING_PRIMARY_CONVERSION_REASON,
    hint: `Zonder primaire (biedbare) conversieactie optimaliseert Google niet op dit doel. Deze conversiedoelen van de campagne hebben nog geen actieve primaire conversieactie: ${names.join(", ")}. Zet in Google Ads bij Doelen per doel minimaal één conversieactie op primair, of verwijder het doel uit de campagne.`,
  };
}


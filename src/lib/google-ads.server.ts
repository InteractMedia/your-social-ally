/**
 * Server-only Google Ads helpers.
 * All credentials stay here (LOVABLE_API_KEY + GOOGLE_ADS_API_KEY are read inside
 * the request handler); nothing in this file may be imported from client code.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_ads";
const API_VERSION = "v24";

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

function extractApiMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);
    const err = Array.isArray(parsed) ? parsed[0]?.error : parsed?.error;
    const detail =
      err?.details?.[0]?.errors?.[0]?.message ??
      err?.message ??
      (typeof parsed === "string" ? parsed : null);
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

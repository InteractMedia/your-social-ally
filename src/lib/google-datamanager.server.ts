/**
 * Server-only Google Data Manager API client (events:ingest + requestStatus).
 *
 * This is the ONLY upload path for offline conversions. Reading Google Ads data
 * (campaigns, costs, clicks, search terms, conversion actions) keeps using the
 * Google Ads API in `google-ads.server.ts` — nothing there is changed.
 *
 * Docs followed:
 *  - POST https://datamanager.googleapis.com/v1/events:ingest
 *  - GET  https://datamanager.googleapis.com/v1/requestStatus:retrieve?requestId=...
 *  - Destination / ProductAccount (operatingAccount.accountType = GOOGLE_ADS,
 *    productDestinationId = numeric conversion action id)
 *
 * Credentials never leave this file: the request is proxied through the Lovable
 * connector gateway, which holds the Google OAuth token (scope
 * https://www.googleapis.com/auth/datamanager). No token, refresh token or
 * client secret is ever exposed to the frontend.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_ads/datamanager/v1";

export class DataManagerError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "DataManagerError";
    this.status = status;
  }
}

function headers() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const adsKey = process.env.GOOGLE_ADS_API_KEY;
  if (!lovableKey) throw new DataManagerError("Serverconfiguratie ontbreekt (API-sleutel).", 500);
  if (!adsKey)
    throw new DataManagerError(
      "Google is niet gekoppeld aan dit project. Koppel Google Ads via Instellingen.",
      412,
    );
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": adsKey,
    "Content-Type": "application/json",
  };
}

export type DmResponse<T = any> = { ok: boolean; status: number; json: T | null; raw: string };

async function dmFetch<T>(path: string, init: RequestInit): Promise<DmResponse<T>> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY}/${path.replace(/^\//, "")}`, {
      ...init,
      headers: headers(),
    });
  } catch (err) {
    throw new DataManagerError(
      `Google Data Manager niet bereikbaar: ${(err as Error).message}`,
      503,
    );
  }
  const raw = await res.text();
  let json: T | null = null;
  try {
    json = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    console.error("[DataManager] call failed", { path, status: res.status, body: raw.slice(0, 800) });
  }
  return { ok: res.ok, status: res.status, json, raw };
}

/* ----------------------------------------------------------- request shapes */

export type ProductAccount = { accountId: string; accountType: "GOOGLE_ADS" | "DATA_PARTNER" };

export type Destination = {
  reference?: string;
  operatingAccount: ProductAccount;
  loginAccount?: ProductAccount;
  productDestinationId: string;
};

export type AdIdentifiers = { gclid?: string; gbraid?: string; wbraid?: string };

export type DmEvent = {
  destinationReferences?: string[];
  transactionId?: string;
  eventTimestamp: string;
  adIdentifiers?: AdIdentifiers;
  currency?: string;
  conversionValue?: number;
  eventSource?: "WEB" | "APP" | "IN_STORE" | "PHONE" | "OTHER";
};

export type IngestEventsRequest = {
  destinations: Destination[];
  events: DmEvent[];
  validateOnly?: boolean;
};

export type IngestEventsResponse = { requestId?: string; fieldWarnings?: unknown[] };

/**
 * Google Ads conversion action as a Data Manager destination.
 * - operatingAccount: the Google Ads conversion account (customer id, no dashes)
 * - productDestinationId: the NUMERIC conversion action id (not a resource name)
 * - loginAccount: only when the call runs through a manager (MCC) account
 */
export function googleAdsDestination(args: {
  customerId: string;
  conversionActionId: string;
  loginCustomerId?: string | null;
  reference?: string;
}): Destination {
  const dest: Destination = {
    reference: args.reference ?? "d0",
    operatingAccount: {
      accountId: args.customerId.replace(/[^0-9]/g, ""),
      accountType: "GOOGLE_ADS",
    },
    productDestinationId: String(args.conversionActionId).replace(/[^0-9]/g, ""),
  };
  if (args.loginCustomerId) {
    dest.loginAccount = {
      accountId: args.loginCustomerId.replace(/[^0-9]/g, ""),
      accountType: "GOOGLE_ADS",
    };
  }
  return dest;
}

/** RFC 3339, Z-normalised — the moment the BUSINESS event happened. */
export function rfc3339(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Deterministic transaction id for Google-side deduplication.
 * Built only from stable business identity, so a retry of the same business
 * conversion always produces exactly the same id.
 */
export function buildTransactionId(p: {
  workspaceId: string;
  leadId: string;
  externalSource?: string | null;
  externalId?: string | null;
  event: string;
  orderId?: string | null;
}): string {
  const slug = (v: string) => v.replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 40);
  const identity =
    p.externalSource && p.externalId
      ? `${slug(p.externalSource)}.${slug(p.externalId)}`
      : `lead.${p.leadId}`;
  const parts = [`sc`, slug(p.workspaceId), identity, slug(p.event)];
  if (p.orderId) parts.push(slug(p.orderId));
  return parts.join("-").slice(0, 150);
}

/* -------------------------------------------------------------- operations */

export async function ingestEvents(body: IngestEventsRequest) {
  return dmFetch<IngestEventsResponse>("events:ingest", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type RequestStatusPerDestination = {
  destination?: Destination;
  requestStatus?: "REQUEST_STATUS_UNKNOWN" | "SUCCESS" | "PROCESSING" | "FAILED" | "PARTIAL_SUCCESS";
  errorInfo?: { errorCounts?: { recordCount?: string; reason?: string }[] };
  warningInfo?: { warningCounts?: { recordCount?: string; reason?: string }[] };
  eventsIngestionStatus?: unknown;
};

/** Diagnostics for an earlier ingest (never available for validateOnly calls). */
export async function retrieveRequestStatus(requestId: string) {
  return dmFetch<{ requestStatusPerDestination?: RequestStatusPerDestination[] }>(
    `requestStatus:retrieve?requestId=${encodeURIComponent(requestId)}`,
    { method: "GET" },
  );
}

/** Human-readable error text from a Data Manager error body (fast-fail model). */
export function dmMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);
    const err = parsed?.error;
    const detail =
      err?.details?.[0]?.fieldViolations?.[0]?.description ?? err?.message ?? null;
    if (detail) return `Data Manager API [${status}]: ${detail}`;
  } catch {
    /* fall through */
  }
  return `Data Manager API [${status}]: ${body.slice(0, 300) || "onbekende fout"}`;
}

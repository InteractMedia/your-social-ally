/**
 * First-party attribution capture for public landing pages.
 *
 * Everything is stored client-side in localStorage/sessionStorage: first touch
 * (never overwritten), last non-direct touch, session id and landing context.
 * The values travel with the form submission so a lead can always be traced
 * back to campaign, ad group, keyword and landing page version.
 */
import { ATTRIBUTION_PARAMS, type AttributionSnapshot } from "./landing-shared";

const FIRST_KEY = "zb_attr_first";
const LAST_KEY = "zb_attr_last";
const SESSION_KEY = "zb_session_id";

function safeGet(store: Storage, key: string) {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function safeSet(store: Storage, key: string, value: unknown) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / storage full: attribution degrades, page keeps working */
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readParams(): Record<string, string | null> {
  const url = new URL(window.location.href);
  const out: Record<string, string | null> = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) out[key] = value.slice(0, 300);
  }
  const referrer = document.referrer && !document.referrer.includes(window.location.host)
    ? document.referrer.slice(0, 500)
    : null;
  if (referrer) out["referrer"] = referrer;
  return out;
}

function hasSignal(values: Record<string, string | null>) {
  return Object.keys(values).some((k) => k !== "referrer") || !!values["referrer"];
}

/** Captures attribution for this pageview and returns the full snapshot. */
export function captureAttribution(context: {
  slug: string;
  funnel: string;
  pageId: string;
  industryName?: string | null;
}): AttributionSnapshot {
  if (typeof window === "undefined") return {};
  const current = readParams();
  const nowIso = new Date().toISOString();

  let first = safeGet(localStorage, FIRST_KEY);
  if (!first) {
    first = {
      ...current,
      first_landing_at: nowIso,
      landing_page: window.location.pathname,
      landing_page_slug: context.slug,
    };
    safeSet(localStorage, FIRST_KEY, first);
  }

  // Last non-direct: only overwrite when this visit carries a real signal.
  let last = safeGet(localStorage, LAST_KEY);
  if (hasSignal(current)) {
    last = { ...current, at: nowIso, landing_page_slug: context.slug };
    safeSet(localStorage, LAST_KEY, last);
  }

  return {
    first_touch: (first ?? {}) as Record<string, string | null>,
    last_non_direct: (last ?? first ?? {}) as Record<string, string | null>,
    first_landing_at: (first?.["first_landing_at"] as string) ?? nowIso,
    landing_page: window.location.pathname,
    landing_page_slug: context.slug,
    landing_page_id: context.pageId,
    industry_name: context.industryName ?? null,
    referrer: (current["referrer"] as string) ?? null,
    session_id: getSessionId(),
  };
}

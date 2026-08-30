/**
 * Server-only schrijflaag richting Google Ads (Execution V1).
 *
 * Regel: hier komt niets terecht zonder expliciete menselijke goedkeuring in
 * SocialCockpit. Dit bestand voert alleen uit wat de aanroeper al heeft
 * gevalideerd en gelogd.
 */

import { GoogleAdsApiError, adsPost, apiMessage } from "./google-ads.server";

export type MutateResult = { resourceNames: string[]; raw: any };

/** Eén mutate-call. Gooit een leesbare fout bij afkeuring door Google. */
export async function mutate(
  customerId: string,
  resource: string,
  operations: unknown[],
  opts?: { loginCustomerId?: string | null; label?: string },
): Promise<MutateResult> {
  const cid = customerId.replace(/[^0-9]/g, "");
  if (!cid) throw new GoogleAdsApiError("Geen Google Ads klantaccount geselecteerd.", 412);
  if (operations.length === 0) return { resourceNames: [], raw: null };

  const res = await adsPost(`customers/${cid}/${resource}:mutate`, {
    operations,
    partialFailure: false,
    validateOnly: false,
  }, opts);

  if (!res.ok) {
    const where = opts?.label ? `${opts.label} (${resource})` : resource;
    throw new GoogleAdsApiError(`Stap "${where}" mislukte — ${apiMessage(res.raw, res.status)}`, res.status);
  }
  const results = (res.json as any)?.results ?? [];
  return { resourceNames: results.map((r: any) => r?.resourceName).filter(Boolean), raw: res.json };
}

/* --------------------------------------------------- criteria-constanten */

/** Google geo target constants voor de markten die wij bedienen. */
const GEO_TARGETS: Record<string, number> = {
  nederland: 2528,
  netherlands: 2528,
  nl: 2528,
  belgie: 2056,
  "belgië": 2056,
  belgium: 2056,
  be: 2056,
  duitsland: 2276,
  germany: 2276,
  de: 2276,
  luxemburg: 2442,
  luxembourg: 2442,
};

const LANGUAGE_CONSTANTS: Record<string, number> = {
  nl: 1010,
  nederlands: 1010,
  dutch: 1010,
  en: 1000,
  engels: 1000,
  english: 1000,
  de: 1001,
  duits: 1001,
  fr: 1002,
};

export function geoTargetId(location: string): number | null {
  return GEO_TARGETS[location.trim().toLowerCase()] ?? null;
}

export function languageConstantId(language: string): number | null {
  return LANGUAGE_CONSTANTS[language.trim().toLowerCase()] ?? null;
}

/* ---------------------------------------------------------- payload-bouw */

export const euros = (amount: number): number => Math.round(amount * 1_000_000);

export function biddingPayload(strategy: string, target: number | null): Record<string, unknown> {
  switch (strategy) {
    case "MAXIMIZE_CONVERSIONS_TARGET_CPA":
      return { maximizeConversions: target ? { targetCpaMicros: String(euros(target)) } : {} };
    case "MAXIMIZE_CONVERSION_VALUE_TARGET_ROAS":
      return { maximizeConversionValue: target ? { targetRoas: target } : {} };
    case "MANUAL_CPC":
      return { manualCpc: { enhancedCpcEnabled: false } };
    case "MAXIMIZE_CONVERSIONS":
    default:
      return { maximizeConversions: {} };
  }
}

export function matchTypeFor(raw: string): "EXACT" | "PHRASE" | "BROAD" {
  const v = String(raw).toUpperCase();
  return v === "EXACT" || v === "BROAD" ? v : "PHRASE";
}

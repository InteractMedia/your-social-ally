/**
 * Client-safe model for Google Ads offline conversion tracking (V1.3).
 * Nothing here talks to Google — it only describes our internal events,
 * upload statuses and the Dutch translations used in the UI.
 */

export type ValueSource = "none" | "fixed" | "dynamic";
export type UploadMode = "manual" | "automatic";

export type UploadStatus =
  | "pending"
  | "processing"
  | "uploaded"
  | "failed"
  | "not_eligible"
  | "disabled";

export const UPLOAD_STATUS_LABELS: Record<string, string> = {
  pending: "Wacht op goedkeuring",
  submitted: "Verzonden naar Google",
  processing: "Google verwerkt nog",
  uploaded: "Bevestigd door Google",
  failed: "Mislukt",
  not_eligible: "Niet uploadbaar",
  disabled: "Uitgeschakeld",
};

/** Verwerkingsstatus zoals Google die teruggeeft voor een verzonden batch. */
export const PROCESSING_STATUS_LABELS: Record<string, string> = {
  PROCESSING: "In verwerking bij Google",
  REQUEST_STATUS_UNKNOWN: "Status nog onbekend",
  SUCCESS: "Verwerkt en geaccepteerd",
  PARTIAL_SUCCESS: "Deels verwerkt",
  FAILED: "Afgekeurd door Google",
};


/** Internal conversion events, in funnel order, with the advised initial usage. */
export const OFFLINE_EVENTS = [
  {
    key: "platform_application",
    label: "Aanvraag (cadeauplatform)",
    funnel: "platform",
    order: 1,
    advice: "Optioneel / secundair signaal",
    advisedValueSource: "none" as ValueSource,
    advisedPrimary: false,
  },
  {
    key: "platform_first_order",
    label: "Eerste bestelling (cadeauplatform)",
    funnel: "platform",
    order: 4,
    advice: "Zeer sterk business-signaal — echte orderwaarde",
    advisedValueSource: "dynamic" as ValueSource,
    advisedPrimary: true,
  },
  {
    key: "quote_request",
    label: "Offerte - Aanvraag",
    funnel: "quote",
    order: 1,
    advice: "Primaire biedconversie in de startfase (generiek voor alle branches)",
    advisedValueSource: "none" as ValueSource,
    advisedPrimary: true,
  },
  {
    key: "quote_qualified",
    label: "Offerte - Qualified",
    funnel: "quote",
    order: 2,
    advice: "Volledig meten, in de startfase niet meebiedend",
    advisedValueSource: "none" as ValueSource,
    advisedPrimary: false,
  },
  {
    key: "quote_won",
    label: "Offerte - Klant",
    funnel: "quote",
    order: 3,
    advice: "Werkelijke omzet meesturen; in de startfase niet meebiedend",
    advisedValueSource: "dynamic" as ValueSource,
    advisedPrimary: false,
  },
] as const;

/**
 * Funnel-events die uitsluitend intern in SocialCockpit leven (Lead Manager,
 * funnelanalyse, AI). Ze worden nooit naar Google Ads geüpload en krijgen dus
 * geen conversiemapping en geen pending conversion-events.
 */
export const INTERNAL_ONLY_EVENT_LABELS: Record<string, string> = {
  platform_approved: "Goedgekeurd (cadeauplatform)",
  platform_activated: "Geactiveerd (cadeauplatform)",
  platform_active_customer: "Actieve klant (cadeauplatform)",
};

export const OFFLINE_EVENT_LABELS: Record<string, string> = {
  ...INTERNAL_ONLY_EVENT_LABELS,
  ...Object.fromEntries(OFFLINE_EVENTS.map((e) => [e.key, e.label])),
};

export const VALUE_SOURCE_LABELS: Record<ValueSource, string> = {
  none: "Geen waarde",
  fixed: "Vaste waarde",
  dynamic: "Dynamisch (echte omzet)",
};

/** Reason codes translated to plain Dutch for the UI. */
export const REASON_LABELS: Record<string, string> = {
  missing_click_identifier: "Geen Google Ads click-ID bij deze lead.",
  conversion_action_missing: "Geen Google Ads conversion action gekoppeld.",
  conversion_action_unavailable:
    "Conversion action bestaat niet meer of staat niet op actief in Google Ads.",
  conversion_action_wrong_type:
    "Conversion action is niet geschikt voor offline click-import (geen upload-type).",
  mapping_missing: "Nog geen mapping ingesteld voor dit event.",
  mapping_disabled: "Upload staat uit voor dit event.",
  test_event: "Testlead — wordt nooit naar Google Ads gestuurd.",
  missing_value: "Geen geldige omzet (> 0) bekend — er wordt niets geüpload.",
  invalid_conversion_time: "Google accepteert het conversietijdstip niet.",
  api_auth_error: "Google Ads-koppeling vereist opnieuw autorisatie.",
  skipped_by_user: "Handmatig overgeslagen.",
  no_google_account: "Er is geen Google Ads-account gekoppeld.",
  api_error: "Google gaf een fout terug bij het verzenden van de conversie.",
  api_unavailable: "Google was tijdelijk niet bereikbaar.",
  dry_run: "Alleen gecontroleerd (geen upload).",
  processing_rejected:
    "Google heeft de conversie na verwerking afgekeurd — zie de diagnose bij dit event.",
  not_allowlisted:
    "Deze conversie kon niet via de oude Google Ads upload-API worden verstuurd; SocialCockpit gebruikt nu de Data Manager API.",
};



export function reasonLabel(reason?: string | null): string | null {
  if (!reason) return null;
  return REASON_LABELS[reason] ?? reason;
}

/** Masks a click identifier so it is never fully shown in the UI. */
export function maskClickId(value?: string | null): string | null {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 3)}…`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export const CLICK_ID_LABELS: Record<string, string> = {
  gclid: "GCLID",
  gbraid: "GBRAID",
  wbraid: "WBRAID",
};

/** Max upload attempts before an event is parked as failed. */
export const MAX_UPLOAD_ATTEMPTS = 5;

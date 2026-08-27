/**
 * Offerte Conversion Architecture V1 — client-safe model.
 *
 * Eén generieke conversiestructuur voor ALLE branche-landingspages:
 * branche, campagne, landing_page_id, variant en click-ID's blijven dimensies
 * van de lead en worden nooit aparte Google-conversieacties.
 *
 * Niets in dit bestand praat met Google; het beschrijft alleen de gewenste
 * structuur, de uploadregels en het (advies-only) verschuiven van het biedmodel.
 */

export type QuoteEventKey = "quote_request" | "quote_qualified" | "quote_won";

export type QuoteEventBlueprint = {
  key: QuoteEventKey;
  /** Naam zoals de conversieactie in Google Ads moet heten. */
  googleActionName: string;
  label: string;
  description: string;
  /** Google Ads conversiecategorie. */
  category: "SUBMIT_LEAD_FORM" | "QUALIFIED_LEAD" | "PURCHASE";
  /** Google Ads categorie-enum die de connector accepteert. */
  createCategory: "SUBMIT_LEAD_FORM" | "REQUEST_QUOTE" | "PURCHASE";
  /** Offline click-import: altijd server-side upload vanuit SocialCockpit. */
  source: "server";
  countingType: "ONE_PER_CLICK";
  valueSource: "none" | "fixed" | "dynamic";
  /** Startfase: alleen de aanvraag is meebiedend. */
  initialBidding: "primary" | "secondary";
  uploadable: boolean;
};

export const QUOTE_EVENT_BLUEPRINTS: readonly QuoteEventBlueprint[] = [
  {
    key: "quote_request",
    googleActionName: "Offerte - Aanvraag",
    label: "Offerte - Aanvraag",
    description:
      "Succesvolle echte offerteaanvraag via een branche-landingspagina (geen test/preview).",
    category: "SUBMIT_LEAD_FORM",
    createCategory: "SUBMIT_LEAD_FORM",
    source: "server",
    countingType: "ONE_PER_CLICK",
    valueSource: "none",
    initialBidding: "primary",
    uploadable: true,
  },
  {
    key: "quote_qualified",
    googleActionName: "Offerte - Qualified",
    label: "Offerte - Qualified",
    description:
      "Lead is in SocialCockpit daadwerkelijk als Qualified (of Hot) gemarkeerd — kwaliteitssignaal.",
    category: "QUALIFIED_LEAD",
    createCategory: "SUBMIT_LEAD_FORM",
    source: "server",
    countingType: "ONE_PER_CLICK",
    valueSource: "none",
    initialBidding: "secondary",
    uploadable: true,
  },
  {
    key: "quote_won",
    googleActionName: "Offerte - Klant",
    label: "Offerte - Klant",
    description:
      "Lead is klant geworden. Waarde = werkelijke klant-/orderwaarde uit SocialCockpit, nooit een AI-schatting.",
    category: "PURCHASE",
    createCategory: "PURCHASE",
    source: "server",
    countingType: "ONE_PER_CLICK",
    valueSource: "dynamic",
    initialBidding: "secondary",
    uploadable: true,
  },
] as const;

export const QUOTE_EVENT_KEYS = QUOTE_EVENT_BLUEPRINTS.map((b) => b.key);

export function quoteBlueprint(key: string): QuoteEventBlueprint | undefined {
  return QUOTE_EVENT_BLUEPRINTS.find((b) => b.key === key);
}

/** De conversieactie waarop een nieuwe Search-campagne in de startfase biedt. */
export const INITIAL_PRIMARY_BID_EVENT: QuoteEventKey = "quote_request";

/** Vaste click-ID prioriteit voor offline uploads. */
export const CLICK_ID_PRIORITY = ["gclid", "gbraid", "wbraid"] as const;

/**
 * Advies-only drempels voor het verschuiven van het biedmodel naar een diepere
 * stap. Nooit automatisch: de gebruiker keurt elke verschuiving expliciet goed.
 * Richtlijn Google: ~30 conversies per 30 dagen voor stabiel biedgedrag.
 */
export const BID_SHIFT_THRESHOLDS = {
  windowDays: 30,
  qualifiedPerWindow: 30,
  wonPerWindow: 15,
} as const;

export type BidShiftAdvice = {
  currentPrimary: QuoteEventKey;
  recommendedPrimary: QuoteEventKey;
  shift: boolean;
  requiresApproval: true;
  reason: string;
  counts: { request: number; qualified: number; won: number; windowDays: number };
};

/**
 * Deterministisch advies (geen AI): mag het optimalisatiedoel opschuiven?
 * Voert nooit iets uit — het resultaat is altijd een voorstel.
 */
export function adviseBidShift(input: {
  currentPrimary?: QuoteEventKey;
  uploadedRequests: number;
  uploadedQualified: number;
  uploadedWon: number;
  windowDays?: number;
}): BidShiftAdvice {
  const windowDays = input.windowDays ?? BID_SHIFT_THRESHOLDS.windowDays;
  const currentPrimary = input.currentPrimary ?? INITIAL_PRIMARY_BID_EVENT;
  const counts = {
    request: input.uploadedRequests,
    qualified: input.uploadedQualified,
    won: input.uploadedWon,
    windowDays,
  };

  if (input.uploadedWon >= BID_SHIFT_THRESHOLDS.wonPerWindow)
    return {
      currentPrimary,
      recommendedPrimary: "quote_won",
      shift: currentPrimary !== "quote_won",
      requiresApproval: true,
      counts,
      reason: `${input.uploadedWon} bevestigde klantconversies in ${windowDays} dagen (drempel ${BID_SHIFT_THRESHOLDS.wonPerWindow}) — bieden op werkelijke omzet is haalbaar.`,
    };

  if (input.uploadedQualified >= BID_SHIFT_THRESHOLDS.qualifiedPerWindow)
    return {
      currentPrimary,
      recommendedPrimary: "quote_qualified",
      shift: currentPrimary !== "quote_qualified",
      requiresApproval: true,
      counts,
      reason: `${input.uploadedQualified} bevestigde qualified-conversies in ${windowDays} dagen (drempel ${BID_SHIFT_THRESHOLDS.qualifiedPerWindow}) — bieden op leadkwaliteit is haalbaar.`,
    };

  return {
    currentPrimary,
    recommendedPrimary: INITIAL_PRIMARY_BID_EVENT,
    shift: false,
    requiresApproval: true,
    counts,
    reason: `Te weinig diepe conversies in ${windowDays} dagen (qualified ${input.uploadedQualified}/${BID_SHIFT_THRESHOLDS.qualifiedPerWindow}, klant ${input.uploadedWon}/${BID_SHIFT_THRESHOLDS.wonPerWindow}). Blijf bieden op Offerte - Aanvraag.`,
  };
}

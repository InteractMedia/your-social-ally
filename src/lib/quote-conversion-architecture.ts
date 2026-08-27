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
 *
 * Volume is een NUTTIG SIGNAAL, nooit de enige beslisregel. Naast volume gelden
 * even harde voorwaarden: attributiekwaliteit (hoeveel conversies daadwerkelijk
 * met een click-ID zijn geüpload en door Google geaccepteerd), stabiliteit over
 * tijd (spreiding over meerdere weken, niet één uitschieter) en voldoende
 * campagne-specifieke data (het bieddoel geldt per campagne, dus de campagne
 * zelf moet die conversies ook echt hebben gezien).
 */
export const BID_SHIFT_THRESHOLDS = {
  windowDays: 30,
  qualifiedPerWindow: 30,
  wonPerWindow: 15,
  /** Aandeel events dat met click-ID succesvol geüpload is (attributiekwaliteit). */
  minAttributionQuality: 0.7,
  /** Aantal weken binnen het venster met minimaal één diepe conversie. */
  minActiveWeeks: 3,
  /** Minimaal aantal diepe conversies in de campagne zelf. */
  minCampaignConversions: 15,
  minCampaignConversionsWon: 8,
} as const;

export type BidShiftCriterion = {
  key: "volume" | "attribution_quality" | "stability" | "campaign_data";
  label: string;
  passed: boolean;
  detail: string;
};

export type BidShiftAdvice = {
  currentPrimary: QuoteEventKey;
  recommendedPrimary: QuoteEventKey;
  /** Alleen true als ELKE voorwaarde is gehaald. */
  shift: boolean;
  requiresApproval: true;
  reason: string;
  criteria: BidShiftCriterion[];
  /** Volume alleen gehaald, maar een andere voorwaarde nog niet. */
  volumeOnly: boolean;
  counts: { request: number; qualified: number; won: number; windowDays: number };
};

export type BidShiftInput = {
  currentPrimary?: QuoteEventKey;
  uploadedRequests: number;
  uploadedQualified: number;
  uploadedWon: number;
  windowDays?: number;
  /** Events met bruikbaar click-ID / geaccepteerd door Google, van totaal aantal events. */
  attributedEvents?: number;
  totalEvents?: number;
  /** Weken binnen het venster met minimaal één diepe conversie. */
  weeksWithConversions?: number;
  /** Diepe conversies toegerekend aan de campagne waarvoor het advies geldt. */
  campaignConversions?: number;
};

function ratio(a?: number, b?: number): number | null {
  if (a == null || b == null || b <= 0) return null;
  return a / b;
}

/**
 * Deterministisch advies (geen AI): mag het optimalisatiedoel opschuiven?
 * Voert nooit iets uit — het resultaat is altijd een voorstel dat de gebruiker
 * expliciet goedkeurt. Volume alléén is nooit voldoende.
 */
export function adviseBidShift(input: BidShiftInput): BidShiftAdvice {
  const windowDays = input.windowDays ?? BID_SHIFT_THRESHOLDS.windowDays;
  const currentPrimary = input.currentPrimary ?? INITIAL_PRIMARY_BID_EVENT;
  const counts = {
    request: input.uploadedRequests,
    qualified: input.uploadedQualified,
    won: input.uploadedWon,
    windowDays,
  };

  const wonVolume = input.uploadedWon >= BID_SHIFT_THRESHOLDS.wonPerWindow;
  const qualifiedVolume = input.uploadedQualified >= BID_SHIFT_THRESHOLDS.qualifiedPerWindow;
  const target: QuoteEventKey | null = wonVolume
    ? "quote_won"
    : qualifiedVolume
      ? "quote_qualified"
      : null;

  const attribution = ratio(input.attributedEvents, input.totalEvents);
  const attributionPassed =
    attribution !== null && attribution >= BID_SHIFT_THRESHOLDS.minAttributionQuality;
  const stabilityPassed =
    (input.weeksWithConversions ?? 0) >= BID_SHIFT_THRESHOLDS.minActiveWeeks;
  const campaignNeeded = wonVolume
    ? BID_SHIFT_THRESHOLDS.minCampaignConversionsWon
    : BID_SHIFT_THRESHOLDS.minCampaignConversions;
  const campaignPassed = (input.campaignConversions ?? 0) >= campaignNeeded;

  const criteria: BidShiftCriterion[] = [
    {
      key: "volume",
      label: "Conversievolume",
      passed: target !== null,
      detail: `Qualified ${input.uploadedQualified}/${BID_SHIFT_THRESHOLDS.qualifiedPerWindow}, klant ${input.uploadedWon}/${BID_SHIFT_THRESHOLDS.wonPerWindow} in ${windowDays} dagen.`,
    },
    {
      key: "attribution_quality",
      label: "Attributiekwaliteit",
      passed: attributionPassed,
      detail:
        attribution === null
          ? "Nog onbekend: te weinig geüploade events om de match met Google-clicks te beoordelen."
          : `${Math.round(attribution * 100)}% van de events is met click-ID geüpload en geaccepteerd (minimaal ${Math.round(BID_SHIFT_THRESHOLDS.minAttributionQuality * 100)}%).`,
    },
    {
      key: "stability",
      label: "Stabiliteit over tijd",
      passed: stabilityPassed,
      detail: `${input.weeksWithConversions ?? 0} van de weken in het venster met diepe conversies (minimaal ${BID_SHIFT_THRESHOLDS.minActiveWeeks}) — één piekweek is geen trend.`,
    },
    {
      key: "campaign_data",
      label: "Campagne-specifieke data",
      passed: campaignPassed,
      detail: `${input.campaignConversions ?? 0} diepe conversies in de campagne zelf (minimaal ${campaignNeeded}).`,
    },
  ];

  const allPassed = criteria.every((c) => c.passed);
  const volumeOnly = target !== null && !allPassed;
  const recommendedPrimary = allPassed && target ? target : INITIAL_PRIMARY_BID_EVENT;
  const failed = criteria.filter((c) => !c.passed).map((c) => c.label);

  return {
    currentPrimary,
    recommendedPrimary,
    shift: allPassed && !!target && currentPrimary !== target,
    requiresApproval: true,
    counts,
    criteria,
    volumeOnly,
    reason: allPassed
      ? `Alle voorwaarden gehaald (volume, attributiekwaliteit, stabiliteit en campagne-specifieke data) — bieden op ${target === "quote_won" ? "werkelijke omzet" : "leadkwaliteit"} is verantwoord. Verschuiven vraagt nog altijd jouw goedkeuring.`
      : volumeOnly
        ? `Het volume is er, maar nog niet voldoende onderbouwing op: ${failed.join(", ")}. Blijf bieden op Offerte - Aanvraag.`
        : `Nog niet genoeg onderbouwing om te verschuiven: ${failed.join(", ")}. Blijf bieden op Offerte - Aanvraag.`,
  };
}

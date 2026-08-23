/**
 * Deterministische server-side decision guardrails (V1.4A).
 *
 * De AI bepaalt WAT hij denkt (advice_confidence). Dit bestand bepaalt of een
 * voorstel ooit uitgevoerd MAG worden (execution_eligibility), op basis van
 * onze eigen datakwaliteit en een contradictiecheck op de AI-output.
 *
 * Belangrijk: een AI-confidence van 90 of 95 kan een blokkade NOOIT overrulen.
 * V1.4B mag uitsluitend acties uitvoeren wanneer execution_eligibility === "ALLOWED".
 *
 * Deze module is puur en client-safe (geen server-imports, geen side effects).
 */

export const GUARDRAIL_VERSION = "guardrails-v1.4a-1";

export type ExecutionEligibility = "ALLOWED" | "REVIEW_ONLY" | "BLOCKED";

export const EXECUTION_ELIGIBILITY_LABELS: Record<ExecutionEligibility, string> = {
  ALLOWED: "UITVOERBAAR",
  REVIEW_ONLY: "ALLEEN BEOORDELEN",
  BLOCKED: "GEBLOKKEERD",
};

/** Ingrijpende write-acties: strengste guardrails. */
export const HIGH_IMPACT_WRITE_TYPES = [
  "PAUSE_CAMPAIGN",
  "DECREASE_BUDGET",
  "INCREASE_BUDGET",
  "BID_STRATEGY_CHANGE",
] as const;

/** Overige acties die in V1.4B een schrijfactie in Google Ads zouden worden. */
export const WRITE_ACTION_TYPES = [
  ...HIGH_IMPACT_WRITE_TYPES,
  "PAUSE_KEYWORD",
  "NEGATIVE_KEYWORD",
  "NEW_SEARCH_CAMPAIGN",
  "NEW_AD_GROUP",
  "NEW_KEYWORD",
  "NEW_AD_COPY",
] as const;

export function isHighImpactWrite(adviceType: string): boolean {
  return (HIGH_IMPACT_WRITE_TYPES as readonly string[]).includes(adviceType);
}

export function isWriteAction(adviceType: string): boolean {
  return (WRITE_ACTION_TYPES as readonly string[]).includes(adviceType);
}

export type GuardrailReasonCode =
  | "insufficient_evidence_for_campaign_pause"
  | "advice_contradicts_own_evidence"
  | "no_b2b_lead_data"
  | "no_revenue_attribution"
  | "tracking_issue_not_technically_proven"
  | "measurement_technically_active"
  | "insufficient_sample_size"
  | "conversion_lag_risk"
  | "traffic_shift_vs_previous_period"
  | "weak_campaign_attribution"
  | "data_quality_warnings"
  | "no_execution_layer_in_v14a";

export const GUARDRAIL_REASON_LABELS: Record<GuardrailReasonCode, string> = {
  insufficient_evidence_for_campaign_pause:
    "Onvoldoende bewijs dat de conversiemeting defect is — een campagne pauzeren mag hier niet op gebaseerd worden.",
  advice_contradicts_own_evidence:
    "Het advies spreekt zijn eigen onderbouwing tegen (de onderbouwing noemt het bewijs onvoldoende of hypothetisch).",
  no_b2b_lead_data: "Geen echte SocialCockpit B2B-leaddata in deze periode.",
  no_revenue_attribution: "Geen betrouwbare omzet- of klantattributie beschikbaar.",
  tracking_issue_not_technically_proven:
    "Trackingprobleem is niet technisch bewezen (geen harde technische aanwijzing).",
  measurement_technically_active:
    "Primaire conversies zijn 0, maar andere meetevents bewijzen dat de meting technisch actief is: dit is een configuratiebevinding, geen defecte meting.",
  insufficient_sample_size: "Sample size is te klein voor een betrouwbare conclusie.",
  conversion_lag_risk: "Conversievertraging (lookback windows) kan de conclusie nog veranderen.",
  traffic_shift_vs_previous_period:
    "Huidige spend/traffic wijkt sterk af van de vergelijkingsperiode; de vergelijking is niet zuiver.",
  weak_campaign_attribution: "Een groot deel van de leads heeft geen campagne-attributie.",
  data_quality_warnings: "Er staan datakwaliteitswaarschuwingen open op deze dataset.",
  no_execution_layer_in_v14a:
    "V1.4A voert niets uit: goedkeuren legt alleen je beslissing vast voor een latere uitvoerfase.",
};

export type GuardrailBlocker = {
  code: GuardrailReasonCode;
  severity: "block" | "review";
  label: string;
};

export type DecisionFacts = {
  spend: number;
  clicks: number;
  impressions: number;
  primaryConversions: number;
  allConversions: number;
  measurementTechnicallyActive: boolean;
  zeroPrimaryButAllConversionsPresent: boolean;
  trackingIssueTechnicallyProven: boolean;
  leadsInPeriod: number;
  leadsWithCampaignAttribution: number;
  hasB2BLeadData: boolean;
  customers: number;
  revenue: number;
  hasRevenueAttribution: boolean;
  sampleSizeSufficient: boolean;
  conversionLagRisk: boolean;
  spendChangePct: number | null;
  trafficShiftSignificant: boolean;
  campaignMixChanged: boolean;
  dataQualityWarnings: number;
  periodDays: number;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Zet de AI-snapshot om in harde feiten. Bevat uitsluitend meetbare gegevens,
 * nooit AI-interpretatie.
 */
export function buildDecisionFacts(snapshot: any): DecisionFacts {
  const account = snapshot?.account ?? {};
  const current = account.current ?? {};
  const previous = account.previous ?? {};
  const tracking = snapshot?.trackingSignals ?? {};
  const dq = snapshot?.dataQuality ?? {};
  const b2b = snapshot?.socialCockpitB2B?.total ?? {};

  const spend = num(current.spend);
  const clicks = num(current.clicks);
  const primaryConversions = num(current.conversions);
  const allConversions = num(current.allConversions);
  const leadsInPeriod = num(dq.leadsInPeriod ?? b2b.leads);
  const leadsWithCampaignAttribution = num(dq.leadsWithCampaignAttribution);
  const customers = num(b2b.customers);
  const revenue = num(b2b.revenue);

  const measurementTechnicallyActive = allConversions > 0;
  const zeroPrimaryButAllConversionsPresent = primaryConversions === 0 && allConversions > 0;

  // Technisch bewijs voor een kapotte meting: noemenswaardige spend en clicks
  // terwijl er helemaal NIETS gemeten wordt, of onze eigen ingest werkt wel
  // terwijl Google Ads nul meetevents heeft.
  const trackingIssueTechnicallyProven =
    allConversions === 0 && spend >= 50 && clicks >= 100
      ? true
      : allConversions === 0 && leadsInPeriod > 0 && clicks >= 50;

  const prevSpend = num(previous.spend);
  const spendChangePct =
    tracking.spendChangePct ?? (prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : null);
  const trafficShiftSignificant = spendChangePct === null ? true : Math.abs(num(spendChangePct)) >= 40;

  const sampleSizeSufficient = clicks >= 100 && (leadsInPeriod >= 10 || primaryConversions >= 10);
  const periodDays = num(snapshot?.meta?.period?.days) || 30;

  return {
    spend,
    clicks,
    impressions: num(current.impressions),
    primaryConversions,
    allConversions,
    measurementTechnicallyActive,
    zeroPrimaryButAllConversionsPresent,
    trackingIssueTechnicallyProven,
    leadsInPeriod,
    leadsWithCampaignAttribution,
    hasB2BLeadData: leadsInPeriod > 0,
    customers,
    revenue,
    hasRevenueAttribution: customers > 0 && revenue > 0,
    sampleSizeSufficient,
    conversionLagRisk: true,
    spendChangePct: spendChangePct === null ? null : Number(num(spendChangePct).toFixed(1)),
    trafficShiftSignificant,
    campaignMixChanged: Boolean(tracking.campaignMixChanged),
    dataQualityWarnings: Array.isArray(dq.warnings) ? dq.warnings.length : 0,
    periodDays,
  };
}

export type DataConfidence = { score: number; level: "low" | "medium" | "high" };

/** Databetrouwbaarheid: puur onze datakwaliteit, los van wat de AI denkt. */
export function computeDataConfidence(facts: DecisionFacts): DataConfidence {
  let score = 100;
  if (!facts.hasB2BLeadData) score -= 30;
  if (!facts.hasRevenueAttribution) score -= 15;
  if (!facts.sampleSizeSufficient) score -= 15;
  if (facts.trafficShiftSignificant) score -= 10;
  if (facts.campaignMixChanged) score -= 10;
  if (facts.zeroPrimaryButAllConversionsPresent) score -= 10;
  if (
    facts.hasB2BLeadData &&
    facts.leadsWithCampaignAttribution / Math.max(1, facts.leadsInPeriod) < 0.5
  )
    score -= 10;
  score -= Math.min(15, facts.dataQualityWarnings * 5);

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: clamped,
    level: clamped >= 75 ? "high" : clamped >= 45 ? "medium" : "low",
  };
}

const HEDGE_PATTERNS = [
  "onvoldoende bewijs",
  "geen bewijs",
  "niet bewezen",
  "niet aangetoond",
  "kan niet worden vastgesteld",
  "niet met zekerheid",
  "hypothese",
  "vermoedelijk",
  "onzeker",
  "nader onderzoek",
  "nader te onderzoeken",
  "insufficient evidence",
  "not proven",
  "unverified",
];

const TRACKING_CLAIM_PATTERNS = [
  "tracking",
  "conversiemeting",
  "conversie meting",
  "meting",
  "meetprobleem",
  "measurement",
];

function textBlob(input: {
  title?: string | null;
  summary?: string | null;
  reasoning?: string | null;
  proposedAction?: string | null;
  evidence?: unknown;
  dataMissing?: unknown;
}): string {
  const parts = [
    input.title ?? "",
    input.summary ?? "",
    input.reasoning ?? "",
    input.proposedAction ?? "",
    input.evidence ? JSON.stringify(input.evidence) : "",
    input.dataMissing ? JSON.stringify(input.dataMissing) : "",
  ];
  return parts.join(" \n ").toLowerCase();
}

export type GuardrailInput = {
  adviceType: string;
  confidenceScore: number;
  title?: string | null;
  summary?: string | null;
  reasoning?: string | null;
  proposedAction?: string | null;
  proposedPayload?: unknown;
  evidence?: unknown;
  dataMissing?: unknown;
};

export type GuardrailDecision = {
  executionEligibility: ExecutionEligibility;
  dataConfidenceScore: number;
  dataConfidenceLevel: "low" | "medium" | "high";
  reasonCode: GuardrailReasonCode | null;
  reasonLabel: string | null;
  blockers: GuardrailBlocker[];
  contradiction: boolean;
  guardrailVersion: string;
};

/**
 * Deterministische beslissing ná de AI-output. AI-confidence is nooit een
 * argument om een blokkade op te heffen; hij kan alleen ALLOWED verhinderen.
 */
export function evaluateExecutionEligibility(
  input: GuardrailInput,
  facts: DecisionFacts,
): GuardrailDecision {
  const data = computeDataConfidence(facts);
  const blockers: GuardrailBlocker[] = [];
  const add = (code: GuardrailReasonCode, severity: "block" | "review") => {
    if (!blockers.some((b) => b.code === code))
      blockers.push({ code, severity, label: GUARDRAIL_REASON_LABELS[code] });
  };

  const blob = textBlob(input);
  const hedged = HEDGE_PATTERNS.some((p) => blob.includes(p));
  const claimsTracking = TRACKING_CLAIM_PATTERNS.some((p) => blob.includes(p));
  const payload = (input.proposedPayload ?? null) as any;
  const flaggedForInvestigation = payload?.requires_further_investigation === true;

  const highImpact = isHighImpactWrite(input.adviceType);
  const write = isWriteAction(input.adviceType);

  // 1. Contradictiecheck: onderbouwing zegt "onvoldoende bewijs", actie is ingrijpend.
  let contradiction = false;
  if (highImpact && (hedged || flaggedForInvestigation)) {
    contradiction = true;
    if (input.adviceType === "PAUSE_CAMPAIGN" && claimsTracking) {
      add("insufficient_evidence_for_campaign_pause", "block");
    } else {
      add("advice_contradicts_own_evidence", "block");
    }
  }

  // 2. Harde datavoorwaarden voor ingrijpende acties.
  if (highImpact) {
    if (!facts.hasB2BLeadData) add("no_b2b_lead_data", "block");
    if (!facts.hasRevenueAttribution) add("no_revenue_attribution", "block");
    if (!facts.sampleSizeSufficient) add("insufficient_sample_size", "block");
    if (facts.trafficShiftSignificant) add("traffic_shift_vs_previous_period", "review");
    if (facts.conversionLagRisk) add("conversion_lag_risk", "review");
    if (
      facts.hasB2BLeadData &&
      facts.leadsWithCampaignAttribution / Math.max(1, facts.leadsInPeriod) < 0.5
    )
      add("weak_campaign_attribution", "review");
  }

  // 3. Trackingargumentatie bij een pauzeeradvies.
  if (input.adviceType === "PAUSE_CAMPAIGN" && claimsTracking) {
    if (!facts.trackingIssueTechnicallyProven)
      add("insufficient_evidence_for_campaign_pause", "block");
    if (facts.zeroPrimaryButAllConversionsPresent) add("measurement_technically_active", "block");
  }
  if (
    highImpact &&
    claimsTracking &&
    !facts.trackingIssueTechnicallyProven &&
    input.adviceType !== "PAUSE_CAMPAIGN"
  ) {
    add("tracking_issue_not_technically_proven", "block");
  }

  // 4. Overige write-acties: datakwaliteit bepaalt of ze ooit ALLOWED kunnen worden.
  if (write && !highImpact) {
    if (data.level === "low") add("data_quality_warnings", "review");
    if (!facts.sampleSizeSufficient) add("insufficient_sample_size", "review");
  }

  const hasBlock = blockers.some((b) => b.severity === "block");
  let eligibility: ExecutionEligibility;
  if (!write) {
    eligibility = "REVIEW_ONLY"; // inzicht-adviezen worden nooit uitgevoerd
  } else if (hasBlock) {
    eligibility = "BLOCKED";
  } else if (blockers.length > 0 || data.level !== "high" || input.confidenceScore < 70) {
    eligibility = "REVIEW_ONLY";
  } else {
    eligibility = "ALLOWED";
  }

  const primary =
    blockers.find((b) => b.severity === "block") ??
    blockers[0] ??
    (write ? null : { code: "no_execution_layer_in_v14a" as GuardrailReasonCode, severity: "review" as const, label: GUARDRAIL_REASON_LABELS.no_execution_layer_in_v14a });

  return {
    executionEligibility: eligibility,
    dataConfidenceScore: data.score,
    dataConfidenceLevel: data.level,
    reasonCode: primary?.code ?? null,
    reasonLabel: primary?.label ?? null,
    blockers,
    contradiction,
    guardrailVersion: GUARDRAIL_VERSION,
  };
}

/** Enige toegestane poort voor een toekomstige V1.4B-uitvoerlaag. */
export function mayExecute(advice: {
  execution_eligibility?: string | null;
  status?: string | null;
}): boolean {
  return advice.execution_eligibility === "ALLOWED" && advice.status === "approved";
}

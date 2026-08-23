/**
 * CRO Intelligence / Evidence Layer (V1.6C) — client-safe contract.
 *
 * Every important commercial design decision of the AI Landing Page Strategist
 * must name the layer its recommendation comes from, in this priority order:
 *
 *   1. own_performance_data  — measured ZoetBezorgen performance for this page
 *   2. similar_own_data      — measured performance of comparable own pages
 *   3. external_evidence     — vetted external CRO/UX research in the knowledge base
 *   4. ai_hypothesis         — general AI expertise; explicitly untested
 *
 * The evidence LEVEL is never taken from the model at face value: it is graded
 * deterministically server-side from the source and the actual sample size, so
 * a general best practice can never be presented as proven for ZoetBezorgen.
 */

/* ------------------------------------------------------------------ layers */

export const EVIDENCE_SOURCES = [
  "own_performance_data",
  "similar_own_data",
  "external_evidence",
  "ai_hypothesis",
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  own_performance_data: "Eigen data",
  similar_own_data: "Vergelijkbare eigen data",
  external_evidence: "Externe evidence",
  ai_hypothesis: "Hypothese (AI-expertise)",
};

export const EVIDENCE_SOURCE_PRIORITY: Record<EvidenceSource, 1 | 2 | 3 | 4> = {
  own_performance_data: 1,
  similar_own_data: 2,
  external_evidence: 3,
  ai_hypothesis: 4,
};

export const EVIDENCE_LEVELS = ["STRONG", "MODERATE", "WEAK", "HYPOTHESIS"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  STRONG: "STRONG — sterk bewijs",
  MODERATE: "MODERATE — redelijk bewijs",
  WEAK: "WEAK — zwak bewijs",
  HYPOTHESIS: "HYPOTHESIS — nog niet getest",
};

const LEVEL_RANK: Record<EvidenceLevel, number> = {
  STRONG: 4,
  MODERATE: 3,
  WEAK: 2,
  HYPOTHESIS: 1,
};

/** Caps a level at a maximum; returns the weaker of the two. */
export function capLevel(level: EvidenceLevel, max: EvidenceLevel): EvidenceLevel {
  return LEVEL_RANK[level] <= LEVEL_RANK[max] ? level : max;
}

/* ---------------------------------------------------------- decision areas */

export const DECISION_AREAS = [
  "page_structure",
  "hero",
  "headline",
  "copy",
  "cta",
  "proof",
  "objections",
  "products",
  "form",
  "form_fields",
  "visual_treatment",
  "section_order",
  "mobile",
  "seo",
  "targeting",
] as const;
export type DecisionArea = (typeof DECISION_AREAS)[number];

export const DECISION_AREA_LABELS: Record<DecisionArea, string> = {
  page_structure: "Pagina-opbouw",
  hero: "Hero-opbouw",
  headline: "Headline",
  copy: "Copy",
  cta: "CTA",
  proof: "Bewijs / social proof",
  objections: "Bezwaren",
  products: "Productselectie",
  form: "Formulier",
  form_fields: "Formuliervelden",
  visual_treatment: "Visual treatment",
  section_order: "Sectievolgorde",
  mobile: "Mobiele opbouw",
  seo: "SEO / metadata",
  targeting: "Doelgroep / intentie",
};

/* ------------------------------------------------- commercial goal ranking */

/**
 * The strategist may NOT optimise for raw lead volume. Downstream commercial
 * quality outranks conversion rate whenever enough downstream data exists.
 */
export const COMMERCIAL_OBJECTIVES = [
  { key: "revenue", label: "Omzet / klant", weight: 100, rank: 1 },
  { key: "qualified_lead", label: "Qualified lead", weight: 25, rank: 2 },
  { key: "lead", label: "Lead", weight: 8, rank: 3 },
  { key: "form_submission", label: "Formulierinzending", weight: 4, rank: 4 },
  { key: "form_start", label: "Formulierstart", weight: 2, rank: 5 },
  { key: "cta_click", label: "CTA-klik", weight: 1, rank: 6 },
] as const;

export type CommercialObjectiveKey = (typeof COMMERCIAL_OBJECTIVES)[number]["key"];

export const COMMERCIAL_HIERARCHY_TEXT =
  "customer/revenue > qualified lead > lead > form submission > form start > CTA click";

export type DownstreamFunnel = {
  views: number;
  cta_clicks: number;
  form_started: number;
  form_submitted: number;
  leads: number;
  qualified: number;
  hot: number;
  customers: number;
  revenue: number;
};

export const emptyDownstreamFunnel = (): DownstreamFunnel => ({
  views: 0,
  cta_clicks: 0,
  form_started: 0,
  form_submitted: 0,
  leads: 0,
  qualified: 0,
  hot: 0,
  customers: 0,
  revenue: 0,
});

/**
 * One comparable number per 100 visits, weighted by commercial value. Pure
 * conversion rate is deliberately NOT the ranking metric: a page with fewer
 * but better leads must be able to win.
 */
export function commercialScore(f: DownstreamFunnel): number | null {
  if (f.views <= 0) return null;
  const weighted =
    f.customers * 100 + f.qualified * 25 + f.leads * 8 + f.form_submitted * 4 + f.cta_clicks * 1;
  return Number(((weighted / f.views) * 100).toFixed(1));
}

/** Revenue per 100 visits — only meaningful once customers exist. */
export function revenuePer100Visits(f: DownstreamFunnel): number | null {
  if (f.views <= 0 || f.customers <= 0) return null;
  return Number(((f.revenue / f.views) * 100).toFixed(2));
}

/**
 * Which objective a comparison may honestly be judged on, given the data that
 * actually exists. Never claim a revenue conclusion from 2 customers.
 */
export function decidableObjective(f: DownstreamFunnel): {
  objective: CommercialObjectiveKey;
  reason: string;
} {
  if (f.customers >= 10) return { objective: "revenue", reason: `${f.customers} klanten gemeten` };
  if (f.qualified >= 15)
    return { objective: "qualified_lead", reason: `${f.qualified} qualified leads gemeten` };
  if (f.leads >= 30) return { objective: "lead", reason: `${f.leads} leads gemeten` };
  if (f.form_submitted >= 25)
    return { objective: "form_submission", reason: `${f.form_submitted} inzendingen gemeten` };
  if (f.form_started >= 40)
    return { objective: "form_start", reason: `${f.form_started} formulierstarts gemeten` };
  return {
    objective: "cta_click",
    reason:
      "Te weinig downstream data (leads/qualified/klanten) om op kwaliteit of omzet te beslissen; alleen bovenkant van de funnel is meetbaar.",
  };
}

/* ---------------------------------------------------- deterministic grading */

export type DecisionInput = {
  decision_area: string;
  decision: string;
  evidence_source: string;
  evidence_level?: string;
  sample_size?: number | null;
  metric?: string | null;
  observed_result?: string | null;
  applicability?: string | null;
  confidence?: number | null;
  reasoning_summary?: string | null;
  evidence_refs?: unknown[];
  ab_test_recommended?: boolean;
};

export type GradedDecision = DecisionInput & {
  evidence_source: EvidenceSource;
  evidence_level: EvidenceLevel;
  sample_size: number | null;
  confidence: number;
  ab_test_recommended: boolean;
  downgraded_from: EvidenceLevel | null;
  downgrade_reason: string | null;
};

/** Thresholds per metric family for calling own data STRONG rather than WEAK. */
function ownDataMaxLevel(metric: string | null | undefined, sample: number): EvidenceLevel {
  const m = (metric ?? "").toLowerCase();
  const revenueMetric = /revenue|omzet|customer|klant|marge/.test(m);
  const qualityMetric = /qualified|hot|kwaliteit|quality/.test(m);
  const leadMetric = /lead/.test(m);

  if (revenueMetric) {
    if (sample >= 25) return "STRONG";
    if (sample >= 10) return "MODERATE";
    return "WEAK";
  }
  if (qualityMetric) {
    if (sample >= 40) return "STRONG";
    if (sample >= 15) return "MODERATE";
    return "WEAK";
  }
  if (leadMetric) {
    if (sample >= 60) return "STRONG";
    if (sample >= 30) return "MODERATE";
    return "WEAK";
  }
  // Funnel-top metrics (views, CTA, form start/submit) need more volume.
  if (sample >= 400) return "STRONG";
  if (sample >= 150) return "MODERATE";
  if (sample >= 40) return "WEAK";
  return "HYPOTHESIS";
}

/**
 * Grades one AI-reported decision. This is the anti-false-certainty guard:
 *
 *  - own data may only be STRONG with a real sample behind it;
 *  - comparable own data is capped at MODERATE (different page, different context);
 *  - external research is capped at MODERATE and always labelled as untested here;
 *  - AI expertise is always HYPOTHESIS and always gets an A/B test recommendation.
 */
export function gradeDecision(input: DecisionInput): GradedDecision {
  const source = (EVIDENCE_SOURCES as readonly string[]).includes(input.evidence_source)
    ? (input.evidence_source as EvidenceSource)
    : "ai_hypothesis";
  const claimed = (EVIDENCE_LEVELS as readonly string[]).includes(input.evidence_level ?? "")
    ? (input.evidence_level as EvidenceLevel)
    : "HYPOTHESIS";
  const sample =
    typeof input.sample_size === "number" && Number.isFinite(input.sample_size)
      ? Math.max(0, Math.round(input.sample_size))
      : null;

  let max: EvidenceLevel;
  let reason: string | null = null;

  switch (source) {
    case "own_performance_data": {
      max = ownDataMaxLevel(input.metric, sample ?? 0);
      if (max !== "STRONG")
        reason = `Eigen data, maar de steekproef (${sample ?? 0}) is te klein voor sterk bewijs op "${input.metric ?? "onbekende metric"}".`;
      break;
    }
    case "similar_own_data": {
      max = capLevel(ownDataMaxLevel(input.metric, sample ?? 0), "MODERATE");
      reason =
        "Gebaseerd op vergelijkbare eigen pagina's, niet op deze pagina zelf: overdraagbaarheid is niet bewezen.";
      break;
    }
    case "external_evidence": {
      max = "MODERATE";
      reason = "Externe evidence suggereert dit, maar het is nog niet getest op ZoetBezorgen.";
      break;
    }
    default: {
      max = "HYPOTHESIS";
      reason = "Geen data of externe evidence: dit is een hypothese en moet getest worden.";
      break;
    }
  }

  const level = capLevel(claimed, max);
  const downgraded = LEVEL_RANK[level] < LEVEL_RANK[claimed];

  const confidenceCap: Record<EvidenceLevel, number> = {
    STRONG: 95,
    MODERATE: 75,
    WEAK: 55,
    HYPOTHESIS: 40,
  };
  const rawConfidence =
    typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? Math.max(0, Math.min(100, Math.round(input.confidence)))
      : 50;

  return {
    ...input,
    evidence_source: source,
    evidence_level: level,
    sample_size: sample,
    confidence: Math.min(rawConfidence, confidenceCap[level]),
    ab_test_recommended:
      Boolean(input.ab_test_recommended) || level === "HYPOTHESIS" || level === "WEAK",
    downgraded_from: downgraded ? claimed : null,
    downgrade_reason: downgraded || level !== "STRONG" ? reason : null,
    applicability: input.applicability ?? (source === "external_evidence" ? reason : null),
  };
}

/** One-line label for the UI: "Hero-opbouw — externe evidence — MODERATE". */
export function decisionSummaryLine(d: {
  decision_area: string;
  evidence_source: string;
  evidence_level: string;
}): string {
  const area = DECISION_AREA_LABELS[d.decision_area as DecisionArea] ?? d.decision_area;
  const src = EVIDENCE_SOURCE_LABELS[d.evidence_source as EvidenceSource] ?? d.evidence_source;
  return `${area} — ${src} — ${d.evidence_level}`;
}

/* --------------------------------------------------------------- KB row type */

export type CroEvidenceRow = {
  id: string;
  workspace_id: string | null;
  principle: string;
  topic: string;
  applies_to: string[];
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  evidence_level: EvidenceLevel;
  context: string | null;
  limitations: string | null;
  recommended_application: string | null;
  metric: string | null;
  tags: string[];
  active: boolean;
  created_at: string;
};

export type LandingAiDecisionRow = {
  id: string;
  proposal_id: string | null;
  decision_area: string;
  decision: string;
  evidence_source: EvidenceSource;
  evidence_level: EvidenceLevel;
  sample_size: number | null;
  metric: string | null;
  observed_result: string | null;
  applicability: string | null;
  confidence: number;
  reasoning_summary: string | null;
  evidence_refs: unknown[];
  ab_test_recommended: boolean;
  downgraded_from: string | null;
  downgrade_reason: string | null;
  sort_order: number;
};

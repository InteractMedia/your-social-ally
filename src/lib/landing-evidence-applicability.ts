/**
 * Evidence applicability validator (V1.8B) — client-safe, deterministic.
 *
 * An external evidence item may only support a decision when it actually
 * applies to the decision's context. An item that names the current context
 * in `not_applicable_to`, or whose funnel/audience/topic scope does not match,
 * can NEVER back a MODERATE/STRONG claim — AI confidence cannot overrule this.
 *
 * Outcomes when a reference fails the check:
 *  - the evidence-ref is removed from the decision;
 *  - with no refs left, an external_evidence decision becomes an AI hypothesis;
 *  - with only weaker refs left, the level is capped at WEAK.
 */
import {
  capLevel,
  type CroEvidenceRow,
  type EvidenceLevel,
  type EvidenceSource,
} from "./landing-cro-evidence";

export type ApplicabilityContext = {
  /** Funnel of the page, e.g. "quote_request". */
  funnelType: string;
  /** Page audience; the landing engine is B2B by default. */
  audience: "b2b" | "b2c";
  /** Decision area, e.g. "form", "hero". */
  decisionArea: string;
  /** Fine-grained decision key, e.g. "form_length_fields". */
  decisionKey?: string;
};

/** All context tokens an evidence item can (dis)claim applicability for. */
export function contextTokens(ctx: ApplicabilityContext): Set<string> {
  const tokens = new Set<string>([ctx.funnelType, ctx.decisionArea]);
  if (ctx.decisionKey) tokens.add(ctx.decisionKey);
  // A B2B quote/lead form is a recognised context of its own.
  if (
    ctx.audience === "b2b" &&
    (ctx.decisionArea === "form" || ctx.decisionArea === "form_fields")
  ) {
    tokens.add("b2b_lead_form");
    tokens.add("quote_request");
  }
  return tokens;
}

export type ApplicabilityCheck = { applicable: boolean; reasons: string[] };

export function checkEvidenceApplicability(
  evidence: Pick<
    CroEvidenceRow,
    "not_applicable_to" | "funnel_type" | "audience" | "applies_to" | "topic"
  >,
  ctx: ApplicabilityContext,
): ApplicabilityCheck {
  const reasons: string[] = [];
  const tokens = contextTokens(ctx);

  const blocked = (evidence.not_applicable_to ?? []).filter((t) => tokens.has(t));
  if (blocked.length)
    reasons.push(`Evidence noemt deze context expliciet niet-toepasselijk: ${blocked.join(", ")}`);

  if (evidence.funnel_type?.length && !evidence.funnel_type.includes(ctx.funnelType))
    reasons.push(
      `Funnel mismatch: evidence geldt voor ${evidence.funnel_type.join("/")}, niet voor ${ctx.funnelType}`,
    );

  if (evidence.audience && evidence.audience !== "both" && evidence.audience !== ctx.audience)
    reasons.push(`Doelgroep mismatch: evidence is ${evidence.audience}, de pagina is ${ctx.audience}`);

  if (evidence.applies_to?.length && !evidence.applies_to.some((a) => tokens.has(a)))
    reasons.push(
      `Onderwerp mismatch: evidence geldt voor ${evidence.applies_to.join("/")}, niet voor ${ctx.decisionArea}`,
    );

  return { applicable: reasons.length === 0, reasons };
}

export type DecisionLike = {
  evidence_source: EvidenceSource;
  evidence_level: EvidenceLevel;
  evidence_refs?: unknown[];
  applicability?: string | null;
  downgraded_from?: string | null;
  downgrade_reason?: string | null;
};

export type ApplicabilityEnforcement<T extends DecisionLike> = {
  decision: T;
  removedRefs: { id: string; reasons: string[] }[];
  changed: boolean;
};

/**
 * Removes inapplicable evidence refs from a decision and downgrades it when
 * the remaining support no longer justifies the claimed level.
 */
export function enforceApplicabilityOnDecision<T extends DecisionLike>(
  decision: T,
  evidenceById: Map<string, CroEvidenceRow>,
  ctx: ApplicabilityContext,
): ApplicabilityEnforcement<T> {
  const refs = (decision.evidence_refs ?? []).map(String);
  const kept: string[] = [];
  const removed: { id: string; reasons: string[] }[] = [];

  for (const ref of refs) {
    const ev = evidenceById.get(ref);
    if (!ev || ev.active === false) {
      removed.push({ id: ref, reasons: ["Evidence-item niet gevonden of inactief"] });
      continue;
    }
    const check = checkEvidenceApplicability(ev, ctx);
    if (check.applicable) kept.push(ref);
    else removed.push({ id: ref, reasons: check.reasons });
  }

  if (!removed.length) return { decision, removedRefs: [], changed: false };

  let source = decision.evidence_source;
  let level = decision.evidence_level;
  const removalNote = `Applicability-check verwijderde evidence-ref(s): ${removed
    .map((r) => r.reasons.join("; "))
    .join(" | ")}`;

  if (source === "external_evidence") {
    if (kept.length === 0) {
      source = "ai_hypothesis";
      level = "HYPOTHESIS";
    } else {
      // Partial support: what remains is generic guidance, not the specific claim.
      level = capLevel(level, "WEAK");
    }
  }

  const next: T = {
    ...decision,
    evidence_refs: kept,
    evidence_source: source,
    evidence_level: level,
    applicability: [decision.applicability, removalNote].filter(Boolean).join(" "),
    downgraded_from:
      level !== decision.evidence_level
        ? (decision.downgraded_from ?? decision.evidence_level)
        : decision.downgraded_from,
    downgrade_reason: [decision.downgrade_reason, removalNote].filter(Boolean).join(" "),
  };
  return { decision: next, removedRefs: removed, changed: true };
}

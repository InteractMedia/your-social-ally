/**
 * Google Ads Execution V1 — goedgekeurde AI-adviezen uitvoeren.
 *
 * Claude mag voorstellen, nooit zelfstandig uitvoeren. Deze module wordt alleen
 * aangeroepen nadat een mens het advies in SocialCockpit heeft goedgekeurd en
 * expliciet op uitvoeren drukt. Elke actie logt voorstel, gebruikte data,
 * AI-redenering, oude en nieuwe waarde, wie goedkeurde en het Google-resultaat.
 */

import { gaql } from "./google-ads.server";
import { euros, matchTypeFor, mutate } from "./google-ads-write.server";

type Ctx = { supabase: any; userId: string };

import { isExecutableAdviceType as isExecutableType } from "./ai-analyst-shared";

export { isExecutableType };

type Payload = Record<string, any>;

const campaignRef = (cid: string, id: string) => `customers/${cid}/campaigns/${id}`;
const adGroupRef = (cid: string, id: string) => `customers/${cid}/adGroups/${id}`;

/** Leest de huidige waarde zodat het logboek een echte oude waarde bevat. */
async function readOldValue(
  cid: string,
  type: string,
  payload: Payload,
): Promise<{ old: unknown; extra: Payload }> {
  if (type === "INCREASE_BUDGET" || type === "DECREASE_BUDGET") {
    const rows = await gaql(
      cid,
      `SELECT campaign.id, campaign.name, campaign_budget.resource_name, campaign_budget.amount_micros
       FROM campaign WHERE campaign.id = ${Number(payload.campaignId)}`,
    );
    const r: any = rows[0];
    if (!r) throw new Error("Campagne niet gevonden in Google Ads.");
    return {
      old: { dailyBudget: Number(r.campaignBudget.amountMicros) / 1_000_000 },
      extra: { budgetResource: r.campaignBudget.resourceName, campaignName: r.campaign.name },
    };
  }
  if (type === "PAUSE_CAMPAIGN") {
    const rows = await gaql(
      cid,
      `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.id = ${Number(payload.campaignId)}`,
    );
    const r: any = rows[0];
    if (!r) throw new Error("Campagne niet gevonden in Google Ads.");
    return { old: { status: r.campaign.status }, extra: { campaignName: r.campaign.name } };
  }
  if (type === "PAUSE_KEYWORD") {
    const rows = await gaql(
      cid,
      `SELECT ad_group_criterion.resource_name, ad_group_criterion.status, ad_group_criterion.keyword.text
       FROM ad_group_criterion WHERE ad_group_criterion.criterion_id = ${Number(payload.criterionId)}
       AND ad_group.id = ${Number(payload.adGroupId)}`,
    );
    const r: any = rows[0];
    if (!r) throw new Error("Zoekwoord niet gevonden in Google Ads.");
    return {
      old: { status: r.adGroupCriterion.status, text: r.adGroupCriterion.keyword?.text },
      extra: { criterionResource: r.adGroupCriterion.resourceName },
    };
  }
  return { old: null, extra: {} };
}

/** Voert precies één goedgekeurde wijziging uit. */
export async function executeAdviceChange(opts: {
  cid: string;
  type: string;
  payload: Payload;
  extra: Payload;
}): Promise<{ newValue: unknown; result: unknown }> {
  const { cid, type, payload, extra } = opts;

  switch (type) {
    case "NEGATIVE_KEYWORD": {
      const text = String(payload.text ?? "").trim();
      if (!text) throw new Error("Geen zoekterm om uit te sluiten.");
      const matchType = matchTypeFor(String(payload.matchType ?? "PHRASE"));
      const res = await mutate(cid, "campaignCriteria", [
        {
          create: {
            campaign: campaignRef(cid, String(payload.campaignId)),
            negative: true,
            keyword: { text, matchType },
          },
        },
      ]);
      return { newValue: { negative: text, matchType }, result: res.resourceNames };
    }
    case "NEW_KEYWORD": {
      const text = String(payload.text ?? "").trim();
      if (!text) throw new Error("Geen zoekwoord om toe te voegen.");
      const matchType = matchTypeFor(String(payload.matchType ?? "PHRASE"));
      const res = await mutate(cid, "adGroupCriteria", [
        {
          create: {
            adGroup: adGroupRef(cid, String(payload.adGroupId)),
            status: "ENABLED",
            keyword: { text, matchType },
          },
        },
      ]);
      return { newValue: { keyword: text, matchType, status: "ENABLED" }, result: res.resourceNames };
    }
    case "PAUSE_KEYWORD": {
      const resource = extra.criterionResource as string;
      const res = await mutate(cid, "adGroupCriteria", [
        { update: { resourceName: resource, status: "PAUSED" }, updateMask: "status" },
      ]);
      return { newValue: { status: "PAUSED" }, result: res.resourceNames };
    }
    case "PAUSE_CAMPAIGN": {
      const res = await mutate(cid, "campaigns", [
        {
          update: { resourceName: campaignRef(cid, String(payload.campaignId)), status: "PAUSED" },
          updateMask: "status",
        },
      ]);
      return { newValue: { status: "PAUSED" }, result: res.resourceNames };
    }
    case "INCREASE_BUDGET":
    case "DECREASE_BUDGET": {
      const amount = Number(payload.newDailyBudget);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Geen geldig nieuw dagbudget.");
      const res = await mutate(cid, "campaignBudgets", [
        {
          update: { resourceName: extra.budgetResource as string, amountMicros: String(euros(amount)) },
          updateMask: "amount_micros",
        },
      ]);
      return { newValue: { dailyBudget: amount }, result: res.resourceNames };
    }
    default:
      throw new Error("Dit adviestype voert SocialCockpit niet uit; het blijft advies.");
  }
}

/**
 * Volledige, gelogde uitvoering van één goedgekeurd advies.
 * Weigert bij onvoldoende data, niet-goedgekeurde status of high-impact zonder
 * server-side toestemming.
 */
export async function runApprovedAdvice(opts: {
  ctx: Ctx;
  workspaceId: string;
  adviceId: string;
  customerId: string;
}): Promise<{ ok: boolean; error: string | null; logId?: string }> {
  const { ctx, workspaceId, adviceId, customerId } = opts;
  const { mayExecute } = await import("./ai-execution-guardrails");

  const { data: advice } = await ctx.supabase
    .from("ai_advice")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", adviceId)
    .maybeSingle();
  if (!advice) return { ok: false, error: "Advies niet gevonden." };

  if (!isExecutableType(advice.advice_type)) {
    return { ok: false, error: "Dit adviestype is alleen advies en wordt niet uitgevoerd." };
  }
  if (!mayExecute(advice)) {
    return {
      ok: false,
      error: `Uitvoeren geblokkeerd: ${advice.execution_block_reason_label ?? advice.execution_eligibility ?? "niet goedgekeurd"}`,
    };
  }
  // Bij onvoldoende data nooit high-impact uitvoeren; budgetverhoging is altijd
  // menselijk goedgekeurd en nooit autonoom.
  const highImpact = ["INCREASE_BUDGET", "PAUSE_CAMPAIGN"].includes(advice.advice_type);
  if (highImpact && (advice.data_confidence_level ?? "LAAG").toUpperCase() === "LAAG") {
    return { ok: false, error: "Onvoldoende databetrouwbaarheid voor een high-impact wijziging." };
  }

  const cid = customerId.replace(/[^0-9]/g, "");
  const payload = (advice.proposed_payload ?? {}) as Payload;
  const now = new Date().toISOString();

  let old: unknown = null;
  let extra: Payload = {};
  try {
    const read = await readOldValue(cid, advice.advice_type, payload);
    old = read.old;
    extra = read.extra;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const { data: logRow } = await ctx.supabase
    .from("google_ads_change_log")
    .insert({
      workspace_id: workspaceId,
      source: "ai_advice",
      advice_id: advice.id,
      customer_id: cid,
      entity_type: advice.entity_type,
      entity_id: advice.entity_id,
      entity_name: advice.entity_name ?? extra.campaignName ?? null,
      change_type: advice.advice_type,
      proposal: { title: advice.title, action: advice.proposed_action, payload },
      data_used: {
        data_available: advice.data_available,
        data_missing: advice.data_missing,
        data_confidence: advice.data_confidence_score,
        decision_facts: advice.decision_facts,
      },
      ai_reasoning: advice.reasoning ?? advice.summary,
      old_value: old as any,
      new_value: null,
      approved_by: ctx.userId,
      approved_at: now,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  try {
    const { newValue, result } = await executeAdviceChange({
      cid,
      type: advice.advice_type,
      payload,
      extra,
    });
    const done = new Date().toISOString();
    await ctx.supabase
      .from("google_ads_change_log")
      .update({ status: "executed", new_value: newValue as any, google_result: result as any, executed_at: done })
      .eq("id", logRow?.id);
    await ctx.supabase
      .from("ai_advice")
      .update({ status: "executed", reviewed_at: done })
      .eq("workspace_id", workspaceId)
      .eq("id", advice.id);
    return { ok: true, error: null, logId: logRow?.id };
  } catch (err) {
    const message = (err as Error).message;
    const failedAt = new Date().toISOString();
    await ctx.supabase
      .from("google_ads_change_log")
      .update({ status: "failed", google_error: message, executed_at: failedAt })
      .eq("id", logRow?.id);
    return { ok: false, error: message, logId: logRow?.id };
  }
}

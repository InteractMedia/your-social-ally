/**
 * Google Ads Execution V1 — het goedgekeurde concept exact aanmaken.
 *
 * Deze module bouwt eerst een definitieve samenvatting (diff) en voert daarna,
 * pas na expliciete menselijke goedkeuring, de schrijfacties uit. Er gebeurt
 * niets automatisch: geen wijzigingen na creatie, geen autonome budgetten.
 */

import type { BuilderProposal, SearchCampaignDraftRow } from "./campaign-builder-shared";
import type { CreationPlan, CreationPlanStep } from "./campaign-creation-shared";
import { gaql, GoogleAdsApiError } from "./google-ads.server";
import {
  biddingPayload,
  euros,
  geoTargetId,
  languageConstantId,
  matchTypeFor,
  mutate,
} from "./google-ads-write.server";

type Ctx = { supabase: any; userId: string };

const on = <T extends { enabled?: boolean }>(rows: T[] | undefined) =>
  (rows ?? []).filter((r) => r.enabled !== false);

/* -------------------------------------------------------------- diff/plan */

/** Deterministische samenvatting van alles wat er in Google Ads komt. */
export function buildCreationPlan(opts: {
  draft: SearchCampaignDraftRow;
  customerId: string;
  customerName?: string | null;
}): CreationPlan {
  const { draft } = opts;
  const p = draft.proposal as BuilderProposal;
  const blockers: string[] = [];
  const warnings: string[] = [];

  const groups = on(p.adGroups).map((g) => ({
    name: g.name,
    keywords: on(g.keywords).map((k) => ({ text: k.text, matchType: matchTypeFor(String(k.matchType)) })),
    headlines: on(g.headlines).map((h) => h.text),
    descriptions: on(g.descriptions).map((d) => d.text),
  }));
  const negatives = on(p.negativeKeywords).map((n) => ({
    text: n.text,
    matchType: matchTypeFor(String(n.matchType)),
  }));
  const sitelinks = on(p.sitelinks).map((s) => ({ text: s.text, description: s.description }));
  const callouts = on(p.callouts).map((c) => c.text);

  const budget = p.dailyBudget?.amount ?? draft.target_daily_budget ?? null;
  const locations = p.locations?.length ? p.locations : (draft.locations ?? []);
  const language = p.language || draft.language || "nl";
  const finalUrl = p.landingPageUrl || draft.landing_page_url || "";

  /* --------- blokkades: alles wat Google zou weigeren of fout zou zetten */
  if (draft.status !== "APPROVED_FOR_CREATION") {
    blockers.push("Concept staat niet op 'Goedgekeurd voor aanmaak'.");
  }
  if (draft.google_campaign_id) {
    blockers.push("Dit concept is al aangemaakt in Google Ads.");
  }
  const eligibility = (p.execution?.eligibility ?? "BLOCKED_FOR_CREATION").toUpperCase();
  if (eligibility !== "ALLOWED") {
    blockers.push(
      `Server-side controle staat op ${eligibility}: ${(p.execution?.blockers ?? []).join(" ") || "niet uitvoerbaar"}`,
    );
  }
  if (!/^https:\/\//i.test(finalUrl)) blockers.push("Geen absolute https final URL.");
  if (!budget || budget <= 0) blockers.push("Geen dagbudget vastgesteld.");
  if (groups.length === 0) blockers.push("Geen actieve advertentiegroepen.");
  groups.forEach((g) => {
    if (g.keywords.length === 0) blockers.push(`Advertentiegroep "${g.name}" heeft geen keywords.`);
    if (g.headlines.length < 3) blockers.push(`Advertentiegroep "${g.name}" heeft minder dan 3 koppen.`);
    if (g.descriptions.length < 2)
      blockers.push(`Advertentiegroep "${g.name}" heeft minder dan 2 beschrijvingen.`);
    g.headlines.forEach((h) => {
      if (h.length > 30) blockers.push(`Kop te lang (${h.length} tekens): "${h}"`);
    });
    g.descriptions.forEach((d) => {
      if (d.length > 90) blockers.push(`Beschrijving te lang (${d.length} tekens): "${d}"`);
    });
  });
  if (locations.length === 0) blockers.push("Geen locatietargeting vastgesteld.");
  locations.forEach((l) => {
    if (geoTargetId(l) == null) blockers.push(`Locatie "${l}" is niet bekend als Google-doelgebied.`);
  });
  if (languageConstantId(language) == null) blockers.push(`Taal "${language}" is niet herkend.`);
  if (!p.conversionGoal?.actionId) {
    warnings.push(
      "Geen specifieke conversieactie gekoppeld: de campagne volgt de accountdoelen in plaats van één bieddoel.",
    );
  }

  const network = p.network ?? { searchNetwork: true, searchPartners: false, displayNetwork: false };
  const strategy = String(p.bidding?.strategy ?? "MAXIMIZE_CONVERSIONS");
  const target = p.bidding?.target ?? null;
  const currency = p.dailyBudget?.currency || "EUR";

  const steps: CreationPlanStep[] = [
    {
      label: "Campagnebudget",
      before: "bestaat niet",
      after: `${currency} ${budget ?? 0} per dag (gedeeld budget: nee)`,
    },
    {
      label: "Search-campagne",
      before: "bestaat niet",
      after: `${p.campaignName} — gepauzeerd, alleen zoeknetwerk, partners ${
        network.searchPartners ? "aan" : "uit"
      }, display ${network.displayNetwork ? "aan" : "uit"}`,
    },
    {
      label: "Biedstrategie",
      before: "—",
      after: target ? `${strategy} met doel ${target}` : `${strategy} zonder doel`,
    },
    {
      label: "Conversiedoel",
      before: "accountdoelen",
      after: p.conversionGoal?.actionId
        ? `${p.conversionGoal.name} (actie ${p.conversionGoal.actionId})`
        : "accountdoelen (geen specifieke actie)",
    },
    {
      label: "Locaties en taal",
      before: "—",
      after: `${locations.join(", ")} — ${p.locationOption ?? "PRESENCE"}; taal ${language}`,
    },
    ...groups.map((g) => ({
      label: `Advertentiegroep ${g.name}`,
      before: "bestaat niet",
      after: `${g.keywords.length} keywords, 1 responsieve zoekadvertentie (${g.headlines.length} koppen, ${g.descriptions.length} beschrijvingen)`,
    })),
    {
      label: "Uitsluitingen",
      before: "geen",
      after: `${negatives.length} negatieve keywords op campagnaniveau`,
    },
    {
      label: "Extra's",
      before: "geen",
      after: `${sitelinks.length} sitelinks, ${callouts.length} callouts`,
    },
    { label: "Final URL", before: "—", after: finalUrl },
  ];

  return {
    campaignName: p.campaignName,
    customerId: opts.customerId,
    customerName: opts.customerName ?? null,
    finalUrl,
    locations,
    language,
    dailyBudget: budget,
    currency,
    biddingStrategy: strategy,
    biddingTarget: target,
    conversionGoalName: p.conversionGoal?.name ?? "—",
    conversionActionId: p.conversionGoal?.actionId ?? null,
    network,
    locationOption: p.locationOption ?? "PRESENCE",
    adGroups: groups,
    negativeKeywords: negatives,
    sitelinks,
    callouts,
    steps,
    blockers,
    warnings,
    startStatus: "PAUSED",
  };
}

/* ------------------------------------------------------------- uitvoering */

export type CreationOutcome = {
  campaignId: string;
  campaignResourceName: string;
  resourceNames: Record<string, unknown>;
  steps: { step: string; result: string }[];
};

/**
 * Maakt exact het goedgekeurde concept aan. Campagne start GEPAUZEERD zodat er
 * nooit ongewild geld wordt uitgegeven; activeren is een aparte, handmatige stap.
 */
export async function createCampaignInGoogle(opts: {
  plan: CreationPlan;
  proposal: BuilderProposal;
  loginCustomerId?: string | null;
}): Promise<CreationOutcome> {
  const { plan, proposal } = opts;
  const cid = plan.customerId.replace(/[^0-9]/g, "");
  const log: { step: string; result: string }[] = [];
  const resources: Record<string, unknown> = {};
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

  /* 1. budget */
  const budgetRes = await mutate(
    cid,
    "campaignBudgets",
    [
      {
        create: {
          name: `${plan.campaignName} budget ${stamp}`,
          amountMicros: String(euros(plan.dailyBudget ?? 0)),
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    ],
    { ...opts, label: "Campagnebudget" },
  );
  const budgetResource = budgetRes.resourceNames[0]!;
  resources.campaignBudget = budgetResource;
  log.push({ step: "Campagnebudget", result: budgetResource });

  /* 2. campagne */
  const campaign: Record<string, unknown> = {
    name: plan.campaignName,
    status: "PAUSED",
    advertisingChannelType: "SEARCH",
    campaignBudget: budgetResource,
    networkSettings: {
      targetGoogleSearch: true,
      targetSearchNetwork: plan.network.searchPartners,
      targetContentNetwork: plan.network.displayNetwork,
      targetPartnerSearchNetwork: false,
    },
    geoTargetTypeSetting: {
      positiveGeoTargetType: plan.locationOption === "PRESENCE" ? "PRESENCE" : "PRESENCE_OR_INTEREST",
      negativeGeoTargetType: "PRESENCE",
    },
    // Verplicht veld sinds de EU-regels voor politieke advertenties. Wij adverteren
    // nooit politiek, dus dit staat vast op "bevat geen politieke advertenties".
    containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
    ...biddingPayload(plan.biddingStrategy, plan.biddingTarget),
  };
  // selectiveOptimization geldt niet voor Search-campagnes; het bieddoel wordt na
  // aanmaak vastgelegd via het campagne-conversiedoel (stap 2b).
  const campaignRes = await mutate(cid, "campaigns", [{ create: campaign }], { ...opts, label: "Search-campagne" });
  const campaignResource = campaignRes.resourceNames[0]!;
  const campaignId = campaignResource.split("/").pop()!;
  resources.campaign = campaignResource;
  log.push({ step: "Search-campagne", result: campaignResource });

  /* 2b. bieddoel: zet de gekozen conversieactie biedbaar (niet fataal) */
  if (plan.conversionActionId) {
    try {
      const rows = await gaql(
        cid,
        `SELECT conversion_action.category, conversion_action.origin
         FROM conversion_action
         WHERE conversion_action.id = ${Number(plan.conversionActionId)}`,
      );
      const ca = (rows[0] as any)?.conversionAction;
      if (ca?.category && ca?.origin) {
        await mutate(
          cid,
          "campaignConversionGoals",
          [
            {
              update: {
                resourceName: `customers/${cid}/campaignConversionGoals/${campaignId}~${ca.category}~${ca.origin}`,
                biddable: true,
              },
              updateMask: "biddable",
            },
          ],
          { ...opts, label: "Campagne-conversiedoel" },
        );
        log.push({ step: "Conversiedoel", result: `${plan.conversionGoalName} biedbaar gemaakt` });
      }
    } catch (err) {
      log.push({
        step: "Conversiedoel",
        result: `niet automatisch gezet (${(err as Error).message}); campagne volgt de accountdoelen`,
      });
    }
  }

  /* 3. locaties, taal en campagne-uitsluitingen */
  const criteria: unknown[] = [];
  for (const loc of plan.locations) {
    const geo = geoTargetId(loc);
    if (geo != null)
      criteria.push({
        create: { campaign: campaignResource, location: { geoTargetConstant: `geoTargetConstants/${geo}` } },
      });
  }
  const langId = languageConstantId(plan.language);
  if (langId != null)
    criteria.push({
      create: { campaign: campaignResource, language: { languageConstant: `languageConstants/${langId}` } },
    });
  for (const neg of plan.negativeKeywords) {
    criteria.push({
      create: {
        campaign: campaignResource,
        negative: true,
        keyword: { text: neg.text, matchType: neg.matchType },
      },
    });
  }
  const critRes = await mutate(cid, "campaignCriteria", criteria, { ...opts, label: "Locaties, taal en uitsluitingen" });
  resources.campaignCriteria = critRes.resourceNames;
  log.push({
    step: "Locaties, taal en uitsluitingen",
    result: `${critRes.resourceNames.length} criteria aangemaakt`,
  });

  /* 4. advertentiegroepen, keywords en RSA's */
  const adGroupResources: string[] = [];
  for (const g of plan.adGroups) {
    const agRes = await mutate(
      cid,
      "adGroups",
      [
        {
          create: {
            name: g.name,
            campaign: campaignResource,
            status: "ENABLED",
            type: "SEARCH_STANDARD",
          },
        },
      ],
      { ...opts, label: `Advertentiegroep ${g.name}` },
    );
    const adGroup = agRes.resourceNames[0]!;
    adGroupResources.push(adGroup);

    await mutate(
      cid,
      "adGroupCriteria",
      g.keywords.map((k) => ({
        create: { adGroup, status: "ENABLED", keyword: { text: k.text, matchType: k.matchType } },
      })),
      { ...opts, label: "Keywords" },
    );

    await mutate(
      cid,
      "adGroupAds",
      [
        {
          create: {
            adGroup,
            status: "ENABLED",
            ad: {
              finalUrls: [plan.finalUrl],
              responsiveSearchAd: {
                headlines: g.headlines.slice(0, 15).map((text) => ({ text })),
                descriptions: g.descriptions.slice(0, 4).map((text) => ({ text })),
              },
            },
          },
        },
      ],
      { ...opts, label: "Zoekadvertentie" },
    );
    log.push({
      step: `Advertentiegroep ${g.name}`,
      result: `${g.keywords.length} keywords + 1 RSA`,
    });
  }
  resources.adGroups = adGroupResources;

  /* 5. sitelinks en callouts */
  const assetOps: unknown[] = [
    ...plan.sitelinks.map((s) => ({
      create: {
        finalUrls: [plan.finalUrl],
        sitelinkAsset: { linkText: s.text.slice(0, 25), description1: s.description.slice(0, 35) },
      },
    })),
    ...plan.callouts.map((c) => ({ create: { calloutAsset: { calloutText: c.slice(0, 25) } } })),
  ];
  if (assetOps.length > 0) {
    const assetRes = await mutate(cid, "assets", assetOps, { ...opts, label: "Sitelinks/callouts aanmaken" });
    const names = assetRes.resourceNames;
    const links = names.slice(0, plan.sitelinks.length);
    const calls = names.slice(plan.sitelinks.length);
    await mutate(
      cid,
      "campaignAssets",
      [
        ...links.map((asset) => ({ create: { campaign: campaignResource, asset, fieldType: "SITELINK" } })),
        ...calls.map((asset) => ({ create: { campaign: campaignResource, asset, fieldType: "CALLOUT" } })),
      ],
      { ...opts, label: "Sitelinks/callouts koppelen" },
    );
    resources.assets = names;
    log.push({ step: "Sitelinks en callouts", result: `${names.length} assets gekoppeld` });
  }

  if (!proposal.campaignName) throw new GoogleAdsApiError("Concept mist een campagnenaam.", 400);

  return { campaignId, campaignResourceName: campaignResource, resourceNames: resources, steps: log };
}

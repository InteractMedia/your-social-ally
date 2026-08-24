/**
 * Visual Fulfilment (V1.9) — koppelt visual briefs aan bestaande, approved
 * assets uit de Product Library / Beeldbank.
 *
 * Regels:
 * - Volledig deterministisch: geen AI-call, geen generatie.
 * - Bestaande relevante assets gaan ALTIJD voor op AI-generatie.
 * - Geen geschikt beeld → brief blijft expliciet "AI IMAGE NEEDED"
 *   (asset_status blijft 'missing'), nooit een stille fallback.
 * - Gevonden assets worden echt gekoppeld: section content.image_url /
 *   image_url_2 + visual.asset_id, zodat composities als layered_hero,
 *   before_after en visual_cta renderen zoals ontworpen.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ types */

type BriefRow = {
  id: string;
  landing_page_id: string;
  section_id: string | null;
  block_type: string | null;
  visual_type: string;
  purpose: string | null;
  brief_text: string | null;
  product_ids: string[] | null;
  asset_status: string;
};

type AssetRow = {
  id: string;
  name: string;
  alt_text: string | null;
  tags: string[] | null;
  asset_type: string;
  product_id: string | null;
  industry_id: string | null;
  desktop_ok: boolean | null;
  mobile_ok: boolean | null;
};

export type FulfilmentMatch = {
  assetId: string;
  assetName: string;
  effectiveType: string;
  score: number;
  reasons: string[];
};

export type BriefFulfilmentResult = {
  briefId: string;
  blockType: string | null;
  visualType: string;
  outcome: "linked" | "ai_image_needed";
  matches: FulfilmentMatch[];
  linkedAssetId?: string;
  linkedAssetName?: string;
  linkedAssetId2?: string;
  linkedAssetName2?: string;
  note?: string;
};

export type FulfilmentReport = {
  pageId: string;
  totalBriefs: number;
  linked: number;
  aiImageNeeded: number;
  results: BriefFulfilmentResult[];
};

/* ------------------------------------------------------------- scoring */

/** Hoe goed past een asset-type bij de gevraagde visual_type? (0–40) */
const TYPE_SCORE: Record<string, Record<string, number>> = {
  business_context: {
    business_context: 40,
    industry_context: 35,
    product_lifestyle: 22,
    personalized_product: 8,
    product_cutout: 4,
  },
  industry_context: {
    industry_context: 40,
    business_context: 35,
    product_lifestyle: 20,
  },
  illustration: { illustration: 40, decorative: 10 },
  personalized_product: {
    personalized_product: 40,
    product_lifestyle: 18,
    product_cutout: 10,
  },
  personalization_example: {
    personalized_product: 40,
    product_cutout: 16,
    product_lifestyle: 12,
  },
  product_lifestyle: {
    product_lifestyle: 40,
    business_context: 22,
    personalized_product: 14,
    product_cutout: 6,
  },
  product_cutout: { product_cutout: 40, personalized_product: 15 },
  product_group: { product_group: 40, product_lifestyle: 18, product_cutout: 10 },
};

const MATCH_THRESHOLD = 50;
/** Assets met een ander product dan de brief vraagt komen nooit boven dit plafond. */
const WRONG_PRODUCT_CAP = 20;
/** Straf voor hergebruik van hetzelfde asset op dezelfde pagina. */
const REUSE_PENALTY = 18;

const NL_STOPWORDS = new Set([
  "een", "het", "de", "van", "voor", "met", "die", "dat", "zijn", "niet",
  "aan", "op", "in", "en", "of", "te", "als", "bij", "uit", "over", "door",
  "naar", "om", "ook", "maar", "dan", "wordt", "worden", "heeft", "hebben",
  "dit", "deze", "hun", "zich", "elk", "per", "via", "geen", "wel",
]);

function tokens(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !NL_STOPWORDS.has(w)),
  );
}

type Candidate = AssetRow & {
  /** product_image_type uit landing_product_images prevaleert boven asset_type. */
  effectiveType: string;
  isPrimary: boolean;
};

function scoreCandidate(
  brief: BriefRow,
  asset: Candidate,
  pageIndustryId: string | null,
  usedAssetIds: Set<string>,
): FulfilmentMatch {
  const reasons: string[] = [];
  let score = 0;

  const typeScore = TYPE_SCORE[brief.visual_type]?.[asset.effectiveType] ?? 0;
  score += typeScore;
  reasons.push(`type ${asset.effectiveType}→${brief.visual_type} +${typeScore}`);

  const wantedProducts = brief.product_ids ?? [];
  if (wantedProducts.length > 0) {
    if (asset.product_id && wantedProducts.includes(asset.product_id)) {
      score += 30;
      reasons.push("juist product +30");
    } else if (asset.product_id) {
      reasons.push("ander product (cap 20)");
    } else {
      score += 5;
      reasons.push("productloos asset +5");
    }
  }

  if (pageIndustryId && asset.industry_id === pageIndustryId) {
    score += 10;
    reasons.push("branche-match +10");
  }

  const briefTokens = tokens(`${brief.purpose ?? ""} ${brief.brief_text ?? ""}`);
  const assetTokens = tokens(
    `${asset.name} ${asset.alt_text ?? ""} ${(asset.tags ?? []).join(" ")}`,
  );
  let keywordHits = 0;
  for (const t of assetTokens) if (briefTokens.has(t)) keywordHits++;
  const keywordScore = Math.min(10, keywordHits * 2);
  if (keywordScore > 0) {
    score += keywordScore;
    reasons.push(`keywords +${keywordScore}`);
  }

  if (asset.isPrimary) {
    score += 5;
    reasons.push("primaire productfoto +5");
  }
  if (asset.desktop_ok && asset.mobile_ok) {
    score += 5;
    reasons.push("desktop+mobiel ok +5");
  }

  if (usedAssetIds.has(asset.id)) {
    score -= REUSE_PENALTY;
    reasons.push(`al gebruikt op deze pagina −${REUSE_PENALTY}`);
  }

  /* Hard cap: een asset van een ander product mag nooit als match gelden. */
  if (
    wantedProducts.length > 0 &&
    asset.product_id &&
    !wantedProducts.includes(asset.product_id)
  ) {
    score = Math.min(score, WRONG_PRODUCT_CAP);
  }

  return {
    assetId: asset.id,
    assetName: asset.name.trim(),
    effectiveType: asset.effectiveType,
    score: Math.max(0, score),
    reasons,
  };
}

/* ------------------------------------------------------------ fulfilment */

const assetUrl = (assetId: string) => `/api/public/landing-asset/${assetId}`;

export async function fulfillVisualBriefs(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  pageId: string;
}): Promise<FulfilmentReport> {
  const { supabase, workspaceId, pageId } = args;

  const [{ data: briefs, error: bErr }, { data: page, error: pErr }, { data: assets, error: aErr }, { data: productImages, error: piErr }, { data: sections, error: sErr }] =
    await Promise.all([
      supabase
        .from("landing_visual_briefs")
        .select("id, landing_page_id, section_id, block_type, visual_type, purpose, brief_text, product_ids, asset_status")
        .eq("landing_page_id", pageId)
        .eq("workspace_id", workspaceId)
        .order("created_at"),
      supabase
        .from("landing_pages")
        .select("id, industry_id")
        .eq("id", pageId)
        .eq("workspace_id", workspaceId)
        .single(),
      supabase
        .from("landing_assets")
        .select("id, name, alt_text, tags, asset_type, product_id, industry_id, desktop_ok, mobile_ok")
        .eq("workspace_id", workspaceId)
        .eq("approval_status", "approved")
        .eq("active", true),
      supabase
        .from("landing_product_images")
        .select("asset_id, image_type, is_primary")
        .eq("workspace_id", workspaceId),
      supabase
        .from("landing_page_sections")
        .select("id, block_type, content")
        .eq("landing_page_id", pageId)
        .eq("workspace_id", workspaceId),
    ]);

  if (bErr) throw new Error(bErr.message);
  if (pErr) throw new Error(pErr.message);
  if (aErr) throw new Error(aErr.message);
  if (piErr) throw new Error(piErr.message);
  if (sErr) throw new Error(sErr.message);

  const piByAsset = new Map<string, { image_type: string; is_primary: boolean }>();
  for (const pi of productImages ?? []) {
    const existing = piByAsset.get(pi.asset_id);
    if (!existing || pi.is_primary) {
      piByAsset.set(pi.asset_id, { image_type: pi.image_type, is_primary: Boolean(pi.is_primary) });
    }
  }

  const candidates: Candidate[] = (assets ?? []).map((a) => {
    const pi = piByAsset.get(a.id);
    return {
      ...a,
      effectiveType: pi?.image_type ?? a.asset_type,
      isPrimary: Boolean(pi?.is_primary),
    };
  });

  const sectionById = new Map((sections ?? []).map((s) => [s.id, s]));
  const usedAssetIds = new Set<string>();
  const results: BriefFulfilmentResult[] = [];

  for (const brief of (briefs ?? []) as BriefRow[]) {
    const scored = candidates
      .map((a) => scoreCandidate(brief, a, page?.industry_id ?? null, usedAssetIds))
      .sort((x, y) => y.score - x.score);
    const top = scored.slice(0, 3);
    const best = scored[0];

    const base: BriefFulfilmentResult = {
      briefId: brief.id,
      blockType: brief.block_type,
      visualType: brief.visual_type,
      outcome: "ai_image_needed",
      matches: top,
    };

    /* before_after heeft TWEE beelden nodig: blanco (cutout) + gepersonaliseerd. */
    const isBeforeAfter = brief.block_type === "personalization";

    if (!best || best.score < MATCH_THRESHOLD) {
      base.note = best
        ? `Beste kandidaat scoort ${best.score}/100 (drempel ${MATCH_THRESHOLD}) — onvoldoende, AI IMAGE NEEDED.`
        : "Geen approved assets beschikbaar — AI IMAGE NEEDED.";
      results.push(base);
      continue;
    }

    if (isBeforeAfter) {
      const cutouts = scored.filter((m) => {
        const a = candidates.find((c) => c.id === m.assetId);
        return a?.effectiveType === "product_cutout";
      });
      const personalized = scored.filter((m) => {
        const a = candidates.find((c) => c.id === m.assetId);
        return a?.effectiveType === "personalized_product";
      });
      const before = cutouts[0];
      const after = personalized[0];
      if (!before || !after || before.score < 40 || after.score < 40) {
        base.note =
          "Before/after vereist zowel een blanco cutout als een gepersonaliseerd beeld van hetzelfde product — niet compleet, AI IMAGE NEEDED.";
        results.push(base);
        continue;
      }
      await linkSectionImage(supabase, sectionById.get(brief.section_id ?? "") ?? null, {
        image_url: assetUrl(before.assetId),
        image_alt: candidates.find((c) => c.id === before.assetId)?.alt_text ?? null,
        image_url_2: assetUrl(after.assetId),
        image_alt_2: candidates.find((c) => c.id === after.assetId)?.alt_text ?? null,
        assetId: after.assetId,
      });
      usedAssetIds.add(before.assetId);
      usedAssetIds.add(after.assetId);
      await markBriefLinked(supabase, brief.id, after.assetId);
      results.push({
        ...base,
        outcome: "linked",
        linkedAssetId: before.assetId,
        linkedAssetName: before.assetName,
        linkedAssetId2: after.assetId,
        linkedAssetName2: after.assetName,
        note: `Before: ${before.assetName} (${before.score}/100) · After: ${after.assetName} (${after.score}/100)`,
      });
      continue;
    }

    /* products-sectie: renderer gebruikt productbeelden; brief koppelen aan het
       beste gepersonaliseerde asset van het eerste gevraagde product. */
    if (brief.block_type === "products") {
      await markBriefLinked(supabase, brief.id, best.assetId);
      usedAssetIds.add(best.assetId);
      results.push({
        ...base,
        outcome: "linked",
        linkedAssetId: best.assetId,
        linkedAssetName: best.assetName,
        note: "Productbeelden renderen via de gekoppelde producten; brief gekoppeld aan beste gepersonaliseerde asset.",
      });
      continue;
    }

    await linkSectionImage(supabase, sectionById.get(brief.section_id ?? "") ?? null, {
      image_url: assetUrl(best.assetId),
      image_alt: candidates.find((c) => c.id === best.assetId)?.alt_text ?? null,
      assetId: best.assetId,
    });
    usedAssetIds.add(best.assetId);
    await markBriefLinked(supabase, brief.id, best.assetId);
    results.push({
      ...base,
      outcome: "linked",
      linkedAssetId: best.assetId,
      linkedAssetName: best.assetName,
      note:
        brief.visual_type !== best.effectiveType
          ? `Gevuld met ${best.effectiveType} (benadering van ${brief.visual_type}).`
          : undefined,
    });
  }

  return {
    pageId,
    totalBriefs: results.length,
    linked: results.filter((r) => r.outcome === "linked").length,
    aiImageNeeded: results.filter((r) => r.outcome === "ai_image_needed").length,
    results,
  };
}

async function linkSectionImage(
  supabase: SupabaseClient,
  section: { id: string; content: unknown } | null,
  patch: {
    image_url: string;
    image_alt?: string | null;
    image_url_2?: string;
    image_alt_2?: string | null;
    assetId: string;
  },
) {
  if (!section) return;
  const content = { ...((section.content ?? {}) as Record<string, unknown>) };
  content.image_url = patch.image_url;
  if (patch.image_alt) content.image_alt = patch.image_alt;
  if (patch.image_url_2) content.image_url_2 = patch.image_url_2;
  if (patch.image_alt_2) content.image_alt_2 = patch.image_alt_2;
  const visual = { ...((content.visual ?? {}) as Record<string, unknown>) };
  visual.asset_id = patch.assetId;
  visual.asset_status = "existing";
  content.visual = visual;
  const { error } = await supabase
    .from("landing_page_sections")
    .update({ content })
    .eq("id", section.id);
  if (error) throw new Error(error.message);
}

async function markBriefLinked(supabase: SupabaseClient, briefId: string, assetId: string) {
  const { error } = await supabase
    .from("landing_visual_briefs")
    .update({
      asset_id: assetId,
      asset_status: "existing",
      approval_status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", briefId);
  if (error) throw new Error(error.message);
}

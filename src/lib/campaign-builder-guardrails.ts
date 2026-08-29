/**
 * Campaign Builder V1.1 — deterministische guardrails.
 *
 * Client-safe en volledig deterministisch: geen AI, geen netwerk, geen Google
 * Ads writes. Deze laag beoordeelt een conceptvoorstel op intentie-zuiverheid,
 * B2B-classificatie, negative safety, tekstlengtes, claim-consistentie,
 * databruikbaarheid en of het concept ooit uitvoerbaar zou mogen zijn.
 */

import type { BuilderProposal } from "./campaign-builder-shared";
import {
  BUSINESS_EXCLUSIONS,
  matchBusinessExclusion,
} from "./campaign-builder-business-context";

/* ------------------------------------------------------------ B2B niveaus */

export const B2B_LEVELS = [
  "CLEAR_B2B",
  "LIKELY_B2B",
  "MIXED",
  "LIKELY_B2C",
  "CLEAR_B2C",
] as const;
export type B2bLevel = (typeof B2B_LEVELS)[number];

export const B2B_LEVEL_LABELS: Record<B2bLevel, string> = {
  CLEAR_B2B: "Duidelijk B2B",
  LIKELY_B2B: "Waarschijnlijk B2B",
  MIXED: "Gemengd",
  LIKELY_B2C: "Waarschijnlijk B2C",
  CLEAR_B2C: "Duidelijk B2C",
};

export const B2B_LEVEL_TONE: Record<B2bLevel, string> = {
  CLEAR_B2B: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  LIKELY_B2B: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  MIXED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  LIKELY_B2C: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  CLEAR_B2C: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

/** Alleen deze niveaus mogen in een branchecampagne standaard aan staan. */
const ACTIVATABLE_LEVELS: B2bLevel[] = ["CLEAR_B2B", "LIKELY_B2B"];

/* ----------------------------------------------------------------- vlaggen */

export const GUARDRAIL_FLAGS = [
  "GENERIC_INTENT_REQUIRES_GENERIC_LANDING_PAGE",
  "CROSS_GROUP_OVERLAP",
  "TOO_BROAD",
  "REVIEW_ONLY",
  "LIKELY_B2C_INTENT",
  "NEGATIVE_BLOCKS_VALID_QUERY",
  "NEGATIVE_TOO_GENERIC",
  "TEXT_TOO_LONG_NEEDS_REWRITE",
  "CLAIM_NOT_SUPPORTED",
  "BUSINESS_EXCLUSION_LOCKED",
] as const;
export type GuardrailFlag = (typeof GUARDRAIL_FLAGS)[number];

export const GUARDRAIL_FLAG_LABELS: Record<GuardrailFlag, string> = {
  GENERIC_INTENT_REQUIRES_GENERIC_LANDING_PAGE:
    "Generieke intentie — hoort op een generieke landingspagina",
  CROSS_GROUP_OVERLAP: "Overlap met andere advertentiegroep",
  TOO_BROAD: "Te breed / geen aankoopintentie",
  REVIEW_ONLY: "Alleen ter review — staat uit",
  LIKELY_B2C_INTENT: "Consumentintentie mogelijk",
  NEGATIVE_BLOCKS_VALID_QUERY: "Kan geldige B2B-zoekopdrachten blokkeren",
  NEGATIVE_TOO_GENERIC: "Te generiek als uitsluiting — blokkeert commerciële zoekopdrachten",
  TEXT_TOO_LONG_NEEDS_REWRITE: "Te lang — herschrijven, niet afkappen",
  CLAIM_NOT_SUPPORTED: "Claim niet gedekt door landingspagina",
  BUSINESS_EXCLUSION_LOCKED: "Vaste business-exclusion — staat altijd aan",
};

/**
 * Losse woorden die je NOOIT als (broad) negative mag gebruiken: ze zitten in
 * commerciële zoekopdrachten zoals "chocolade laten maken met logo".
 */
export const GENERIC_NEGATIVE_WORDS = [
  "maken",
  "maakt",
  "laten",
  "doen",
  "geven",
  "sturen",
  "versturen",
  "bezorgen",
  "leveren",
  "maat",
  "maatwerk",
  "eigen",
  "samenstellen",
  "bedrukken",
];

/** Zoekopdrachten met duidelijke commerciële intentie die niet geblokkeerd mogen worden. */
export const PROTECTED_COMMERCIAL_QUERIES = [
  "laten maken",
  "op maat laten maken",
  "chocolade laten maken",
  "snoep laten maken",
  "geschenk laten maken",
  "zelf samenstellen",
  "laten bedrukken",
  "laten bezorgen",
];


/* -------------------------------------------------------------- lexicons */

const B2B_MARKERS = [
  "zakelijk", "zakelijke", "bedrijf", "bedrijfs", "bedrijven", "bedrijfscadeau",
  "relatiegeschenk", "relatiegeschenken", "personeel", "personeelscadeau",
  "medewerker", "medewerkers", "team", "teamcadeau", "bouwteam", "kerstpakket",
  "kerstpakketten", "b2b", "offerte", "jubileum", "oplevering", "projectafsluiting",
  "klanten", "collega", "collega's", "kantoor", "werkgever", "opdrachtgever",
  "factuur", "grootverpakking", "bulk",
];

const B2C_MARKERS = [
  "bruiloft", "trouwerij", "geboorte", "geboortebedankjes", "kraamcadeau",
  "verjaardag", "kind", "kinderen", "kinderfeestje", "traktatie", "traktaties",
  "cadeautje", "moederdag", "vaderdag", "communie", "babyshower", "vriendin",
  "gasten", "surprise", "valentijn",
];

/** Product/personalisatie-woorden: op zichzelf NOOIT bewijs van B2B. */
const PERSONALIZATION_MARKERS = [
  "logo", "bedrukken", "bedrukt", "bedrukking", "personaliseren", "gepersonaliseerd",
  "gepersonaliseerde", "wikkel", "sticker", "huisstijl", "eigen", "naam",
];

/** Generieke kopterm zonder aankoop- of doelgroepcontext. */
const BROAD_HEAD_TERMS = ["snoep", "chocolade", "cadeau", "cadeaus", "geschenk", "geschenken", "bonbons", "snoeppot"];

/** Commerciële woorden die je niet generiek mag uitsluiten. */
const COMMERCIAL_WORDS = [
  "kopen", "bestellen", "prijs", "prijzen", "kosten", "offerte", "aanvragen",
  "bestelling", "leverancier", "zakelijk", "bedrijf", "groothandel", "inkoop",
];

const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  bouw: ["bouw", "bouwbedrijf", "bouwbedrijven", "bouwsector", "bouwteam", "bouwproject", "aannemer", "aannemers", "installateur", "installatiebedrijf", "bouwplaats"],
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u017f\s'-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}

function hits(list: string[], toks: string[]): number {
  return list.filter((w) => toks.includes(w)).length;
}

export function industryTerms(industryName: string | null | undefined): string[] {
  if (!industryName) return [];
  const key = industryName.trim().toLowerCase();
  return INDUSTRY_SYNONYMS[key] ?? [key];
}

export function hasIndustryContext(text: string, industryName: string | null | undefined): boolean {
  const terms = industryTerms(industryName);
  if (!terms.length) return true;
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t));
}

/** Zelfstandige classificatie: product + logo is uitdrukkelijk niet B2B. */
export function classifyB2b(text: string, industryName?: string | null): B2bLevel {
  const toks = tokens(text);
  const b2b = hits(B2B_MARKERS, toks);
  const b2c = hits(B2C_MARKERS, toks);
  const perso = hits(PERSONALIZATION_MARKERS, toks);
  const industry = hasIndustryContext(text, industryName) && industryTerms(industryName).length > 0;

  if (b2c >= 2 && b2b === 0) return "CLEAR_B2C";
  if (b2c >= 1 && b2b === 0) return "LIKELY_B2C";
  if (b2c >= 1 && b2b >= 1) return "MIXED";
  if (b2b >= 1 && industry) return "CLEAR_B2B";
  if (b2b >= 2) return "CLEAR_B2B";
  if (b2b === 1) return "LIKELY_B2B";
  if (industry) return "LIKELY_B2B";
  if (perso >= 1) return "MIXED";
  return "MIXED";
}

export function isTooBroad(text: string, industryName?: string | null): boolean {
  const toks = tokens(text);
  const industry = industryTerms(industryName).length > 0 && hasIndustryContext(text, industryName);
  const b2b = hits(B2B_MARKERS, toks);
  if (toks.length <= 2 && !industry && b2b === 0) return true;
  if (BROAD_HEAD_TERMS.includes(toks[0] ?? "") && !industry && b2b === 0) return true;
  // Geen enkel signaal van cadeau-aankoop én geen branchecontext.
  const buySignal = [...BROAD_HEAD_TERMS, ...B2B_MARKERS, "pakket", "pakketten"].some((w) => toks.includes(w));
  return !buySignal && !industry;
}

/* ------------------------------------------------------ groepstoewijzing */

/** Themawoorden per groep; bepaalt bij overlap welke groep het keyword houdt. */
function groupThemeTokens(groupName: string, searchIntent: string): Set<string> {
  return new Set([...tokens(groupName), ...tokens(searchIntent)]);
}

function themeScore(text: string, theme: Set<string>): number {
  return tokens(text).filter((t) => theme.has(t)).length;
}

function overlapRatio(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  if (!union) return 0;
  const subset = inter === Math.min(ta.size, tb.size);
  return subset ? Math.max(0.6, inter / union) : inter / union;
}

/* -------------------------------------------------- advertentietekst-limieten */

export const ASSET_LIMITS = {
  headline: 30,
  description: 90,
  sitelinkText: 25,
  sitelinkDescription: 35,
  callout: 25,
} as const;

/**
 * Deterministische handmatige herschrijvingen van afgebroken V1-teksten.
 * Nooit afkappen: de volledige frase wordt vervangen door een natuurlijke,
 * afgeronde variant binnen de Google-limiet.
 */
export const MANUAL_ASSET_REWRITES: Record<string, string> = {
  "Vier de oplevering of beloon veiligheidsprestaties met een persoonlijk geschenk. Vanaf 25":
    "Vier de oplevering of beloon veiligheidsprestaties met een persoonlijk geschenk.",
  "Kerstpakketten of jubileumcadeaus volledig in jullie huisstijl. Levering op elk adres":
    "Kerstpakketten of jubileumcadeaus in jullie huisstijl, geleverd op elk adres.",
  "Vraag vrijblijvend een offerte aan. Reactie binnen 1 werkdag, levering op elk adres":
    "Vraag vrijblijvend een offerte aan. Reactie binnen 1 werkdag, levering overal.",
  "Persoonlijke snoep- en chocoladegeschenken voor de bouw. Vanaf 25 stuks, met logo":
    "Persoonlijke snoep- en chocoladegeschenken voor de bouw, vanaf 25 stuks met logo.",
  "Geen chatbot, echte": "Persoonlijk contact",
};

/** Netwerk- en locatie-instellingen worden structureel vastgelegd, niet geraden. */
export const REQUIRED_NETWORK_SETTINGS = {
  searchNetwork: true,
  searchPartners: false,
  displayNetwork: false,
} as const;

export const REQUIRED_LOCATION_OPTION = "PRESENCE" as const;

/** Nooit afkappen: te lange tekst wordt gemarkeerd, niet geknipt. */
export function assetTooLong(text: string, limit: number): boolean {
  return text.trim().length > limit;
}


/** Woorden die een advertentietekst nooit mogen afsluiten. */
const DANGLING_TAIL =
  /\b(?:in|op|met|van|voor|per|en|of|tot|bij|de|het|een|als|om|aan|naar|vanaf|onze|jullie)$/i;

/**
 * Herschrijf-hulp: verkort op woordgrens en verwijdert een half afgekapt of
 * bungelend laatste woord volledig — nooit half laten staan. Lukt dat niet met
 * een leesbaar resultaat, dan is fits false en wordt de tekst uitgezet in
 * plaats van geknipt.
 */
export function rewriteToLimit(text: string, limit: number): { text: string; fits: boolean } {
  const clean = text.trim().replace(/\s+/g, " ");
  const words = clean.split(" ");
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > limit) break;
    out = next;
  }
  const tidy = (s: string) => s.replace(/[,.;:·&/-]+$/, "").trim();
  out = tidy(out);

  // Afgekapt laatste woord (of een bungelend voorzetsel) gaat er helemaal uit.
  if (looksTruncated(text, limit) && out === clean) {
    const parts = out.split(" ");
    parts.pop();
    out = tidy(parts.join(" "));
  }
  while (out.includes(" ") && DANGLING_TAIL.test(out)) {
    const parts = out.split(" ");
    parts.pop();
    out = tidy(parts.join(" "));
  }

  // Een tekst mag ook niet op een los getal eindigen ("… in 4").
  while (out.includes(" ") && /\s\d+$/.test(out)) {
    const parts = out.split(" ");
    parts.pop();
    out = tidy(parts.join(" "));
  }

  const words2 = out.split(" ").filter(Boolean);
  const last = words2[words2.length - 1] ?? "";
  const fits = out.length > 0 && out.length <= limit && words2.length >= 2 && last.length >= 3;
  return { text: out, fits };
}

/**
 * Detecteert een op de tekenlimiet afgekapte tekst (V1-erfenis): vol tot aan de
 * limiet en eindigend in een losse spatie of een kort restfragment.
 */
export function looksTruncated(text: string, limit: number): boolean {
  if (/\s$/.test(text)) return true;
  const t = text.trim();
  if (MANUAL_ASSET_REWRITES[t]) return true;
  // Een tekst die op een los getal of bungelend voorzetsel eindigt is altijd
  // afgebroken, ook als hij ruim binnen de limiet blijft.
  if (!/[.!?)]$/.test(t) && /\s\d+$/.test(t)) return true;
  if (!/[.!?)]$/.test(t) && DANGLING_TAIL.test(t)) return true;
  if (t.length < limit - 1) return false;
  if (/[.!?)]$/.test(t)) return false;
  const words = t.split(" ");
  const last = words[words.length - 1] ?? "";
  // Eén lang woord dat exact de limiet vult, of een kort staartfragment.
  if (words.length === 1) return true;
  // Precies vol tot de limiet zonder afsluitend leesteken: vrijwel altijd het
  // gevolg van afkappen. Liever één woord inleveren dan een half woord tonen.
  if (t.length >= limit) return true;
  return last.length <= 5 && !/^\d+$/.test(last) && !DANGLING_TAIL.test(last);
}


/* ------------------------------------------------------- claim-consistentie */

export type ClaimRule = { variants: string[]; preferred: string; replacement: string };

export const CLAIM_RULES: ClaimRule[] = [
  {
    variants: ["binnen 24 uur", "binnen 48 uur", "direct antwoord"],
    preferred: "reactie binnen 1 werkdag",
    replacement: "Voorstel met proefbeeld",
  },
];

export function claimConflicts(texts: string[]): { rule: ClaimRule; offending: string[] }[] {
  const lower = texts.map((t) => t.toLowerCase());
  const out: { rule: ClaimRule; offending: string[] }[] = [];
  for (const rule of CLAIM_RULES) {
    const supported = lower.some((t) => t.includes(rule.preferred));
    const offending = texts.filter((t) =>
      rule.variants.some((v) => t.toLowerCase().includes(v)),
    );
    if (offending.length && supported) out.push({ rule, offending });
  }
  return out;
}

/* ------------------------------------------------------- data confidence */

export const DATA_CONFIDENCE_BANDS = ["LAAG", "MIDDEN", "HOOG"] as const;
export type DataConfidenceBand = (typeof DATA_CONFIDENCE_BANDS)[number];

export function dataConfidenceBand(score: number): DataConfidenceBand {
  if (score < 35) return "LAAG";
  if (score < 65) return "MIDDEN";
  return "HOOG";
}

export type DataUsability = {
  ownLeads: number;
  qualifiedLeads: number;
  customers: number;
  revenue: number;
  keywordConversions: number;
  searchTermRows: number;
  cpcDataRows: number;
  cpaKnown: boolean;
  landingContent: boolean;
  conversionMappingForFunnel: boolean;
  pmaxCategories: number;
  historicKeywordRows: number;
};

/**
 * Bruikbaarheid weegt, niet aanwezigheid. Zonder eigen leads en zonder
 * betrouwbare CPC/CPA/zoekvolume-data kan een concept nooit HOOG scoren.
 */
export function scoreDataUsability(u: DataUsability): {
  score: number;
  band: DataConfidenceBand;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (u.ownLeads >= 25) { score += 30; reasons.push(`${u.ownLeads} eigen leads (+30).`); }
  else if (u.ownLeads >= 10) { score += 20; reasons.push(`${u.ownLeads} eigen leads (+20).`); }
  else if (u.ownLeads > 0) { score += 10; reasons.push(`${u.ownLeads} eigen leads — te weinig voor onderbouwing (+10).`); }
  else reasons.push("Geen eigen leads: budget, CPA en keywordkeuze blijven hypothese (0).");

  if (u.qualifiedLeads > 0) { score += 10; reasons.push(`${u.qualifiedLeads} gekwalificeerde leads (+10).`); }
  else reasons.push("Geen gekwalificeerde leads bekend (0).");

  if (u.customers > 0) { score += 10; reasons.push(`${u.customers} klanten uit deze funnel/branche (+10).`); }
  if (u.revenue > 0) { score += 5; reasons.push("Omzetdata beschikbaar (+5).");}

  if (u.keywordConversions > 0) { score += 15; reasons.push(`${u.keywordConversions} conversies op keywordniveau (+15).`); }
  else reasons.push("Geen conversies op campagne-/keywordniveau (0).");

  if (u.searchTermRows >= 100) { score += 10; reasons.push(`${u.searchTermRows} zoektermrijen: voldoende volume (+10).`); }
  else if (u.searchTermRows >= 30) { score += 5; reasons.push(`${u.searchTermRows} zoektermrijen: beperkt volume (+5).`); }
  else reasons.push(`Te weinig zoektermvolume (${u.searchTermRows} rijen) om keuzes op te baseren (0).`);

  if (u.cpcDataRows >= 20 && u.cpaKnown) { score += 10; reasons.push("CPC- én CPA-data beschikbaar (+10).");}
  else if (u.cpcDataRows >= 20) { score += 5; reasons.push("CPC-data beschikbaar, CPA onbekend (+5).");}
  else reasons.push("Geen betrouwbare CPC/CPA-data voor dit segment (0).");

  if (u.landingContent) { score += 8; reasons.push("Landingspagina-copy en formulier beschikbaar (+8).");}
  if (u.conversionMappingForFunnel) { score += 5; reasons.push("Conversiekoppeling voor deze funnel aanwezig (+5).");}
  else reasons.push("Geen conversiekoppeling voor deze funnel (0).");

  if (u.pmaxCategories > 0)
    reasons.push(`${u.pmaxCategories} PMax-zoekcategorieën: richting, geen bewijs (+0).`);
  if (u.historicKeywordRows > 0 && u.historicKeywordRows < 10)
    reasons.push(`Slechts ${u.historicKeywordRows} historische zoekwoordrijen: niet representatief (+0).`);

  // Harde plafonds op bruikbaarheid.
  if (u.ownLeads === 0) {
    score = Math.min(score, 40);
    reasons.push("Plafond 40: zonder eigen leads nooit hoger dan MIDDEN.");
  }
  if (u.keywordConversions === 0 && u.searchTermRows < 30) {
    score = Math.min(score, 30);
    reasons.push("Plafond 30: geen keywordconversies en te weinig zoektermvolume.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, band: dataConfidenceBand(score), reasons };
}

/* --------------------------------------------------- execution eligibility */

export const EXECUTION_ELIGIBILITIES = ["ALLOWED", "BLOCKED_FOR_CREATION"] as const;
export type ExecutionEligibility = (typeof EXECUTION_ELIGIBILITIES)[number];

export type FinalUrlFacts = {
  landingStatus: string | null;
  url: string | null;
  httpStatus: number | null;
  noindex: boolean | null;
  trackingValidated: boolean;
  /** De final URL mag niet naar een andere host doorverwijzen (canonical-breuk). */
  finalHostMatches?: boolean | null;
  /** Actieve, correcte conversieactie voor de funnel (bv. "Offerte - Aanvraag"). */
  conversionActionName?: string | null;
  conversionActionId?: string | null;
  /** Gepubliceerde versie waarop het verkeer daadwerkelijk landt. */
  productionVersionId?: string | null;
  /** De conversieactie die in het concept als bieddoel staat. */
  proposalConversionActionId?: string | null;
  /** Netwerk-instellingen zoals in het concept vastgelegd. */
  network?: { searchNetwork?: boolean; searchPartners?: boolean; displayNetwork?: boolean } | null;
  /** PRESENCE of PRESENCE_OR_INTEREST. */
  locationOption?: string | null;
  /** Actieve advertentieteksten die nog afgebroken zijn. */
  truncatedActiveAssets?: string[];
};

/** Een concept mag alleen uitvoerbaar heten als de final URL echt klaar is. */
export function evaluateExecutionEligibility(f: FinalUrlFacts): {
  eligibility: ExecutionEligibility;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (f.landingStatus !== "published")
    blockers.push(`Landingspagina staat op '${f.landingStatus ?? "onbekend"}' en is niet gepubliceerd.`);
  if (!f.url || !/^https:\/\//i.test(f.url))
    blockers.push("Geen absolute HTTPS production-URL bekend (relatieve of preview-URL).");
  if (f.httpStatus !== 200)
    blockers.push(`Pagina geeft geen HTTP 200 (${f.httpStatus ?? "niet gecontroleerd"}).`);
  if (f.finalHostMatches === false)
    blockers.push("Final URL verwijst door naar een andere host: canonical en advertentie-URL wijken af.");
  if (f.noindex !== false) blockers.push("Noindex niet weerlegd: pagina kan op noindex staan.");
  if (!f.trackingValidated) blockers.push("Conversietracking op de pagina is niet live gevalideerd.");
  if (!f.conversionActionId || !f.conversionActionName)
    blockers.push("Geen actieve conversieactie gekoppeld voor deze funnel.");
  if (
    f.conversionActionId &&
    f.proposalConversionActionId &&
    f.proposalConversionActionId !== f.conversionActionId
  )
    blockers.push(
      `Bieddoel in het concept (${f.proposalConversionActionId}) wijkt af van de gekoppelde conversieactie (${f.conversionActionId}).`,
    );
  if (!f.productionVersionId)
    blockers.push("Geen gepubliceerde productieversie van de landingspagina bekend.");
  if (f.network) {
    if (f.network.searchNetwork !== true) blockers.push("Google Search Network staat niet aan.");
    if (f.network.searchPartners !== false) blockers.push("Search Partners staat niet uit.");
    if (f.network.displayNetwork !== false) blockers.push("Display Network staat niet uit.");
  } else {
    blockers.push("Netwerk-instellingen (Search / Partners / Display) zijn niet vastgelegd.");
  }
  if ((f.locationOption ?? null) !== REQUIRED_LOCATION_OPTION)
    blockers.push("Locatie-optie staat niet op Presence (mensen in de getargete locatie).");
  if (f.truncatedActiveAssets && f.truncatedActiveAssets.length)
    blockers.push(
      `${f.truncatedActiveAssets.length} actieve advertentieteksten zijn nog afgebroken: ${f.truncatedActiveAssets.join(" | ")}`,
    );

  return {
    eligibility: blockers.length ? "BLOCKED_FOR_CREATION" : "ALLOWED",
    blockers,
  };
}


/* ------------------------------------------------------- guardrail report */

export type GuardrailReport = {
  version: string;
  appliedAt: string;
  keywordFindings: {
    group: string;
    keyword: string;
    b2bLevel: B2bLevel;
    flags: GuardrailFlag[];
    enabled: boolean;
    note: string;
  }[];
  negativeFindings: { text: string; flags: GuardrailFlag[]; enabled: boolean; note: string }[];
  assetFindings: { scope: string; text: string; limit: number; length: number; action: string }[];
  claimFindings: string[];
  /** Correcties op de biedstrategie, bv. doel-CPA verwijderd bij te weinig data. */
  biddingFindings: string[];

  counts: {
    keywordsActive: number;
    keywordsDisabled: number;
    negativesActive: number;
    negativesDisabled: number;
    assetsRewritten: number;
  };
};

export const GUARDRAIL_VERSION = "builder-guardrails-v1.1";

export type GuardrailContext = {
  industryName: string | null;
  isIndustryCampaign: boolean;
  landingCopy: string;
};

/**
 * Past alle deterministische regels toe op een voorstel en geeft een schoon
 * voorstel plus een rapport terug. Wijzigt niets in Google Ads.
 */
export function applyGuardrails(
  input: BuilderProposal,
  ctx: GuardrailContext,
): { proposal: BuilderProposal; report: GuardrailReport } {
  const proposal: BuilderProposal = JSON.parse(JSON.stringify(input));
  const report: GuardrailReport = {
    version: GUARDRAIL_VERSION,
    appliedAt: new Date().toISOString(),
    keywordFindings: [],
    negativeFindings: [],
    assetFindings: [],
    claimFindings: [],
    counts: {
      keywordsActive: 0,
      keywordsDisabled: 0,
      negativesActive: 0,
      negativesDisabled: 0,
      assetsRewritten: 0,
    },
  };

  const groups = proposal.adGroups ?? [];
  const themes = groups.map((g) => groupThemeTokens(g.name, g.searchIntent));

  /* 1 + 2 + 3: keyword-niveau regels */
  groups.forEach((group, gi) => {
    group.keywords.forEach((kw) => {
      const flags: GuardrailFlag[] = [];
      const level = classifyB2b(kw.text, ctx.industryName);
      const notes: string[] = [];

      // Overlap tussen groepen: keyword blijft in de best passende groep.
      let bestGroup = gi;
      let bestScore = themeScore(kw.text, themes[gi]!);
      groups.forEach((other, oi) => {
        if (oi === gi) return;
        const collides = other.keywords.some(
          (k) => k.text !== kw.text && overlapRatio(k.text, kw.text) >= 0.5,
        );
        const s = themeScore(kw.text, themes[oi]!);
        if (collides && s > bestScore) {
          bestScore = s;
          bestGroup = oi;
        }
      });
      const collidesAnywhere = groups.some(
        (other, oi) =>
          oi !== gi &&
          other.keywords.some((k) => overlapRatio(k.text, kw.text) >= 0.5),
      );
      if (collidesAnywhere && bestGroup !== gi) {
        flags.push("CROSS_GROUP_OVERLAP");
        notes.push(`Past beter in "${groups[bestGroup]!.name}".`);
      }

      // Sector-neutraal keyword mag niet naar een branchepagina.
      if (ctx.isIndustryCampaign && !hasIndustryContext(kw.text, ctx.industryName)) {
        flags.push("GENERIC_INTENT_REQUIRES_GENERIC_LANDING_PAGE");
        notes.push("Geen branchecontext: hoort op een generieke landingspagina/campagne.");
      }

      if (isTooBroad(kw.text, ctx.industryName)) {
        flags.push("TOO_BROAD");
        notes.push("Te breed of zonder cadeau-aankoopintentie.");
      }

      if (level === "LIKELY_B2C" || level === "CLEAR_B2C") flags.push("LIKELY_B2C_INTENT");
      if (level === "MIXED") {
        flags.push("REVIEW_ONLY");
        notes.push("Gemengde intentie: alleen ter review.");
      }

      const activatable =
        ACTIVATABLE_LEVELS.includes(level) &&
        !flags.includes("GENERIC_INTENT_REQUIRES_GENERIC_LANDING_PAGE") &&
        !flags.includes("CROSS_GROUP_OVERLAP") &&
        !flags.includes("TOO_BROAD") &&
        !flags.includes("LIKELY_B2C_INTENT");

      (kw as any).b2bLevel = level;
      (kw as any).flags = flags;
      if (!activatable) {
        kw.enabled = false;
        if (!flags.includes("REVIEW_ONLY")) flags.push("REVIEW_ONLY");
      }
      kw.intent = level === "CLEAR_B2B" || level === "LIKELY_B2B" ? "B2B" : level === "MIXED" ? "MIXED" : "B2C";

      report.keywordFindings.push({
        group: group.name,
        keyword: kw.text,
        b2bLevel: level,
        flags,
        enabled: kw.enabled,
        note: notes.join(" "),
      });
      if (kw.enabled) report.counts.keywordsActive += 1;
      else report.counts.keywordsDisabled += 1;
    });
  });

  /* 4: negative keyword safety */
  const activeKeywords = groups.flatMap((g) => g.keywords.filter((k) => k.enabled).map((k) => k.text));
  const copy = ctx.landingCopy.toLowerCase();
  proposal.negativeKeywords = (proposal.negativeKeywords ?? []).map((neg) => {
    const flags: GuardrailFlag[] = [];
    const notes: string[] = [];
    const negToks = tokens(neg.text);

    // Vaste business-exclusion: altijd toegestaan en altijd aan, ook bij
    // commerciële intentie. De AI mag deze niet weglaten of uitzetten.
    const exclusion = matchBusinessExclusion(neg.text);
    if (exclusion) {
      flags.push("BUSINESS_EXCLUSION_LOCKED");
      report.counts.negativesActive += 1;
      report.negativeFindings.push({
        text: neg.text,
        flags,
        enabled: true,
        note: exclusion.reason,
      });
      return { ...neg, enabled: true, flags, reason: neg.reason || exclusion.reason } as any;
    }

    const blocksKeyword = activeKeywords.some((k) => {
      const kt = tokens(k);
      return negToks.every((t) => kt.includes(t));
    });
    if (blocksKeyword) {
      flags.push("NEGATIVE_BLOCKS_VALID_QUERY");
      notes.push("Blokkeert een actief keyword.");
    }

    const commercial = negToks.some((t) => COMMERCIAL_WORDS.includes(t));
    if (commercial) {
      flags.push("NEGATIVE_BLOCKS_VALID_QUERY");
      notes.push("Commercieel woord: sluit geldige B2B-zoekopdrachten uit.");
    }

    const inCopy = negToks.length > 0 && negToks.every((t) => copy.includes(t));
    if (inCopy && String(neg.matchType).toUpperCase() === "BROAD") {
      flags.push("NEGATIVE_BLOCKS_VALID_QUERY");
      notes.push("Woord komt in de landingspagina/FAQ voor.");
    }

    const enabled = flags.length === 0;
    if (!enabled) flags.push("REVIEW_ONLY");
    if (enabled) report.counts.negativesActive += 1;
    else report.counts.negativesDisabled += 1;
    report.negativeFindings.push({ text: neg.text, flags, enabled, note: notes.join(" ") });
    return { ...neg, enabled, flags } as any;
  });

  // Vaste business-exclusions deterministisch aanvullen wanneer de AI ze
  // heeft weggelaten of anders geformuleerd.
  BUSINESS_EXCLUSIONS.forEach((exclusion) => {
    const present = proposal.negativeKeywords.some(
      (neg) => matchBusinessExclusion(neg.text)?.text === exclusion.text,
    );
    if (present) return;
    proposal.negativeKeywords.push({
      text: exclusion.text,
      matchType: exclusion.matchType,
      reason: exclusion.reason,
      enabled: true,
      flags: ["BUSINESS_EXCLUSION_LOCKED"],
    } as any);
    report.counts.negativesActive += 1;
    report.negativeFindings.push({
      text: exclusion.text,
      flags: ["BUSINESS_EXCLUSION_LOCKED"],
      enabled: true,
      note: `Automatisch toegevoegd: ${exclusion.reason}`,
    });
  });


  /* 5: nooit afkappen — herschrijven en opnieuw valideren */
  const fixAsset = (text: string, limit: number, scope: string): { text: string; enabled: boolean } => {
    const manual = MANUAL_ASSET_REWRITES[text.trim()];
    if (manual && manual.length <= limit) {
      report.assetFindings.push({
        scope,
        text,
        limit,
        length: text.length,
        action: `handmatig herschreven naar "${manual}" (${manual.length})`,
      });
      report.counts.assetsRewritten += 1;
      return { text: manual, enabled: true };
    }
    if (!assetTooLong(text, limit) && !looksTruncated(text, limit)) return { text, enabled: true };
    const rewritten = rewriteToLimit(text, limit);

    if (rewritten.fits && !assetTooLong(rewritten.text, limit)) {
      report.assetFindings.push({
        scope,
        text,
        limit,
        length: text.length,
        action: `herschreven naar "${rewritten.text}" (${rewritten.text.length})`,
      });
      report.counts.assetsRewritten += 1;
      return { text: rewritten.text, enabled: true };
    }
    report.assetFindings.push({
      scope,
      text,
      limit,
      length: text.length,
      action: "uitgezet: handmatig herschrijven vereist (niet afgekapt)",
    });
    return { text, enabled: false };
  };

  groups.forEach((group) => {
    group.headlines = group.headlines.map((h) => {
      const r = fixAsset(h.text, ASSET_LIMITS.headline, `${group.name} · headline`);
      return { ...h, text: r.text, enabled: h.enabled && r.enabled };
    });
    group.descriptions = group.descriptions.map((d) => {
      const r = fixAsset(d.text, ASSET_LIMITS.description, `${group.name} · description`);
      return { ...d, text: r.text, enabled: d.enabled && r.enabled };
    });
  });
  proposal.sitelinks = (proposal.sitelinks ?? []).map((s) => {
    const t = fixAsset(s.text, ASSET_LIMITS.sitelinkText, "sitelink · tekst");
    const d = fixAsset(s.description ?? "", ASSET_LIMITS.sitelinkDescription, "sitelink · omschrijving");
    return { ...s, text: t.text, description: d.text, enabled: s.enabled && t.enabled && d.enabled };
  });
  proposal.callouts = (proposal.callouts ?? []).map((c) => {
    const r = fixAsset(c.text, ASSET_LIMITS.callout, "callout");
    return { ...c, text: r.text, enabled: c.enabled && r.enabled };
  });

  /* 6: claims consistent met landingspagina */
  const allAssetTexts = [
    ...groups.flatMap((g) => [...g.headlines, ...g.descriptions].map((a) => a.text)),
    ...proposal.callouts.map((c) => c.text),
    ...proposal.sitelinks.map((s) => `${s.text} ${s.description}`),
  ];
  for (const { rule, offending } of claimConflicts(allAssetTexts)) {
    for (const bad of offending) {
      const replace = (a: { text: string }) => {
        if (a.text !== bad) return a;
        return { ...a, text: rule.replacement };
      };
      groups.forEach((g) => {
        g.headlines = g.headlines.map((h) => replace(h) as typeof h);
        g.descriptions = g.descriptions.map((d) => replace(d) as typeof d);
      });
      proposal.callouts = proposal.callouts.map((c) => replace(c) as typeof c);
      report.claimFindings.push(
        `"${bad}" vervangen door "${rule.replacement}" — alleen "${rule.preferred}" is door de landingspagina gedekt.`,
      );
    }
  }

  // Groep zonder actief keyword gaat uit.
  groups.forEach((g) => {
    if (!g.keywords.some((k) => k.enabled)) g.enabled = false;
  });

  /* 7: netwerk- en locatie-instellingen structureel vastleggen */
  (proposal as any).network = { ...REQUIRED_NETWORK_SETTINGS };
  (proposal as any).locationOption = REQUIRED_LOCATION_OPTION;

  (proposal as any).guardrails = report;
  return { proposal, report };
}


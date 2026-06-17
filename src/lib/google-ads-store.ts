// Lightweight in-memory store voor Google Ads demo-mutaties (Fase 1).
// Vervangt later door echte server-function calls (Fase 2).
import { useSyncExternalStore } from "react";

export type GoogleAdGroup = {
  id: string;
  name: string;
  keywords: { text: string; match: "broad" | "phrase" | "exact"; cpc: number }[];
  ads: {
    id: string;
    headlines: string[];   // tot 15
    descriptions: string[]; // tot 4
    finalUrl: string;
  }[];
  // stats laatste 28 dagen
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
};

export type GoogleCampaign = {
  id: string;
  name: string;
  status: "actief" | "gepauzeerd" | "concept";
  objective: "Sales" | "Leads" | "Website traffic";
  bidStrategy: "Maximize conversions" | "Maximize clicks" | "Target CPA" | "Manual CPC";
  targetCpa?: number;
  dailyBudget: number; // EUR
  geo: string[];       // ["Nederland", "België"]
  languages: string[]; // ["Nederlands"]
  type: "Search" | "Performance Max" | "YouTube" | "Shopping";
  startedAt: string;
  adGroups: GoogleAdGroup[];
};

const seed = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
};

const initial: GoogleCampaign[] = [
  {
    id: "g1",
    name: "Search — Generieke termen",
    status: "actief",
    objective: "Sales",
    bidStrategy: "Target CPA",
    targetCpa: 8,
    dailyBudget: 45,
    geo: ["Nederland"],
    languages: ["Nederlands"],
    type: "Search",
    startedAt: seed(28),
    adGroups: [
      {
        id: "ag1",
        name: "Taart laten bezorgen",
        keywords: [
          { text: "taart laten bezorgen", match: "phrase", cpc: 0.42 },
          { text: "taart bezorgen morgen", match: "phrase", cpc: 0.48 },
          { text: "[taart bezorgen amsterdam]", match: "exact", cpc: 0.55 },
        ],
        ads: [
          {
            id: "gad1",
            headlines: [
              "Taart Laten Bezorgen?",
              "Morgen Bij Jou Bezorgd",
              "Ambachtelijk · Vers · Snel",
              "Vandaag besteld",
              "ZoetBezorgen.nl",
            ],
            descriptions: [
              "Vers, ambachtelijk en morgen op je stoep. Bestel vóór 16:00.",
              "Verras met een handgemaakte taart. Gratis bezorging vanaf €35.",
            ],
            finalUrl: "https://zoetbezorgen.nl/taart",
          },
        ],
        impressions: 18400,
        clicks: 980,
        conversions: 58,
        spend: 412,
      },
      {
        id: "ag2",
        name: "Bonbons cadeau",
        keywords: [
          { text: "bonbons cadeau", match: "phrase", cpc: 0.38 },
          { text: "chocolade bezorgen", match: "broad", cpc: 0.31 },
        ],
        ads: [
          {
            id: "gad2",
            headlines: [
              "Bonbons als Cadeau?",
              "12 Smaken Handgemaakt",
              "Morgen Bezorgd",
              "Vanaf €19,50",
              "ZoetBezorgen",
            ],
            descriptions: [
              "Verras met handgemaakte bonbons in een luxe geschenkdoos.",
              "Vóór 16:00 besteld = morgen bezorgd in heel Nederland.",
            ],
            finalUrl: "https://zoetbezorgen.nl/bonbons",
          },
        ],
        impressions: 5600,
        clicks: 300,
        conversions: 16,
        spend: 128,
      },
    ],
  },
  {
    id: "g2",
    name: "YouTube — Bereik 18-34",
    status: "gepauzeerd",
    objective: "Website traffic",
    bidStrategy: "Maximize clicks",
    dailyBudget: 25,
    geo: ["Nederland"],
    languages: ["Nederlands"],
    type: "YouTube",
    startedAt: seed(22),
    adGroups: [
      {
        id: "ag3",
        name: "Chocolade craft — bumper 6s",
        keywords: [],
        ads: [{ id: "gad3", headlines: ["30s in onze chocolade-keuken"], descriptions: ["Bekijk hoe wij bonbons maken."], finalUrl: "https://zoetbezorgen.nl/over-ons" }],
        impressions: 88000,
        clicks: 240,
        conversions: 4,
        spend: 180,
      },
    ],
  },
  {
    id: "g3",
    name: "Performance Max — Always-on",
    status: "actief",
    objective: "Sales",
    bidStrategy: "Maximize conversions",
    dailyBudget: 60,
    geo: ["Nederland", "België"],
    languages: ["Nederlands"],
    type: "Performance Max",
    startedAt: seed(45),
    adGroups: [
      {
        id: "ag4",
        name: "Asset group — Cadeau",
        keywords: [],
        ads: [{ id: "gad4", headlines: ["Cadeau nodig?", "Morgen bezorgd"], descriptions: ["Ambachtelijke cadeaus, vers bezorgd."], finalUrl: "https://zoetbezorgen.nl/cadeau" }],
        impressions: 124000,
        clicks: 2100,
        conversions: 92,
        spend: 720,
      },
    ],
  },
];

// Keyword Planner demo-suggesties
export const keywordSuggestions = [
  { text: "taart laten bezorgen", volume: 8100, comp: "Hoog", cpcLow: 0.35, cpcHigh: 0.62 },
  { text: "bonbons online", volume: 2900, comp: "Midden", cpcLow: 0.22, cpcHigh: 0.48 },
  { text: "verjaardagstaart bezorgen", volume: 5400, comp: "Hoog", cpcLow: 0.42, cpcHigh: 0.78 },
  { text: "chocolade cadeau", volume: 12000, comp: "Hoog", cpcLow: 0.18, cpcHigh: 0.55 },
  { text: "bedrijfsontbijt bezorgen", volume: 720, comp: "Midden", cpcLow: 0.55, cpcHigh: 1.20 },
  { text: "high tea aan huis", volume: 1900, comp: "Midden", cpcLow: 0.32, cpcHigh: 0.68 },
  { text: "ambachtelijke taart", volume: 480, comp: "Laag", cpcLow: 0.20, cpcHigh: 0.42 },
  { text: "patisserie bezorgen", volume: 320, comp: "Laag", cpcLow: 0.28, cpcHigh: 0.54 },
];

// ─── store ────────────────────────────────────────────────────────────────────
let state: GoogleCampaign[] = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const googleAdsStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setStatus(id: string, status: GoogleCampaign["status"]) {
    state = state.map((c) => (c.id === id ? { ...c, status } : c));
    emit();
  },
  setBudget(id: string, dailyBudget: number) {
    state = state.map((c) => (c.id === id ? { ...c, dailyBudget } : c));
    emit();
  },
  updateCampaign(id: string, patch: Partial<GoogleCampaign>) {
    state = state.map((c) => (c.id === id ? { ...c, ...patch } : c));
    emit();
  },
  updateAdText(campaignId: string, adGroupId: string, adId: string, headlines: string[], descriptions: string[]) {
    state = state.map((c) =>
      c.id !== campaignId ? c : {
        ...c,
        adGroups: c.adGroups.map((g) =>
          g.id !== adGroupId ? g : {
            ...g,
            ads: g.ads.map((a) => (a.id !== adId ? a : { ...a, headlines, descriptions })),
          },
        ),
      },
    );
    emit();
  },
  create(campaign: GoogleCampaign) {
    state = [campaign, ...state];
    emit();
  },
};

export function useGoogleCampaigns() {
  return useSyncExternalStore(googleAdsStore.subscribe, googleAdsStore.get, googleAdsStore.get);
}

export function useGoogleCampaign(id: string) {
  const all = useGoogleCampaigns();
  return all.find((c) => c.id === id);
}

// helpers
export const sumCampaignStats = (c: GoogleCampaign) => {
  const a = c.adGroups.reduce(
    (acc, g) => ({
      impressions: acc.impressions + g.impressions,
      clicks: acc.clicks + g.clicks,
      conversions: acc.conversions + g.conversions,
      spend: acc.spend + g.spend,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 },
  );
  const ctr = a.impressions ? (a.clicks / a.impressions) * 100 : 0;
  const cpc = a.clicks ? a.spend / a.clicks : 0;
  const cpa = a.conversions ? a.spend / a.conversions : 0;
  return { ...a, ctr, cpc, cpa };
};

// Clean start — geen demo Google Ads. Types en store-API blijven zodat de wizard
// nog steeds nieuwe campagnes kan aanmaken.
import { useSyncExternalStore } from "react";

export type MatchType = "broad" | "phrase" | "exact";
export type Device = "desktop" | "mobile" | "tablet";
export type SchedulePreset = "always" | "business-hours";

export type GoogleAdGroup = {
  id: string;
  name: string;
  keywords: { text: string; match: MatchType; cpc: number }[];
  negatives?: { text: string; match: MatchType }[];
  ads: {
    id: string;
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
  }[];
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
  dailyBudget: number;
  geo: string[];
  languages: string[];
  type: "Search" | "Performance Max" | "YouTube" | "Shopping";
  startedAt: string;
  startDate?: string;
  endDate?: string;
  devices?: Device[];
  schedule?: SchedulePreset;
  adGroups: GoogleAdGroup[];
};

// Geen seed-data
const initial: GoogleCampaign[] = [];

// Keyword-suggesties zijn productdata (planner-referentie), geen fake stats van jou.
// Leeggemaakt tot er echte Keyword Planner koppeling is.
export const keywordSuggestions: { text: string; volume: number; comp: string; cpcLow: number; cpcHigh: number }[] = [];

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

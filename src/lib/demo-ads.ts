// Clean start — geen demo ads meer. Types en helpers blijven.

export type AdPlatform = "meta" | "tiktok" | "linkedin" | "google";

export const AD_PLATFORMS: { id: AdPlatform; label: string; manager: string }[] = [
  { id: "meta", label: "Meta (FB + IG)", manager: "https://adsmanager.facebook.com" },
  { id: "tiktok", label: "TikTok Ads", manager: "https://ads.tiktok.com" },
  { id: "linkedin", label: "LinkedIn Ads", manager: "https://www.linkedin.com/campaignmanager" },
  { id: "google", label: "Google / YouTube", manager: "https://ads.google.com" },
];

export const adPlatformLabel = (p: AdPlatform) =>
  AD_PLATFORMS.find((x) => x.id === p)?.label ?? p;
export const adPlatformManager = (p: AdPlatform) =>
  AD_PLATFORMS.find((x) => x.id === p)?.manager ?? "#";

export type AdStatus = "actief" | "gepauzeerd" | "afgelopen" | "review";

export type Ad = {
  id: string;
  platform: AdPlatform;
  name: string;
  campaign: string;
  status: AdStatus;
  objective: string;
  format: string;
  copy: string;
  cta: string;
  creativeColor: string;
  startedAt: string;
  daysLive: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  conversions: number;
  roas: number;
  themes: string[];
};

export const myAds: Ad[] = [];

export type CompetitorAd = {
  id: string;
  competitorId: string;
  competitorLabel: string;
  platform: AdPlatform;
  copy: string;
  cta: string;
  creativeColor: string;
  format: string;
  startedAt: string;
  daysLive: number;
  variants: number;
  themes: string[];
  hookPattern: string;
};
export const competitorAds: CompetitorAd[] = [];

export const adsByPlatform = (platform: AdPlatform) =>
  myAds.filter((a) => a.platform === platform);
export const competitorAdsByPlatform = (platform: AdPlatform) =>
  competitorAds.filter((a) => a.platform === platform);
export const adById = (id: string) => myAds.find((a) => a.id === id);

export const formatEUR = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export const formatNum = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

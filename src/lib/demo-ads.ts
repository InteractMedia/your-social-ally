// Demo ads data — Fase 1. Wordt later vervangen door echte Meta/TikTok/LinkedIn/Google API's.

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
  objective: string;        // "Conversies" | "Bereik" | "Verkeer" | "Leads"
  format: string;           // "Reel" | "Carrousel" | "Single image" | "Video 15s" | "Search"
  copy: string;
  cta: string;              // "Bestel nu" | "Meer info" | "Shop"
  creativeColor: string;    // hex/oklch voor preview-tile
  startedAt: string;        // ISO
  daysLive: number;
  spend: number;            // EUR
  impressions: number;
  clicks: number;
  ctr: number;              // %
  cpm: number;              // EUR
  conversions: number;
  roas: number;             // x
  themes: string[];         // ["seizoen", "pov", "battle"]
};

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
};

export const myAds: Ad[] = [
  {
    id: "a1", platform: "meta", name: "Valentijn-box Reel A",
    campaign: "Valentijn 2026 — Conversies", status: "actief",
    objective: "Conversies", format: "Reel",
    copy: "Verras 'm/haar met 12 handgemaakte bonbons. Vandaag besteld = donderdag bezorgd. 💝",
    cta: "Bestel nu", creativeColor: "#d65a78",
    startedAt: iso(12), daysLive: 12,
    spend: 412, impressions: 184000, clicks: 4120, ctr: 2.24, cpm: 2.24,
    conversions: 86, roas: 4.2, themes: ["seizoen", "gift", "scarcity"],
  },
  {
    id: "a2", platform: "meta", name: "Valentijn-box Carrousel B",
    campaign: "Valentijn 2026 — Conversies", status: "actief",
    objective: "Conversies", format: "Carrousel",
    copy: "12 smaken, één doos. Swipe →",
    cta: "Shop", creativeColor: "#b04763",
    startedAt: iso(12), daysLive: 12,
    spend: 308, impressions: 142000, clicks: 1980, ctr: 1.39, cpm: 2.17,
    conversions: 38, roas: 2.4, themes: ["seizoen", "gift"],
  },
  {
    id: "a3", platform: "tiktok", name: "Pistache-éclair POV",
    campaign: "Always-on TikTok", status: "actief",
    objective: "Verkeer", format: "Video 15s",
    copy: "POV: jij bent de eerste die deze probeert 🌿",
    cta: "Meer info", creativeColor: "#7da86a",
    startedAt: iso(6), daysLive: 6,
    spend: 184, impressions: 312000, clicks: 6240, ctr: 2.00, cpm: 0.59,
    conversions: 42, roas: 1.8, themes: ["pov", "smaak", "reveal"],
  },
  {
    id: "a4", platform: "tiktok", name: "Smaak-battle pistache vs yuzu",
    campaign: "Always-on TikTok", status: "actief",
    objective: "Bereik", format: "Video 22s",
    copy: "Eén wint, één gaat de winkel niet halen. Welke kies jij?",
    cta: "Meer info", creativeColor: "#c4a04a",
    startedAt: iso(9), daysLive: 9,
    spend: 240, impressions: 428000, clicks: 9120, ctr: 2.13, cpm: 0.56,
    conversions: 28, roas: 1.2, themes: ["battle", "engagement"],
  },
  {
    id: "a5", platform: "linkedin", name: "Bedrijfsontbijt — Lead Gen",
    campaign: "B2B Q1 — Leads", status: "actief",
    objective: "Leads", format: "Single image + form",
    copy: "Verras je team op kantoor. Bedrijfsontbijt vanaf 25 personen, bezorgd in heel NL.",
    cta: "Offerte aanvragen", creativeColor: "#3e6b8a",
    startedAt: iso(18), daysLive: 18,
    spend: 620, impressions: 38000, clicks: 480, ctr: 1.26, cpm: 16.32,
    conversions: 14, roas: 6.8, themes: ["b2b", "lead", "gift"],
  },
  {
    id: "a6", platform: "google", name: "Search — 'taart laten bezorgen'",
    campaign: "Search — Generieke termen", status: "actief",
    objective: "Conversies", format: "Search",
    copy: "Taart laten bezorgen? ZoetBezorgen — vers, ambachtelijk, morgen op de stoep.",
    cta: "Bestel online", creativeColor: "#4a7c9d",
    startedAt: iso(28), daysLive: 28,
    spend: 540, impressions: 24000, clicks: 1280, ctr: 5.33, cpm: 22.50,
    conversions: 74, roas: 5.4, themes: ["search", "intent"],
  },
  {
    id: "a7", platform: "google", name: "YouTube Shorts — chocolade-craft",
    campaign: "YouTube — Bereik 18-34", status: "gepauzeerd",
    objective: "Bereik", format: "Bumper 6s",
    copy: "30 seconden in onze chocolade-keuken.",
    cta: "Bekijk meer", creativeColor: "#5a3a1f",
    startedAt: iso(22), daysLive: 14,
    spend: 180, impressions: 88000, clicks: 240, ctr: 0.27, cpm: 2.05,
    conversions: 4, roas: 0.4, themes: ["craft", "video"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Concurrent-ads — publiek beschikbaar (Meta Ad Library / TikTok Creative Center)
// Geen CTR / spend (privé), wel: creative + copy + looptijd + frequentie
// ─────────────────────────────────────────────────────────────────────────────

export type CompetitorAd = {
  id: string;
  competitorId: string;   // verwijst naar competitors uit demo-data.ts
  competitorLabel: string;
  platform: AdPlatform;
  copy: string;
  cta: string;
  creativeColor: string;
  format: string;
  startedAt: string;
  daysLive: number;
  variants: number;       // hoeveel varianten lopen er parallel
  themes: string[];
  hookPattern: string;
};

export const competitorAds: CompetitorAd[] = [
  {
    id: "ca1", competitorId: "c2", competitorLabel: "Petit Gateau",
    platform: "meta", copy: "Verse bonbons vanaf €12,50. Bestel vóór 16:00 — morgen bezorgd.",
    cta: "Bestel nu", creativeColor: "#a87b48", format: "Reel",
    startedAt: iso(18), daysLive: 18, variants: 4,
    themes: ["scarcity", "prijs", "snelheid"], hookPattern: "Direct aanbod + prijs",
  },
  {
    id: "ca2", competitorId: "c2", competitorLabel: "Petit Gateau",
    platform: "tiktok", copy: "We sluiten om 17:00 — wat doen we met de overgebleven taarten?",
    cta: "Meer info", creativeColor: "#7d4a2a", format: "Video 18s",
    startedAt: iso(8), daysLive: 8, variants: 3,
    themes: ["cliffhanger", "engagement"], hookPattern: "Cliffhanger vraag",
  },
  {
    id: "ca3", competitorId: "c2", competitorLabel: "Petit Gateau",
    platform: "meta", copy: "Pistache of framboos? Eén van deze gaat de winkel niet halen.",
    cta: "Shop", creativeColor: "#a08660", format: "Carrousel",
    startedAt: iso(14), daysLive: 14, variants: 2,
    themes: ["battle", "smaak"], hookPattern: "Versus / battle",
  },
  {
    id: "ca4", competitorId: "c1", competitorLabel: "Holtkamp Patisserie",
    platform: "meta", copy: "Bedrijfsontbijt nodig? Vanaf 25 stuks. Vandaag besteld, morgen bezorgd.",
    cta: "Offerte", creativeColor: "#8a5a32", format: "Single image",
    startedAt: iso(32), daysLive: 32, variants: 2,
    themes: ["b2b", "drempel"], hookPattern: "B2B met drempel",
  },
  {
    id: "ca5", competitorId: "c1", competitorLabel: "Holtkamp Patisserie",
    platform: "linkedin", copy: "Lunch voor je team? Wij regelen het — vanaf 10 personen.",
    cta: "Aanvragen", creativeColor: "#6b4423", format: "Single image",
    startedAt: iso(24), daysLive: 24, variants: 1,
    themes: ["b2b", "lunch"], hookPattern: "B2B aanbod",
  },
  {
    id: "ca6", competitorId: "c3", competitorLabel: "Vlaamsch Broodhuys",
    platform: "linkedin", copy: "Lunchbroodjes voor je team — vanaf 10 personen, dagelijks vers.",
    cta: "Aanvragen", creativeColor: "#9a6f44", format: "Single image",
    startedAt: iso(40), daysLive: 40, variants: 1,
    themes: ["b2b", "lunch", "duurzaam"], hookPattern: "B2B lunch",
  },
  {
    id: "ca7", competitorId: "c4", competitorLabel: "Bakkerij Van Vessem",
    platform: "meta", copy: "Valentijn-box: 12 handgemaakte bonbons. Bestel voor 12 feb.",
    cta: "Bestel nu", creativeColor: "#8a5a32", format: "Carrousel",
    startedAt: iso(10), daysLive: 10, variants: 3,
    themes: ["seizoen", "gift", "deadline"], hookPattern: "Seizoens-aanbod",
  },
  {
    id: "ca8", competitorId: "c4", competitorLabel: "Bakkerij Van Vessem",
    platform: "tiktok", copy: "ASMR: pure chocolade die uit de mal komt. 🍫",
    cta: "Meer info", creativeColor: "#4a2e18", format: "Video 12s",
    startedAt: iso(16), daysLive: 16, variants: 2,
    themes: ["asmr", "craft"], hookPattern: "ASMR / sensorisch",
  },
];

export const adsByPlatform = (platform: AdPlatform) =>
  myAds.filter((a) => a.platform === platform);

export const competitorAdsByPlatform = (platform: AdPlatform) =>
  competitorAds.filter((a) => a.platform === platform);

export const adById = (id: string) => myAds.find((a) => a.id === id);

export const formatEUR = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const formatNum = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

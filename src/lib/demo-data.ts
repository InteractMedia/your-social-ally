// Demo data voor v1 — wordt later vervangen door echte API-data (TikTok Creative Center,
// Meta Ad Library, Google Trends, LinkedIn) zodra de keys er zijn.

export type Platform = "tiktok" | "linkedin" | "instagram" | "facebook" | "youtube";

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
];

export const platformLabel = (p: Platform) =>
  PLATFORMS.find((x) => x.id === p)?.label ?? p;

export const platformColorVar = (p: Platform) => `var(--platform-${p})`;

export type AccountStats = {
  platform: Platform;
  handle: string;
  followers: number;
  growth30d: number;
  engagementRate: number;
  postsThisWeek: number;
  connection: "api" | "manual";
};

export const accounts: AccountStats[] = [
  { platform: "tiktok", handle: "@zoetbezorgen", followers: 18420, growth30d: 8.4, engagementRate: 6.2, postsThisWeek: 4, connection: "api" },
  { platform: "linkedin", handle: "ZoetBezorgen B.V.", followers: 3120, growth30d: 4.1, engagementRate: 3.8, postsThisWeek: 2, connection: "api" },
  { platform: "instagram", handle: "@zoetbezorgen", followers: 12640, growth30d: 2.6, engagementRate: 4.1, postsThisWeek: 3, connection: "manual" },
  { platform: "facebook", handle: "ZoetBezorgen", followers: 5430, growth30d: 0.7, engagementRate: 1.9, postsThisWeek: 2, connection: "manual" },
  { platform: "youtube", handle: "ZoetBezorgen Shorts", followers: 980, growth30d: 12.3, engagementRate: 5.4, postsThisWeek: 1, connection: "manual" },
];

const days = 30;
export const growthSeries = Array.from({ length: days }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1 - i));
  const base = 1 + i / days;
  return {
    date: d.toISOString().slice(5, 10),
    tiktok: Math.round(16800 + i * 55 + Math.sin(i / 2) * 60),
    linkedin: Math.round(3020 + i * 4 + Math.cos(i / 3) * 6),
    instagram: Math.round(12400 + i * 8 + Math.sin(i / 4) * 12),
    facebook: Math.round(5400 + i * 1.2 + Math.cos(i / 5) * 4),
    youtube: Math.round(880 + i * 3.5 * base),
  };
});

export type TopPost = {
  id: string;
  platform: Platform;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string;
};

export const topPosts: TopPost[] = [
  { id: "p1", platform: "tiktok", caption: "POV: jij maakt de bestelling, wij bakken de droom 🍰", likes: 4820, comments: 312, shares: 218, postedAt: "2d" },
  { id: "p2", platform: "instagram", caption: "Verse cinnamon rolls, elke ochtend bezorgd in Amsterdam.", likes: 1840, comments: 96, shares: 41, postedAt: "3d" },
  { id: "p3", platform: "linkedin", caption: "Hoe we 1.200 bedrijfsontbijten per week organiseren — onze logistiek-stack.", likes: 412, comments: 38, shares: 22, postedAt: "5d" },
  { id: "p4", platform: "tiktok", caption: "We testen onze nieuwste éclair — wint pistache of yuzu?", likes: 3120, comments: 287, shares: 142, postedAt: "6d" },
];

export type ScheduledPost = {
  id: string;
  date: string;
  platforms: Platform[];
  content: string;
  status: "concept" | "ingepland" | "gepost" | "mislukt";
};

const today = new Date();
const dateAt = (offset: number, hour: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const scheduled: ScheduledPost[] = [
  { id: "s1", date: dateAt(0, 10), platforms: ["tiktok", "instagram"], content: "Achter de schermen bij onze bakkers", status: "gepost" },
  { id: "s2", date: dateAt(1, 9), platforms: ["linkedin"], content: "Q3 cijfers: +34% bedrijfsklanten", status: "ingepland" },
  { id: "s3", date: dateAt(1, 16), platforms: ["tiktok"], content: "Trend: nieuwe pistache-éclair reveal", status: "ingepland" },
  { id: "s4", date: dateAt(2, 11), platforms: ["instagram", "facebook"], content: "Klantverhaal: bruiloft bij De Hortus", status: "concept" },
  { id: "s5", date: dateAt(3, 8), platforms: ["tiktok", "instagram", "youtube"], content: "Ochtendroutine in de bakkerij", status: "ingepland" },
  { id: "s6", date: dateAt(4, 14), platforms: ["linkedin"], content: "We zijn op zoek naar een logistiek manager", status: "concept" },
  { id: "s7", date: dateAt(-1, 12), platforms: ["instagram"], content: "Reels: nieuwe smaak van de week", status: "mislukt" },
];

// ────────────────────────────────────────────────────────────────────────────
// Concurrentie — uitgebreid per kanaal
// ────────────────────────────────────────────────────────────────────────────

export type Competitor = {
  id: string;
  label: string;
  primaryHandle: string;
  primaryPlatform: Platform; // alleen voor card-icon
  totalFollowers: number;
  growth30d: number;
  engagementRate: number;
  about: string;
};

export const competitors: Competitor[] = [
  { id: "c1", label: "Holtkamp Patisserie", primaryHandle: "@holtkamp", primaryPlatform: "instagram", totalFollowers: 42100, growth30d: 1.2, engagementRate: 3.1, about: "Klassieke Amsterdamse patisserie, sterk op IG en LinkedIn (B2B)." },
  { id: "c2", label: "Petit Gateau", primaryHandle: "@petitgateau", primaryPlatform: "tiktok", totalFollowers: 68400, growth30d: 6.8, engagementRate: 5.4, about: "Snelle groeier op TikTok met POV-content en achter-de-schermen video's." },
  { id: "c3", label: "Vlaamsch Broodhuys", primaryHandle: "Vlaamsch Broodhuys", primaryPlatform: "linkedin", totalFollowers: 22300, growth30d: 2.3, engagementRate: 2.9, about: "Ambachtelijke bakkerij-keten, professioneel en educatief geladen." },
  { id: "c4", label: "Bakkerij Van Vessem", primaryHandle: "@vanvessem", primaryPlatform: "instagram", totalFollowers: 24800, growth30d: 0.8, engagementRate: 2.4, about: "Sterk in chocolade-content en seizoens-specials." },
];

export type CompetitorChannel = {
  competitorId: string;
  platform: Platform;
  handle: string;
  followers: number;
  growth30d: number;
  engagementRate: number;
  postsPerWeek: number;
  bestHours: string[]; // bv. ["wo 19u", "zo 20u"]
  adSpendIndex: number; // relatief 0-100
  activeAdsCount: number;
};

export const competitorChannels: CompetitorChannel[] = [
  // Holtkamp
  { competitorId: "c1", platform: "instagram", handle: "@holtkamp", followers: 28400, growth30d: 1.4, engagementRate: 3.6, postsPerWeek: 4, bestHours: ["wo 19u", "za 11u"], adSpendIndex: 42, activeAdsCount: 3 },
  { competitorId: "c1", platform: "linkedin", handle: "Holtkamp B.V.", followers: 9800, growth30d: 0.9, engagementRate: 2.4, postsPerWeek: 2, bestHours: ["di 08u", "do 12u"], adSpendIndex: 22, activeAdsCount: 1 },
  { competitorId: "c1", platform: "facebook", handle: "Holtkamp", followers: 3900, growth30d: 0.2, engagementRate: 1.1, postsPerWeek: 1, bestHours: ["zo 10u"], adSpendIndex: 8, activeAdsCount: 0 },
  // Petit Gateau
  { competitorId: "c2", platform: "tiktok", handle: "@petitgateau", followers: 41200, growth30d: 8.4, engagementRate: 6.9, postsPerWeek: 6, bestHours: ["wo 19u", "zo 20u", "vr 21u"], adSpendIndex: 64, activeAdsCount: 5 },
  { competitorId: "c2", platform: "instagram", handle: "@petitgateau", followers: 22400, growth30d: 5.2, engagementRate: 4.3, postsPerWeek: 4, bestHours: ["di 18u", "za 12u"], adSpendIndex: 38, activeAdsCount: 2 },
  { competitorId: "c2", platform: "youtube", handle: "PetitGateauShorts", followers: 4800, growth30d: 11.2, engagementRate: 5.1, postsPerWeek: 2, bestHours: ["zo 14u"], adSpendIndex: 12, activeAdsCount: 0 },
  // Vlaamsch
  { competitorId: "c3", platform: "linkedin", handle: "Vlaamsch Broodhuys", followers: 14200, growth30d: 3.1, engagementRate: 3.6, postsPerWeek: 3, bestHours: ["di 08u", "wo 09u", "do 12u"], adSpendIndex: 28, activeAdsCount: 2 },
  { competitorId: "c3", platform: "instagram", handle: "@vlaamschbroodhuys", followers: 6400, growth30d: 1.4, engagementRate: 2.3, postsPerWeek: 2, bestHours: ["za 10u"], adSpendIndex: 14, activeAdsCount: 1 },
  { competitorId: "c3", platform: "facebook", handle: "Vlaamsch Broodhuys", followers: 1700, growth30d: 0.3, engagementRate: 1.4, postsPerWeek: 1, bestHours: ["zo 11u"], adSpendIndex: 4, activeAdsCount: 0 },
  // Van Vessem
  { competitorId: "c4", platform: "instagram", handle: "@vanvessem", followers: 15600, growth30d: 1.1, engagementRate: 2.6, postsPerWeek: 3, bestHours: ["wo 18u", "za 11u"], adSpendIndex: 30, activeAdsCount: 2 },
  { competitorId: "c4", platform: "tiktok", handle: "@vanvessem", followers: 6800, growth30d: 4.2, engagementRate: 4.8, postsPerWeek: 3, bestHours: ["vr 19u"], adSpendIndex: 18, activeAdsCount: 1 },
  { competitorId: "c4", platform: "facebook", handle: "Bakkerij Van Vessem", followers: 2400, growth30d: 0.4, engagementRate: 1.2, postsPerWeek: 1, bestHours: ["zo 10u"], adSpendIndex: 6, activeAdsCount: 0 },
];

export type CompetitorPost = {
  id: string;
  competitorId: string;
  platform: Platform;
  type: "organic" | "ad";
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  thumb: string;
  hookPattern: string;
  postedDaysAgo: number;
};

export const competitorPosts: CompetitorPost[] = [
  // Holtkamp
  { id: "cp-h1", competitorId: "c1", platform: "instagram", type: "organic", caption: "POV: je werkt 30 jaar in de patisserie en dit is je ochtendritueel.", likes: 8600, comments: 412, shares: 198, views: 84000, thumb: "#c9a37a", hookPattern: "POV-formule", postedDaysAgo: 4 },
  { id: "cp-h2", competitorId: "c1", platform: "instagram", type: "ad", caption: "Bedrijfsontbijt nodig? Holtkamp bezorgt vanaf 25 stuks. Vandaag besteld = morgen bezorgd.", likes: 412, comments: 22, shares: 14, views: 38000, thumb: "#8a5a32", hookPattern: "B2B met drempel", postedDaysAgo: 6 },
  { id: "cp-h3", competitorId: "c1", platform: "linkedin", type: "organic", caption: "Hoe we 18.000 koekjes per week handmatig vouwen — een kijkje in onze keuken.", likes: 1240, comments: 84, shares: 62, thumb: "#b58a5e", hookPattern: "Insider proces", postedDaysAgo: 9 },
  { id: "cp-h4", competitorId: "c1", platform: "linkedin", type: "ad", caption: "Vacature: ervaren patissier (m/v) in Amsterdam-Zuid.", likes: 180, comments: 12, shares: 24, thumb: "#7d4a2a", hookPattern: "Vacature", postedDaysAgo: 12 },
  // Petit Gateau
  { id: "cp-p1", competitorId: "c2", platform: "tiktok", type: "organic", caption: "We sluiten de bakkerij om 17:00 — wat doen we met de overgebleven taarten?", likes: 12400, comments: 842, shares: 612, views: 184000, thumb: "#a87b48", hookPattern: "Cliffhanger vraag", postedDaysAgo: 2 },
  { id: "cp-p2", competitorId: "c2", platform: "tiktok", type: "ad", caption: "Bestel vandaag, morgen op de stoep. Verse bonbons vanaf €12,50.", likes: 980, comments: 64, shares: 28, views: 92000, thumb: "#7d4a2a", hookPattern: "Direct aanbod + prijs", postedDaysAgo: 3 },
  { id: "cp-p3", competitorId: "c2", platform: "tiktok", type: "organic", caption: "Pistache of framboos? Eén van deze gaat de winkel niet halen.", likes: 9800, comments: 612, shares: 412, views: 142000, thumb: "#a08660", hookPattern: "Versus / battle", postedDaysAgo: 5 },
  { id: "cp-p4", competitorId: "c2", platform: "instagram", type: "organic", caption: "3 stappen tot de perfecte ganache (en waar 90% mis gaat).", likes: 3400, comments: 184, shares: 92, thumb: "#6b4423", hookPattern: "Listicle + tip", postedDaysAgo: 7 },
  { id: "cp-p5", competitorId: "c2", platform: "youtube", type: "organic", caption: "Hoe wij chocolade temperen — 60 seconden.", likes: 2100, comments: 124, shares: 84, views: 48000, thumb: "#5a3a1f", hookPattern: "How-to short", postedDaysAgo: 8 },
  // Vlaamsch
  { id: "cp-v1", competitorId: "c3", platform: "linkedin", type: "organic", caption: "Onze meesterbakker legt uit waarom een goed brood 24u rust nodig heeft.", likes: 1820, comments: 124, shares: 88, thumb: "#6b4423", hookPattern: "Educatieve insider", postedDaysAgo: 3 },
  { id: "cp-v2", competitorId: "c3", platform: "linkedin", type: "ad", caption: "Lunchbroodjes voor je team — vanaf 10 personen, dagelijks vers.", likes: 380, comments: 24, shares: 18, thumb: "#7d4a2a", hookPattern: "B2B lunch", postedDaysAgo: 5 },
  { id: "cp-v3", competitorId: "c3", platform: "instagram", type: "organic", caption: "Het verschil tussen industrieel en ambachtelijk brood — zie je het?", likes: 820, comments: 64, shares: 28, thumb: "#9a6f44", hookPattern: "Vergelijking", postedDaysAgo: 6 },
  // Van Vessem
  { id: "cp-vv1", competitorId: "c4", platform: "instagram", type: "organic", caption: "Drie smaken, één winnaar. Welke kies jij?", likes: 4200, comments: 612, shares: 142, thumb: "#b88a5c", hookPattern: "Keuze-engagement", postedDaysAgo: 2 },
  { id: "cp-vv2", competitorId: "c4", platform: "instagram", type: "ad", caption: "Valentijn-box: 12 handgemaakte bonbons. Bestel voor 12 feb.", likes: 240, comments: 18, shares: 12, thumb: "#8a5a32", hookPattern: "Seizoens-aanbod", postedDaysAgo: 4 },
  { id: "cp-vv3", competitorId: "c4", platform: "tiktok", type: "organic", caption: "ASMR: pure chocolade die uit de mal komt.", likes: 5600, comments: 184, shares: 248, views: 92000, thumb: "#4a2e18", hookPattern: "ASMR / sensorisch", postedDaysAgo: 5 },
];

export type CompetitorTheme = {
  competitorId: string;
  theme: string;
  share: number; // % van content
  avgEngagement: number;
  example: string;
};

export const competitorThemes: CompetitorTheme[] = [
  { competitorId: "c1", theme: "Ambacht & proces", share: 42, avgEngagement: 4.8, example: "Hoe we 18.000 koekjes vouwen" },
  { competitorId: "c1", theme: "B2B / bedrijfsontbijt", share: 28, avgEngagement: 2.1, example: "Bedrijfsontbijt vanaf 25 stuks" },
  { competitorId: "c1", theme: "POV / mens achter zaak", share: 18, avgEngagement: 6.4, example: "POV: 30 jaar in de patisserie" },
  { competitorId: "c1", theme: "Seizoens-specials", share: 12, avgEngagement: 3.2, example: "Sint-collectie 2025" },

  { competitorId: "c2", theme: "Battles & keuzes", share: 34, avgEngagement: 7.1, example: "Pistache vs framboos" },
  { competitorId: "c2", theme: "Cliffhanger / vraag", share: 26, avgEngagement: 8.4, example: "Wat doen we met overgebleven taarten?" },
  { competitorId: "c2", theme: "Achter-de-schermen", share: 22, avgEngagement: 5.2, example: "Bakkerij om 5u 's ochtends" },
  { competitorId: "c2", theme: "How-to / tips", share: 18, avgEngagement: 4.6, example: "3 stappen tot perfecte ganache" },

  { competitorId: "c3", theme: "Educatief / craft", share: 48, avgEngagement: 4.2, example: "Waarom brood 24u rust nodig heeft" },
  { competitorId: "c3", theme: "B2B / lunch", share: 26, avgEngagement: 2.4, example: "Lunchbroodjes voor je team" },
  { competitorId: "c3", theme: "Duurzaamheid", share: 14, avgEngagement: 3.1, example: "Lokale granen" },
  { competitorId: "c3", theme: "Vacatures", share: 12, avgEngagement: 1.8, example: "Zoeken: ervaren bakker" },

  { competitorId: "c4", theme: "Chocolade-craft", share: 38, avgEngagement: 5.1, example: "Temperen in 60 sec" },
  { competitorId: "c4", theme: "Keuze-engagement", share: 28, avgEngagement: 6.2, example: "Drie smaken, één winnaar" },
  { competitorId: "c4", theme: "Seizoens / feestdag", share: 22, avgEngagement: 3.4, example: "Valentijn-box" },
  { competitorId: "c4", theme: "ASMR / sensorisch", share: 12, avgEngagement: 5.8, example: "Chocolade uit de mal" },
];

// ────────────────────────────────────────────────────────────────────────────
// Markttrends — snoep & chocolade
// ────────────────────────────────────────────────────────────────────────────

export type TrendStatus = "stijgend" | "piek" | "dalend" | "stabiel";

export type MarketTrend = {
  id: string;
  title: string;
  category: "smaak" | "format" | "hook" | "seizoen" | "doelgroep";
  platforms: Platform[];
  status: TrendStatus;
  growth7d: number; // % groei in mentions/views laatste 7 dagen
  volume: number; // mentions / posts laatste 30 dagen
  avgEngagement: number; // %
  topHashtags: string[];
  bestFormat: string;
  whyItWorks: string;
  example: string;
  sourceNote: string; // welke databron in v2
};

export const marketTrends: MarketTrend[] = [
  {
    id: "t1",
    title: "Dubai-chocolade (pistache + kadayif)",
    category: "smaak",
    platforms: ["tiktok", "instagram"],
    status: "piek",
    growth7d: 184,
    volume: 124000,
    avgEngagement: 8.9,
    topHashtags: ["#dubaichocolate", "#pistache", "#kadayif", "#viral"],
    bestFormat: "POV unboxing / first-bite reactie",
    whyItWorks: "Visueel uniek (groen + goud), ASMR-knap, schaarste-gevoel ('alleen tot op'). Werkt zonder voice-over.",
    example: "'Ik probeer voor het eerst Dubai-chocolade — eerlijke reactie' — gem. 240k views",
    sourceNote: "Bron v2: TikTok Creative Center + Google Trends",
  },
  {
    id: "t2",
    title: "POV: ochtend in de bakkerij",
    category: "format",
    platforms: ["tiktok", "instagram", "youtube"],
    status: "stijgend",
    growth7d: 42,
    volume: 88000,
    avgEngagement: 7.4,
    topHashtags: ["#povbakery", "#earlyshift", "#bakery"],
    bestFormat: "POV + timestamp overlay (04:30 → 07:00)",
    whyItWorks: "Authenticiteit + ritueel triggert kijktijd. Gem. retention 68% bij ≤45s.",
    example: "'04:30 — de oven gaat aan' — POV format met klok-overlay",
    sourceNote: "Bron v2: TikTok Creative Center",
  },
  {
    id: "t3",
    title: "Battle: smaak A vs smaak B",
    category: "hook",
    platforms: ["tiktok", "instagram"],
    status: "stabiel",
    growth7d: 12,
    volume: 64000,
    avgEngagement: 6.8,
    topHashtags: ["#tasteoff", "#whichoneareyou"],
    bestFormat: "Split-screen of side-by-side, vraag in caption",
    whyItWorks: "Comments-magnet — kijkers willen stem uitbrengen. Triple-digit comments-ratio normaal.",
    example: "'Pistache vs framboos — welke gaat de winkel niet halen?'",
    sourceNote: "Bron v2: Meta Ad Library + interne benchmarks",
  },
  {
    id: "t4",
    title: "Glutenvrij & vegan patisserie",
    category: "doelgroep",
    platforms: ["instagram", "tiktok"],
    status: "stijgend",
    growth7d: 28,
    volume: 41000,
    avgEngagement: 5.2,
    topHashtags: ["#glutenvrij", "#vegantreats", "#patisserie"],
    bestFormat: "Voor/na shot + ingrediënten-flatlay",
    whyItWorks: "Onderbediende niche met hoge save-rate. Comments vragen vaak naar bezorging.",
    example: "'Vegan éclair die niet droog is — hier is hoe'",
    sourceNote: "Bron v2: Google Trends NL",
  },
  {
    id: "t5",
    title: "Sint & kerst (early bird ads)",
    category: "seizoen",
    platforms: ["facebook", "instagram", "tiktok"],
    status: "stijgend",
    growth7d: 96,
    volume: 38000,
    avgEngagement: 4.6,
    topHashtags: ["#sinterklaas", "#kerstpakket", "#chocolade"],
    bestFormat: "Product-reveal + 'bestel voor [datum]' CTA",
    whyItWorks: "Aankoop-intentie piekt 6-8 weken voor feestdag. CPM nog laag t.o.v. piekweken.",
    example: "'Sint-box 2025 — bestel voor 25 nov'",
    sourceNote: "Bron v2: Meta Ad Library",
  },
  {
    id: "t6",
    title: "ASMR chocolade-craft",
    category: "format",
    platforms: ["tiktok", "instagram", "youtube"],
    status: "stabiel",
    growth7d: 8,
    volume: 72000,
    avgEngagement: 6.2,
    topHashtags: ["#asmr", "#chocolatework", "#satisfying"],
    bestFormat: "Close-up, geen voice-over, alleen geluid",
    whyItWorks: "Hoge replay-rate. Werkt international zonder vertaling.",
    example: "Pure chocolade die uit een siliconenmal valt",
    sourceNote: "Bron v2: TikTok Creative Center",
  },
  {
    id: "t7",
    title: "B2B kerstpakket-content op LinkedIn",
    category: "seizoen",
    platforms: ["linkedin"],
    status: "stijgend",
    growth7d: 54,
    volume: 8200,
    avgEngagement: 3.4,
    topHashtags: ["#kerstpakket", "#teamcadeau", "#b2b"],
    bestFormat: "Carousel met 3-4 pakket-opties + prijs vanaf",
    whyItWorks: "HR/Office managers bestellen nu. Carousel haalt 2× engagement van single image.",
    example: "'5 kerstpakketten die je team écht onthoudt — vanaf €18 p.p.'",
    sourceNote: "Bron v2: LinkedIn Ads benchmarks",
  },
  {
    id: "t8",
    title: "Mini-formats & 'pocket' patisserie",
    category: "smaak",
    platforms: ["instagram", "tiktok"],
    status: "stijgend",
    growth7d: 36,
    volume: 28000,
    avgEngagement: 5.8,
    topHashtags: ["#minicake", "#bitesized", "#patisserie"],
    bestFormat: "Top-down shot, hand voor schaal",
    whyItWorks: "Cadeau- en sample-gebruik. Hogere AOV via combo-boxes.",
    example: "'12 mini-éclairs in één box — voor wie kiezen moeilijk is'",
    sourceNote: "Bron v2: Google Trends + interne data",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Inbox
// ────────────────────────────────────────────────────────────────────────────

export type InboxItem = {
  id: string;
  platform: Platform;
  author: string;
  authorHandle: string;
  body: string;
  postContext: string;
  sentiment: "positief" | "neutraal" | "negatief";
  status: "ongelezen" | "gelezen" | "beantwoord";
  createdAt: string;
};

export const inboxItems: InboxItem[] = [
  { id: "i1", platform: "tiktok", author: "Sanne", authorHandle: "@sannekookt", body: "Waar kan ik die pistache-éclair bestellen?? 😍", postContext: "Pistache vs yuzu éclair", sentiment: "positief", status: "ongelezen", createdAt: "12 min" },
  { id: "i2", platform: "instagram", author: "Mark de Vries", authorHandle: "@mark.dv", body: "Bezorgen jullie ook in Utrecht? Of alleen Amsterdam?", postContext: "Cinnamon rolls reel", sentiment: "neutraal", status: "ongelezen", createdAt: "34 min" },
  { id: "i3", platform: "tiktok", author: "Joep", authorHandle: "@joepb", body: "Dit zag er goed uit tot ik de prijs zag tbh", postContext: "Pistache vs yuzu éclair", sentiment: "negatief", status: "ongelezen", createdAt: "1u" },
  { id: "i4", platform: "linkedin", author: "Femke Janssen", authorHandle: "Femke Janssen", body: "Mooie cijfers! Hoe vinden jullie genoeg ervaren bakkers in deze markt?", postContext: "Q3 cijfers post", sentiment: "positief", status: "gelezen", createdAt: "2u" },
  { id: "i5", platform: "instagram", author: "Lotte", authorHandle: "@lottebakery", body: "❤️❤️❤️ ik kom langs deze week!", postContext: "Bakker achter de schermen", sentiment: "positief", status: "beantwoord", createdAt: "5u" },
  { id: "i6", platform: "tiktok", author: "Rico", authorHandle: "@ricoamsterdam", body: "Hebben jullie ook glutenvrije opties?", postContext: "Ochtendroutine bakkerij", sentiment: "neutraal", status: "ongelezen", createdAt: "6u" },
];

// ────────────────────────────────────────────────────────────────────────────
// Seed feedback-loop "post results" (later vervangen door echte post_results uit DB)
// ────────────────────────────────────────────────────────────────────────────

export type PostResult = {
  id: string;
  platform: Platform;
  caption: string;
  hookPattern: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  postedAt: string; // ISO
};

export const seedPostResults: PostResult[] = [
  { id: "r1", platform: "tiktok", caption: "POV: jij maakt de bestelling, wij bakken de droom 🍰", hookPattern: "POV-formule", likes: 4820, comments: 312, shares: 218, reach: 64000, engagementRate: 8.3, postedAt: dateAt(-2, 19) },
  { id: "r2", platform: "instagram", caption: "Verse cinnamon rolls, elke ochtend bezorgd in Amsterdam.", hookPattern: "Product + lokaal", likes: 1840, comments: 96, shares: 41, reach: 28000, engagementRate: 6.9, postedAt: dateAt(-3, 9) },
  { id: "r3", platform: "tiktok", caption: "We testen onze nieuwste éclair — wint pistache of yuzu?", hookPattern: "Versus / battle", likes: 3120, comments: 287, shares: 142, reach: 48000, engagementRate: 7.4, postedAt: dateAt(-6, 18) },
  { id: "r4", platform: "linkedin", caption: "Hoe we 1.200 bedrijfsontbijten per week organiseren — onze logistiek-stack.", hookPattern: "Insider proces", likes: 412, comments: 38, shares: 22, reach: 12000, engagementRate: 3.9, postedAt: dateAt(-5, 8) },
  { id: "r5", platform: "instagram", caption: "Achter de schermen bij onze chocolatier (timelapse).", hookPattern: "Achter-de-schermen", likes: 980, comments: 42, shares: 28, reach: 18000, engagementRate: 5.8, postedAt: dateAt(-8, 11) },
  { id: "r6", platform: "tiktok", caption: "We hebben té veel taart over. Wat moeten we ermee doen?", hookPattern: "Cliffhanger vraag", likes: 6200, comments: 612, shares: 284, reach: 88000, engagementRate: 8.1, postedAt: dateAt(-10, 20) },
];

// Demo data voor v1 — wordt later vervangen door echte data uit Lovable Cloud + connectors.

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

export const platformColorVar = (p: Platform) => `var(--color-platform-${p})`;

export type AccountStats = {
  platform: Platform;
  handle: string;
  followers: number;
  growth30d: number; // percentage
  engagementRate: number; // percentage
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
  date: string; // ISO
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

export type Competitor = {
  id: string;
  label: string;
  handle: string;
  platform: Platform;
  followers: number;
  growth30d: number;
  engagementRate: number;
};

export const competitors: Competitor[] = [
  { id: "c1", label: "Holtkamp Patisserie", handle: "@holtkamp", platform: "instagram", followers: 28400, growth30d: 1.2, engagementRate: 3.1 },
  { id: "c2", label: "Petit Gateau", handle: "@petitgateau", platform: "tiktok", followers: 41200, growth30d: 6.8, engagementRate: 5.4 },
  { id: "c3", label: "Vlaamsch Broodhuys", handle: "Vlaamsch Broodhuys", platform: "linkedin", followers: 8200, growth30d: 2.3, engagementRate: 2.9 },
  { id: "c4", label: "Bakkerij Van Vessem", handle: "@vanvessem", platform: "instagram", followers: 15600, growth30d: 0.8, engagementRate: 2.4 },
];

export type CompetitorPost = {
  id: string;
  competitorId: string;
  type: "organic" | "ad";
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  thumb: string; // hex bg
  hookPattern: string;
};

export const competitorPosts: CompetitorPost[] = [
  { id: "cp1", competitorId: "c2", type: "organic", caption: "We sluiten de bakkerij om 17:00 — wat doen we met de overgebleven taarten?", likes: 12400, comments: 842, shares: 612, thumb: "#a87b48", hookPattern: "Cliffhanger vraag" },
  { id: "cp2", competitorId: "c2", type: "ad", caption: "Bestel vandaag, morgen op de stoep. Verse bonbons vanaf €12,50.", likes: 980, comments: 64, shares: 28, thumb: "#7d4a2a", hookPattern: "Direct aanbod + prijs" },
  { id: "cp3", competitorId: "c1", type: "organic", caption: "POV: je werkt 30 jaar in de patisserie en dit is je ochtendritueel.", likes: 8600, comments: 412, shares: 198, thumb: "#c9a37a", hookPattern: "POV-formule" },
  { id: "cp4", competitorId: "c1", type: "ad", caption: "Bedrijfsontbijt nodig? Holtkamp bezorgt vanaf 25 stuks.", likes: 412, comments: 22, shares: 14, thumb: "#8a5a32", hookPattern: "B2B met drempel" },
  { id: "cp5", competitorId: "c3", type: "organic", caption: "Onze meesterbakker legt uit waarom een goed brood 24u rust nodig heeft.", likes: 1820, comments: 124, shares: 88, thumb: "#6b4423", hookPattern: "Educatieve insider" },
  { id: "cp6", competitorId: "c4", type: "organic", caption: "Drie smaken, één winnaar. Welke kies jij?", likes: 4200, comments: 612, shares: 142, thumb: "#b88a5c", hookPattern: "Keuze-engagement" },
];

export type InboxItem = {
  id: string;
  platform: Platform;
  author: string;
  authorHandle: string;
  body: string;
  postContext: string;
  sentiment: "positief" | "neutraal" | "negatief";
  status: "ongelezen" | "gelezen" | "beantwoord";
  createdAt: string; // relatief
};

export const inboxItems: InboxItem[] = [
  { id: "i1", platform: "tiktok", author: "Sanne", authorHandle: "@sannekookt", body: "Waar kan ik die pistache-éclair bestellen?? 😍", postContext: "Pistache vs yuzu éclair", sentiment: "positief", status: "ongelezen", createdAt: "12 min" },
  { id: "i2", platform: "instagram", author: "Mark de Vries", authorHandle: "@mark.dv", body: "Bezorgen jullie ook in Utrecht? Of alleen Amsterdam?", postContext: "Cinnamon rolls reel", sentiment: "neutraal", status: "ongelezen", createdAt: "34 min" },
  { id: "i3", platform: "tiktok", author: "Joep", authorHandle: "@joepb", body: "Dit zag er goed uit tot ik de prijs zag tbh", postContext: "Pistache vs yuzu éclair", sentiment: "negatief", status: "ongelezen", createdAt: "1u" },
  { id: "i4", platform: "linkedin", author: "Femke Janssen", authorHandle: "Femke Janssen", body: "Mooie cijfers! Hoe vinden jullie genoeg ervaren bakkers in deze markt?", postContext: "Q3 cijfers post", sentiment: "positief", status: "gelezen", createdAt: "2u" },
  { id: "i5", platform: "instagram", author: "Lotte", authorHandle: "@lottebakery", body: "❤️❤️❤️ ik kom langs deze week!", postContext: "Bakker achter de schermen", sentiment: "positief", status: "beantwoord", createdAt: "5u" },
  { id: "i6", platform: "tiktok", author: "Rico", authorHandle: "@ricoamsterdam", body: "Hebben jullie ook glutenvrije opties?", postContext: "Ochtendroutine bakkerij", sentiment: "neutraal", status: "ongelezen", createdAt: "6u" },
];

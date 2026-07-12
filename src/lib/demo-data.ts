// Clean start — alle demo-arrays zijn leeg.
// Types + helpers blijven zodat bestaande schermen compileren en netjes een
// empty-state renderen tot je echte data koppelt.

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
export const accounts: AccountStats[] = [];

export const growthSeries: Array<{ date: string } & Partial<Record<Platform, number>>> = [];

export type TopPost = {
  id: string;
  platform: Platform;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string;
};
export const topPosts: TopPost[] = [];

export type ScheduledPost = {
  id: string;
  date: string;
  platforms: Platform[];
  content: string;
  status: "concept" | "ingepland" | "gepost" | "mislukt";
};
export const scheduled: ScheduledPost[] = [];

export type Competitor = {
  id: string;
  label: string;
  primaryHandle: string;
  primaryPlatform: Platform;
  totalFollowers: number;
  growth30d: number;
  engagementRate: number;
  about: string;
};
export const competitors: Competitor[] = [];

export type CompetitorChannel = {
  competitorId: string;
  platform: Platform;
  handle: string;
  followers: number;
  growth30d: number;
  engagementRate: number;
  postsPerWeek: number;
  bestHours: string[];
  adSpendIndex: number;
  activeAdsCount: number;
};
export const competitorChannels: CompetitorChannel[] = [];

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
export const competitorPosts: CompetitorPost[] = [];

export type CompetitorTheme = {
  competitorId: string;
  theme: string;
  share: number;
  avgEngagement: number;
  example: string;
};
export const competitorThemes: CompetitorTheme[] = [];

export type TrendStatus = "stijgend" | "piek" | "dalend" | "stabiel";
export type MarketTrend = {
  id: string;
  title: string;
  category: "smaak" | "format" | "hook" | "seizoen" | "doelgroep";
  platforms: Platform[];
  status: TrendStatus;
  growth7d: number;
  volume: number;
  avgEngagement: number;
  topHashtags: string[];
  bestFormat: string;
  whyItWorks: string;
  example: string;
  sourceNote: string;
};
export const marketTrends: MarketTrend[] = [];

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
export const inboxItems: InboxItem[] = [];

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
  postedAt: string;
};
export const seedPostResults: PostResult[] = [];

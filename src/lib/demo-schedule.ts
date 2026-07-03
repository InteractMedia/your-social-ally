import type { Platform } from "@/lib/demo-data";

// 7 dagen × 24 uur engagement-index per platform (0-100)
// Gebaseerd op typische audience-patronen: TikTok 's avonds + weekends,
// LinkedIn werkdagen 8-12u, IG 's avonds + zaterdag, FB middag, YT weekends.
export type HourGrid = number[][]; // [dag 0=ma..6=zo][uur 0..23]

function build(pattern: (day: number, hour: number) => number): HourGrid {
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => Math.max(0, Math.min(100, Math.round(pattern(d, h))))),
  );
}

export const activityByPlatform: Record<Platform, HourGrid> = {
  tiktok: build((d, h) => {
    // Piek 18-22u alle dagen, extra hoog weekend
    const evening = Math.max(0, 90 - Math.abs(20 - h) * 15);
    const weekendBoost = d >= 5 ? 15 : 0;
    const lunchDip = h >= 12 && h <= 14 ? 25 : 0;
    return evening + weekendBoost + lunchDip;
  }),
  linkedin: build((d, h) => {
    if (d >= 5) return 8 + Math.random() * 4; // weekend zwak
    // Werkdag pieken: 8-10u, 12-13u, 16-17u
    if (h >= 8 && h <= 10) return 85 - (h - 8) * 5;
    if (h >= 12 && h <= 13) return 70;
    if (h >= 16 && h <= 17) return 65;
    if (h >= 7 && h <= 18) return 40;
    return 5;
  }),
  instagram: build((d, h) => {
    // Avondpiek 19-22u, extra sterk woensdag/zaterdag
    const evening = Math.max(0, 82 - Math.abs(20 - h) * 12);
    const morning = h >= 7 && h <= 9 ? 45 : 0;
    const dayBoost = d === 2 || d === 5 ? 12 : 0;
    return Math.max(evening, morning) + dayBoost;
  }),
  facebook: build((d, h) => {
    // Middag + vroege avond, ouder publiek
    if (h >= 12 && h <= 15) return 55 + (d >= 5 ? 10 : 0);
    if (h >= 18 && h <= 21) return 48;
    if (h >= 8 && h <= 11) return 35;
    return 12;
  }),
  youtube: build((d, h) => {
    // Weekends middag/avond
    const weekend = d >= 5;
    if (weekend && h >= 13 && h <= 22) return 75 - Math.abs(18 - h) * 4;
    if (h >= 19 && h <= 22) return 55;
    if (h >= 12 && h <= 14) return 40;
    return 15;
  }),
};

export const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export type TopSlot = {
  platform: Platform;
  day: number; // 0-6
  hour: number; // 0-23
  score: number;
};

export function computeTopSlots(platforms: Platform[], count = 3): TopSlot[] {
  const all: TopSlot[] = [];
  for (const p of platforms) {
    const grid = activityByPlatform[p];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        all.push({ platform: p, day: d, hour: h, score: grid[d][h] });
      }
    }
  }
  return all.sort((a, b) => b.score - a.score).slice(0, count);
}

// Deterministische geplande posts voor timeline
export type QueuedPost = {
  id: string;
  content: string;
  platforms: Platform[];
  scheduledFor: { day: number; hour: number }; // dagen vanaf nu
  suggestedSlot?: { day: number; hour: number; score: number };
};

export const initialQueue: QueuedPost[] = [
  { id: "q1", content: "Achter de schermen: nieuwe pistache-éclair reveal", platforms: ["tiktok", "instagram"], scheduledFor: { day: 1, hour: 14 } },
  { id: "q2", content: "Q3 cijfers: +34% bedrijfsklanten dit kwartaal", platforms: ["linkedin"], scheduledFor: { day: 2, hour: 11 } },
  { id: "q3", content: "POV: ochtend in de bakkerij (05:00-08:00)", platforms: ["tiktok"], scheduledFor: { day: 3, hour: 12 } },
  { id: "q4", content: "Klantverhaal: bruiloft bij De Hortus", platforms: ["instagram", "facebook"], scheduledFor: { day: 4, hour: 16 } },
  { id: "q5", content: "Weekend-special: Dubai-chocolade box", platforms: ["tiktok", "instagram", "youtube"], scheduledFor: { day: 5, hour: 10 } },
];

export function medianReplyTimeMinutes(): number {
  // Demo: gemiddelde mediaan-reactietijd
  return 42;
}

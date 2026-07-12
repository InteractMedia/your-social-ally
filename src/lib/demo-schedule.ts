// Clean start — activiteit-grids op 0 en geen queued posts.
// Zodra er echte engagement/publish data is, vervangen we dit door live berekeningen.
import type { Platform } from "@/lib/demo-data";

export type HourGrid = number[][];

const emptyGrid = (): HourGrid =>
  Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

export const activityByPlatform: Record<Platform, HourGrid> = {
  tiktok: emptyGrid(),
  linkedin: emptyGrid(),
  instagram: emptyGrid(),
  facebook: emptyGrid(),
  youtube: emptyGrid(),
};

export const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export type TopSlot = {
  platform: Platform;
  day: number;
  hour: number;
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

export type QueuedPost = {
  id: string;
  content: string;
  platforms: Platform[];
  scheduledFor: { day: number; hour: number };
  suggestedSlot?: { day: number; hour: number; score: number };
};

export const initialQueue: QueuedPost[] = [];

export function medianReplyTimeMinutes(): number | null {
  // Onbekend tot er echte inbox-data is.
  return null;
}

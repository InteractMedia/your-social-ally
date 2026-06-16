// Feedback-loop: leg resultaten van gepubliceerde posts vast en gebruik ze
// als context voor nieuwe AI-suggesties. v1 = localStorage; v2 verhuist naar
// Lovable Cloud (`post_results` tabel) zodra de DB-laag erin zit.

import { seedPostResults, type PostResult, type Platform } from "@/lib/demo-data";

const KEY = "zb_post_results_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getPostResults(): PostResult[] {
  if (!isBrowser()) return seedPostResults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedPostResults;
    const stored = JSON.parse(raw) as PostResult[];
    return [...stored, ...seedPostResults];
  } catch {
    return seedPostResults;
  }
}

export function recordPostResult(r: Omit<PostResult, "id">) {
  if (!isBrowser()) return;
  const existing = (() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PostResult[];
    } catch {
      return [];
    }
  })();
  const item: PostResult = { id: `local-${Date.now()}`, ...r };
  localStorage.setItem(KEY, JSON.stringify([item, ...existing].slice(0, 200)));
}

type Learnings = {
  topPlatform: Platform | null;
  topHook: string | null;
  avgEngagement: number;
  bestPost: PostResult | null;
  worstPost: PostResult | null;
  hookRanking: { hook: string; avgEngagement: number; count: number }[];
  summary: string; // korte tekst voor in AI-prompt
};

export function computeLearnings(platform?: Platform): Learnings {
  const all = getPostResults().filter((r) => !platform || r.platform === platform);
  if (all.length === 0) {
    return {
      topPlatform: null,
      topHook: null,
      avgEngagement: 0,
      bestPost: null,
      worstPost: null,
      hookRanking: [],
      summary: "Nog geen post-resultaten beschikbaar.",
    };
  }

  const sorted = [...all].sort((a, b) => b.engagementRate - a.engagementRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // Hook ranking
  const byHook = new Map<string, { sum: number; count: number }>();
  for (const r of all) {
    const cur = byHook.get(r.hookPattern) ?? { sum: 0, count: 0 };
    cur.sum += r.engagementRate;
    cur.count += 1;
    byHook.set(r.hookPattern, cur);
  }
  const hookRanking = [...byHook.entries()]
    .map(([hook, v]) => ({ hook, avgEngagement: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Platform ranking
  const byPlatform = new Map<Platform, { sum: number; count: number }>();
  for (const r of all) {
    const cur = byPlatform.get(r.platform) ?? { sum: 0, count: 0 };
    cur.sum += r.engagementRate;
    cur.count += 1;
    byPlatform.set(r.platform, cur);
  }
  const topPlatform =
    [...byPlatform.entries()].sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)[0]?.[0] ?? null;

  const avg = all.reduce((s, r) => s + r.engagementRate, 0) / all.length;

  const topHooks = hookRanking
    .slice(0, 3)
    .map((h) => `${h.hook} (${h.avgEngagement.toFixed(1)}% engagement, ${h.count}×)`)
    .join("; ");

  const summary = [
    `Top-platform: ${topPlatform ?? "—"} (gem. ${avg.toFixed(1)}% engagement).`,
    `Hooks die werken: ${topHooks || "—"}.`,
    `Beste post tot nu: "${best.caption.slice(0, 80)}…" (${best.engagementRate}%).`,
    `Slechtste hook: ${hookRanking[hookRanking.length - 1]?.hook ?? "—"}.`,
  ].join(" ");

  return {
    topPlatform,
    topHook: hookRanking[0]?.hook ?? null,
    avgEngagement: avg,
    bestPost: best,
    worstPost: worst,
    hookRanking,
    summary,
  };
}

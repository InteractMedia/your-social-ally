import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Flame, Hash, Loader2, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAI } from "@/lib/ai.functions";
import type { Platform } from "@/lib/demo-data";

type Tag = { tag: string; volume: number };
type Tiers = { high: Tag[]; mid: Tag[]; niche: Tag[] };

function parseTiers(raw: string): Tiers | null {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { tiers?: Tiers };
    return parsed.tiers ?? null;
  } catch {
    return null;
  }
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function HashtagOptimizerPanel({
  content,
  platform,
  onAppend,
}: {
  content: string;
  platform?: Platform;
  onAppend: (hashtags: string) => void;
}) {
  const fn = useServerFn(generateAI);
  const [tiers, setTiers] = useState<Tiers | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onSuccess: ({ output }) => {
      const parsed = parseTiers(output);
      if (!parsed) {
        toast.error("Kon hashtags niet parsen — probeer opnieuw.");
        return;
      }
      setTiers(parsed);
      setSelected(new Set([...parsed.high, ...parsed.mid, ...parsed.niche].map((t) => t.tag)));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggle = (tag: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const applySelected = () => {
    if (selected.size === 0) return;
    onAppend([...selected].join(" "));
    toast.success(`${selected.size} hashtags toegevoegd`);
  };

  const tierMeta = [
    { key: "high" as const, icon: Flame, label: "High-volume", hint: ">100k posts — breed bereik", color: "text-warning" },
    { key: "mid" as const, icon: TrendingUp, label: "Mid-tier", hint: "10k-100k — sweet spot", color: "text-primary" },
    { key: "niche" as const, icon: Target, label: "Niche", hint: "<10k — hoge conversie", color: "text-success" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Hash className="h-4 w-4 text-primary" />
          Hashtag optimizer
        </CardTitle>
        <div className="flex gap-2">
          {tiers && (
            <Button size="sm" variant="secondary" onClick={applySelected} disabled={selected.size === 0}>
              Voeg {selected.size} toe
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({ data: { action: "hashtag_tiers", content, platform } })
            }
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hash className="h-3.5 w-3.5" />}
            Suggereer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!tiers && (
          <p className="text-xs text-muted-foreground">
            12 hashtags verdeeld over 3 tiers. Kies wat past — dan pas toevoegen.
          </p>
        )}
        {tiers &&
          tierMeta.map(({ key, icon: Icon, label, hint, color }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-xs font-medium">{label}</span>
                <span className="text-[10px] text-muted-foreground">{hint}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tiers[key].map((t) => {
                  const on = selected.has(t.tag);
                  return (
                    <button
                      key={t.tag}
                      onClick={() => toggle(t.tag)}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                        on
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-surface text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.tag} <span className="text-[10px] opacity-60">· {formatVolume(t.volume)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

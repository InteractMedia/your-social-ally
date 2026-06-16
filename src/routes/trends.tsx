import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  Flame,
  Loader2,
  Minus,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generateAI } from "@/lib/ai.functions";
import { marketTrends, type MarketTrend, type TrendStatus } from "@/lib/demo-data";
import { computeLearnings } from "@/lib/feedback-loop";

export const Route = createFileRoute("/trends")({
  head: () => ({ meta: [{ title: "Trends — ZoetBezorgen Social" }] }),
  component: TrendsPage,
});

const CATS = [
  { id: "all", label: "Alle" },
  { id: "smaak", label: "Smaken" },
  { id: "format", label: "Formats" },
  { id: "hook", label: "Hooks" },
  { id: "seizoen", label: "Seizoen" },
  { id: "doelgroep", label: "Doelgroep" },
] as const;

const nf = (n: number) => new Intl.NumberFormat("nl-NL").format(n);

function statusBadge(s: TrendStatus) {
  const map: Record<TrendStatus, { label: string; cls: string; icon: typeof ArrowUp }> = {
    piek: { label: "Piek", cls: "bg-primary/15 text-primary border-primary/30", icon: Flame },
    stijgend: { label: "Stijgend", cls: "bg-success/15 text-success border-success/30", icon: ArrowUp },
    stabiel: { label: "Stabiel", cls: "bg-muted text-muted-foreground border-border", icon: Minus },
    dalend: { label: "Dalend", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: ArrowDown },
  };
  const v = map[s];
  const Icon = v.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${v.cls}`}>
      <Icon className="h-3 w-3" /> {v.label}
    </Badge>
  );
}

function TrendsPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [active, setActive] = useState<MarketTrend | null>(null);
  const fn = useServerFn(generateAI);
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onError: (e: Error) => toast.error(e.message),
  });

  const trends = useMemo(
    () =>
      [...marketTrends]
        .filter((t) => cat === "all" || t.category === cat)
        .sort((a, b) => b.growth7d - a.growth7d),
    [cat],
  );

  const topChart = trends.slice(0, 8).map((t) => ({
    name: t.title.length > 22 ? t.title.slice(0, 22) + "…" : t.title,
    growth: t.growth7d,
    engagement: t.avgEngagement,
  }));

  const inhakenOp = (t: MarketTrend) => {
    setActive(t);
    const learnings = computeLearnings(t.platforms[0]).summary;
    mutation.mutate({
      data: {
        action: "trend_hook",
        content: "",
        context: `${t.title}\n${t.whyItWorks}\nVoorbeeld: ${t.example}\nBest format: ${t.bestFormat}\nTop hashtags: ${t.topHashtags.join(" ")}`,
        platform: t.platforms[0],
        learnings,
      },
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Trends in snoep & chocolade"
        subtitle="Wat scoort nú in de markt — én wat je morgen kunt posten om in te haken."
        actions={
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> Live v2 via TikTok Creative Center, Meta Ad Library, Google Trends
          </Badge>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Aantal piek-trends</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {marketTrends.filter((t) => t.status === "piek").length}
              </span>
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Inhaken vóór de bulk komt.</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Stijgend deze week</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {marketTrends.filter((t) => t.status === "stijgend").length}
              </span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Bouw nu een format op.</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Gem. engagement van top-trends</div>
            <div className="mt-1 text-3xl font-semibold">
              {(marketTrends.reduce((s, t) => s + t.avgEngagement, 0) / marketTrends.length).toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Vergelijk met jouw gemiddelde in Dashboard.</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Top trends — groei laatste 7 dagen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topChart} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="growth" fill="var(--platform-instagram)" radius={[4, 4, 0, 0]} name="Groei %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs value={cat} onValueChange={(v) => setCat(v as typeof cat)} className="mb-4">
        <TabsList>
          {CATS.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        {trends.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{t.title}</CardTitle>
                {statusBadge(t.status)}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {t.platforms.map((p) => (
                  <PlatformIcon key={p} platform={p} size={18} />
                ))}
                <Badge variant="outline" className="capitalize">
                  {t.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-2 p-3 text-center text-xs">
                <div>
                  <div className="font-semibold text-foreground">+{t.growth7d}%</div>
                  <div className="text-muted-foreground">7-daags</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{nf(t.volume)}</div>
                  <div className="text-muted-foreground">volume / 30d</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{t.avgEngagement}%</div>
                  <div className="text-muted-foreground">engagement</div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{t.whyItWorks}</p>

              <div className="space-y-1 text-xs">
                <div>
                  <span className="font-medium text-foreground">Beste format:</span>{" "}
                  <span className="text-muted-foreground">{t.bestFormat}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Voorbeeld:</span>{" "}
                  <span className="text-muted-foreground italic">{t.example}</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {t.topHashtags.map((h) => (
                    <Badge key={h} variant="secondary" className="text-[10px]">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-[10px] text-muted-foreground">{t.sourceNote}</span>
                <Button size="sm" className="gap-1.5" onClick={() => inhakenOp(t)}>
                  <Wand2 className="h-3.5 w-3.5" /> Haak hierop in
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Inhaken op: {active?.title}
            </DialogTitle>
            <DialogDescription>
              AI maakt concept, hook, post en hashtags op basis van deze trend + wat eerder bij jou werkte.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-surface p-3 text-sm">
            {mutation.isPending ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Genereren…
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {mutation.data?.output ?? "Geen output."}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Megaphone,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon, platformTintStyle } from "@/components/platform-icon";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { generateAI } from "@/lib/ai.functions";
import {
  competitorChannels,
  competitorPosts,
  competitors,
  competitorThemes,
  platformLabel,
  type CompetitorPost,
  type Platform,
} from "@/lib/demo-data";
import { computeLearnings } from "@/lib/feedback-loop";
import { useCustomCompetitors } from "@/lib/competitors-store";

export const Route = createFileRoute("/competitors/$id")({
  component: CompetitorDetail,
});

const nf = (n: number) => new Intl.NumberFormat("nl-NL").format(n);

function CompetitorDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const custom = useCustomCompetitors();
  const competitor = competitors.find((c) => c.id === id) ?? custom.find((c) => c.id === id);
  const channels = competitorChannels.filter((c) => c.competitorId === id);
  const themes = competitorThemes.filter((t) => t.competitorId === id);
  const posts = competitorPosts.filter((p) => p.competitorId === id);

  const [tab, setTab] = useState<Platform>(channels[0]?.platform ?? "instagram");
  const [adapt, setAdapt] = useState<CompetitorPost | null>(null);
  const [insightFor, setInsightFor] = useState<Platform | null>(null);

  const fn = useServerFn(generateAI);
  const mut = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!competitor) {
    return (
      <AppShell>
        <PageHeader title="Concurrent niet gevonden" />
        <Link to="/competitors" className="text-sm text-primary">
          ← Terug naar overzicht
        </Link>
      </AppShell>
    );
  }

  const handleAdapt = (p: CompetitorPost) => {
    setAdapt(p);
    const learnings = computeLearnings(p.platform).summary;
    mut.mutate({
      data: {
        action: "adapt_competitor",
        content: "",
        context: p.caption,
        platform: p.platform,
        learnings,
      },
    });
  };

  const handleChannelInsight = (platform: Platform) => {
    setInsightFor(platform);
    const ch = channels.find((c) => c.platform === platform)!;
    const channelPosts = posts.filter((p) => p.platform === platform);
    const topOrganic = channelPosts.filter((p) => p.type === "organic").sort((a, b) => b.likes - a.likes)[0];
    const topAd = channelPosts.filter((p) => p.type === "ad").sort((a, b) => b.likes - a.likes)[0];
    const ctx = [
      `${competitor.label} op ${platformLabel(platform)}: ${nf(ch.followers)} followers, ${ch.engagementRate}% engagement, ${ch.postsPerWeek}× per week posten.`,
      topOrganic ? `Top organisch: "${topOrganic.caption}" (${nf(topOrganic.likes)} likes, hook: ${topOrganic.hookPattern})` : "",
      topAd ? `Top ad: "${topAd.caption}" (${nf(topAd.likes)} likes, hook: ${topAd.hookPattern})` : "",
      `Beste posttijden: ${ch.bestHours.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    mut.mutate({
      data: {
        action: "competitor_channel_insight",
        content: "",
        context: ctx,
        platform,
        learnings: computeLearnings(platform).summary,
      },
    });
  };

  return (
    <AppShell>
      <PageHeader
        title={competitor.label}
        subtitle={competitor.about}
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/competitors">
              <ArrowLeft className="h-4 w-4" /> Terug
            </Link>
          </Button>
        }
      />

      {/* Algemene KPI's */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Totaal followers</div>
            <div className="mt-1 text-2xl font-semibold">{nf(competitor.totalFollowers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Groei (30d)</div>
            <div className="mt-1 flex items-center gap-1 text-2xl font-semibold text-success">
              <TrendingUp className="h-5 w-5" /> {competitor.growth30d}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Gem. engagement</div>
            <div className="mt-1 text-2xl font-semibold">{competitor.engagementRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Actieve ads totaal</div>
            <div className="mt-1 flex items-center gap-1 text-2xl font-semibold">
              <Megaphone className="h-5 w-5 text-primary" />
              {channels.reduce((s, ch) => s + ch.activeAdsCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-kanaal tabs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Per kanaal</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Platform)}>
            <TabsList className="flex flex-wrap gap-1">
              {channels.map((ch) => (
                <TabsTrigger
                  key={ch.platform}
                  value={ch.platform}
                  className="platform-tab gap-2"
                  style={platformTintStyle(ch.platform)}
                >
                  <PlatformIcon platform={ch.platform} size={16} />
                  {platformLabel(ch.platform)}
                </TabsTrigger>
              ))}
            </TabsList>

            {channels.map((ch) => {
              const channelPosts = posts.filter((p) => p.platform === ch.platform);
              const organic = channelPosts.filter((p) => p.type === "organic").sort((a, b) => b.likes - a.likes);
              const ads = channelPosts.filter((p) => p.type === "ad").sort((a, b) => b.likes - a.likes);

              return (
                <TabsContent key={ch.platform} value={ch.platform} className="mt-4 space-y-5">
                  {/* Kanaal-stats */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Followers" value={nf(ch.followers)} />
                    <Stat label="Groei (30d)" value={`${ch.growth30d}%`} tone="success" />
                    <Stat label="Engagement" value={`${ch.engagementRate}%`} />
                    <Stat label="Posts / week" value={String(ch.postsPerWeek)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card className="bg-surface-2">
                      <CardContent className="pt-5">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase text-muted-foreground">
                          <Clock className="h-3 w-3" /> Beste posttijden
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ch.bestHours.map((h) => (
                            <Badge key={h} variant="outline">{h}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-surface-2">
                      <CardContent className="pt-5">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
                          <Megaphone className="h-3 w-3" /> Ad-activiteit
                        </div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-2xl font-semibold">{ch.activeAdsCount}</span>
                          <span className="text-xs text-muted-foreground">actieve ads nu</span>
                        </div>
                        <div className="mt-2">
                          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                            <span>Ad-spend index (relatief)</span>
                            <span>{ch.adSpendIndex}/100</span>
                          </div>
                          <Progress value={ch.adSpendIndex} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Channel insight */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                    <div className="text-sm">
                      <div className="font-medium">Wat doen zij goed op {platformLabel(ch.platform)}?</div>
                      <div className="text-xs text-muted-foreground">
                        AI analyseert hun stats, posts en ads en geeft een concreet idee voor ons.
                      </div>
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={() => handleChannelInsight(ch.platform)}>
                      <Sparkles className="h-3.5 w-3.5" /> AI-analyse
                    </Button>
                  </div>

                  {/* Beste posts & ads */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <PostSection title="Beste organische posts" icon={<Target className="h-4 w-4 text-primary" />} posts={organic} onAdapt={handleAdapt} />
                    <PostSection title="Beste ads" icon={<Megaphone className="h-4 w-4 text-primary" />} posts={ads} onAdapt={handleAdapt} emptyHint="Geen actieve ads gevonden voor dit kanaal." />
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Thema's */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Content-thema's & hooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {themes.map((t) => (
            <div key={t.theme} className="rounded-md border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{t.theme}</div>
                <div className="text-xs text-muted-foreground">
                  {t.share}% van content · gem. {t.avgEngagement}% engagement
                </div>
              </div>
              <Progress value={t.share} className="mt-2" />
              <div className="mt-2 text-xs text-muted-foreground italic">Voorbeeld: {t.example}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Adapt dialog */}
      <Dialog open={!!adapt} onOpenChange={(o) => !o && setAdapt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" /> Adapt naar onze stem
            </DialogTitle>
            <DialogDescription>
              Met onze tone of voice + wat eerder bij ons werkte als context.
            </DialogDescription>
          </DialogHeader>
          {adapt && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-surface-2 p-3 text-sm">
                <div className="mb-1 text-xs uppercase text-muted-foreground">Origineel</div>
                {adapt.caption}
              </div>
              <div className="rounded-md border border-border bg-surface p-3 text-sm">
                {mut.isPending ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Genereren…
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{mut.data?.output ?? "Geen output"}</pre>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAdapt(null)}>Sluiten</Button>
                <Button
                  disabled={!mut.data?.output}
                  onClick={() => navigate({ to: "/composer", search: { draft: mut.data?.output ?? "" } as never })}
                >
                  Naar Composer →
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Channel-insight dialog */}
      <Dialog open={!!insightFor} onOpenChange={(o) => !o && setInsightFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI-analyse: {competitor.label} op {insightFor && platformLabel(insightFor)}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-border bg-surface p-3 text-sm">
            {mut.isPending ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyseren…
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans">{mut.data?.output ?? ""}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone === "success" ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}

function PostSection({
  title,
  icon,
  posts,
  onAdapt,
  emptyHint,
}: {
  title: string;
  icon: React.ReactNode;
  posts: CompetitorPost[];
  onAdapt: (p: CompetitorPost) => void;
  emptyHint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon} {title}
      </div>
      {posts.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          {emptyHint ?? "Geen posts beschikbaar."}
        </div>
      )}
      {posts.slice(0, 3).map((p) => (
        <div key={p.id} className="flex gap-3 rounded-md border border-border bg-card p-3">
          <div className="h-16 w-16 shrink-0 rounded-md" style={{ backgroundColor: p.thumb }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug">{p.caption}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>♥ {nf(p.likes)}</span>
              <span>💬 {nf(p.comments)}</span>
              <span>↗ {nf(p.shares)}</span>
              {p.views && <span>👁 {nf(p.views)}</span>}
              <Badge variant="outline" className="text-[10px]">{p.hookPattern}</Badge>
              <span>· {p.postedDaysAgo}d geleden</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="self-center gap-1.5" onClick={() => onAdapt(p)}>
            <Wand2 className="h-3 w-3" /> Adapt
          </Button>
        </div>
      ))}
    </div>
  );
}

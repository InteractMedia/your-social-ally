import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Plus, Sparkles, TrendingUp, Wand2 } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generateAI } from "@/lib/ai.functions";
import {
  competitorPosts,
  competitors,
  platformLabel,
  type CompetitorPost,
} from "@/lib/demo-data";

export const Route = createFileRoute("/competitors")({
  head: () => ({ meta: [{ title: "Concurrentie — ZoetBezorgen Social" }] }),
  component: Competitors,
});

function nf(n: number) {
  return new Intl.NumberFormat("nl-NL").format(n);
}

function Competitors() {
  const [active, setActive] = useState(competitors[0].id);
  const [adaptPost, setAdaptPost] = useState<CompetitorPost | null>(null);
  const navigate = useNavigate();
  const fn = useServerFn(generateAI);
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onError: (err: Error) => toast.error(err.message),
  });

  const current = competitors.find((c) => c.id === active)!;
  const posts = competitorPosts.filter((p) => p.competitorId === active);

  const handleAdapt = (post: CompetitorPost) => {
    setAdaptPost(post);
    mutation.mutate({
      data: {
        action: "adapt_competitor",
        content: "",
        context: post.caption,
        platform: current.platform,
      },
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Concurrentie-analyse"
        subtitle="Zie wat werkt bij concurrenten en zet hun beste posts om in jouw stem."
        actions={
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Concurrent toevoegen
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {competitors.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`text-left rounded-lg border bg-card p-4 transition-colors ${
              active === c.id ? "border-primary/50 ring-1 ring-primary/30" : "border-border hover:border-primary/30"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <PlatformIcon platform={c.platform} size={22} />
              <span className="text-sm font-medium">{c.label}</span>
            </div>
            <div className="text-xs text-muted-foreground">{c.handle}</div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-semibold">{nf(c.followers)}</span>
              <span className="flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" /> {c.growth30d.toFixed(1)}%
              </span>
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlatformIcon platform={current.platform} />
            {current.label}
            <Badge variant="outline" className="ml-2 capitalize">
              {platformLabel(current.platform)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="organic">
            <TabsList>
              <TabsTrigger value="organic">Top organische posts</TabsTrigger>
              <TabsTrigger value="ads">Actieve ads</TabsTrigger>
              <TabsTrigger value="patterns">Patronen</TabsTrigger>
            </TabsList>

            <TabsContent value="organic" className="mt-4 space-y-3">
              {posts
                .filter((p) => p.type === "organic")
                .map((p) => (
                  <PostRow key={p.id} post={p} onAdapt={handleAdapt} />
                ))}
            </TabsContent>

            <TabsContent value="ads" className="mt-4 space-y-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Bron: Meta Ad Library (FB/IG) en TikTok Ad Library — publiek beschikbaar, geen scraping.
              </p>
              {posts
                .filter((p) => p.type === "ad")
                .map((p) => (
                  <PostRow key={p.id} post={p} onAdapt={handleAdapt} />
                ))}
            </TabsContent>

            <TabsContent value="patterns" className="mt-4 space-y-3">
              <Card className="bg-surface-2">
                <CardContent className="pt-6">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Wat werkt bij {current.label}
                  </h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li>• POV-formule scoort consequent het hoogst (gem. {nf(8600)} likes).</li>
                    <li>• Posts met een cliffhanger-vraag in eerste regel halen 3× meer comments.</li>
                    <li>• Beste posttijden: woensdag &amp; zondag tussen 18u–21u.</li>
                    <li>• Korte captions (≤120 tekens) presteren beter op TikTok dan lange.</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!adaptPost} onOpenChange={(o) => !o && setAdaptPost(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Adapt naar jouw stem
            </DialogTitle>
            <DialogDescription>
              AI maakt 3 varianten op basis van deze post in ZoetBezorgen's tone of voice.
            </DialogDescription>
          </DialogHeader>

          {adaptPost && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-surface-2 p-3 text-sm">
                <div className="mb-1 text-xs uppercase text-muted-foreground">Origineel</div>
                {adaptPost.caption}
              </div>

              <div className="rounded-md border border-border bg-surface p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Varianten
                </div>
                {mutation.isPending ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Genereren…
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">
                    {mutation.data?.output ?? "Geen output"}
                  </pre>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAdaptPost(null)}>
                  Sluiten
                </Button>
                <Button
                  disabled={!mutation.data?.output}
                  onClick={() => {
                    const draft = mutation.data?.output ?? "";
                    navigate({ to: "/composer", search: { draft } as never });
                  }}
                >
                  Naar Composer →
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function PostRow({ post, onAdapt }: { post: CompetitorPost; onAdapt: (p: CompetitorPost) => void }) {
  return (
    <div className="flex gap-4 rounded-md border border-border bg-card p-3">
      <div
        className="h-20 w-20 shrink-0 rounded-md"
        style={{ backgroundColor: post.thumb }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{post.caption}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>♥ {nf(post.likes)}</span>
          <span>💬 {nf(post.comments)}</span>
          <span>↗ {nf(post.shares)}</span>
          <Badge variant="outline" className="text-[10px]">
            {post.hookPattern}
          </Badge>
        </div>
      </div>
      <Button size="sm" className="self-center gap-1.5" onClick={() => onAdapt(post)}>
        <Wand2 className="h-3.5 w-3.5" /> Adapt
      </Button>
    </div>
  );
}

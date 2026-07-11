import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Brain, CheckCircle2, Hash, Linkedin, Loader2, Maximize2, Minimize2, RefreshCcw, Send, Sparkles } from "lucide-react";


import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon } from "@/components/platform-icon";
import { MediaPicker, type MediaItem } from "@/components/media-picker";
import { HookGeneratorPanel } from "@/components/composer/HookGeneratorPanel";
import { HashtagOptimizerPanel } from "@/components/composer/HashtagOptimizerPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateAI } from "@/lib/ai.functions";
import { publishLinkedInPost } from "@/lib/linkedin.functions";
import { PLATFORMS, platformLabel, type Platform } from "@/lib/demo-data";
import { computeLearnings, recordPostResult } from "@/lib/feedback-loop";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/composer")({
  head: () => ({ meta: [{ title: "Post Composer — ZoetBezorgen Social" }] }),
  component: Composer,
});

function Composer() {
  const router = useRouter();
  // Read draft from search state for "adapt from competitor" flow
  const initial = typeof window !== "undefined"
    ? new URL(window.location.href).searchParams.get("draft") ?? ""
    : "";

  const [content, setContent] = useState(initial);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<Platform[]>(["tiktok", "instagram"]);
  const fn = useServerFn(generateAI);
  const publishLI = useServerFn(publishLinkedInPost);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onError: (err: Error) => toast.error(err.message),
  });

  const liMutation = useMutation({
    mutationFn: (text: string) => publishLI({ data: { text } }),
    onSuccess: () => toast.success("Gepubliceerd op LinkedIn ✅"),
    onError: (err: Error) => toast.error(err.message),
  });


  const toggle = (p: Platform) =>
    setSelected((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));


  type AIAction =
    | "ideas" | "rewrite" | "hashtags" | "shorter" | "longer"
    | "adapt_competitor" | "reply_suggestion";

  const learnings = useMemo(() => computeLearnings(selected[0]), [selected]);

  const handleAI = (action: AIAction) => {
    mutation.mutate(
      { data: { action, content, platform: selected[0], learnings: learnings.summary } },
      {
        onSuccess: ({ output }) => {
          if (action === "ideas") {
            toast.success("Ideeën gegenereerd — kies er één hieronder.");
            setContent((c) => c + (c ? "\n\n" : "") + output);
          } else if (action === "hashtags") {
            setContent((c) => `${c}\n\n${output}`);
          } else {
            setContent(output);
          }
        },
      },
    );
  };

  const markAsPosted = () => {
    if (!content.trim() || selected.length === 0) {
      toast.error("Schrijf eerst een post en kies een platform.");
      return;
    }
    for (const p of selected) {
      recordPostResult({
        platform: p,
        caption: content,
        hookPattern: "Eigen post",
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        engagementRate: 0,
        postedAt: new Date().toISOString(),
      });
    }
    toast.success("Geregistreerd — vul later de stats aan om de AI te laten leren.");
  };

  return (
    <AppShell>
      <PageHeader
        title="Post Composer"
        subtitle="Schrijf één keer, post overal — met AI die je tone of voice kent."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setContent("")}>
              Wissen
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={markAsPosted}>
              <CheckCircle2 className="h-4 w-4" />
              Markeer als gepost
            </Button>
            <Button size="sm" className="gap-1.5">
              <Send className="h-4 w-4" />
              Inplannen
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platformen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const on = selected.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                        on
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-surface text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <PlatformIcon platform={p.id} size={20} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Bericht</CardTitle>
              <span className="text-xs text-muted-foreground">{content.length} tekens</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="Bijvoorbeeld: Vanmorgen verse cinnamon rolls uit de oven…"
                className="resize-none bg-surface text-base"
              />

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Afbeeldingen</div>
                <MediaPicker value={media} onChange={setMedia} max={4} />
              </div>



              <div className="flex flex-wrap gap-2">
                <AIButton onClick={() => handleAI("ideas")} loading={mutation.isPending}>
                  <Sparkles className="h-3.5 w-3.5" /> Genereer ideeën
                </AIButton>
                <AIButton onClick={() => handleAI("rewrite")} loading={mutation.isPending}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Herschrijf voor {selected[0] ? platformLabel(selected[0]) : "platform"}
                </AIButton>
                <AIButton onClick={() => handleAI("hashtags")} loading={mutation.isPending}>
                  <Hash className="h-3.5 w-3.5" /> Voeg hashtags toe
                </AIButton>
                <AIButton onClick={() => handleAI("shorter")} loading={mutation.isPending}>
                  <Minimize2 className="h-3.5 w-3.5" /> Korter
                </AIButton>
                <AIButton onClick={() => handleAI("longer")} loading={mutation.isPending}>
                  <Maximize2 className="h-3.5 w-3.5" /> Langer
                </AIButton>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1.5"
                  onClick={() => router.navigate({ to: "/competitors" })}
                >
                  Optimize tegen concurrentie →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-primary" /> Wat eerder voor jou werkte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">{learnings.summary}</p>
              {learnings.hookRanking.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Top hooks</div>
                  {learnings.hookRanking.slice(0, 4).map((h) => (
                    <div key={h.hook} className="flex items-center justify-between gap-2">
                      <span className="truncate">{h.hook}</span>
                      <Badge variant="outline" className="shrink-0">{h.avgEngagement.toFixed(1)}%</Badge>
                    </div>
                  ))}
                </div>
              )}
              <p className="pt-1 text-[11px] text-muted-foreground">
                Wordt automatisch meegestuurd aan de AI bij elke suggestie.
              </p>
            </CardContent>
          </Card>

          <HookGeneratorPanel
            content={content}
            platform={selected[0]}
            onSelect={(hook) => {
              setContent((c) => {
                const lines = c.split("\n");
                if (lines.length === 0 || !lines[0].trim()) return hook + (c ? "\n" + c : "");
                lines[0] = hook;
                return lines.join("\n");
              });
            }}
          />

          <HashtagOptimizerPanel
            content={content}
            platform={selected[0]}
            onAppend={(hashtags) => setContent((c) => `${c}${c ? "\n\n" : ""}${hashtags}`)}
          />

          <h3 className="text-sm font-medium text-muted-foreground">Live preview</h3>
          {selected.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Selecteer minimaal één platform om een preview te zien.
            </div>
          )}
          {selected.map((p) => (
            <Preview key={p} platform={p} content={content} media={media} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function AIButton({
  children,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <Button variant="secondary" size="sm" className="gap-1.5" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </Button>
  );
}

function Preview({ platform, content, media }: { platform: Platform; content: string; media: MediaItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        <PlatformIcon platform={platform} />
        <div className="flex-1">
          <div className="text-sm font-medium">ZoetBezorgen</div>
          <div className="text-xs text-muted-foreground">@zoetbezorgen · zo meteen</div>
        </div>
        <Badge variant="outline">{platformLabel(platform)}</Badge>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {content || <span className="text-muted-foreground">Je bericht verschijnt hier…</span>}
        </p>
        {media.length > 0 ? (
          <div
            className={cn(
              "mt-4 grid gap-1 overflow-hidden rounded-md",
              media.length === 1 && "grid-cols-1",
              media.length === 2 && "grid-cols-2",
              media.length >= 3 && "grid-cols-2",
            )}
          >
            {media.map((m, i) => (
              <img
                key={m.path}
                src={m.url}
                alt=""
                className={cn(
                  "h-full w-full object-cover",
                  media.length === 1 ? "aspect-square" : "aspect-square",
                  media.length === 3 && i === 0 && "row-span-2 aspect-auto",
                )}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 h-40 rounded-md border border-dashed border-border bg-surface-2" />
        )}
      </CardContent>
    </Card>
  );
}

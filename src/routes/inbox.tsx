import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Send, Zap } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateAI } from "@/lib/ai.functions";
import { inboxItems, type InboxItem } from "@/lib/demo-data";
import { PriorityBadge, type Intent, type Priority } from "@/components/inbox/PriorityBadge";
import { ReplyGenerator } from "@/components/inbox/ReplyGenerator";
import { ReplyTimeMeter } from "@/components/inbox/ReplyTimeMeter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "Inbox — ZoetBezorgen Social" }] }),
  component: InboxPage,
});

const sentimentStyles: Record<string, string> = {
  positief: "text-success border-success/30",
  neutraal: "text-muted-foreground border-border",
  negatief: "text-destructive border-destructive/30",
};

type Classification = { priority: Priority; intent: Intent; suggestedAction?: string };

// Fallback heuristische classificatie (voordat AI klaar is)
function heuristicClassify(item: InboxItem): Classification {
  const b = item.body.toLowerCase();
  if (/koop|bestel|prijs|hoeveel|afrekenen/.test(b)) return { priority: "high", intent: "purchase_intent", suggestedAction: "Direct doorverwijzen naar bestelpagina" };
  if (item.sentiment === "negatief" || /klacht|slecht|teleurgesteld/.test(b)) return { priority: "high", intent: "complaint", suggestedAction: "Excuses + oplossing bieden" };
  if (b.includes("?")) return { priority: "medium", intent: "question", suggestedAction: "Beantwoord binnen 1u" };
  if (item.sentiment === "positief") return { priority: "low", intent: "praise", suggestedAction: "Bedank kort" };
  return { priority: "low", intent: "other" };
}

function InboxPage() {
  if (inboxItems.length === 0) return <EmptyInbox />;
  return <InboxPageInner />;
}

function EmptyInbox() {
  return (
    <AppShell>
      <PageHeader
        title="Inbox"
        subtitle="Reacties, vermeldingen en DM's van alle platformen op één plek."
      />
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Nog geen berichten. Zodra reacties binnenkomen via je gekoppelde kanalen verschijnen ze hier.
        </CardContent>
      </Card>
    </AppShell>
  );
}

function InboxPageInner() {
  const [selectedId, setSelectedId] = useState<string>(inboxItems[0].id);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"alle" | "ongelezen" | "high">("alle");
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [classifications, setClassifications] = useState<Record<string, Classification>>(() => {
    const initial: Record<string, Classification> = {};
    for (const item of inboxItems) initial[item.id] = heuristicClassify(item);
    return initial;
  });
  const [bulkMode, setBulkMode] = useState(false);

  const fn = useServerFn(generateAI);
  const classifyMutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
  });

  const selected = inboxItems.find((i) => i.id === selectedId) ?? inboxItems[0];

  const items = useMemo(() => {
    if (filter === "alle") return inboxItems;
    if (filter === "ongelezen") return inboxItems.filter((i) => i.status === "ongelezen" && !answered.has(i.id));
    return inboxItems.filter((i) => classifications[i.id]?.priority === "high");
  }, [filter, answered, classifications]);

  const runAIClassify = () => {
    const targets = inboxItems.filter((i) => classifications[i.id]?.priority !== "high" || !classifications[i.id]);
    toast.info(`AI classificeert ${targets.length} berichten…`);
    targets.forEach((item, idx) => {
      setTimeout(() => {
        classifyMutation.mutate(
          {
            data: { action: "classify_comment", content: item.postContext, context: item.body, platform: item.platform },
          },
          {
            onSuccess: ({ output }) => {
              try {
                const cleaned = output.replace(/```json\n?|```/g, "").trim();
                const parsed = JSON.parse(cleaned) as Classification;
                setClassifications((cur) => ({ ...cur, [item.id]: parsed }));
              } catch {
                // silent
              }
            },
          },
        );
      }, idx * 250);
    });
  };

  const markAnswered = (id: string, text: string) => {
    setAnswered((cur) => new Set(cur).add(id));
    toast.success(`Antwoord verstuurd (demo): "${text.slice(0, 40)}…"`);
    // Auto-advance in bulk mode
    if (bulkMode) {
      const idx = items.findIndex((i) => i.id === id);
      const next = items[idx + 1];
      if (next) {
        setSelectedId(next.id);
        setReply("");
      } else {
        toast.info("Alle berichten in deze view verwerkt!");
        setBulkMode(false);
      }
    }
  };

  // Bulk-mode keyboard shortcuts
  useEffect(() => {
    if (!bulkMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "s" || e.key === "S") {
        const idx = items.findIndex((i) => i.id === selectedId);
        const next = items[idx + 1];
        if (next) setSelectedId(next.id);
      }
      if (e.key === "Escape") setBulkMode(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [bulkMode, selectedId, items]);

  const unread = inboxItems.filter((i) => i.status === "ongelezen" && !answered.has(i.id)).length;

  return (
    <AppShell>
      <PageHeader
        title="Inbox"
        subtitle="Reacties, vermeldingen en DM's van alle platformen op één plek."
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={runAIClassify} disabled={classifyMutation.isPending}>
              <Zap className="h-3.5 w-3.5" /> AI-prioriteer alle
            </Button>
            <Button
              size="sm"
              variant={bulkMode ? "default" : "outline"}
              onClick={() => setBulkMode((v) => !v)}
            >
              {bulkMode ? "Bulk-modus AAN (Esc)" : "Bulk-modus"}
            </Button>
            <div className="flex gap-1 rounded-md border border-border bg-surface p-0.5 text-xs">
              {(["alle", "ongelezen", "high"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded px-3 py-1 capitalize",
                    filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {f === "high" ? "Prioriteit" : f}
                </button>
              ))}
            </div>
          </>
        }
      />

      <div className="mb-4">
        <ReplyTimeMeter inboxCount={inboxItems.length} unread={unread} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {items.map((item) => {
              const cls = classifications[item.id];
              const isAnswered = answered.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setReply("");
                  }}
                  className={cn(
                    "flex w-full gap-3 p-4 text-left transition-colors hover:bg-surface",
                    selectedId === item.id && "bg-surface",
                    isAnswered && "opacity-60",
                  )}
                >
                  <PlatformIcon platform={item.platform} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{item.author}</span>
                      {item.status === "ongelezen" && !isAnswered && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{item.createdAt}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                    {cls && (
                      <div className="mt-1.5">
                        <PriorityBadge intent={cls.intent} priority={cls.priority} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            {items.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">Geen berichten in deze view.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <PlatformIcon platform={selected.platform} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selected.author}</span>
                  <span className="text-xs text-muted-foreground">{selected.authorHandle}</span>
                  <Badge
                    variant="outline"
                    className={cn("ml-auto text-[10px] capitalize", sentimentStyles[selected.sentiment])}
                  >
                    {selected.sentiment}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Reactie op: <span className="text-foreground">{selected.postContext}</span>
                </div>
                {classifications[selected.id] && (
                  <div className="mt-2 flex items-center gap-2">
                    <PriorityBadge
                      intent={classifications[selected.id].intent}
                      priority={classifications[selected.id].priority}
                    />
                    {classifications[selected.id].suggestedAction && (
                      <span className="text-[10px] text-muted-foreground">
                        → {classifications[selected.id].suggestedAction}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface p-3 text-sm">{selected.body}</div>

            <ReplyGenerator
              item={selected}
              onPick={(text) => setReply(text)}
              onSend={(text) => markAnswered(selected.id, text)}
            />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Jouw antwoord</h4>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                placeholder="Typ je antwoord of gebruik een AI-suggestie hierboven…"
                className="resize-none bg-surface"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!reply.trim()}
                  onClick={() => markAnswered(selected.id, reply)}
                >
                  <Send className="h-3.5 w-3.5" /> Verstuur antwoord
                </Button>
              </div>
            </div>

            {bulkMode && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Bulk-modus actief.</strong> Sneltoetsen: <kbd className="rounded border border-border bg-surface px-1">S</kbd> skip · <kbd className="rounded border border-border bg-surface px-1">Esc</kbd> stop
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { HelpCircle, Loader2, MessageSquareQuote, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateAI } from "@/lib/ai.functions";
import type { Platform } from "@/lib/demo-data";
import { computeLearnings } from "@/lib/feedback-loop";

type Hook = { style: string; text: string };

const styleMeta: Record<string, { icon: typeof HelpCircle; label: string; hint: string }> = {
  vraag: { icon: HelpCircle, label: "Vraag", hint: "triggert nieuwsgierigheid" },
  statement: { icon: Zap, label: "Statement", hint: "bold uitspraak" },
  cijfer: { icon: MessageSquareQuote, label: "Cijfer", hint: "concreet & scanbaar" },
};

function parseHooks(raw: string): Hook[] {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { hooks?: Hook[] };
    return parsed.hooks ?? [];
  } catch {
    return [];
  }
}

export function HookGeneratorPanel({
  content,
  platform,
  onSelect,
}: {
  content: string;
  platform?: Platform;
  onSelect: (hook: string) => void;
}) {
  const fn = useServerFn(generateAI);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const learnings = computeLearnings(platform);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onSuccess: ({ output }) => {
      const parsed = parseHooks(output);
      if (parsed.length === 0) {
        toast.error("Kon hooks niet parsen — probeer opnieuw.");
        return;
      }
      setHooks(parsed);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Score-schatting: match hook-style tegen learnings.hookRanking
  const scoreFor = (style: string): number => {
    const map: Record<string, string[]> = {
      vraag: ["vraag", "cliffhanger", "keuze"],
      statement: ["statement", "insider", "pov"],
      cijfer: ["cijfer", "listicle", "insider"],
    };
    const matches = learnings.hookRanking.filter((h) =>
      map[style]?.some((k) => h.hook.toLowerCase().includes(k)),
    );
    if (matches.length === 0) return learnings.avgEngagement;
    return matches.reduce((s, m) => s + m.avgEngagement, 0) / matches.length;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Hook A/B generator
        </CardTitle>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              data: {
                action: "hooks_ab",
                content,
                platform,
                learnings: learnings.summary,
              },
            })
          }
        >
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Genereer 3 hooks
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {hooks.length === 0 && (
          <p className="text-xs text-muted-foreground">
            AI schrijft 3 openingszinnen in verschillende stijlen. Klik één aan om je post te openen met die hook.
          </p>
        )}
        {hooks.map((hook, i) => {
          const meta = styleMeta[hook.style] ?? styleMeta.statement;
          const Icon = meta.icon;
          const score = scoreFor(hook.style);
          return (
            <button
              key={i}
              onClick={() => {
                onSelect(hook.text);
                toast.success(`Hook overgenomen (${meta.label})`);
              }}
              className="group flex w-full items-start gap-3 rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {meta.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{meta.hint}</span>
                  {score > 0 && (
                    <Badge variant="outline" className="ml-auto text-[10px] text-success">
                      ~{score.toFixed(1)}% eng.
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm">{hook.text}</p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

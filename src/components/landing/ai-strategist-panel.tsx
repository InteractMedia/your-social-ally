import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listLandingAiProposals, runLandingAiStrategist } from "@/lib/landing-ai.functions";
import {
  CONFIDENCE_LEVEL_LABELS,
  LANDING_AI_DEFAULT_MODEL,
  LANDING_AI_MODE_LABELS,
  confidenceLevel,
  type LandingAiMode,
} from "@/lib/landing-ai-shared";

const STATUS_LABELS: Record<string, string> = {
  draft: "Nieuw voorstel",
  applied: "Toegepast als concept",
  discarded: "Afgewezen",
};

export function AiStrategistPanel({ pageId }: { pageId: string }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listLandingAiProposals);
  const run = useServerFn(runLandingAiStrategist);

  const [mode, setMode] = useState<LandingAiMode>("optimize");
  const [goal, setGoal] = useState("Meer gekwalificeerde zakelijke offerteaanvragen");
  const [brief, setBrief] = useState("");
  const [period, setPeriod] = useState<"30" | "90" | "180">("90");

  const proposals = useQuery({
    queryKey: ["landing-ai-proposals", pageId],
    queryFn: () => list({ data: { pageId } }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      run({
        data: {
          mode,
          pageId,
          goal: goal.trim() || null,
          brief: brief.trim() || null,
          provider: "anthropic" as const,
          model: LANDING_AI_DEFAULT_MODEL,
          periodDays: Number(period) as 30 | 90 | 180,
        },
      }),
    onSuccess: (res: any) => {
      if (!res?.ok) {
        toast.error(res?.error ?? "AI-analyse mislukt");
        return;
      }
      toast.success(
        `Voorstel gereed — ${res.sectionCount} blokken, AI-confidence ${res.aiConfidence}, datavertrouwen ${res.dataConfidence.score}`,
      );
      if (res.fallbackReason) toast.warning(res.fallbackReason);
      queryClient.invalidateQueries({ queryKey: ["landing-ai-proposals", pageId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            AI Landing Page Strategist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            De AI analyseert onze eigen lead- en paginadata plus Google Ads-zoekintentie en stelt een complete
            pagina-opbouw voor binnen onze bestaande blokken. Er wordt niets gepubliceerd en niets in Google Ads
            gewijzigd: toepassen maakt altijd een nieuw concept.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Modus</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as LandingAiMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LANDING_AI_MODE_LABELS) as LandingAiMode[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {LANDING_AI_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dataperiode</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as "30" | "90" | "180")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dagen</SelectItem>
                  <SelectItem value="90">90 dagen</SelectItem>
                  <SelectItem value="180">180 dagen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doel</Label>
              <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Briefing (optioneel)</Label>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="Bijv. focus op grote bouwbedrijven, nadruk op levering op meerdere projectlocaties."
            />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> AI werkt aan het voorstel…
              </>
            ) : (
              <>
                <Bot className="size-4" /> Analyse starten
              </>
            )}
          </Button>
          {mutation.isPending ? (
            <p className="text-muted-foreground text-xs">
              Dit duurt doorgaans 1 tot 3 minuten: eerst strategie, dan pagina-ontwerp.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI-voorstellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proposals.isLoading ? (
            <p className="text-muted-foreground text-sm">Laden…</p>
          ) : (proposals.data?.proposals ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nog geen AI-voorstellen voor deze pagina. Start hierboven een analyse.
            </p>
          ) : (
            (proposals.data?.proposals ?? []).map((p: any) => (
              <Link
                key={p.id}
                to="/landing-ai/$id"
                params={{ id: p.id }}
                className="hover:bg-muted/60 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(p.created_at).toLocaleString("nl-NL")} ·{" "}
                    {LANDING_AI_MODE_LABELS[p.mode as LandingAiMode] ?? p.mode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">AI {p.ai_confidence}</Badge>
                  <Badge variant="secondary">
                    Data {CONFIDENCE_LEVEL_LABELS[confidenceLevel(p.data_confidence)]} ({p.data_confidence})
                  </Badge>
                  <Badge variant={p.status === "applied" ? "default" : "outline"}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

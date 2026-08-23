import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Brain, Loader2, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { AdviceInbox } from "@/components/ads/advice-inbox";
import { PeriodPicker } from "@/components/ads/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, resolvePeriod, type Period } from "@/lib/ads-period";
import { getAiAdsSettings, listAiAdvice, runAiAdsAnalysis } from "@/lib/ai-ads.functions";

export const Route = createFileRoute("/ads/google/advice")({
  head: () => ({
    meta: [
      { title: "AI Ads Analyst — SocialCockpit" },
      {
        name: "description",
        content:
          "Laat AI je Google Ads-account en B2B-leadkwaliteit analyseren en concrete optimalisatievoorstellen doen. Jij beslist wat er gebeurt.",
      },
      { property: "og:title", content: "AI Ads Analyst — SocialCockpit" },
      {
        property: "og:description",
        content: "AI-adviezen over campagnes, zoekwoorden, leadkwaliteit en landingspagina's.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdvicePage,
});

function AdvicePage() {
  const [period, setPeriod] = useState<Period>(() => resolvePeriod("last_30_days"));
  const qc = useQueryClient();

  const settingsFn = useServerFn(getAiAdsSettings);
  const listFn = useServerFn(listAiAdvice);
  const runFn = useServerFn(runAiAdsAnalysis);

  const settingsQuery = useQuery({ queryKey: ["ai-settings"], queryFn: () => settingsFn({}) });
  const runsQuery = useQuery({
    queryKey: ["ai-advice", "runs"],
    queryFn: () => listFn({ data: { status: "all", includeTest: false } }),
  });

  const run = useMutation({
    mutationFn: () => runFn({ data: { start: period.start, end: period.end } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error ?? "Analyse mislukt");
        return;
      }
      if (res.fallbackReason) toast.warning(res.fallbackReason);
      toast.success(`Analyse klaar — ${res.adviceCount} advies(en)`);
      qc.invalidateQueries({ queryKey: ["ai-advice"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const settings = settingsQuery.data?.settings;
  const runs = runsQuery.data?.runs ?? [];
  const lastRun = runs[0];
  const lastSummary = (lastRun?.snapshot as any)?.summary as string | undefined;

  return (
    <AppShell>
      <PageHeader
        title="AI Ads Analyst"
        subtitle="AI analyseert je campagnes en leadkwaliteit en doet voorstellen. Er wordt niets in Google Ads gewijzigd."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/ads/google">
              <ArrowLeft className="mr-1 h-4 w-4" /> Google Ads
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <div className="font-medium">Alleen advies — geen automatische wijzigingen</div>
              <p className="text-muted-foreground">
                De AI mag geen budgetten, biedingen, zoekwoorden, advertenties of targeting aanpassen.
                Elk voorstel wacht op jouw goedkeuring; goedkeuren legt in deze fase alleen je beslissing
                vast.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Nieuwe analyse
            </CardTitle>
            {settings && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{settings.model}</Badge>
                {settingsQuery.data?.availability?.[settings.provider] === false && (
                  <Badge variant="secondary">fallbackmodel actief</Badge>
                )}
                <span>drempel {settings.minConfidence}%</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <PeriodPicker period={period} onChange={setPeriod} />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => run.mutate()} disabled={run.isPending}>
                {run.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1 h-4 w-4" />
                )}
                Analyse starten
              </Button>
              <span className="text-xs text-muted-foreground">
                Analyseert campagnes, zoekwoorden, zoektermen, branches, landingspagina's en
                afwijsredenen van leads.
              </span>
            </div>

            {lastSummary && (
              <div className="rounded-md border border-border bg-surface p-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Laatste samenvatting
                </div>
                <p className="mt-1 text-muted-foreground">{lastSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <AdviceInbox minConfidence={settings?.minConfidence ?? 70} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysegeschiedenis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen analyses uitgevoerd.</p>
            ) : (
              runs.map((r: any) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.status === "completed" ? "secondary" : "outline"}>
                      {r.status === "completed"
                        ? "Voltooid"
                        : r.status === "failed"
                          ? "Mislukt"
                          : "Bezig"}
                    </Badge>
                    <span>
                      {r.period_start} t/m {r.period_end}
                    </span>
                    <span className="text-muted-foreground">
                      {r.advice_count} advies(en) · {r.model_name}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {formatDateTime(r.created_at)}
                    {r.runtime_ms ? ` · ${Math.round(r.runtime_ms / 100) / 10}s` : ""}
                    {r.error ? ` · ${r.error.slice(0, 120)}` : ""}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

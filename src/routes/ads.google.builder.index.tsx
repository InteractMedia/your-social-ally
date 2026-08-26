import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, ShieldAlert, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUILDER_FUNNELS,
  DRAFT_STATUS_LABELS,
  draftTotals,
  funnelLabel,
  type BuilderFunnel,
  type SearchCampaignDraftRow,
} from "@/lib/campaign-builder-shared";
import { getBuilderOptions, listSearchDrafts, runSearchConcept } from "@/lib/campaign-builder.functions";

export const Route = createFileRoute("/ads/google/builder/")({
  head: () => ({
    meta: [
      { title: "Campaign Builder — SocialCockpit" },
      {
        name: "description",
        content:
          "Laat AI op basis van je eigen funnel-, lead- en Google Ads-data een compleet Google Search-campagneconcept opstellen. Volledig bewerkbaar, niets wordt automatisch aangemaakt.",
      },
      { property: "og:title", content: "Campaign Builder — SocialCockpit" },
      {
        property: "og:description",
        content: "AI-concepten voor Google Search-campagnes op basis van je eigen data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const optionsFn = useServerFn(getBuilderOptions);
  const listFn = useServerFn(listSearchDrafts);
  const runFn = useServerFn(runSearchConcept);

  const optionsQuery = useQuery({ queryKey: ["builder-options"], queryFn: () => optionsFn({}) });
  const draftsQuery = useQuery({ queryKey: ["builder-drafts"], queryFn: () => listFn({}) });

  const [funnel, setFunnel] = useState<BuilderFunnel>("quote");
  const [pageId, setPageId] = useState("");
  const [industryId, setIndustryId] = useState("auto");
  const [locations, setLocations] = useState("Nederland");
  const [language, setLanguage] = useState("nl");
  const [budget, setBudget] = useState("");

  const pages = useMemo(
    () => (optionsQuery.data?.pages ?? []).filter((p: any) => p.funnel_type === funnel),
    [optionsQuery.data, funnel],
  );

  const run = useMutation({
    mutationFn: () =>
      runFn({
        data: {
          funnel,
          landingPageId: pageId,
          industryId: industryId === "auto" ? null : industryId,
          locations: locations
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          language,
          targetDailyBudget: budget ? Number(budget) : null,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok || !res.draftId) {
        toast.error(res.error ?? "Concept maken mislukt");
        return;
      }
      if (res.fallbackReason) toast.warning(res.fallbackReason);
      toast.success("Campagneconcept aangemaakt");
      qc.invalidateQueries({ queryKey: ["builder-drafts"] });
      navigate({ to: "/ads/google/builder/$id", params: { id: res.draftId } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const drafts = (draftsQuery.data?.drafts ?? []) as SearchCampaignDraftRow[];
  const canRun = Boolean(pageId) && locations.trim().length > 1 && !run.isPending;

  return (
    <AppShell>
      <PageHeader
        title="Campaign Builder"
        subtitle="AI stelt een compleet Google Search-concept op uit je eigen data. Je bewerkt alles zelf; er wordt niets in Google Ads aangemaakt."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/ads/google">
              <ArrowLeft className="mr-1 h-4 w-4" /> Google Ads
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            V1 maakt uitsluitend concepten. Ook een goedgekeurd concept wordt niet in Google Ads
            aangemaakt of gewijzigd.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" /> Nieuw Search-concept
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Funnel</Label>
              <Select
                value={funnel}
                onValueChange={(v) => {
                  setFunnel(v as BuilderFunnel);
                  setPageId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILDER_FUNNELS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Landingspagina</Label>
              <Select value={pageId} onValueChange={setPageId}>
                <SelectTrigger>
                  <SelectValue placeholder={pages.length ? "Kies een pagina" : "Geen pagina's"} />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Branche (optioneel)</Label>
              <Select value={industryId} onValueChange={setIndustryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatisch uit de landingspagina</SelectItem>
                  {(optionsQuery.data?.industries ?? []).map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Land / regio</Label>
              <Input
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="Nederland, België"
              />
              <p className="text-[11px] text-muted-foreground">Scheid meerdere gebieden met komma's.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Taal</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">Nederlands</SelectItem>
                  <SelectItem value="en">Engels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Gewenst dagbudget (optioneel)</Label>
              <Input
                type="number"
                min={1}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="bijv. 25"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Model: {optionsQuery.data?.model ?? "…"}
                {optionsQuery.data && !optionsQuery.data.availability.anthropic
                  ? " (Claude-key ontbreekt — fallbackmodel wordt gebruikt)"
                  : ""}
              </p>
              <Button onClick={() => run.mutate()} disabled={!canRun}>
                {run.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                Concept laten opstellen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Concepten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {draftsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Laden…</p>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen concepten. Maak hierboven je eerste Search-concept.
              </p>
            ) : (
              drafts.map((d) => {
                const t = draftTotals(d.proposal);
                return (
                  <Link
                    key={d.id}
                    to="/ads/google/builder/$id"
                    params={{ id: d.id }}
                    className="block rounded-lg border p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {d.proposal?.campaignName || "Concept zonder naam"}
                      </span>
                      <Badge variant="secondary">{DRAFT_STATUS_LABELS[d.status] ?? d.status}</Badge>
                      <Badge variant="outline">{funnelLabel(d.funnel)}</Badge>
                      {d.industry_name ? <Badge variant="outline">{d.industry_name}</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.adGroups} advertentiegroepen · {t.keywords} keywords ({t.b2bKeywords} B2B) ·{" "}
                      {t.negatives} negatieve · AI-confidence {d.ai_confidence}% · data-confidence{" "}
                      {d.data_confidence}%
                    </p>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

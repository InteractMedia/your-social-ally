import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignCreationPanel } from "@/components/ads/campaign-creation-panel";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  APPROVED_NOTICE,
  AUDIENCE_INTENT_LABELS,
  BIDDING_STRATEGY_LABELS,
  DRAFT_STATUS_LABELS,
  MATCH_TYPE_LABELS,
  draftTotals,
  evidenceLabel,
  evidenceTone,
  funnelLabel,
  type BuilderProposal,
  type EvidenceNote,
  type SearchCampaignDraftRow,
} from "@/lib/campaign-builder-shared";
import {
  deleteSearchDraft,
  getSearchDraft,
  revalidateSearchDraft,
  saveSearchDraft,
  setSearchDraftStatus,
} from "@/lib/campaign-builder.functions";

export const Route = createFileRoute("/ads/google/builder/$id")({
  head: () => ({
    meta: [
      { title: "Campagneconcept bewerken — SocialCockpit" },
      {
        name: "description",
        content:
          "Bekijk en bewerk het AI-concept voor een Google Search-campagne: advertentiegroepen, keywords, advertentieteksten en onderbouwing per keuze.",
      },
      { property: "og:title", content: "Campagneconcept bewerken — SocialCockpit" },
      {
        property: "og:description",
        content: "Volledige handmatige controle over het AI-campagneconcept voordat er iets gebeurt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DraftPage,
});

function Evidence({ evidence }: { evidence: EvidenceNote | undefined }) {
  if (!evidence) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", evidenceTone(evidence.source))}
      >
        {evidenceLabel(evidence.source)}
      </span>
      {evidence.note ? (
        <span className="text-[11px] text-muted-foreground">{evidence.note}</span>
      ) : null}
    </span>
  );
}

function DraftPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const getFn = useServerFn(getSearchDraft);
  const saveFn = useServerFn(saveSearchDraft);
  const statusFn = useServerFn(setSearchDraftStatus);
  const deleteFn = useServerFn(deleteSearchDraft);
  const revalidateFn = useServerFn(revalidateSearchDraft);

  const draftQuery = useQuery({
    queryKey: ["builder-draft", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const draft = draftQuery.data?.draft as SearchCampaignDraftRow | null | undefined;
  const [proposal, setProposal] = useState<BuilderProposal | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (draft?.proposal && !dirty) setProposal(draft.proposal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.updated_at]);

  const patch = (fn: (p: BuilderProposal) => void) => {
    setProposal((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: () => saveFn({ data: { id, proposal: proposal as any } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error ?? "Opslaan mislukt");
      setDirty(false);
      toast.success("Concept opgeslagen");
      qc.invalidateQueries({ queryKey: ["builder-draft", id] });
      qc.invalidateQueries({ queryKey: ["builder-drafts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: "AI_CONCEPT" | "REVIEWED" | "APPROVED_FOR_CREATION") =>
      statusFn({ data: { id, status } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error ?? "Status wijzigen mislukt");
      toast.success(APPROVED_NOTICE);
      qc.invalidateQueries({ queryKey: ["builder-draft", id] });
      qc.invalidateQueries({ queryKey: ["builder-drafts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // V1.1: deterministische hervalidatie (guardrails, data-confidence, final URL).
  const revalidate = useMutation({
    mutationFn: () => revalidateFn({ data: { id } }),
    onSuccess: (res: any) => {
      if (!res.ok) return toast.error(res.error ?? "Hervalidatie mislukt");
      setDirty(false);
      toast.success(
        `Guardrails toegepast · data-confidence ${res.dataConfidence}% (${res.dataConfidenceBand}) · ${
          res.execution?.eligibility === "ALLOWED" ? "uitvoerbaar" : "geblokkeerd voor creatie"
        }`,
      );
      qc.invalidateQueries({ queryKey: ["builder-draft", id] });
      qc.invalidateQueries({ queryKey: ["builder-drafts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["builder-drafts"] });
      navigate({ to: "/ads/google/builder" });
    },
  });

  if (draftQuery.isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Laden…</p>
      </AppShell>
    );
  }
  if (!draft || !proposal) {
    return (
      <AppShell>
        <PageHeader title="Concept niet gevonden" subtitle={draftQuery.data?.error ?? ""} />
        <Button asChild variant="ghost" size="sm">
          <Link to="/ads/google/builder">
            <ArrowLeft className="mr-1 h-4 w-4" /> Terug
          </Link>
        </Button>
      </AppShell>
    );
  }

  const totals = draftTotals(proposal);

  return (
    <AppShell>
      <PageHeader
        title={proposal.campaignName}
        subtitle={`${funnelLabel(draft.funnel)} · ${draft.landing_page_name ?? "geen pagina"} · ${draft.locations.join(", ")}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/ads/google/builder">
                <ArrowLeft className="mr-1 h-4 w-4" /> Concepten
              </Link>
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              {save.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Opslaan
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{APPROVED_NOTICE}</p>
        </div>

        {/* Status + confidence */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status en betrouwbaarheid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{DRAFT_STATUS_LABELS[draft.status] ?? draft.status}</Badge>
              <Badge variant="outline">AI-confidence {draft.ai_confidence}%</Badge>
              <Badge variant="outline">
                Data-confidence {draft.data_confidence}%
                {(proposal as any)?.dataConfidenceBand ? ` · ${(proposal as any).dataConfidenceBand}` : ""}
              </Badge>
              <Badge variant="outline">
                {draft.provider} · {draft.model}
              </Badge>
              {(proposal as any)?.execution ? (
                <Badge
                  variant={
                    (proposal as any).execution.eligibility === "ALLOWED" ? "default" : "destructive"
                  }
                >
                  {(proposal as any).execution.eligibility === "ALLOWED"
                    ? "Uitvoerbaar"
                    : "Geblokkeerd voor creatie"}
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {totals.adGroups} groepen · {totals.keywords} keywords ({totals.b2bKeywords} B2B) ·{" "}
                {totals.headlines} headlines · {totals.negatives} negatieve
              </span>
            </div>
            {draft.fallback_reason ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">{draft.fallback_reason}</p>
            ) : null}
            {(proposal as any)?.execution?.blockers?.length ? (
              <ul className="list-disc space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-3 pl-6 text-xs">
                {(proposal as any).execution.blockers.map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : null}
            {(proposal as any)?.guardrails ? (
              <details className="rounded-md border p-3 text-xs">
                <summary className="cursor-pointer font-medium">
                  Guardrail-rapport ({(proposal as any).guardrails.version})
                </summary>
                <p className="mt-2 text-muted-foreground">
                  {(proposal as any).guardrails.counts?.keywordsActive} keywords actief ·{" "}
                  {(proposal as any).guardrails.counts?.keywordsDisabled} uitgezet ·{" "}
                  {(proposal as any).guardrails.counts?.negativesDisabled} negatieve verwijderd ·{" "}
                  {(proposal as any).guardrails.counts?.assetsRewritten} teksten herschreven
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {((proposal as any).guardrails.keywordFindings ?? [])
                    .filter((f: any) => f.flags?.length)
                    .map((f: any, i: number) => (
                      <li key={i}>
                        <span className="font-medium">{f.keyword}</span> — {f.b2bLevel} ·{" "}
                        {f.flags.join(", ")} {f.note}
                      </li>
                    ))}
                  {((proposal as any).guardrails.assetFindings ?? []).map((f: any, i: number) => (
                    <li key={`a${i}`}>
                      {f.scope}: “{f.text}” ({f.length}/{f.limit}) → {f.action}
                    </li>
                  ))}
                  {((proposal as any).guardrails.claimFindings ?? []).map((f: string, i: number) => (
                    <li key={`c${i}`}>{f}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => revalidate.mutate()}
                disabled={revalidate.isPending}
              >
                {revalidate.isPending ? "Bezig…" : "Hervalideer (guardrails)"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus.mutate("REVIEWED")}
                disabled={setStatus.isPending}
              >
                Markeer als nagekeken
              </Button>
              <Button
                size="sm"
                onClick={() => setStatus.mutate("APPROVED_FOR_CREATION")}
                disabled={setStatus.isPending}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> Concept goedkeuren
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Verwijderen
              </Button>
            </div>
            <details className="rounded-md border p-3 text-xs">
              <summary className="cursor-pointer font-medium">Onderbouwing data-confidence</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                {(draft.data_confidence_reasons ?? []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <p className="mt-3 font-medium">Gebruikte bronnen</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {(draft.data_sources ?? []).map((s, i) => (
                  <li key={i}>
                    {s.used ? "✓" : "—"} {s.source}: {s.detail}
                  </li>
                ))}
              </ul>
            </details>
            {(draft.missing_data ?? []).length ? (
              <div className="rounded-md border border-dashed p-3 text-xs">
                <p className="flex items-center gap-1.5 font-medium">
                  <Info className="h-3.5 w-3.5" /> Ontbrekende data
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                  {draft.missing_data.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Gecontroleerde uitvoering richting Google Ads */}
        <CampaignCreationPanel draft={draft} />



        {/* Campagne-instellingen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campagne-instellingen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Campagnenaam</Label>
              <Input
                value={proposal.campaignName}
                onChange={(e) => patch((p) => void (p.campaignName = e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Landingspagina</Label>
              <Input
                value={proposal.landingPageUrl}
                onChange={(e) => patch((p) => void (p.landingPageUrl = e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dagbudget (€)</Label>
              <Input
                type="number"
                value={proposal.dailyBudget.amount ?? ""}
                onChange={(e) =>
                  patch(
                    (p) =>
                      void (p.dailyBudget.amount = e.target.value ? Number(e.target.value) : null),
                  )
                }
              />
              <p className="text-[11px] text-muted-foreground">{proposal.dailyBudget.reasoning}</p>
              <Evidence evidence={proposal.dailyBudget.evidence} />
            </div>
            <div className="space-y-1.5">
              <Label>Biedstrategie</Label>
              <Input
                value={
                  BIDDING_STRATEGY_LABELS[proposal.bidding.strategy as keyof typeof BIDDING_STRATEGY_LABELS] ??
                  proposal.bidding.strategy
                }
                readOnly
              />
              <p className="text-[11px] text-muted-foreground">
                {proposal.bidding.reasoning}
                {proposal.bidding.target ? ` (doel: ${proposal.bidding.target})` : ""}
              </p>
              <Evidence evidence={proposal.bidding.evidence} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Conversiedoel</Label>
              <Input
                value={proposal.conversionGoal.name}
                onChange={(e) => patch((p) => void (p.conversionGoal.name = e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">{proposal.conversionGoal.reasoning}</p>
              {proposal.conversionGoal.actionId ? (
                <p className="text-[11px] text-muted-foreground">
                  Conversieactie-ID: {proposal.conversionGoal.actionId}
                </p>
              ) : null}
              <Evidence evidence={proposal.conversionGoal.evidence} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Netwerk en locatie-instelling (vastgelegd)</Label>
              <p className="text-[11px] text-muted-foreground">
                Zoeknetwerk: {proposal.network?.searchNetwork === false ? "uit" : "aan"} · zoekpartners:{" "}
                {proposal.network?.searchPartners ? "aan" : "uit"} · Display:{" "}
                {proposal.network?.displayNetwork ? "aan" : "uit"} · locatiedoelgroep:{" "}
                {proposal.locationOption ?? "PRESENCE"} (alleen aanwezigheid)
              </p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Doel en verwachte intentie</Label>
              <Textarea
                rows={3}
                value={`${proposal.goal}\n${proposal.expectedIntent}`.trim()}
                onChange={(e) => patch((p) => void (p.goal = e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Locaties: {proposal.locations.join(", ")} · taal: {proposal.language}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advertentiegroepen */}
        {proposal.adGroups.map((group, gi) => (
          <Card key={gi} className={cn(!group.enabled && "opacity-60")}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  <Input
                    className="h-8 w-64"
                    value={group.name}
                    onChange={(e) => patch((p) => void (p.adGroups[gi]!.name = e.target.value))}
                  />
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {AUDIENCE_INTENT_LABELS[
                      group.audienceIntent as keyof typeof AUDIENCE_INTENT_LABELS
                    ] ?? group.audienceIntent}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Actief</span>
                    <Switch
                      checked={group.enabled}
                      onCheckedChange={(v) => patch((p) => void (p.adGroups[gi]!.enabled = v))}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{group.searchIntent}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Keywords</p>
                <div className="space-y-1.5">
                  {group.keywords.map((kw, ki) => (
                    <div
                      key={ki}
                      className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <Switch
                        checked={kw.enabled}
                        onCheckedChange={(v) =>
                          patch((p) => void (p.adGroups[gi]!.keywords[ki]!.enabled = v))
                        }
                      />
                      <Input
                        className="h-8 flex-1 min-w-[180px]"
                        value={kw.text}
                        onChange={(e) =>
                          patch((p) => void (p.adGroups[gi]!.keywords[ki]!.text = e.target.value))
                        }
                      />
                      <Badge variant="secondary">
                        {MATCH_TYPE_LABELS[kw.matchType as keyof typeof MATCH_TYPE_LABELS] ??
                          kw.matchType}
                      </Badge>
                      <Badge variant={kw.intent === "B2B" ? "default" : "outline"}>{kw.intent}</Badge>
                      <Evidence evidence={kw.evidence} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                    Headlines (max 30 tekens)
                  </p>
                  <div className="space-y-1.5">
                    {group.headlines.map((h, hi) => (
                      <div key={hi} className="flex items-center gap-2">
                        <Switch
                          checked={h.enabled}
                          onCheckedChange={(v) =>
                            patch((p) => void (p.adGroups[gi]!.headlines[hi]!.enabled = v))
                          }
                        />
                        <Input
                          className="h-8"
                          maxLength={30}
                          value={h.text}
                          onChange={(e) =>
                            patch((p) => void (p.adGroups[gi]!.headlines[hi]!.text = e.target.value))
                          }
                        />
                        <span className="w-8 text-right text-[11px] text-muted-foreground">
                          {h.text.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                    Descriptions (max 90 tekens)
                  </p>
                  <div className="space-y-1.5">
                    {group.descriptions.map((d, di) => (
                      <div key={di} className="flex items-start gap-2">
                        <Switch
                          checked={d.enabled}
                          onCheckedChange={(v) =>
                            patch((p) => void (p.adGroups[gi]!.descriptions[di]!.enabled = v))
                          }
                        />
                        <Textarea
                          rows={2}
                          maxLength={90}
                          value={d.text}
                          onChange={(e) =>
                            patch(
                              (p) => void (p.adGroups[gi]!.descriptions[di]!.text = e.target.value),
                            )
                          }
                        />
                        <span className="w-8 pt-2 text-right text-[11px] text-muted-foreground">
                          {d.text.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Negatieve keywords + extensies */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Negatieve keywords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {proposal.negativeKeywords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen voorstellen.</p>
              ) : (
                proposal.negativeKeywords.map((n, ni) => (
                  <div key={ni} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Switch
                      checked={n.enabled}
                      onCheckedChange={(v) =>
                        patch((p) => void (p.negativeKeywords[ni]!.enabled = v))
                      }
                    />
                    <Input
                      className="h-8 flex-1"
                      value={n.text}
                      onChange={(e) =>
                        patch((p) => void (p.negativeKeywords[ni]!.text = e.target.value))
                      }
                    />
                    <Badge variant="secondary">
                      {MATCH_TYPE_LABELS[n.matchType as keyof typeof MATCH_TYPE_LABELS] ??
                        n.matchType}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{n.reason}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sitelinks en callouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposal.sitelinks.map((s, si) => (
                <div key={si} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => patch((p) => void (p.sitelinks[si]!.enabled = v))}
                  />
                  <Input
                    className="h-8"
                    maxLength={25}
                    value={s.text}
                    onChange={(e) => patch((p) => void (p.sitelinks[si]!.text = e.target.value))}
                  />
                  <span className="flex-1 text-[11px] text-muted-foreground">{s.description}</span>
                </div>
              ))}
              {proposal.callouts.map((c, ci) => (
                <div key={ci} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={c.enabled}
                    onCheckedChange={(v) => patch((p) => void (p.callouts[ci]!.enabled = v))}
                  />
                  <Input
                    className="h-8"
                    maxLength={25}
                    value={c.text}
                    onChange={(e) => patch((p) => void (p.callouts[ci]!.text = e.target.value))}
                  />
                </div>
              ))}
              {!proposal.sitelinks.length && !proposal.callouts.length ? (
                <p className="text-sm text-muted-foreground">Geen extensies voorgesteld.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Risico's */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risico's en onzekerheden</CardTitle>
          </CardHeader>
          <CardContent>
            {proposal.summary ? <p className="mb-3 text-sm">{proposal.summary}</p> : null}
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {proposal.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BLOCK_LABELS, type BlockType } from "@/lib/landing-shared";
import {
  applyLandingAiProposal,
  discardLandingAiProposal,
  getLandingAiProposal,
} from "@/lib/landing-ai.functions";
import { CONFIDENCE_LEVEL_LABELS, confidenceLevel } from "@/lib/landing-ai-shared";

export const Route = createFileRoute("/landing-ai/$id")({
  head: () => ({
    meta: [
      { title: "AI-voorstel landingspagina | SocialCockpit" },
      {
        name: "description",
        content:
          "Bekijk de AI-strategie, pagina-opbouw en onderbouwing voor een B2B-landingspagina en zet die om in een nieuw concept.",
      },
      { property: "og:title", content: "AI-voorstel landingspagina | SocialCockpit" },
      {
        property: "og:description",
        content: "AI-strategie, blokopbouw en experimenten voor een B2B-landingspagina.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProposalDetail,
});

function List({ items }: { items?: unknown[] }) {
  const rows = (items ?? []) as string[];
  if (!rows.length) return <p className="text-muted-foreground text-sm">—</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {rows.map((r, i) => (
        <li key={i}>{String(r)}</li>
      ))}
    </ul>
  );
}

function ProposalDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const load = useServerFn(getLandingAiProposal);
  const apply = useServerFn(applyLandingAiProposal);
  const discard = useServerFn(discardLandingAiProposal);

  const { data, isLoading } = useQuery({
    queryKey: ["landing-ai-proposal", id],
    queryFn: () => load({ data: { id } }),
  });

  const applyMutation = useMutation({
    mutationFn: () => apply({ data: { proposalId: id } }),
    onSuccess: (res: any) => {
      if (!res?.ok) {
        toast.error(res?.error ?? "Toepassen mislukt");
        return;
      }
      toast.success("Nieuw concept aangemaakt — de bestaande pagina is ongewijzigd.");
      queryClient.invalidateQueries({ queryKey: ["landing-ai-proposal", id] });
      navigate({ to: "/landingpages/$id", params: { id: res.pageId } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const discardMutation = useMutation({
    mutationFn: () => discard({ data: { proposalId: id } }),
    onSuccess: () => {
      toast.success("Voorstel afgewezen");
      queryClient.invalidateQueries({ queryKey: ["landing-ai-proposal", id] });
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  const proposal = data?.proposal as any;
  if (!proposal) {
    return (
      <AppShell>
        <PageHeader title="Voorstel niet gevonden" subtitle="Dit AI-voorstel bestaat niet (meer)." />
        <Button asChild variant="outline">
          <Link to="/landingpages">
            <ArrowLeft className="size-4" /> Terug naar landingspagina's
          </Link>
        </Button>
      </AppShell>
    );
  }

  const run = data?.run as any;
  const strategy = (proposal.strategy ?? {}) as any;
  const page = (proposal.page_plan ?? {}) as any;
  const form = (proposal.form_plan ?? {}) as any;
  const visual = (proposal.visual_direction ?? {}) as any;
  const sections = (page.sections ?? []) as any[];
  const dataLevel = confidenceLevel(proposal.data_confidence);

  return (
    <AppShell>
      <PageHeader
        title={proposal.title}
        subtitle={`AI-voorstel · ${new Date(proposal.created_at).toLocaleString("nl-NL")}${run?.model ? ` · ${run.model}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/landingpages">
              <ArrowLeft className="size-4" /> Landingspagina's
            </Link>
          </Button>
          {proposal.status === "applied" && proposal.applied_page_id ? (
            <Button asChild>
              <Link to="/landingpages/$id" params={{ id: proposal.applied_page_id }}>
                <ExternalLink className="size-4" /> Open AI-concept
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => discardMutation.mutate()}>
                <Trash2 className="size-4" /> Afwijzen
              </Button>
              <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Toepassen als nieuw concept
              </Button>
            </>
          )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Strategie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Doelgroep</p>
              <p className="text-muted-foreground">{strategy.audience ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium">Bezoekintentie</p>
              <p className="text-muted-foreground">{strategy.visit_intent ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium">Kernpropositie</p>
              <p className="text-muted-foreground">{strategy.core_proposition ?? "—"}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-medium">Pijnpunten</p>
                <List items={strategy.pains} />
              </div>
              <div>
                <p className="font-medium">Bezwaren</p>
                <List items={strategy.objections} />
              </div>
              <div>
                <p className="font-medium">Bewijs</p>
                <List items={strategy.key_proof} />
              </div>
              <div>
                <p className="font-medium">Mobiele prioriteiten</p>
                <List items={strategy.mobile_priorities} />
              </div>
            </div>
            <div>
              <p className="font-medium">Primaire actie</p>
              <p className="text-muted-foreground">{strategy.primary_cta ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Betrouwbaarheid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>AI-confidence (strategie)</span>
                <Badge variant="outline">{proposal.ai_confidence}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Datavertrouwen (server)</span>
                <Badge variant={dataLevel === "high" ? "default" : "secondary"}>
                  {CONFIDENCE_LEVEL_LABELS[dataLevel]} ({proposal.data_confidence})
                </Badge>
              </div>
              <div>
                <p className="font-medium">Gebruikte data</p>
                <List items={proposal.performance_data_used} />
              </div>
              <div>
                <p className="font-medium">Beperkingen</p>
                <List items={proposal.data_confidence_reasons} />
              </div>
              {run ? (
                <p className="text-muted-foreground text-xs">
                  {run.provider} · {run.model} · {Math.round((run.runtime_ms ?? 0) / 1000)}s ·{" "}
                  {(run.input_tokens ?? 0) + (run.output_tokens ?? 0)} tokens
                  {run.estimated_cost_usd ? ` · ~$${run.estimated_cost_usd}` : ""}
                </p>
              ) : null}
              {run?.fallback_reason ? (
                <p className="text-amber-600 text-xs">{run.fallback_reason}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-amber-500" /> Ontbrekende data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <List items={proposal.missing_data} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Voorgestelde pagina-opbouw ({sections.length} blokken)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{i + 1}</Badge>
                <span className="text-sm font-medium">
                  {BLOCK_LABELS[s.block_type as BlockType] ?? s.block_type}
                </span>
                {s.content?.design?.layout ? (
                  <Badge variant="outline">{s.content.design.layout}</Badge>
                ) : null}
                {s.content?.design?.background ? (
                  <Badge variant="outline">{s.content.design.background}</Badge>
                ) : null}
                {s.content?.design?.emphasis === "high" ? <Badge>nadruk</Badge> : null}
              </div>
              {s.content?.title ? <p className="font-medium">{s.content.title}</p> : null}
              {s.content?.subtitle ? (
                <p className="text-muted-foreground text-sm">{s.content.subtitle}</p>
              ) : null}
              {s.content?.body ? (
                <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">{s.content.body}</p>
              ) : null}
              {(s.content?.items ?? []).length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {s.content.items.map((it: any, k: number) => (
                    <li key={k}>
                      <span className="font-medium">{it.title}</span>
                      {it.text ? <span className="text-muted-foreground"> — {it.text}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.content?.cta_label ? (
                <p className="mt-2 text-xs">
                  CTA: <span className="font-medium">{s.content.cta_label}</span> → {s.content.cta_url}
                </p>
              ) : null}
              {s.content?.design?.media_intent ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  Visual: {s.content.design.media_intent}
                </p>
              ) : null}
              {s.reason ? <p className="text-muted-foreground mt-2 text-xs">Reden: {s.reason}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formuliervoorstel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{form.title ?? "—"}</p>
            <p className="text-muted-foreground">{form.intro ?? ""}</p>
            <ul className="space-y-1">
              {(form.fields ?? []).map((f: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                  <span>{f.label ?? f.key}</span>
                  <Badge variant={f.state === "required" ? "default" : "outline"}>{f.state}</Badge>
                </li>
              ))}
            </ul>
            {form.reason ? <p className="text-muted-foreground text-xs">{form.reason}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visuele richting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{visual.overall ?? "—"}</p>
            <div>
              <p className="font-medium">Benodigde beelden</p>
              <List items={visual.photography_needs} />
            </div>
            {visual.desktop_composition ? (
              <p className="text-muted-foreground text-xs">Desktop: {visual.desktop_composition}</p>
            ) : null}
            {visual.mobile_composition ? (
              <p className="text-muted-foreground text-xs">Mobiel: {visual.mobile_composition}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onderbouwing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {((proposal.rationale ?? []) as any[]).map((r, i) => (
              <div key={i}>
                <p className="font-medium">{r.topic}</p>
                <p className="text-muted-foreground">{r.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voorgestelde experimenten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(data?.experiments ?? []).length === 0 ? (
              <p className="text-muted-foreground">Geen experimenten voorgesteld.</p>
            ) : (
              (data?.experiments ?? []).map((e: any) => (
                <div key={e.id} className="rounded border p-3">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-muted-foreground">{e.hypothesis}</p>
                  <p className="text-muted-foreground text-xs">
                    Meetpunt: {e.primary_metric}
                    {e.target_block ? ` · blok: ${e.target_block}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

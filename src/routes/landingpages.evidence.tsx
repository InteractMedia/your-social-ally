import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMERCIAL_HIERARCHY_TEXT,
  EVIDENCE_LEVELS,
  EVIDENCE_LEVEL_LABELS,
  type EvidenceLevel,
} from "@/lib/landing-cro-evidence";
import {
  deleteCroEvidence,
  getEvidenceCoverage,
  listCroEvidence,
  upsertCroEvidence,
} from "@/lib/landing-cro-evidence.functions";

export const Route = createFileRoute("/landingpages/evidence")({
  head: () => ({
    meta: [
      { title: "CRO-evidence & bronstatus | SocialCockpit" },
      {
        name: "description",
        content:
          "Beheer de CRO-kennisbank en zie welke bewijslagen de AI Landing Page Strategist vandaag echt kan gebruiken.",
      },
      { property: "og:title", content: "CRO-evidence & bronstatus | SocialCockpit" },
      {
        property: "og:description",
        content: "Eigen meetdata, vergelijkbare data, externe evidence en hypotheses in één overzicht.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvidencePage,
});

const LEVEL_STYLES: Record<EvidenceLevel, string> = {
  STRONG: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MODERATE: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  WEAK: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  HYPOTHESIS: "bg-muted text-muted-foreground",
};

function EvidenceDialog({ onSaved }: { onSaved: () => void }) {
  const save = useServerFn(upsertCroEvidence);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    topic: "",
    principle: "",
    evidence_level: "MODERATE" as EvidenceLevel,
    source_name: "",
    source_url: "",
    metric: "",
    context: "",
    limitations: "",
    recommended_application: "",
    applies_to: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          topic: form.topic,
          principle: form.principle,
          evidence_level: form.evidence_level,
          source_name: form.source_name || null,
          source_url: form.source_url || null,
          metric: form.metric || null,
          context: form.context || null,
          limitations: form.limitations || null,
          recommended_application: form.recommended_application || null,
          applies_to: form.applies_to
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          tags: [],
          active: true,
        },
      }),
    onSuccess: () => {
      toast.success("Evidence toegevoegd");
      setOpen(false);
      setForm({ ...form, topic: "", principle: "", source_name: "", source_url: "" });
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Evidence toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Externe CRO-evidence toevoegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Onderwerp</Label>
            <Input
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="bijv. formulierlengte"
            />
          </div>
          <div className="space-y-1">
            <Label>Principe</Label>
            <Textarea
              rows={3}
              value={form.principle}
              onChange={(e) => setForm({ ...form, principle: e.target.value })}
              placeholder="Wat zegt dit onderzoek of principe concreet?"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Bewijsniveau</Label>
              <Select
                value={form.evidence_level}
                onValueChange={(v) => setForm({ ...form, evidence_level: v as EvidenceLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {EVIDENCE_LEVEL_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Metric</Label>
              <Input
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value })}
                placeholder="bijv. leads per 100 bezoeken"
              />
            </div>
            <div className="space-y-1">
              <Label>Bron</Label>
              <Input
                value={form.source_name}
                onChange={(e) => setForm({ ...form, source_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Bron-URL</Label>
              <Input
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Toepasbaar op (komma-gescheiden)</Label>
            <Input
              value={form.applies_to}
              onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
              placeholder="form, cta, hero"
            />
          </div>
          <div className="space-y-1">
            <Label>Beperkingen</Label>
            <Textarea
              rows={2}
              value={form.limitations}
              onChange={(e) => setForm({ ...form, limitations: e.target.value })}
              placeholder="Waarom geldt dit misschien niet voor ZoetBezorgen?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || form.principle.length < 10 || form.topic.length < 2}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvidencePage() {
  const queryClient = useQueryClient();
  const loadKb = useServerFn(listCroEvidence);
  const loadCoverage = useServerFn(getEvidenceCoverage);
  const remove = useServerFn(deleteCroEvidence);

  const kb = useQuery({ queryKey: ["cro-evidence"], queryFn: () => loadKb({}) });
  const coverage = useQuery({
    queryKey: ["cro-evidence-coverage"],
    queryFn: () => loadCoverage({ data: { periodDays: 90 } }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Verwijderd");
      queryClient.invalidateQueries({ queryKey: ["cro-evidence"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const own = coverage.data?.ownData;
  const kbStats = coverage.data?.knowledgeBase;

  return (
    <AppShell>
      <PageHeader
        title="CRO-evidence & bronstatus"
        subtitle="Waarop baseert de AI zijn keuzes? Eigen meetdata eerst, dan vergelijkbare data, dan externe kennis, dan hypothese."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/landingpages">
                <ArrowLeft className="size-4" /> Landingspagina's
              </Link>
            </Button>
            <EvidenceDialog
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["cro-evidence"] })}
            />
          </div>
        }
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Commerciële hiërarchie</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {COMMERCIAL_HIERARCHY_TEXT}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laag 1 & 2 — eigen meetdata (90 dagen)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {coverage.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !own ? (
              <p className="text-muted-foreground">Geen data beschikbaar.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Bezoeken", own.totals.views],
                    ["Leads", own.totals.leads],
                    ["Gekwalificeerd", own.totals.qualified],
                    ["Klanten", own.totals.customers],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded border p-2">
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="text-lg font-semibold">{String(value)}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Meetbare dimensies</p>
                  {own.measurableDimensions.length === 0 ? (
                    <p className="text-muted-foreground">
                      Nog geen enkele dimensie meetbaar: alle AI-keuzes zijn hypotheses.
                    </p>
                  ) : (
                    own.measurableDimensions.map((d) => (
                      <div key={d.label} className="rounded border px-2 py-1">
                        <p>
                          {d.label}{" "}
                          <span className="text-muted-foreground text-xs">({d.entries} varianten)</span>
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Beslisbaar op: {d.decidable_objective} — {d.decidable_reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {own.gaps.length ? (
                  <div>
                    <p className="font-medium">Ontbrekende bronlagen</p>
                    <ul className="text-muted-foreground list-disc pl-5 text-xs">
                      {own.gaps.slice(0, 10).map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laag 3 — externe kennisbank</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {kbStats ? (
              <p className="text-muted-foreground">
                {kbStats.total} principes actief ({kbStats.shared} gedeeld, {kbStats.workspaceOwned} eigen).
                Externe evidence weegt nooit zwaarder dan MATIG.
              </p>
            ) : null}
            {kb.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (kb.data?.entries ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                Nog geen evidence. Zonder kennisbank valt de AI terug op hypotheses.
              </p>
            ) : (
              <div className="space-y-2">
                {(kb.data?.entries ?? []).map((e: any) => (
                  <div key={e.id} className="rounded border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{e.topic}</Badge>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[e.evidence_level as EvidenceLevel] ?? ""}`}
                          >
                            {EVIDENCE_LEVEL_LABELS[e.evidence_level as EvidenceLevel] ?? e.evidence_level}
                          </span>
                          {e.workspace_id ? null : <Badge variant="secondary">standaard</Badge>}
                        </div>
                        <p className="mt-1">{e.principle}</p>
                        {e.limitations ? (
                          <p className="text-muted-foreground text-xs">Beperking: {e.limitations}</p>
                        ) : null}
                        {e.source_name ? (
                          <p className="text-muted-foreground text-xs">Bron: {e.source_name}</p>
                        ) : null}
                      </div>
                      {e.workspace_id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMutation.mutate(e.id)}
                          aria-label="Evidence verwijderen"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <BookOpen className="text-muted-foreground size-4" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

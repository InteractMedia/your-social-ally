import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEUR } from "@/lib/demo-ads";
import {
  googleAdsStore,
  keywordSuggestions,
  type GoogleCampaign,
} from "@/lib/google-ads-store";

export const Route = createFileRoute("/ads/google/new")({
  head: () => ({ meta: [{ title: "Nieuwe Google-campagne" }] }),
  component: NewCampaignWizard,
});

type Draft = {
  objective: GoogleCampaign["objective"];
  name: string;
  dailyBudget: number;
  bidStrategy: GoogleCampaign["bidStrategy"];
  targetCpa?: number;
  geo: string[];
  languages: string[];
  adGroupName: string;
  keywords: string[];
  headlines: string;
  descriptions: string;
  finalUrl: string;
};

const STEPS = ["Doel", "Naam & budget", "Targeting", "Keywords", "Advertentie", "Review"] as const;

function NewCampaignWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    objective: "Sales",
    name: "",
    dailyBudget: 25,
    bidStrategy: "Maximize conversions",
    geo: ["Nederland"],
    languages: ["Nederlands"],
    adGroupName: "",
    keywords: [],
    headlines: "",
    descriptions: "",
    finalUrl: "https://zoetbezorgen.nl/",
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!draft.objective;
      case 1: return draft.name.trim().length >= 3 && draft.dailyBudget >= 1;
      case 2: return draft.geo.length > 0;
      case 3: return draft.adGroupName.trim().length >= 2 && draft.keywords.length > 0;
      case 4: return draft.headlines.trim().split("\n").filter(Boolean).length >= 3 && draft.descriptions.trim().split("\n").filter(Boolean).length >= 2;
      default: return true;
    }
  }, [step, draft]);

  const submit = () => {
    const id = `g_${Date.now().toString(36)}`;
    const headlines = draft.headlines.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 15);
    const descriptions = draft.descriptions.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4);
    const campaign: GoogleCampaign = {
      id,
      name: draft.name,
      status: "actief",
      objective: draft.objective,
      bidStrategy: draft.bidStrategy,
      targetCpa: draft.bidStrategy === "Target CPA" ? draft.targetCpa : undefined,
      dailyBudget: draft.dailyBudget,
      geo: draft.geo,
      languages: draft.languages,
      type: "Search",
      startedAt: new Date().toISOString(),
      adGroups: [
        {
          id: `ag_${id}`,
          name: draft.adGroupName,
          keywords: draft.keywords.map((k) => ({ text: k, match: "phrase" as const, cpc: 0.4 })),
          ads: [{ id: `gad_${id}`, headlines, descriptions, finalUrl: draft.finalUrl }],
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
        },
      ],
    };
    googleAdsStore.create(campaign);
    toast.success(`Campagne "${draft.name}" aangemaakt`);
    navigate({ to: "/ads/google/$campaignId", params: { campaignId: id } });
  };

  return (
    <AppShell>
      <PageHeader
        title="Nieuwe Google-campagne"
        subtitle={`Stap ${step + 1} van ${STEPS.length}: ${STEPS[step]}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/ads/google"><ArrowLeft className="mr-1 h-4 w-4" />Annuleer</Link>
          </Button>
        }
      />

      {/* Stepper */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              i === step ? "border-primary bg-primary/10 text-primary"
              : i < step ? "border-success/40 bg-success/10 text-success"
              : "border-border text-muted-foreground"
            }`}
          >
            {i < step ? <Check className="h-3 w-3" /> : <span className="font-medium tabular-nums">{i + 1}</span>}
            {s}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Wat is je hoofddoel?</h3>
            {(["Sales", "Leads", "Website traffic"] as const).map((o) => (
              <button
                key={o}
                onClick={() => set("objective", o)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  draft.objective === o ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="font-medium">{o}</div>
                <div className="text-xs text-muted-foreground">
                  {o === "Sales" && "Optimaliseer voor aankopen op je site."}
                  {o === "Leads" && "Verzamel leads via formulieren of telefoontjes."}
                  {o === "Website traffic" && "Stuur kwalitatief verkeer naar je site."}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Campagne-naam</Label>
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="bv. Search — Brand termen" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Dagbudget (EUR)</Label>
                <Input type="number" min={1} value={draft.dailyBudget} onChange={(e) => set("dailyBudget", Number(e.target.value))} />
                <p className="mt-1 text-xs text-muted-foreground">Geschat: ~{formatEUR(draft.dailyBudget * 30)}/maand</p>
              </div>
              <div>
                <Label>Bod-strategie</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.bidStrategy}
                  onChange={(e) => set("bidStrategy", e.target.value as Draft["bidStrategy"])}
                >
                  <option>Maximize conversions</option>
                  <option>Maximize clicks</option>
                  <option>Target CPA</option>
                  <option>Manual CPC</option>
                </select>
              </div>
            </div>
            {draft.bidStrategy === "Target CPA" && (
              <div>
                <Label>Target CPA (EUR)</Label>
                <Input type="number" min={1} value={draft.targetCpa ?? ""} onChange={(e) => set("targetCpa", Number(e.target.value))} />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Geografische targeting</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {["Nederland", "België", "Duitsland", "Vlaanderen"].map((g) => {
                  const on = draft.geo.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set("geo", on ? draft.geo.filter((x) => x !== g) : [...draft.geo, g])}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >{g}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Talen</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {["Nederlands", "Engels", "Duits"].map((l) => {
                  const on = draft.languages.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => set("languages", on ? draft.languages.filter((x) => x !== l) : [...draft.languages, l])}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >{l}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Ad group naam</Label>
              <Input value={draft.adGroupName} onChange={(e) => set("adGroupName", e.target.value)} placeholder="bv. Taart bezorgen" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />Keyword Planner — suggesties
              </Label>
              <div className="mt-2 overflow-hidden rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Keyword</th>
                      <th className="px-3 py-2 text-right font-medium">Volume/mnd</th>
                      <th className="px-3 py-2 text-left font-medium">Comp.</th>
                      <th className="px-3 py-2 text-right font-medium">CPC range</th>
                      <th className="px-3 py-2 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywordSuggestions.map((k) => {
                      const on = draft.keywords.includes(k.text);
                      return (
                        <tr key={k.text} className="border-t border-border">
                          <td className="px-3 py-2">{k.text}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{k.volume.toLocaleString("nl-NL")}</td>
                          <td className="px-3 py-2">{k.comp}</td>
                          <td className="px-3 py-2 text-right tabular-nums">€{k.cpcLow.toFixed(2)}–€{k.cpcHigh.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant={on ? "secondary" : "outline"}
                              className="h-6 px-2 text-[10px]"
                              onClick={() => set("keywords", on ? draft.keywords.filter((x) => x !== k.text) : [...draft.keywords, k.text])}
                            >{on ? "Verwijder" : "+ Voeg toe"}</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <Label>Geselecteerd ({draft.keywords.length})</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {draft.keywords.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nog geen keywords gekozen.</span>
                  ) : draft.keywords.map((k) => (
                    <Badge key={k} variant="outline">{k}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label>Final URL</Label>
              <Input value={draft.finalUrl} onChange={(e) => set("finalUrl", e.target.value)} />
            </div>
            <div>
              <Label>Headlines (min 3, max 15 — 1 per regel)</Label>
              <Textarea rows={6} value={draft.headlines} onChange={(e) => set("headlines", e.target.value)} placeholder="Taart laten bezorgen?&#10;Morgen Bij Jou&#10;Ambachtelijk & Vers" />
            </div>
            <div>
              <Label>Descriptions (min 2, max 4 — 1 per regel)</Label>
              <Textarea rows={3} value={draft.descriptions} onChange={(e) => set("descriptions", e.target.value)} placeholder="Vóór 16:00 besteld = morgen bezorgd.&#10;Gratis verzending vanaf €35." />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-sm">
            <h3 className="text-sm font-semibold">Review je campagne</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Review label="Doel" value={draft.objective} />
              <Review label="Naam" value={draft.name} />
              <Review label="Dagbudget" value={formatEUR(draft.dailyBudget)} />
              <Review label="Bod-strategie" value={draft.bidStrategy + (draft.targetCpa ? ` (€${draft.targetCpa})` : "")} />
              <Review label="Geo" value={draft.geo.join(", ")} />
              <Review label="Talen" value={draft.languages.join(", ")} />
              <Review label="Ad group" value={draft.adGroupName} />
              <Review label="Keywords" value={`${draft.keywords.length} geselecteerd`} />
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Door op "Campagne aanmaken" te klikken wordt deze direct toegevoegd aan je overzicht en op <strong className="text-foreground">actief</strong> gezet.
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Terug</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Volgende <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit}>Campagne aanmaken</Button>
        )}
      </div>
    </AppShell>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

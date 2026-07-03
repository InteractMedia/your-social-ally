import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Plus, Sparkles, Trash2, X } from "lucide-react";
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
  type Device,
  type GoogleCampaign,
  type MatchType,
  type SchedulePreset,
} from "@/lib/google-ads-store";

export const Route = createFileRoute("/ads/google/new")({
  head: () => ({ meta: [{ title: "Nieuwe Google-campagne" }] }),
  component: NewCampaignWizard,
});

type KW = { text: string; match: MatchType };

type Draft = {
  objective: GoogleCampaign["objective"];
  name: string;
  dailyBudget: number;
  bidStrategy: GoogleCampaign["bidStrategy"];
  targetCpa?: number;
  startDate: string;
  endDate: string;
  geo: string[];
  languages: string[];
  devices: Device[];
  schedule: SchedulePreset;
  adGroupName: string;
  keywords: KW[];
  negatives: KW[];
  headlines: string;
  descriptions: string;
  finalUrl: string;
};

const STEPS = ["Doel", "Naam & budget", "Targeting", "Keywords", "Advertentie", "Review"] as const;

const HEADLINE_MAX = 30;
const DESC_MAX = 90;

// Parse "[woord]" -> exact, "\"woord\"" -> phrase, anders broad
function parseKeywordLine(raw: string): KW | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("[") && s.endsWith("]")) return { text: s.slice(1, -1).trim(), match: "exact" };
  if (s.startsWith('"') && s.endsWith('"')) return { text: s.slice(1, -1).trim(), match: "phrase" };
  return { text: s, match: "broad" };
}

function estimatedCpc(text: string): number {
  const hit = keywordSuggestions.find((k) => k.text === text);
  if (hit) return (hit.cpcLow + hit.cpcHigh) / 2;
  return 0.4;
}

function NewCampaignWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<Draft>({
    objective: "Sales",
    name: "",
    dailyBudget: 25,
    bidStrategy: "Maximize conversions",
    startDate: today,
    endDate: "",
    geo: ["Nederland"],
    languages: ["Nederlands"],
    devices: ["desktop", "mobile", "tablet"],
    schedule: "always",
    adGroupName: "",
    keywords: [],
    negatives: [],
    headlines: "",
    descriptions: "",
    finalUrl: "https://zoetbezorgen.nl/",
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const headlineLines = draft.headlines.split("\n").map((s) => s.trim()).filter(Boolean);
  const descLines = draft.descriptions.split("\n").map((s) => s.trim()).filter(Boolean);
  const headlineOverflow = headlineLines.some((l) => l.length > HEADLINE_MAX);
  const descOverflow = descLines.some((l) => l.length > DESC_MAX);

  // Aanbevolen budget = 2× hoogste CPC × 10 clicks
  const highestCpc = draft.keywords.reduce((m, k) => Math.max(m, estimatedCpc(k.text)), 0);
  const recommendedBudget = Math.ceil(highestCpc * 2 * 10);
  const budgetLow = highestCpc > 0 && draft.dailyBudget < recommendedBudget;

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!draft.objective;
      case 1: return draft.name.trim().length >= 3 && draft.dailyBudget >= 1 && !!draft.startDate;
      case 2: return draft.geo.length > 0 && draft.devices.length > 0;
      case 3: return draft.adGroupName.trim().length >= 2 && draft.keywords.length > 0;
      case 4: return headlineLines.length >= 3 && descLines.length >= 2 && !headlineOverflow && !descOverflow && draft.finalUrl.trim().length > 0;
      default: return true;
    }
  }, [step, draft, headlineLines.length, descLines.length, headlineOverflow, descOverflow]);

  const submit = (status: GoogleCampaign["status"]) => {
    const id = `g_${Date.now().toString(36)}`;
    const headlines = headlineLines.slice(0, 15);
    const descriptions = descLines.slice(0, 4);
    const campaign: GoogleCampaign = {
      id,
      name: draft.name,
      status,
      objective: draft.objective,
      bidStrategy: draft.bidStrategy,
      targetCpa: draft.bidStrategy === "Target CPA" ? draft.targetCpa : undefined,
      dailyBudget: draft.dailyBudget,
      geo: draft.geo,
      languages: draft.languages,
      devices: draft.devices,
      schedule: draft.schedule,
      startDate: draft.startDate,
      endDate: draft.endDate || undefined,
      type: "Search",
      startedAt: new Date().toISOString(),
      adGroups: [
        {
          id: `ag_${id}`,
          name: draft.adGroupName,
          keywords: draft.keywords.map((k) => ({ text: k.text, match: k.match, cpc: estimatedCpc(k.text) })),
          negatives: draft.negatives,
          ads: [{ id: `gad_${id}`, headlines, descriptions, finalUrl: draft.finalUrl }],
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
        },
      ],
    };
    googleAdsStore.create(campaign);
    toast.success(status === "concept" ? `Concept "${draft.name}" opgeslagen` : `Campagne "${draft.name}" gepubliceerd`);
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
                {budgetLow && (
                  <p className="mt-1 text-xs text-warning">
                    Aanbevolen: minimaal {formatEUR(recommendedBudget)}/dag voor je geselecteerde keywords (2× hoogste CPC × 10 clicks).
                  </p>
                )}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Startdatum</Label>
                <Input type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div>
                <Label>Einddatum (optioneel)</Label>
                <Input type="date" value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
            </div>
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
            <div>
              <Label>Apparaten</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["desktop", "mobile", "tablet"] as const).map((d) => {
                  const on = draft.devices.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set("devices", on ? draft.devices.filter((x) => x !== d) : [...draft.devices, d])}
                      className={`rounded-full border px-3 py-1 text-xs capitalize ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >{d}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Advertentie-schema</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {([
                  { key: "always", label: "Altijd (24/7)" },
                  { key: "business-hours", label: "Werkdagen 08:00–20:00" },
                ] as const).map((opt) => {
                  const on = draft.schedule === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => set("schedule", opt.key)}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >{opt.label}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <KeywordsStep
            draft={draft}
            set={set}
          />
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label>Final URL</Label>
              <Input value={draft.finalUrl} onChange={(e) => set("finalUrl", e.target.value)} />
            </div>
            <div>
              <Label>Headlines (min 3, max 15 — 1 per regel, max {HEADLINE_MAX} tekens)</Label>
              <Textarea rows={6} value={draft.headlines} onChange={(e) => set("headlines", e.target.value)} placeholder="Taart laten bezorgen?&#10;Morgen Bij Jou&#10;Ambachtelijk & Vers" />
              <LineCounter lines={headlineLines} max={HEADLINE_MAX} />
            </div>
            <div>
              <Label>Descriptions (min 2, max 4 — 1 per regel, max {DESC_MAX} tekens)</Label>
              <Textarea rows={3} value={draft.descriptions} onChange={(e) => set("descriptions", e.target.value)} placeholder="Vóór 16:00 besteld = morgen bezorgd.&#10;Gratis verzending vanaf €35." />
              <LineCounter lines={descLines} max={DESC_MAX} />
            </div>
            {(headlineLines.length > 0 || descLines.length > 0) && (
              <div>
                <Label className="mb-1.5 block">Preview</Label>
                <SerpPreview headlines={headlineLines} descriptions={descLines} url={draft.finalUrl} />
              </div>
            )}
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
              <Review label="Periode" value={`${draft.startDate}${draft.endDate ? ` → ${draft.endDate}` : " → doorlopend"}`} />
              <Review label="Schema" value={draft.schedule === "always" ? "Altijd (24/7)" : "Werkdagen 08:00–20:00"} />
              <Review label="Geo" value={draft.geo.join(", ")} />
              <Review label="Talen" value={draft.languages.join(", ")} />
              <Review label="Apparaten" value={draft.devices.join(", ")} />
              <Review label="Ad group" value={draft.adGroupName} />
              <Review
                label="Keywords"
                value={`${draft.keywords.length} totaal — ${countByMatch(draft.keywords)}`}
              />
              <Review label="Negatives" value={draft.negatives.length ? `${draft.negatives.length} keywords` : "geen"} />
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Kies of je de campagne direct wilt publiceren of eerst als concept wilt opslaan om later te controleren.
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submit("concept")}>Opslaan als concept</Button>
            <Button onClick={() => submit("actief")}>Publiceer</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Keywords stap ────────────────────────────────────────────────────────────
function KeywordsStep({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  const [kwInput, setKwInput] = useState("");
  const [negInput, setNegInput] = useState("");

  const addFromInput = (raw: string, target: "keywords" | "negatives") => {
    const lines = raw.split("\n");
    const parsed = lines.map(parseKeywordLine).filter(Boolean) as KW[];
    if (parsed.length === 0) return;
    const existing = draft[target];
    const merged = [...existing];
    for (const p of parsed) {
      if (!merged.some((x) => x.text === p.text && x.match === p.match)) merged.push(p);
    }
    set(target, merged);
  };

  return (
    <div className="space-y-5">
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
                const on = draft.keywords.some((x) => x.text === k.text);
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
                        onClick={() =>
                          set(
                            "keywords",
                            on
                              ? draft.keywords.filter((x) => x.text !== k.text)
                              : [...draft.keywords, { text: k.text, match: "phrase" }],
                          )
                        }
                      >{on ? "Verwijder" : "+ Voeg toe"}</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <Label>Eigen keywords toevoegen</Label>
        <p className="mb-1.5 text-xs text-muted-foreground">
          1 per regel. Gebruik <code>[woord]</code> voor exact, <code>"woord"</code> voor phrase, anders broad.
        </p>
        <div className="flex gap-2">
          <Textarea
            rows={2}
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            placeholder={`taart bezorgen\n"verjaardagstaart bezorgen"\n[bonbons cadeau]`}
          />
          <Button
            type="button"
            onClick={() => { addFromInput(kwInput, "keywords"); setKwInput(""); }}
            disabled={!kwInput.trim()}
          ><Plus className="mr-1 h-3.5 w-3.5" />Voeg toe</Button>
        </div>
      </div>

      <div>
        <Label>Geselecteerde keywords ({draft.keywords.length})</Label>
        {draft.keywords.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">Nog geen keywords gekozen.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Keyword</th>
                  <th className="px-3 py-2 text-left font-medium">Match type</th>
                  <th className="px-3 py-2 text-right font-medium">Gesch. CPC</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {draft.keywords.map((k, idx) => (
                  <tr key={`${k.text}-${idx}`} className="border-t border-border">
                    <td className="px-3 py-2">{k.text}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {(["broad", "phrase", "exact"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const next = [...draft.keywords];
                              next[idx] = { ...next[idx], match: m };
                              set("keywords", next);
                            }}
                            className={`rounded-md border px-2 py-0.5 text-[10px] ${
                              k.match === m
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >{matchLabel(m)}</button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">€{estimatedCpc(k.text).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => set("keywords", draft.keywords.filter((_, i) => i !== idx))}
                      ><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <Label>Negatieve keywords ({draft.negatives.length})</Label>
        <p className="mb-1.5 text-xs text-muted-foreground">
          Voorkom vertoning op deze zoekopdrachten. Zelfde syntax als hierboven.
        </p>
        <div className="flex gap-2">
          <Input
            value={negInput}
            onChange={(e) => setNegInput(e.target.value)}
            placeholder={`gratis of "goedkope taart" of [taart recept]`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => { addFromInput(negInput, "negatives"); setNegInput(""); }}
            disabled={!negInput.trim()}
          ><Plus className="mr-1 h-3.5 w-3.5" />Toevoegen</Button>
        </div>
        {draft.negatives.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.negatives.map((n, idx) => (
              <Badge key={`${n.text}-${idx}`} variant="outline" className="gap-1.5">
                <span className="text-[10px] text-muted-foreground">{matchLabel(n.match)}</span>
                {n.text}
                <button
                  type="button"
                  onClick={() => set("negatives", draft.negatives.filter((_, i) => i !== idx))}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                ><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function matchLabel(m: MatchType) {
  return m === "exact" ? "[exact]" : m === "phrase" ? '"phrase"' : "broad";
}

function countByMatch(kws: KW[]) {
  const c = { broad: 0, phrase: 0, exact: 0 };
  for (const k of kws) c[k.match]++;
  return `${c.broad} broad · ${c.phrase} phrase · ${c.exact} exact`;
}

function LineCounter({ lines, max }: { lines: string[]; max: number }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {lines.map((l, i) => (
        <span
          key={i}
          className={`rounded border px-1.5 py-0.5 text-[10px] tabular-nums ${
            l.length > max ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border text-muted-foreground"
          }`}
        >
          #{i + 1}: {l.length}/{max}
        </span>
      ))}
    </div>
  );
}

function SerpPreview({ headlines, descriptions, url }: { headlines: string[]; descriptions: string[]; url: string }) {
  const title = headlines.slice(0, 3).filter(Boolean).join(" | ");
  const desc = descriptions.slice(0, 2).filter(Boolean).join(" ");
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">
        <span className="mr-2 rounded-sm border border-border px-1 py-px text-[9px] font-bold text-foreground">Ad</span>
        {url || "—"}
      </div>
      <div className="mt-1 truncate text-base font-medium text-primary">{title || "—"}</div>
      <div className="mt-1 line-clamp-2 text-xs text-foreground">{desc || "—"}</div>
    </div>
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

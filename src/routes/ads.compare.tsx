import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  competitorAds,
  formatEUR,
  formatNum,
  myAds,
  type Ad,
  type CompetitorAd,
} from "@/lib/demo-ads";

export const Route = createFileRoute("/ads/compare")({
  head: () => ({ meta: [{ title: "Vergelijk ads — ZoetBezorgen" }] }),
  component: CompareAds,
});

function CompareAds() {
  if (myAds.length === 0 || competitorAds.length === 0) {
    return (
      <AppShell>
        <PageHeader
          title="Vergelijk ads"
          subtitle="Zet jouw ad naast een concurrent-ad en zie waar het verschil zit."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/ads"><ArrowLeft className="mr-1 h-4 w-4" /> Terug naar overzicht</Link>
            </Button>
          }
        />
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nog geen ads om te vergelijken. Zodra er eigen ads en concurrent-ads beschikbaar zijn kun je ze hier naast elkaar zetten.
        </Card>
      </AppShell>
    );
  }
  const [myId, setMyId] = useState<string>(myAds[0].id);
  const [theirId, setTheirId] = useState<string>(competitorAds[0].id);
  const mine = myAds.find((a) => a.id === myId)!;
  const theirs = competitorAds.find((a) => a.id === theirId)!;

  return (
    <AppShell>
      <PageHeader
        title="Vergelijk ads"
        subtitle="Zet jouw ad naast een concurrent-ad en zie waar het verschil zit."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/ads"><ArrowLeft className="mr-1 h-4 w-4" /> Terug naar overzicht</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Picker label="Jouw ad" value={myId} onChange={setMyId}
          options={myAds.map((a) => ({ id: a.id, label: `${a.name} · ${a.platform}` }))} />
        <Picker label="Concurrent-ad" value={theirId} onChange={setTheirId}
          options={competitorAds.map((a) => ({ id: a.id, label: `${a.competitorLabel} · ${a.platform}` }))} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <MyAdCard ad={mine} />
        <TheirAdCard ad={theirs} />
      </div>

      <AiAnalysis mine={mine} theirs={theirs} />
    </AppShell>
  );
}

function Picker({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

function MyAdCard({ ad }: { ad: Ad }) {
  return (
    <Card className="p-4">
      <Badge variant="outline" className="mb-2 border-primary/40 bg-primary/10 text-primary">Jouw ad</Badge>
      <div className="aspect-video w-full rounded-md" style={{ backgroundColor: ad.creativeColor }} />
      <div className="mt-3 text-sm font-semibold">{ad.name}</div>
      <div className="text-xs text-muted-foreground">{ad.campaign} · {ad.format}</div>
      <p className="mt-2 text-sm text-foreground">{ad.copy}</p>
      <div className="mt-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        CTA: <span className="font-medium text-foreground">{ad.cta}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ad.themes.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{t}</span>)}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3 text-xs">
        <Mini label="Spend" v={formatEUR(ad.spend)} />
        <Mini label="CTR" v={`${ad.ctr.toFixed(2)}%`} />
        <Mini label="Conv." v={formatNum(ad.conversions)} />
        <Mini label="ROAS" v={`${ad.roas.toFixed(1)}×`} />
      </div>
    </Card>
  );
}

function TheirAdCard({ ad }: { ad: CompetitorAd }) {
  return (
    <Card className="p-4">
      <Badge variant="outline" className="mb-2">Concurrent</Badge>
      <div className="aspect-video w-full rounded-md" style={{ backgroundColor: ad.creativeColor }} />
      <div className="mt-3 text-sm font-semibold">{ad.competitorLabel}</div>
      <div className="text-xs text-muted-foreground">{ad.platform} · {ad.format}</div>
      <p className="mt-2 text-sm text-foreground">{ad.copy}</p>
      <div className="mt-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        CTA: <span className="font-medium text-foreground">{ad.cta}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ad.themes.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{t}</span>)}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <Mini label="Live" v={`${ad.daysLive}d`} />
        <Mini label="Varianten" v={String(ad.variants)} />
        <Mini label="Hook" v={ad.hookPattern} />
      </div>
      <p className="mt-2 text-[10px] italic text-muted-foreground">
        Performance van concurrent-ads is privé. Wel zichtbaar: looptijd, varianten, creatives.
      </p>
    </Card>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-xs font-medium text-foreground">{v}</div>
    </div>
  );
}

function AiAnalysis({ mine, theirs }: { mine: Ad; theirs: CompetitorAd }) {
  // Heuristische "AI"-analyse op basis van velden — in fase 3 vervangen door echte LLM-call.
  const points: { label: string; mine: string; theirs: string; note: string }[] = [
    {
      label: "Hook-type",
      mine: mine.themes.includes("battle") ? "Battle / keuze" : mine.themes.includes("pov") ? "POV" : mine.themes.includes("scarcity") ? "Schaarste/deadline" : "Direct aanbod",
      theirs: theirs.hookPattern,
      note: theirs.daysLive > 14 ? `Hun hook draait al ${theirs.daysLive} dagen — sterk signaal dat hij converteert.` : "Hun hook is relatief nieuw, test fase.",
    },
    {
      label: "CTA",
      mine: mine.cta,
      theirs: theirs.cta,
      note: mine.cta.toLowerCase() === theirs.cta.toLowerCase() ? "Zelfde CTA — overweeg differentiatie." : "Verschillende CTA — meet welke beter werkt voor jouw doelgroep.",
    },
    {
      label: "Format",
      mine: mine.format,
      theirs: theirs.format,
      note: mine.format === theirs.format ? "Zelfde format — vergelijking is appels-met-appels." : "Ander format — overweeg jouw winnende hook in hun format te testen.",
    },
    {
      label: "Tone",
      mine: mine.copy.length < 80 ? "Kort & direct" : "Verhalend",
      theirs: theirs.copy.length < 80 ? "Kort & direct" : "Verhalend",
      note: "Korter copy converteert vaak beter op feed-ads; verhalend werkt voor consideration.",
    },
  ];

  return (
    <Card className="mt-6 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">AI-analyse: wat is het verschil?</h2>
      </div>
      <div className="space-y-3">
        {points.map((p) => (
          <div key={p.label} className="grid grid-cols-1 gap-2 rounded-md border border-border bg-card/40 p-3 md:grid-cols-[120px_1fr_auto_1fr]">
            <div className="text-xs font-medium text-muted-foreground">{p.label}</div>
            <div className="text-sm text-foreground">{p.mine}</div>
            <ArrowRight className="hidden h-4 w-4 self-center text-muted-foreground md:block" />
            <div className="text-sm text-foreground">{p.theirs}</div>
            <div className="md:col-span-4 md:pl-[120px] text-xs text-muted-foreground">{p.note}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] italic text-muted-foreground">
        Heuristische analyse op demo-data. In een volgende fase vervangen door een echte AI-call via de Lovable AI Gateway.
      </p>
    </Card>
  );
}

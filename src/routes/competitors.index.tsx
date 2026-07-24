import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Pencil, Plus, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon, platformTintStyle } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import {
  competitorChannels,
  competitorPosts,
  competitors as demoCompetitors,
  platformLabel,
  type Competitor,
  type Platform,
} from "@/lib/demo-data";
import {
  addCustomCompetitor,
  removeCustomCompetitor,
  updateCustomCompetitor,
  useCustomCompetitors,
} from "@/lib/competitors-store";

export const Route = createFileRoute("/competitors/")({
  head: () => ({
    meta: [
      { title: "Concurrentie — Social Cockpit" },
      { name: "description", content: "Beheer je concurrenten en analyseer hun social performance." },
    ],
  }),
  component: CompetitorsIndex,
});

const nf = (n: number) => new Intl.NumberFormat("nl-NL").format(n);
const PLATFORMS: Platform[] = ["instagram", "facebook", "linkedin", "tiktok", "youtube"];

function CompetitorsIndex() {
  const custom = useCustomCompetitors();
  const all = [...demoCompetitors, ...custom];
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Concurrentie-analyse"
        subtitle="Voeg concurrenten toe en analyseer hun kanalen, posts en ads."
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Concurrent toevoegen
          </Button>
        }
      />

      {all.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <div className="text-base font-semibold">Nog geen concurrenten</div>
            <p className="max-w-md text-sm text-muted-foreground">
              Voeg de eerste concurrent toe om hun kanalen naast die van jou te vergelijken.
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Concurrent toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {all.map((c) => {
            const channels = competitorChannels.filter((ch) => ch.competitorId === c.id);
            const posts = competitorPosts.filter((p) => p.competitorId === c.id);
            const totalAds = channels.reduce((s, ch) => s + ch.activeAdsCount, 0);
            const bestPost = [...posts].sort((a, b) => b.likes - a.likes)[0];
            const isCustom = c.id.startsWith("custom-");

            return (
              <div
                key={c.id}
                className="platform-row group relative rounded-lg border p-5 transition-colors hover:border-primary/40"
                style={platformTintStyle(c.primaryPlatform)}
              >
                {isCustom && (
                  <button
                    type="button"
                    aria-label="Verwijder concurrent"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeCustomCompetitor(c.id);
                      toast.success(`${c.label} verwijderd`);
                    }}
                    className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <Link
                  to="/competitors/$id"
                  params={{ id: c.id }}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={c.primaryPlatform} size={28} />
                      <div>
                        <div className="text-base font-semibold">{c.label}</div>
                        <div className="text-xs text-muted-foreground">{c.primaryHandle}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>

                  {c.about && <p className="mt-3 text-sm text-muted-foreground">{c.about}</p>}

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-2 p-3 text-center text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{nf(c.totalFollowers)}</div>
                      <div className="text-muted-foreground">followers</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 font-semibold text-success">
                        <TrendingUp className="h-3 w-3" /> {c.growth30d}%
                      </div>
                      <div className="text-muted-foreground">30 dagen</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{totalAds}</div>
                      <div className="text-muted-foreground">actieve ads</div>
                    </div>
                  </div>

                  {channels.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Actief op:</span>
                      {channels.map((ch) => (
                        <Badge
                          key={ch.platform}
                          variant="outline"
                          className="platform-badge gap-1"
                          style={platformTintStyle(ch.platform)}
                        >
                          <PlatformIcon platform={ch.platform} size={14} />
                          {platformLabel(ch.platform)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {bestPost && (
                    <div className="mt-3 rounded-md border border-border bg-surface p-2 text-xs">
                      <div className="text-muted-foreground">Top post:</div>
                      <div className="line-clamp-2 text-foreground">{bestPost.caption}</div>
                    </div>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <AddCompetitorDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}

function AddCompetitorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [label, setLabel] = useState("");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [about, setAbout] = useState("");

  const reset = () => {
    setLabel("");
    setHandle("");
    setPlatform("instagram");
    setAbout("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !handle.trim()) {
      toast.error("Vul minimaal naam en handle in.");
      return;
    }
    addCustomCompetitor({
      label: label.trim(),
      primaryHandle: handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`,
      primaryPlatform: platform,
      about: about.trim() || undefined,
    });
    toast.success(`${label} toegevoegd`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Concurrent toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een merk toe waarmee je jezelf wilt vergelijken.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="c-label">Naam</Label>
              <Input
                id="c-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Bijv. Tony's Chocolonely"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-handle">Handle</Label>
              <Input
                id="c-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@merknaam"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Primair platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {platformLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-about">Korte omschrijving (optioneel)</Label>
              <Textarea
                id="c-about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Wat maakt dit merk relevant om te volgen?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">Toevoegen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


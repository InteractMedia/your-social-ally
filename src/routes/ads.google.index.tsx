import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, ExternalLink, Pause, Play, Plus, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEUR, formatNum } from "@/lib/demo-ads";
import {
  googleAdsStore,
  sumCampaignStats,
  useGoogleCampaigns,
  type GoogleCampaign,
} from "@/lib/google-ads-store";

export const Route = createFileRoute("/ads/google/")({
  head: () => ({
    meta: [
      { title: "Google Ads beheer — ZoetBezorgen" },
      { name: "description", content: "Beheer Google Search, Performance Max en YouTube-campagnes: pauzeren, budget aanpassen, nieuwe campagnes aanmaken." },
    ],
  }),
  component: GoogleAdsIndex,
});

function GoogleAdsIndex() {
  const campaigns = useGoogleCampaigns();
  const [budgetEdit, setBudgetEdit] = useState<GoogleCampaign | null>(null);

  const totals = campaigns.reduce(
    (acc, c) => {
      const s = sumCampaignStats(c);
      return {
        spend: acc.spend + s.spend,
        conversions: acc.conversions + s.conversions,
        budget: acc.budget + (c.status === "actief" ? c.dailyBudget : 0),
      };
    },
    { spend: 0, conversions: 0, budget: 0 },
  );

  return (
    <AppShell>
      <PageHeader
        title="Google Ads"
        subtitle="Volledig beheer: pauzeren, budgetten, ad-tekst en nieuwe campagnes."
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ads"><ArrowLeft className="mr-1 h-4 w-4" /> Alle platforms</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/ads/google/stats"><BarChart3 className="mr-1.5 h-4 w-4" /> Statistieken</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="https://ads.google.com" target="_blank" rel="noreferrer">
                Google Ads <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild size="sm">
              <Link to="/ads/google/new"><Plus className="mr-1.5 h-4 w-4" /> Nieuwe campagne</Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-foreground">
        <strong className="text-primary">Demo-modus.</strong> Mutaties (pauzeren, budget, ad-tekst, nieuwe campagne) blijven bewaard tijdens je sessie.
        Echte koppeling via Google Ads API komt in fase 2 zodra je een Developer Token hebt aangevraagd.
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Kpi label="Totale spend (28d)" value={formatEUR(totals.spend)} />
        <Kpi label="Conversies (28d)" value={formatNum(totals.conversions)} />
        <Kpi label="Dagbudget actief" value={formatEUR(totals.budget)} />
        <Kpi label="Campagnes" value={`${campaigns.filter((c) => c.status === "actief").length} / ${campaigns.length}`} />
      </div>

      <h2 className="mb-3 text-sm font-semibold">Campagnes</h2>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Campagne</th>
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-left font-medium">Bod-strategie</th>
              <th className="px-4 py-2.5 text-right font-medium">Budget/dag</th>
              <th className="px-4 py-2.5 text-right font-medium">Spend</th>
              <th className="px-4 py-2.5 text-right font-medium">CTR</th>
              <th className="px-4 py-2.5 text-right font-medium">Conv.</th>
              <th className="px-4 py-2.5 text-right font-medium">CPA</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Acties</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const s = sumCampaignStats(c);
              return (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link to="/ads/google/$campaignId" params={{ campaignId: c.id }} className="font-medium text-foreground hover:text-primary">
                      {c.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{c.adGroups.length} ad groups · {c.geo.join(", ")}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{c.type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.bidStrategy}{c.targetCpa ? ` · €${c.targetCpa}` : ""}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatEUR(c.dailyBudget)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatEUR(s.spend)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNum(s.conversions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.cpa ? formatEUR(s.cpa) : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          const next = c.status === "actief" ? "gepauzeerd" : "actief";
                          googleAdsStore.setStatus(c.id, next);
                          toast.success(`${c.name} ${next === "actief" ? "geactiveerd" : "gepauzeerd"}`);
                        }}
                        title={c.status === "actief" ? "Pauzeer" : "Activeer"}
                      >
                        {c.status === "actief" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setBudgetEdit(c)} title="Bewerk budget">
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <BudgetDialog campaign={budgetEdit} onClose={() => setBudgetEdit(null)} />
    </AppShell>
  );
}

function BudgetDialog({ campaign, onClose }: { campaign: GoogleCampaign | null; onClose: () => void }) {
  const [value, setValue] = useState("");
  return (
    <Dialog open={!!campaign} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dagbudget aanpassen</DialogTitle></DialogHeader>
        {campaign && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{campaign.name}</div>
            <div>
              <Label htmlFor="budget">Nieuw dagbudget (EUR)</Label>
              <Input
                id="budget"
                type="number"
                min={1}
                placeholder={String(campaign.dailyBudget)}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Huidig: {formatEUR(campaign.dailyBudget)}/dag</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button
            onClick={() => {
              if (!campaign) return;
              const n = Number(value);
              if (!n || n < 1) return toast.error("Vul een geldig budget in");
              googleAdsStore.setBudget(campaign.id, n);
              toast.success(`Budget aangepast naar ${formatEUR(n)}/dag`);
              setValue("");
              onClose();
            }}
          >Opslaan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    actief: "bg-success/15 text-success border-success/30",
    gepauzeerd: "bg-muted text-muted-foreground border-border",
    concept: "bg-warning/15 text-warning border-warning/30",
  };
  return <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${map[status] ?? ""}`}>{status}</Badge>;
}

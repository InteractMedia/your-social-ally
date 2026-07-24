import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, GitCompare, Sparkles, TrendingUp } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AD_PLATFORMS,
  adPlatformManager,
  adsByPlatform,
  competitorAdsByPlatform,
  competitorAds,
  formatEUR,
  formatNum,
  myAds,
  type AdPlatform,
} from "@/lib/demo-ads";

export const Route = createFileRoute("/ads/")({
  head: () => ({
    meta: [
      { title: "Ads dashboard — ZoetBezorgen" },
      { name: "description", content: "Alle ad-stats van Meta, TikTok, LinkedIn en Google op één plek + concurrent-ads naast je eigen ads." },
    ],
  }),
  component: AdsDashboard,
});

function AdsDashboard() {
  const totalSpend = myAds.reduce((s, a) => s + a.spend, 0);
  const totalConv = myAds.reduce((s, a) => s + a.conversions, 0);
  const totalImpr = myAds.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = myAds.reduce((s, a) => s + a.clicks, 0);
  const avgCtr = totalImpr ? (totalClicks / totalImpr) * 100 : 0;
  const bestAd = [...myAds].sort((a, b) => b.roas - a.roas)[0];
  const activeCompetitorAds = competitorAds.length;
  const hasAds = myAds.length > 0;

  return (
    <AppShell>
      <PageHeader
        title="Ads"
        subtitle="Alle campagnes, performance en concurrent-ads op één plek."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/ads/compare"><GitCompare className="mr-1.5 h-4 w-4" /> Vergelijk met concurrent</Link>
            </Button>
            <Button asChild size="sm">
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noreferrer">
                Nieuwe ad <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-3 rounded-lg border border-border bg-card/60 px-4 py-2.5 text-xs text-muted-foreground">
        <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
        Nog geen ad-koppelingen actief. Koppel je account in <Link to="/settings" className="underline">Instellingen</Link> of open direct de Ads Manager van het platform.
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Totale spend (30d)" value={formatEUR(totalSpend)} hint={hasAds ? `${myAds.filter((a) => a.status === "actief").length} actieve ads` : "Geen actieve ads"} />
        <Kpi label="Conversies" value={formatNum(totalConv)} hint={`${formatNum(totalClicks)} clicks`} />
        <Kpi label="Gem. CTR" value={`${avgCtr.toFixed(2)}%`} hint={`${formatNum(totalImpr)} impressies`} />
        <Kpi label="Beste ROAS" value={bestAd ? `${bestAd.roas.toFixed(1)}×` : "—"} hint={bestAd?.name ?? "Nog geen data"} />
      </div>


      {/* Per platform */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-foreground">Per platform</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {AD_PLATFORMS.map((p) => {
          const ads = adsByPlatform(p.id);
          const spend = ads.reduce((s, a) => s + a.spend, 0);
          const conv = ads.reduce((s, a) => s + a.conversions, 0);
          const compCount = competitorAdsByPlatform(p.id).length;
          return (
            <Link
              key={p.id}
              to="/ads/$platform"
              params={{ platform: p.id }}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{p.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{ads.length} ads · {compCount} concurrent-ads</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Spend" value={formatEUR(spend)} />
                <Stat label="Conv." value={formatNum(conv)} />
              </div>
              <a
                href={adPlatformManager(p.id)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
              >
                Open Ads Manager <ExternalLink className="h-3 w-3" />
              </a>
            </Link>
          );
        })}
      </div>

      {/* Top performers */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-foreground">Top performers</h2>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Ad</th>
              <th className="px-4 py-2.5 text-left font-medium">Platform</th>
              <th className="px-4 py-2.5 text-right font-medium">Spend</th>
              <th className="px-4 py-2.5 text-right font-medium">CTR</th>
              <th className="px-4 py-2.5 text-right font-medium">Conv.</th>
              <th className="px-4 py-2.5 text-right font-medium">ROAS</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...myAds].sort((a, b) => b.roas - a.roas).map((ad) => (
              <tr key={ad.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded" style={{ backgroundColor: ad.creativeColor }} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{ad.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{ad.campaign}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{ad.platform}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatEUR(ad.spend)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{ad.ctr.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNum(ad.conversions)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  <span className={ad.roas >= 3 ? "text-success" : ad.roas >= 1 ? "text-foreground" : "text-destructive"}>
                    {ad.roas.toFixed(1)}×
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={ad.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Concurrent-ads ticker */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          <TrendingUp className="mr-1.5 inline h-4 w-4 text-primary" />
          {activeCompetitorAds} live concurrent-ads
        </h2>
        <Link to="/ads/compare" className="text-xs text-primary hover:underline">Vergelijk side-by-side →</Link>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {competitorAds.slice(0, 8).map((ad) => (
          <div key={ad.id} className="rounded-xl border border-border bg-card p-3">
            <div className="aspect-square w-full rounded-md" style={{ backgroundColor: ad.creativeColor }} />
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{ad.competitorLabel}</span>
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{ad.platform}</Badge>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs text-foreground">{ad.copy}</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{ad.daysLive}d live</span>
              <span>·</span>
              <span>{ad.variants} varianten</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    actief: "bg-success/15 text-success border-success/30",
    gepauzeerd: "bg-muted text-muted-foreground border-border",
    afgelopen: "bg-muted text-muted-foreground border-border",
    review: "bg-warning/15 text-warning border-warning/30",
  };
  return <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${map[status] ?? ""}`}>{status}</Badge>;
}

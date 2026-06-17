import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AD_PLATFORMS,
  adPlatformLabel,
  adPlatformManager,
  adsByPlatform,
  competitorAdsByPlatform,
  formatEUR,
  formatNum,
  type AdPlatform,
} from "@/lib/demo-ads";

const VALID: AdPlatform[] = ["meta", "tiktok", "linkedin", "google"];

export const Route = createFileRoute("/ads/$platform")({
  parseParams: ({ platform }) => {
    if (!VALID.includes(platform as AdPlatform)) throw notFound();
    return { platform: platform as AdPlatform };
  },
  head: ({ params }) => ({
    meta: [{ title: `${adPlatformLabel(params.platform)} ads — ZoetBezorgen` }],
  }),
  notFoundComponent: () => (
    <AppShell><div className="p-8 text-sm">Onbekend platform.</div></AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell><div className="p-8 text-sm text-destructive">Fout: {error.message}</div></AppShell>
  ),
  component: PlatformAds,
});

function PlatformAds() {
  const { platform } = Route.useParams();
  const ads = adsByPlatform(platform);
  const compAds = competitorAdsByPlatform(platform);
  const spend = ads.reduce((s, a) => s + a.spend, 0);
  const conv = ads.reduce((s, a) => s + a.conversions, 0);

  return (
    <AppShell>
      <PageHeader
        title={adPlatformLabel(platform)}
        subtitle={`${ads.length} eigen ads · ${compAds.length} concurrent-ads`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ads"><ArrowLeft className="mr-1 h-4 w-4" /> Alle platforms</Link>
            </Button>
            <Button asChild size="sm">
              <a href={adPlatformManager(platform)} target="_blank" rel="noreferrer">
                Open Ads Manager <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        }
      />

      {/* Tabs (eigen vs concurrent) */}
      <div className="flex gap-2 border-b border-border">
        {AD_PLATFORMS.map((p) => (
          <Link
            key={p.id}
            to="/ads/$platform"
            params={{ platform: p.id }}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              p.id === platform
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <KpiSmall label="Spend" value={formatEUR(spend)} />
        <KpiSmall label="Conversies" value={formatNum(conv)} />
        <KpiSmall label="Actieve ads" value={String(ads.filter((a) => a.status === "actief").length)} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">Jouw ads</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {ads.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">Nog geen ads op dit platform.</Card>
        ) : ads.map((ad) => (
          <Card key={ad.id} className="p-4">
            <div className="flex gap-3">
              <div className="h-24 w-24 shrink-0 rounded-md" style={{ backgroundColor: ad.creativeColor }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{ad.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{ad.campaign} · {ad.format}</div>
                  </div>
                  <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">{ad.status}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-foreground">{ad.copy}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ad.themes.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-xs">
              <MiniStat label="Spend" value={formatEUR(ad.spend)} />
              <MiniStat label="CTR" value={`${ad.ctr.toFixed(2)}%`} />
              <MiniStat label="Conv." value={formatNum(ad.conversions)} />
              <MiniStat label="ROAS" value={`${ad.roas.toFixed(1)}×`} highlight={ad.roas >= 3} />
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">Live concurrent-ads</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {compAds.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">Geen concurrent-ads op dit platform gedetecteerd.</Card>
        ) : compAds.map((ad) => (
          <Card key={ad.id} className="overflow-hidden p-0">
            <div className="aspect-video w-full" style={{ backgroundColor: ad.creativeColor }} />
            <div className="p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{ad.competitorLabel}</span>
                <span className="text-muted-foreground">{ad.daysLive}d · {ad.variants} varianten</span>
              </div>
              <p className="mt-1.5 line-clamp-3 text-xs text-foreground">{ad.copy}</p>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Hook: <span className="text-foreground">{ad.hookPattern}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function KpiSmall({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`tabular-nums font-medium ${highlight ? "text-success" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

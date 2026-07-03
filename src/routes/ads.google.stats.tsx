import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEUR, formatNum } from "@/lib/demo-ads";
import {
  useGoogleCampaigns,
  type Device,
  type GoogleCampaign,
} from "@/lib/google-ads-store";

export const Route = createFileRoute("/ads/google/stats")({
  head: () => ({
    meta: [
      { title: "Google Ads statistieken — ZoetBezorgen" },
      { name: "description", content: "KPI's per campagne: spend, clicks, CTR, CPC, conversies en ROAS. Filter op datum en apparaat." },
    ],
  }),
  component: GoogleAdsStats,
});

// Gemiddelde orderwaarde (EUR) om ROAS te schatten uit conversies × AOV.
const AOV = 45;
// Device-verdeling (moet optellen tot 1).
const DEVICE_SPLIT: Record<Device, number> = { mobile: 0.62, desktop: 0.28, tablet: 0.10 };
const DEVICES: Device[] = ["desktop", "mobile", "tablet"];

// Deterministische pseudo-random op basis van string (voor reproduceerbare demo-data).
function seedNoise(key: string, i: number) {
  let h = 2166136261;
  const s = `${key}:${i}`;
  for (let j = 0; j < s.length; j++) {
    h ^= s.charCodeAt(j);
    h = Math.imul(h, 16777619);
  }
  // 0.7 .. 1.3
  return 0.7 + ((h >>> 0) % 1000) / 1000 * 0.6;
}

function daysBetween(fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const out: string[] = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

type CampaignStats = {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
};

// Verdeel de 28-daagse totalen over de gekozen datums × geselecteerde devices.
function computeStats(campaign: GoogleCampaign, days: string[], devices: Device[]): CampaignStats {
  const totals = campaign.adGroups.reduce(
    (a, g) => ({
      impressions: a.impressions + g.impressions,
      clicks: a.clicks + g.clicks,
      conversions: a.conversions + g.conversions,
      spend: a.spend + g.spend,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 },
  );

  // Basis per dag (van de originele 28d cijfers).
  const perDay = {
    impressions: totals.impressions / 28,
    clicks: totals.clicks / 28,
    conversions: totals.conversions / 28,
    spend: totals.spend / 28,
  };

  const deviceShare = devices.reduce((sum, d) => sum + DEVICE_SPLIT[d], 0);

  let impressions = 0, clicks = 0, conversions = 0, spend = 0;
  days.forEach((day, i) => {
    const noise = seedNoise(campaign.id, i);
    impressions += perDay.impressions * noise * deviceShare;
    clicks += perDay.clicks * noise * deviceShare;
    conversions += perDay.conversions * noise * deviceShare;
    spend += perDay.spend * noise * deviceShare;
  });

  impressions = Math.round(impressions);
  clicks = Math.round(clicks);
  conversions = Math.round(conversions);
  spend = Math.round(spend * 100) / 100;
  const revenue = conversions * AOV;
  const ctr = impressions ? (clicks / impressions) * 100 : 0;
  const cpc = clicks ? spend / clicks : 0;
  const cpa = conversions ? spend / conversions : 0;
  const roas = spend ? revenue / spend : 0;

  return { impressions, clicks, conversions, spend, revenue, ctr, cpc, cpa, roas };
}

function GoogleAdsStats() {
  const campaigns = useGoogleCampaigns();
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 27);

  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [devices, setDevices] = useState<Device[]>(["desktop", "mobile", "tablet"]);

  const days = useMemo(() => (from && to && from <= to ? daysBetween(from, to) : []), [from, to]);

  const rows = useMemo(
    () => campaigns.map((c) => ({ campaign: c, stats: computeStats(c, days, devices) })),
    [campaigns, days, devices],
  );

  const totals = rows.reduce<CampaignStats>(
    (a, r) => ({
      impressions: a.impressions + r.stats.impressions,
      clicks: a.clicks + r.stats.clicks,
      conversions: a.conversions + r.stats.conversions,
      spend: a.spend + r.stats.spend,
      revenue: a.revenue + r.stats.revenue,
      ctr: 0, cpc: 0, cpa: 0, roas: 0,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0 },
  );
  totals.ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  totals.cpc = totals.clicks ? totals.spend / totals.clicks : 0;
  totals.cpa = totals.conversions ? totals.spend / totals.conversions : 0;
  totals.roas = totals.spend ? totals.revenue / totals.spend : 0;

  const preset = (n: number) => {
    const t = new Date();
    const f = new Date(t);
    f.setDate(f.getDate() - (n - 1));
    setFrom(f.toISOString().slice(0, 10));
    setTo(t.toISOString().slice(0, 10));
  };

  const toggleDevice = (d: Device) =>
    setDevices((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <AppShell>
      <PageHeader
        title="Google Ads statistieken"
        subtitle={`KPI's per campagne · ${days.length || 0} dagen · ${devices.length}/3 apparaten`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ads/google"><ArrowLeft className="mr-1 h-4 w-4" /> Terug naar beheer</Link>
            </Button>
          </>
        }
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-4 md:grid-cols-[auto_auto_1fr_auto] md:items-end">
          <div>
            <Label>Van</Label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Tot</Label>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Snelle keuze</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[7, 14, 28, 90].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => preset(n)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >Laatste {n} dagen</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Apparaten</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {DEVICES.map((d) => {
                const on = devices.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDevice(d)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${
                      on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >{d}</button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {days.length === 0 || devices.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {days.length === 0 ? "Kies een geldig datumbereik." : "Selecteer minimaal één apparaat."}
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Spend" value={formatEUR(totals.spend)} />
            <Kpi label="Clicks" value={formatNum(totals.clicks)} />
            <Kpi label="CTR" value={`${totals.ctr.toFixed(2)}%`} />
            <Kpi label="CPC" value={totals.cpc ? formatEUR(totals.cpc) : "—"} />
            <Kpi label="Conversies" value={formatNum(totals.conversions)} />
            <Kpi label="ROAS" value={totals.roas ? `${totals.roas.toFixed(2)}×` : "—"} accent={totals.roas >= 2} />
          </div>

          <h2 className="mb-3 text-sm font-semibold">Per campagne</h2>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Campagne</th>
                  <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                  <th className="px-4 py-2.5 text-right font-medium">Clicks</th>
                  <th className="px-4 py-2.5 text-right font-medium">CTR</th>
                  <th className="px-4 py-2.5 text-right font-medium">CPC</th>
                  <th className="px-4 py-2.5 text-right font-medium">Conv.</th>
                  <th className="px-4 py-2.5 text-right font-medium">CPA</th>
                  <th className="px-4 py-2.5 text-right font-medium">Omzet</th>
                  <th className="px-4 py-2.5 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ campaign, stats }) => (
                  <tr key={campaign.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        to="/ads/google/$campaignId"
                        params={{ campaignId: campaign.id }}
                        className="font-medium text-foreground hover:text-primary"
                      >{campaign.name}</Link>
                      <div className="text-xs text-muted-foreground">{campaign.type} · {campaign.status}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatEUR(stats.spend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNum(stats.clicks)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{stats.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{stats.cpc ? formatEUR(stats.cpc) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNum(stats.conversions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{stats.cpa ? formatEUR(stats.cpa) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatEUR(stats.revenue)}</td>
                    <td className="px-4 py-3 text-right">
                      <RoasBadge value={stats.roas} />
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-4 py-3">Totaal</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatEUR(totals.spend)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNum(totals.clicks)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.cpc ? formatEUR(totals.cpc) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNum(totals.conversions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.cpa ? formatEUR(totals.cpa) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatEUR(totals.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <RoasBadge value={totals.roas} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          <p className="mt-3 text-xs text-muted-foreground">
            ROAS berekend met gem. orderwaarde van {formatEUR(AOV)}. Device-verdeling: mobile 62% · desktop 28% · tablet 10%.
          </p>
        </>
      )}
    </AppShell>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-success" : "text-foreground"}`}>{value}</div>
    </Card>
  );
}

function RoasBadge({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const good = value >= 2;
  const mid = value >= 1;
  const cls = good
    ? "bg-success/15 text-success border-success/30"
    : mid
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
  return <Badge variant="outline" className={`tabular-nums ${cls}`}>{value.toFixed(2)}×</Badge>;
}

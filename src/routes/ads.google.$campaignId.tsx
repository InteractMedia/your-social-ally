import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Pause, Pencil, Play, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEUR, formatNum } from "@/lib/demo-ads";
import { googleAdsStore, sumCampaignStats, useGoogleCampaign } from "@/lib/google-ads-store";

export const Route = createFileRoute("/ads/google/$campaignId")({
  head: ({ params }) => ({ meta: [{ title: `Campagne ${params.campaignId} — Google Ads` }] }),
  component: CampaignDetail,
});

function CampaignDetail() {
  const { campaignId } = Route.useParams();
  const campaign = useGoogleCampaign(campaignId);
  const [editingAd, setEditingAd] = useState<{ adGroupId: string; adId: string } | null>(null);

  if (!campaign) throw notFound();

  const stats = sumCampaignStats(campaign);

  return (
    <AppShell>
      <PageHeader
        title={campaign.name}
        subtitle={`${campaign.type} · ${campaign.objective} · ${campaign.bidStrategy}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ads/google"><ArrowLeft className="mr-1 h-4 w-4" /> Alle campagnes</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = campaign.status === "actief" ? "gepauzeerd" : "actief";
                googleAdsStore.setStatus(campaign.id, next);
                toast.success(next === "actief" ? "Campagne geactiveerd" : "Campagne gepauzeerd");
              }}
            >
              {campaign.status === "actief" ? <><Pause className="mr-1.5 h-3.5 w-3.5" /> Pauzeer</> : <><Play className="mr-1.5 h-3.5 w-3.5" /> Activeer</>}
            </Button>
            <Button asChild size="sm">
              <a href="https://ads.google.com" target="_blank" rel="noreferrer">
                Open in Google Ads <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Kpi label="Impressies" value={formatNum(stats.impressions)} />
        <Kpi label="Clicks" value={formatNum(stats.clicks)} />
        <Kpi label="CTR" value={`${stats.ctr.toFixed(2)}%`} />
        <Kpi label="CPA" value={stats.cpa ? formatEUR(stats.cpa) : "—"} />
      </div>

      <Card className="mb-6 p-4">
        <h3 className="mb-3 text-sm font-semibold">Campagne-instellingen</h3>
        <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          <Field label="Status" value={campaign.status} />
          <Field label="Dagbudget" value={formatEUR(campaign.dailyBudget)} />
          <Field label="Bod-strategie" value={campaign.bidStrategy + (campaign.targetCpa ? ` (€${campaign.targetCpa})` : "")} />
          <Field label="Geo" value={campaign.geo.join(", ")} />
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold">Ad groups</h2>
      <div className="space-y-4">
        {campaign.adGroups.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">{g.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatNum(g.impressions)} impr · {formatNum(g.clicks)} clicks · {formatNum(g.conversions)} conv · {formatEUR(g.spend)} spend
                </div>
              </div>
            </div>

            {g.keywords.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.keywords.map((k) => (
                    <Badge key={k.text} variant="outline" className="text-xs">
                      <span className="mr-1.5 text-[10px] text-muted-foreground">{matchSymbol(k.match)}</span>
                      {k.text}
                      <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">€{k.cpc.toFixed(2)}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {g.ads.map((ad) => {
                const isEditing = editingAd?.adGroupId === g.id && editingAd.adId === ad.id;
                return (
                  <div key={ad.id} className="rounded-lg border border-border bg-background/40 p-3">
                    {isEditing ? (
                      <AdEditor
                        initialHeadlines={ad.headlines}
                        initialDescriptions={ad.descriptions}
                        onCancel={() => setEditingAd(null)}
                        onSave={(h, d) => {
                          googleAdsStore.updateAdText(campaign.id, g.id, ad.id, h, d);
                          toast.success("Ad-tekst opgeslagen");
                          setEditingAd(null);
                        }}
                      />
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <SerpPreview headlines={ad.headlines} descriptions={ad.descriptions} url={ad.finalUrl} />
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingAd({ adGroupId: g.id, adId: ad.id })}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Bewerk
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground md:grid-cols-2">
                          <div><strong className="text-foreground">{ad.headlines.length}</strong>/15 headlines</div>
                          <div><strong className="text-foreground">{ad.descriptions.length}</strong>/4 descriptions</div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function matchSymbol(m: "broad" | "phrase" | "exact") {
  return m === "exact" ? "[exact]" : m === "phrase" ? '"phrase"' : "broad";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium text-foreground">{value}</div>
    </div>
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

function SerpPreview({ headlines, descriptions, url }: { headlines: string[]; descriptions: string[]; url: string }) {
  const title = headlines.slice(0, 3).filter(Boolean).join(" | ");
  const desc = descriptions.slice(0, 2).filter(Boolean).join(" ");
  return (
    <div className="min-w-0 flex-1 rounded-md border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">
        <span className="mr-2 rounded-sm border border-border px-1 py-px text-[9px] font-bold text-foreground">Ad</span>
        {url}
      </div>
      <div className="mt-1 truncate text-base font-medium text-primary">{title || "—"}</div>
      <div className="mt-1 line-clamp-2 text-xs text-foreground">{desc || "—"}</div>
    </div>
  );
}

function AdEditor({
  initialHeadlines, initialDescriptions, onSave, onCancel,
}: {
  initialHeadlines: string[];
  initialDescriptions: string[];
  onSave: (h: string[], d: string[]) => void;
  onCancel: () => void;
}) {
  const [headlines, setHeadlines] = useState(initialHeadlines.join("\n"));
  const [descriptions, setDescriptions] = useState(initialDescriptions.join("\n"));
  return (
    <div className="space-y-3">
      <div>
        <Label>Headlines (1 per regel, max 30 tekens, max 15 stuks)</Label>
        <Textarea rows={6} value={headlines} onChange={(e) => setHeadlines(e.target.value)} />
      </div>
      <div>
        <Label>Descriptions (1 per regel, max 90 tekens, max 4 stuks)</Label>
        <Textarea rows={4} value={descriptions} onChange={(e) => setDescriptions(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="mr-1 h-3.5 w-3.5" />Annuleer</Button>
        <Button
          size="sm"
          onClick={() => {
            const h = headlines.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 15);
            const d = descriptions.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4);
            if (!h.length || !d.length) return toast.error("Minimaal 1 headline en 1 description");
            onSave(h, d);
          }}
        ><Save className="mr-1 h-3.5 w-3.5" />Opslaan</Button>
      </div>
    </div>
  );
}

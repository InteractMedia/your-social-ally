import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { AdsEmpty, AdsError, AdsLoading } from "@/components/ads/ads-states";
import { MetricCards } from "@/components/ads/metric-cards";
import { PeriodPicker } from "@/components/ads/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatDec,
  formatInt,
  formatMoney,
  formatPct,
  resolvePeriod,
  type Period,
} from "@/lib/ads-period";
import { getGoogleAdsCampaignDetail } from "@/lib/google-ads.functions";

export const Route = createFileRoute("/ads/google/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campagnedetails — Google Ads — SocialCockpit" },
      {
        name: "description",
        content:
          "Bekijk per campagne de advertentiegroepen, advertenties, zoekwoorden en zoektermen met echte kosten, klikken en conversies.",
      },
      { property: "og:title", content: "Campagnedetails — Google Ads" },
      {
        property: "og:description",
        content: "Advertentiegroepen, zoekwoorden en zoektermen met live prestaties.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignDetail,
});

function MetricHeadCells() {
  return (
    <>
      <TableHead className="text-right">Kosten</TableHead>
      <TableHead className="text-right">Impr.</TableHead>
      <TableHead className="text-right">Klikken</TableHead>
      <TableHead className="text-right">CTR</TableHead>
      <TableHead className="text-right">CPC</TableHead>
      <TableHead className="text-right">Conv.</TableHead>
    </>
  );
}

function MetricCells({ m, currency }: { m: any; currency: string }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">{formatMoney(m.spend, currency)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatInt(m.impressions)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatInt(m.clicks)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatPct(m.ctr)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(m.avgCpc, currency)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatDec(m.conversions, 1)}</TableCell>
    </>
  );
}

function CampaignDetail() {
  const { campaignId } = Route.useParams();
  const [period, setPeriod] = useState<Period>(() => resolvePeriod("last_30_days"));
  const queryClient = useQueryClient();
  const detailFn = useServerFn(getGoogleAdsCampaignDetail);

  const query = useQuery({
    queryKey: ["google-ads", "campaign", campaignId, period.start, period.end],
    queryFn: () => detailFn({ data: { campaignId, start: period.start, end: period.end } }),
  });

  const data = query.data;
  const currency = "EUR";
  const campaign = data?.campaign ?? null;
  const adGroups: any[] = data?.adGroups ?? [];
  const ads: any[] = data?.ads ?? [];
  const keywords: any[] = data?.keywords ?? [];
  const searchTerms: any[] = data?.searchTerms ?? [];
  const assetGroups: any[] = data?.assetGroups ?? [];
  const isPmax = campaign?.rawType === "PERFORMANCE_MAX";

  return (
    <AppShell>
      <PageHeader
        title={campaign?.name ?? "Campagne"}
        subtitle={
          campaign
            ? `${campaign.type} · ${campaign.status}${campaign.bidStrategy ? ` · ${campaign.bidStrategy}` : ""}`
            : "Campagnedetails uit Google Ads"
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/ads/google">
              <ArrowLeft className="mr-1 h-4 w-4" /> Alle campagnes
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <PeriodPicker period={period} onChange={setPeriod} />

        {query.isLoading ? (
          <AdsLoading label="Campagnegegevens ophalen…" />
        ) : data?.error || !campaign ? (
          <AdsError
            message={data?.error ?? "Campagne niet gevonden."}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ["google-ads", "campaign"] })}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{campaign.type}</Badge>
              <Badge variant="outline">{campaign.status}</Badge>
              {campaign.dailyBudget > 0 ? (
                <Badge variant="outline">Dagbudget {formatMoney(campaign.dailyBudget, currency)}</Badge>
              ) : null}
              <CampaignHealthBadge health={(campaign as any).health} />
            </div>

            <CampaignHealthAlert health={(campaign as any).health} />

            <MetricCards metrics={campaign.metrics} currency={currency} />


            {isPmax ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assetgroepen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assetGroups.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Geen assetgroepen met data in deze periode.
                    </p>
                  ) : (
                    assetGroups.map((g: any) => (
                      <div key={g.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{g.name}</p>
                          <div className="text-muted-foreground flex gap-4 text-sm tabular-nums">
                            <span>{formatMoney(g.metrics.spend, currency)}</span>
                            <span>{formatInt(g.metrics.clicks)} klikken</span>
                            <span>{formatDec(g.metrics.conversions, 1)} conv.</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {g.assets.slice(0, 20).map((a: any, i: number) => (
                            <span
                              key={i}
                              className="bg-muted rounded-md px-2 py-1 text-xs"
                              title={a.fieldType ?? undefined}
                            >
                              {a.text ?? a.assetType ?? a.fieldType}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="adgroups">
                <TabsList>
                  <TabsTrigger value="adgroups">Advertentiegroepen ({adGroups.length})</TabsTrigger>
                  <TabsTrigger value="ads">Advertenties ({ads.length})</TabsTrigger>
                  <TabsTrigger value="keywords">Zoekwoorden ({keywords.length})</TabsTrigger>
                  <TabsTrigger value="terms">Zoektermen ({searchTerms.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="adgroups" className="mt-4">
                  {adGroups.length === 0 ? (
                    <AdsEmpty
                      title="Geen advertentiegroepen met data"
                      description="In deze periode had geen advertentiegroep vertoningen."
                    />
                  ) : (
                    <Card>
                      <CardContent className="overflow-x-auto p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Advertentiegroep</TableHead>
                              <TableHead>Status</TableHead>
                              <MetricHeadCells />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {adGroups.map((g: any) => (
                              <TableRow key={g.id}>
                                <TableCell className="font-medium">{g.name}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{g.status}</TableCell>
                                <MetricCells m={g.metrics} currency={currency} />
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="ads" className="mt-4 space-y-3">
                  {ads.length === 0 ? (
                    <AdsEmpty
                      title="Geen advertenties met data"
                      description="In deze periode zijn er geen advertentiestatistieken."
                    />
                  ) : (
                    ads.map((ad: any) => (
                      <Card key={ad.id}>
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">{ad.adGroup ?? "Advertentie"}</p>
                              <p className="text-muted-foreground text-xs">
                                {ad.type} · {ad.status}
                              </p>
                            </div>
                            <div className="text-muted-foreground flex gap-4 text-sm tabular-nums">
                              <span>{formatMoney(ad.metrics.spend, currency)}</span>
                              <span>{formatInt(ad.metrics.clicks)} klikken</span>
                              <span>{formatPct(ad.metrics.ctr)}</span>
                            </div>
                          </div>
                          {ad.headlines.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-muted-foreground text-xs uppercase tracking-wide">Koppen</p>
                              <p className="text-sm">{ad.headlines.join(" · ")}</p>
                            </div>
                          ) : null}
                          {ad.descriptions.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                                Beschrijvingen
                              </p>
                              <p className="text-sm">{ad.descriptions.join(" · ")}</p>
                            </div>
                          ) : null}
                          {ad.finalUrls.length > 0 ? (
                            <p className="text-muted-foreground truncate text-xs">{ad.finalUrls[0]}</p>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="keywords" className="mt-4">
                  {keywords.length === 0 ? (
                    <AdsEmpty
                      title="Geen zoekwoorden met data"
                      description="Deze campagne gebruikt geen zoekwoorden of had geen vertoningen in deze periode."
                    />
                  ) : (
                    <Card>
                      <CardContent className="overflow-x-auto p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Zoekwoord</TableHead>
                              <TableHead>Match</TableHead>
                              <TableHead>Groep</TableHead>
                              <MetricHeadCells />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {keywords.map((k: any, i: number) => (
                              <TableRow key={`${k.text}-${i}`}>
                                <TableCell className="font-medium">{k.text}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {k.matchType ?? "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {k.adGroup ?? "—"}
                                </TableCell>
                                <MetricCells m={k.metrics} currency={currency} />
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="terms" className="mt-4">
                  {searchTerms.length === 0 ? (
                    <AdsEmpty
                      title="Geen zoektermen"
                      description="Er zijn in deze periode geen zoektermen gerapporteerd voor deze campagne."
                    />
                  ) : (
                    <Card>
                      <CardContent className="overflow-x-auto p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Zoekterm</TableHead>
                              <TableHead>Groep</TableHead>
                              <MetricHeadCells />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {searchTerms.map((t: any, i: number) => (
                              <TableRow key={`${t.text}-${i}`}>
                                <TableCell className="font-medium">{t.text}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {t.adGroup ?? "—"}
                                </TableCell>
                                <MetricCells m={t.metrics} currency={currency} />
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Target } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { AdsEmpty, AdsError, AdsLoading } from "@/components/ads/ads-states";
import { PeriodPicker } from "@/components/ads/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDec, formatMoney, resolvePeriod, type Period } from "@/lib/ads-period";
import { getGoogleAdsConversions } from "@/lib/google-ads.functions";

export const Route = createFileRoute("/ads/google/conversions")({
  head: () => ({
    meta: [
      { title: "Google Ads conversies — SocialCockpit" },
      {
        name: "description",
        content:
          "Bekijk welke conversieacties Google Ads meet, welke meetellen in de biedstrategie en hoe jouw eigen funnelconversies daarop aansluiten.",
      },
      { property: "og:title", content: "Google Ads conversies — SocialCockpit" },
      {
        property: "og:description",
        content: "Conversieacties, waarde en biedgebruik uit je Google Ads-account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConversionsPage,
});

function ConversionsPage() {
  const [period, setPeriod] = useState<Period>(() => resolvePeriod("last_30_days"));
  const queryClient = useQueryClient();
  const conversionsFn = useServerFn(getGoogleAdsConversions);

  const query = useQuery({
    queryKey: ["google-ads", "conversions", period.start, period.end],
    queryFn: () => conversionsFn({ data: { start: period.start, end: period.end } }),
  });

  const actions = query.data?.actions ?? [];
  const definitions = query.data?.definitions ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Conversies"
        subtitle="Wat Google Ads meet, en hoe dat samenhangt met je eigen funnel."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/ads/google">
              <ArrowLeft className="mr-1 h-4 w-4" /> Google Ads
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <PeriodPicker period={period} onChange={setPeriod} />

        {query.isLoading ? (
          <AdsLoading label="Conversieacties ophalen…" />
        ) : query.data?.error ? (
          <AdsError
            message={query.data.error}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ["google-ads", "conversions"] })}
          />
        ) : actions.length === 0 ? (
          <AdsEmpty
            title="Geen conversieacties gevonden"
            description="Dit Google Ads-account meet nog geen conversies, of ze zijn uitgeschakeld. Zonder conversieactie kan Google niet optimaliseren op resultaat."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversieacties in Google Ads</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Biedgebruik</TableHead>
                      <TableHead className="text-right">Conversies</TableHead>
                      <TableHead className="text-right">Alle conversies</TableHead>
                      <TableHead className="text-right">Waarde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{a.category ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{a.type ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={a.usage === "primary" ? "default" : "secondary"}>
                            {a.usage === "primary" ? "Primair" : "Secundair"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDec(a.conversions, 1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDec(a.allConversions, 1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(a.conversionsValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" /> Eigen funnelconversies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Naast wat Google meet, houdt SocialCockpit je eigen funnelstappen bij. Er zijn nu{" "}
              <span className="font-medium text-foreground">{query.data?.ownEventCount ?? 0}</span>{" "}
              eigen conversies vastgelegd.
            </p>
            {definitions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Er zijn nog geen eigen conversiestappen ingericht.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {definitions.map((d: any) => (
                  <div key={d.key} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{d.label}</p>
                      <Badge variant="outline">{d.funnel}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Stap {d.stage_order} · bron {d.source} · waarde {d.value_type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

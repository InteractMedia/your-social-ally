import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDec, formatInt, formatMoney, formatPct } from "@/lib/ads-period";

export type AdsMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  costPerConversion: number;
  conversionRate: number;
};

export const EMPTY_METRICS: AdsMetrics = {
  spend: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  avgCpc: 0,
  conversions: 0,
  conversionsValue: 0,
  costPerConversion: 0,
  conversionRate: 0,
};

export function metricTiles(m: AdsMetrics, currency = "EUR") {
  return [
    { label: "Kosten", value: formatMoney(m.spend, currency) },
    { label: "Impressies", value: formatInt(m.impressions) },
    { label: "Klikken", value: formatInt(m.clicks) },
    { label: "CTR", value: formatPct(m.ctr) },
    { label: "Gem. CPC", value: formatMoney(m.avgCpc, currency) },
    { label: "Conversies", value: formatDec(m.conversions, 1) },
    { label: "Kosten / conv.", value: m.conversions > 0 ? formatMoney(m.costPerConversion, currency) : "—" },
    { label: "Conv.waarde", value: formatMoney(m.conversionsValue, currency) },
  ];
}

export function MetricCards({
  metrics,
  currency = "EUR",
  loading,
}: {
  metrics: AdsMetrics | null;
  currency?: string;
  loading?: boolean;
}) {
  const tiles = metricTiles(metrics ?? EMPTY_METRICS, currency);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-6 w-20" />
            ) : (
              <p className="mt-1 text-xl font-semibold tabular-nums">{t.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

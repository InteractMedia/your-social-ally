import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PeriodPicker } from "@/components/ads/period-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDec, resolvePeriod } from "@/lib/ads-period";
import {
  FUNNEL_LABELS,
  STATUS_LABELS,
  funnelSteps,
  statusesForFunnel,
  type FunnelType,
} from "@/lib/leads-shared";
import { getFunnelAnalytics } from "@/lib/leads.functions";

export const Route = createFileRoute("/leads/funnels")({ component: FunnelsPage });

function FunnelsPage() {
  const [period, setPeriod] = useState(() => resolvePeriod("last_30_days"));
  const fn = useServerFn(getFunnelAnalytics);
  const query = useQuery({
    queryKey: ["leads", "funnels", period.start, period.end],
    queryFn: () => fn({ data: { start: period.start, end: period.end } }),
  });
  const leads = query.data?.leads ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Funnel-analyse"
        subtitle="Aantallen en conversiepercentages per funnelstap, gebaseerd op je eigen leaddata."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/leads">
              <ArrowLeft className="mr-1 h-4 w-4" /> Alle leads
            </Link>
          </Button>
        }
      />
      <div className="space-y-6">
        <PeriodPicker period={period} onChange={setPeriod} />
        {query.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-medium">Nog geen B2B leads ontvangen.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                De funneldoorstroom wordt berekend zodra er leads zijn.
              </p>
            </CardContent>
          </Card>
        ) : (
          (["quote", "platform"] as FunnelType[]).map((funnel) => {
            const inFunnel = leads.filter((l) => l.funnel_type === funnel);
            const order = statusesForFunnel(funnel);
            const steps = funnelSteps(funnel);
            const counts = steps.map((step) => {
              const index = order.indexOf(step);
              return inFunnel.filter((l) => {
                const li = order.indexOf(l.status);
                return li >= index && l.status !== "customer_lost";
              }).length;
            });
            const lost = inFunnel.filter((l) => l.status === "customer_lost").length;
            return (
              <Card key={funnel}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {FUNNEL_LABELS[funnel]} · {inFunnel.length} leads
                    {lost > 0 ? ` · ${lost} verloren` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-5">
                    {steps.map((step, i) => {
                      const prev = i === 0 ? counts[0] : counts[i - 1];
                      const rate = prev > 0 ? (counts[i] / prev) * 100 : null;
                      return (
                        <div key={step} className="rounded-lg border p-3">
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            {STATUS_LABELS[step] ?? step}
                          </p>
                          <p className="mt-1 text-xl font-semibold tabular-nums">{counts[i]}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {i === 0
                              ? "Instroom"
                              : rate === null
                                ? "—"
                                : `${formatDec(rate, 1)}% van vorige stap`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

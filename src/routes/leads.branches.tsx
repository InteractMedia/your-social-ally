import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PeriodPicker } from "@/components/ads/period-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDec, formatMoney, resolveLeadPeriod } from "@/lib/ads-period";
import { customerRate, qualifiedRate } from "@/lib/leads-shared";
import { getBranchAnalytics } from "@/lib/leads.functions";

export const Route = createFileRoute("/leads/branches")({ component: BranchesPage });

function BranchesPage() {
  const [period, setPeriod] = useState(() => resolveLeadPeriod("last_30_days"));
  const fn = useServerFn(getBranchAnalytics);
  const query = useQuery({
    queryKey: ["leads", "branches", period.start, period.end],
    queryFn: () => fn({ data: { start: period.start, end: period.end } }),
  });
  const branches = query.data?.branches ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Branches"
        subtitle="Leadkwaliteit en omzet per branche. Spend, CPL, CPQL en CAC volgen zodra advertentiekosten per branche toegekend kunnen worden."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/leads">
              <ArrowLeft className="mr-1 h-4 w-4" /> Alle leads
            </Link>
          </Button>
        }
      />
      <div className="space-y-6">
        <PeriodPicker period={period} onChange={setPeriod} includeToday />
        <Card>
          <CardContent className="p-0">
            {query.isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : branches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-medium">Nog geen B2B leads ontvangen.</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Branche-analyses verschijnen zodra leads met een branche zijn vastgelegd.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b text-xs uppercase tracking-wide">
                    <tr>
                      {[
                        "Branche",
                        "Leads",
                        "Qualified",
                        "Hot",
                        "Klanten",
                        "Qualified rate",
                        "Customer rate",
                        "Omzet",
                      ].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => {
                      const qr = qualifiedRate(b.qualified, b.leads);
                      const cr = customerRate(b.customers, b.leads);
                      return (
                        <tr key={b.key} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{b.name}</td>
                          <td className="px-3 py-2 tabular-nums">{b.leads}</td>
                          <td className="px-3 py-2 tabular-nums">{b.qualified}</td>
                          <td className="px-3 py-2 tabular-nums">{b.hot}</td>
                          <td className="px-3 py-2 tabular-nums">{b.customers}</td>
                          <td className="px-3 py-2 tabular-nums">
                            {qr === null ? "—" : `${formatDec(qr, 1)}%`}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {cr === null ? "—" : `${formatDec(cr, 1)}%`}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{formatMoney(b.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

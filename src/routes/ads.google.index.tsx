import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowUpRight, RefreshCw, Search, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { AdsError, AdsLoading, AdsNotConnected } from "@/components/ads/ads-states";
import { MetricCards } from "@/components/ads/metric-cards";
import { OfflineConversionSummary } from "@/components/ads/offline-summary";
import { PeriodPicker } from "@/components/ads/period-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatDec,
  formatInt,
  formatMoney,
  formatPct,
  formatDateTime,
  resolvePeriod,
  type Period,
} from "@/lib/ads-period";
import {
  getGoogleAdsCampaigns,
  getGoogleAdsConnection,
  getGoogleAdsOverview,
  selectGoogleAdsAccount,
  syncGoogleAdsAccounts,
} from "@/lib/google-ads.functions";
import { cac, cpl, cpql, roas } from "@/lib/leads-shared";
import { getCampaignLeadStats } from "@/lib/leads.functions";


export const Route = createFileRoute("/ads/google/")({
  head: () => ({
    meta: [
      { title: "Google Ads-dashboard — SocialCockpit" },
      {
        name: "description",
        content:
          "Live Google Ads-data in SocialCockpit: kosten, klikken, CTR, conversies en alle campagnes per klantaccount en periode.",
      },
      { property: "og:title", content: "Google Ads-dashboard — SocialCockpit" },
      {
        property: "og:description",
        content: "Echte campagneprestaties uit je Google Ads-account, per periode en per klantaccount.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoogleAdsIndex,
});

const STATUS_TONE: Record<string, string> = {
  Actief: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Gepauzeerd: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Verwijderd: "bg-muted text-muted-foreground",
};

function GoogleAdsIndex() {
  const [period, setPeriod] = useState<Period>(() => resolvePeriod("last_30_days"));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("spend");

  const queryClient = useQueryClient();
  const connectionFn = useServerFn(getGoogleAdsConnection);
  const overviewFn = useServerFn(getGoogleAdsOverview);
  const campaignsFn = useServerFn(getGoogleAdsCampaigns);
  const syncFn = useServerFn(syncGoogleAdsAccounts);
  const selectFn = useServerFn(selectGoogleAdsAccount);

  const connection = useQuery({ queryKey: ["google-ads", "connection"], queryFn: () => connectionFn() });
  const customerId = connection.data?.selected?.customerId ?? null;
  const currency = connection.data?.selected?.currencyCode ?? "EUR";

  const periodKey = [period.start, period.end, customerId] as const;
  const overview = useQuery({
    queryKey: ["google-ads", "overview", ...periodKey],
    queryFn: () => overviewFn({ data: { start: period.start, end: period.end } }),
    enabled: Boolean(customerId),
  });
  const campaigns = useQuery({
    queryKey: ["google-ads", "campaigns", ...periodKey],
    queryFn: () => campaignsFn({ data: { start: period.start, end: period.end } }),
    enabled: Boolean(customerId),
  });
  const leadStatsFn = useServerFn(getCampaignLeadStats);
  const leadStats = useQuery({
    queryKey: ["leads", "campaign-stats", period.start, period.end],
    queryFn: () => leadStatsFn({ data: { start: period.start, end: period.end } }),
  });


  const sync = useMutation({
    mutationFn: () => syncFn({}),
    onSuccess: (res) => {
      if (res.ok) toast.success("Google Ads-accounts vernieuwd");
      else toast.error(res.error ?? "Vernieuwen mislukt");
      queryClient.invalidateQueries({ queryKey: ["google-ads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const switchAccount = useMutation({
    mutationFn: (id: string) => selectFn({ data: { customerId: id } }),
    onSuccess: () => {
      toast.success("Klantaccount gewijzigd");
      queryClient.invalidateQueries({ queryKey: ["google-ads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const list = campaigns.data?.campaigns ?? [];
    const filtered = list.filter((c) => {
      if (statusFilter === "active" && c.rawStatus !== "ENABLED") return false;
      if (statusFilter === "paused" && c.rawStatus !== "PAUSED") return false;
      if (statusFilter === "not_removed" && c.rawStatus === "REMOVED") return false;
      if (typeFilter !== "all" && c.rawType !== typeFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const key = sort as keyof (typeof filtered)[number]["metrics"];
    return [...filtered].sort((a, b) => (b.metrics[key] ?? 0) - (a.metrics[key] ?? 0));
  }, [campaigns.data, statusFilter, typeFilter, search, sort]);

  const types = useMemo(() => {
    const set = new Map<string, string>();
    for (const c of campaigns.data?.campaigns ?? []) set.set(c.rawType, c.type);
    return [...set.entries()];
  }, [campaigns.data]);

  const errorMessage =
    connection.data?.error || overview.data?.error || campaigns.data?.error || null;

  return (
    <AppShell>
      <PageHeader
        title="Google Ads"
        subtitle="Live campagnedata uit je gekoppelde Google Ads-klantaccount."
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ads">
                <ArrowLeft className="mr-1 h-4 w-4" /> Alle platforms
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/ads/google/conversions">
                <Target className="mr-1.5 h-4 w-4" /> Conversies
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
              Vernieuwen
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {connection.isLoading ? (
          <AdsLoading label="Koppeling controleren…" />
        ) : !connection.data?.connected ? (
          <AdsNotConnected />
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Klantaccount</p>
                    {connection.data.accounts.length > 1 ? (
                      <Select
                        value={customerId ?? undefined}
                        onValueChange={(id) => switchAccount.mutate(id)}
                      >
                        <SelectTrigger className="mt-1 w-[280px]">
                          <SelectValue placeholder="Kies account" />
                        </SelectTrigger>
                        <SelectContent>
                          {connection.data.accounts.map((a) => (
                            <SelectItem key={a.customerId} value={a.customerId}>
                              {a.name} · {a.customerId}
                              {a.isManager ? " (manager)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 font-medium">
                        {connection.data.selected?.name ?? "—"}{" "}
                        <span className="text-muted-foreground text-sm">{customerId}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="h-6">
                    Gekoppeld
                  </Badge>
                </div>
                <div className="space-y-1 text-right">
                  <PeriodPicker period={period} onChange={setPeriod} />
                  <p className="text-muted-foreground text-xs">
                    Laatste sync: {formatDateTime(connection.data.selected?.lastSyncedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {errorMessage ? (
              <AdsError
                message={errorMessage}
                onRetry={() => queryClient.invalidateQueries({ queryKey: ["google-ads"] })}
              />
            ) : null}

            <MetricCards
              metrics={overview.data?.metrics ?? null}
              currency={overview.data?.currency ?? currency ?? "EUR"}
              loading={overview.isLoading}
            />

            <OfflineConversionSummary />



            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    Campagnes{" "}
                    <span className="text-muted-foreground text-sm font-normal">({rows.length})</span>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Zoek campagne"
                        className="w-[200px] pl-8"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Alleen actief</SelectItem>
                        <SelectItem value="paused">Gepauzeerd</SelectItem>
                        <SelectItem value="not_removed">Actief + gepauzeerd</SelectItem>
                        <SelectItem value="all">Alle statussen</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle campagnetypes</SelectItem>
                        {types.map(([raw, label]) => (
                          <SelectItem key={raw} value={raw}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spend">Sorteer op kosten</SelectItem>
                        <SelectItem value="clicks">Sorteer op klikken</SelectItem>
                        <SelectItem value="impressions">Sorteer op impressies</SelectItem>
                        <SelectItem value="conversions">Sorteer op conversies</SelectItem>
                        <SelectItem value="ctr">Sorteer op CTR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {campaigns.isLoading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-sm">
                    Geen campagnes gevonden met deze filters in de gekozen periode.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campagne</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Dagbudget</TableHead>
                          <TableHead className="text-right">Kosten</TableHead>
                          <TableHead className="text-right">Impr.</TableHead>
                          <TableHead className="text-right">Klikken</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">CPC</TableHead>
                          <TableHead className="text-right">Conv.</TableHead>
                          <TableHead className="text-right">Kosten/conv.</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="max-w-[240px] font-medium">
                              <Link
                                to="/ads/google/$campaignId"
                                params={{ campaignId: c.id }}
                                className="hover:underline"
                              >
                                {c.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{c.type}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.status] ?? "bg-muted text-muted-foreground"}`}
                                >
                                  {c.status}
                                </span>
                                {(c as any).health && (c as any).health.severity !== "ok" ? (
                                  <CampaignHealthBadge health={(c as any).health} />
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell className="text-right tabular-nums">
                              {c.dailyBudget > 0 ? formatMoney(c.dailyBudget, currency) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(c.metrics.spend, currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatInt(c.metrics.impressions)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatInt(c.metrics.clicks)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatPct(c.metrics.ctr)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(c.metrics.avgCpc, currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatDec(c.metrics.conversions, 1)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {c.metrics.conversions > 0
                                ? formatMoney(c.metrics.costPerConversion, currency)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button asChild size="icon" variant="ghost">
                                <Link to="/ads/google/$campaignId" params={{ campaignId: c.id }}>
                                  <ArrowUpRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">B2B-resultaten per campagne</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Leads uit de Lead Manager gekoppeld aan Google Ads-campagnes (laatste
                  niet-directe klik). CPL, CPQL en CAC gebruiken de kosten van dezelfde campagne en
                  periode.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {leadStats.isLoading ? (
                  <div className="space-y-2 p-4">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (leadStats.data?.campaigns ?? []).length === 0 ? (
                  <p className="text-muted-foreground p-6 text-sm">
                    Nog geen B2B leads met bekende campagne-attributie in deze periode. Zodra
                    aanvragen met een campagne of gclid binnenkomen, verschijnen hier Qualified,
                    Hot, klanten, CPQL, CAC en omzet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campagne</TableHead>
                          <TableHead className="text-right">Kosten</TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">Qualified</TableHead>
                          <TableHead className="text-right">Hot</TableHead>
                          <TableHead className="text-right">Klanten</TableHead>
                          <TableHead className="text-right">CPL</TableHead>
                          <TableHead className="text-right">CPQL</TableHead>
                          <TableHead className="text-right">CAC</TableHead>
                          <TableHead className="text-right">Omzet</TableHead>
                          <TableHead className="text-right">ROAS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(leadStats.data?.campaigns ?? []).map((s) => {
                          const match = (campaigns.data?.campaigns ?? []).find(
                            (c) =>
                              (s.campaignId && c.id === s.campaignId) ||
                              (s.campaignName && c.name === s.campaignName),
                          );
                          const spend = match?.metrics.spend ?? null;
                          const money = (v: number | null) =>
                            v === null ? "—" : formatMoney(v, currency);
                          const r = spend !== null ? roas(s.revenue, spend) : null;
                          return (
                            <TableRow key={s.campaignId ?? s.campaignName ?? "onbekend"}>
                              <TableCell className="max-w-[240px] font-medium">
                                {match ? (
                                  <Link
                                    to="/ads/google/$campaignId"
                                    params={{ campaignId: match.id }}
                                    className="hover:underline"
                                  >
                                    {s.campaignName ?? match.name}
                                  </Link>
                                ) : (
                                  (s.campaignName ?? s.campaignId ?? "Onbekend")
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {money(spend)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{s.leads}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {s.qualified}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{s.hot}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {s.customers}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {money(spend !== null ? cpl(spend, s.leads) : null)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {money(spend !== null ? cpql(spend, s.qualified) : null)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {money(spend !== null ? cac(spend, s.customers) : null)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatMoney(s.revenue, currency)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {r === null ? "—" : `${formatDec(r, 2)}×`}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>

        )}
      </div>
    </AppShell>
  );
}

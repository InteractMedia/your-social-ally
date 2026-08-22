import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Filter, GitCompare, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { QualityBadge, StatusBadge } from "@/components/leads/lead-ui";
import { usePoorLeadReasons } from "@/components/leads/poor-reason-dialog";
import { PeriodPicker } from "@/components/ads/period-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, resolveLeadPeriod } from "@/lib/ads-period";
import { getGoogleAdsOverview } from "@/lib/google-ads.functions";
import { cpql, FUNNEL_LABELS, LEAD_TYPE_LABELS, QUALITY_LABELS, STATUS_LABELS } from "@/lib/leads-shared";
import { getLeadsOverview, listIndustries, listLeads } from "@/lib/leads.functions";

export const Route = createFileRoute("/leads/")({ component: LeadsPage });

const ALL = "all";

function LeadsPage() {
  const [period, setPeriod] = useState(() => resolveLeadPeriod("last_30_days"));
  const [funnel, setFunnel] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [quality, setQuality] = useState(ALL);
  const [poorReason, setPoorReason] = useState(ALL);
  const [industryId, setIndustryId] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [campaign, setCampaign] = useState(ALL);
  const [search, setSearch] = useState("");

  const overviewFn = useServerFn(getLeadsOverview);
  const leadsFn = useServerFn(listLeads);
  const industriesFn = useServerFn(listIndustries);
  const adsOverviewFn = useServerFn(getGoogleAdsOverview);

  const key = [period.start, period.end];
  const overview = useQuery({
    queryKey: ["leads", "overview", ...key],
    queryFn: () => overviewFn({ data: { start: period.start, end: period.end } }),
  });
  const poorReasons = usePoorLeadReasons();
  const industries = useQuery({
    queryKey: ["leads", "industries"],
    queryFn: () => industriesFn({}),
  });
  const leads = useQuery({
    queryKey: ["leads", "list", ...key, funnel, status, quality, poorReason, industryId, search],
    queryFn: () =>
      leadsFn({
        data: {
          start: period.start,
          end: period.end,
          ...(funnel !== ALL ? { funnel } : {}),
          ...(status !== ALL ? { status } : {}),
          ...(quality !== ALL ? { quality } : {}),
          ...(poorReason !== ALL ? { poorReason } : {}),
          ...(industryId !== ALL ? { industryId } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      }),
  });
  const adsOverview = useQuery({
    queryKey: ["leads", "ads-spend", ...key],
    queryFn: () => adsOverviewFn({ data: { start: period.start, end: period.end } }),
  });

  const rows = useMemo(() => {
    const list = leads.data?.leads ?? [];
    return list.filter((l) => {
      if (platform !== ALL && (l.platform ?? "—") !== platform) return false;
      if (campaign !== ALL && (l.campaign_name ?? "—") !== campaign) return false;
      return true;
    });
  }, [leads.data, platform, campaign]);

  const platforms = useMemo(
    () => [...new Set((leads.data?.leads ?? []).map((l) => l.platform).filter(Boolean))] as string[],
    [leads.data],
  );
  const campaigns = useMemo(
    () =>
      [...new Set((leads.data?.leads ?? []).map((l) => l.campaign_name).filter(Boolean))] as string[],
    [leads.data],
  );

  const spend = adsOverview.data?.metrics?.spend ?? null;
  const kpiCpql =
    spend !== null && overview.data ? cpql(spend, overview.data.qualified) : null;

  const kpis = [
    { label: "Nieuwe leads", value: overview.data ? String(overview.data.totalLeads) : "—" },
    { label: "Qualified leads", value: overview.data ? String(overview.data.qualified) : "—" },
    { label: "Hot leads", value: overview.data ? String(overview.data.hot) : "—" },
    { label: "Nieuwe klanten", value: overview.data ? String(overview.data.customers) : "—" },
    {
      label: "Totale klantwaarde",
      value: overview.data ? formatMoney(overview.data.revenue) : "—",
    },
    { label: "Gem. CPQL", value: kpiCpql !== null ? formatMoney(kpiCpql) : "—" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="B2B Leads"
        subtitle="SocialCockpit is de bron van waarheid voor leadkwaliteit, klanten en omzet."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/leads/branches">
                <BarChart3 className="mr-1.5 h-4 w-4" /> Branches
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/leads/funnels">
                <GitCompare className="mr-1.5 h-4 w-4" /> Funnels
              </Link>
            </Button>
            <AddLeadDialog />
          </>
        }
      />

      <div className="space-y-6">
        <PeriodPicker period={period} onChange={setPeriod} includeToday />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  {k.label}
                </p>
                {overview.isLoading ? (
                  <Skeleton className="mt-2 h-6 w-16" />
                ) : (
                  <p className="mt-1 text-xl font-semibold tabular-nums">{k.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Filter className="text-muted-foreground h-4 w-4" />
            <FilterSelect
              value={funnel}
              onChange={setFunnel}
              placeholder="Funnel"
              options={Object.entries(FUNNEL_LABELS)}
            />
            <FilterSelect
              value={status}
              onChange={setStatus}
              placeholder="Status"
              options={Object.entries(STATUS_LABELS)}
            />
            <FilterSelect
              value={quality}
              onChange={setQuality}
              placeholder="Kwaliteit"
              options={Object.entries(QUALITY_LABELS)}
            />
            <FilterSelect
              value={poorReason}
              onChange={setPoorReason}
              placeholder="Reden slechte lead"
              options={(poorReasons.data?.reasons ?? []).map((r) => [r.key, r.label])}
            />
            <FilterSelect
              value={industryId}
              onChange={setIndustryId}
              placeholder="Branche"
              options={(industries.data?.industries ?? []).map((i) => [i.id, i.name])}
            />
            <FilterSelect
              value={platform}
              onChange={setPlatform}
              placeholder="Platform"
              options={platforms.map((p) => [p, p])}
            />
            <FilterSelect
              value={campaign}
              onChange={setCampaign}
              placeholder="Campagne"
              options={campaigns.map((c) => [c, c])}
            />
            <div className="relative ml-auto">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                className="w-[240px] pl-8"
                placeholder="Bedrijf, contact of e-mail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {leads.isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-medium">Nog geen B2B leads ontvangen.</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Zodra offerteaanvragen of cadeauplatform-aanvragen binnenkomen — via de API of
                  handmatig — verschijnen ze hier met hun volledige marketingherkomst.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b text-xs uppercase tracking-wide">
                    <tr>
                      {[
                        "Datum",
                        "Bedrijf",
                        "Contact",
                        "Type",
                        "Branche",
                        "Bron",
                        "Campagne",
                        "Landingspagina",
                        "Status",
                        "Kwaliteit",
                        "Waarde",
                      ].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/40 border-b last:border-0">
                        <td className="whitespace-nowrap px-3 py-2">
                          {new Date(l.received_at).toLocaleDateString("nl-NL")}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <Link to="/leads/$id" params={{ id: l.id }} className="hover:underline">
                            {l.company_name}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{l.contact_name ?? "—"}</td>
                        <td className="px-3 py-2">{LEAD_TYPE_LABELS[l.lead_type] ?? l.lead_type}</td>
                        <td className="px-3 py-2">{l.industry_name ?? "—"}</td>
                        <td className="px-3 py-2">{l.platform ?? "—"}</td>
                        <td className="px-3 py-2">{l.campaign_name ?? "—"}</td>
                        <td className="px-3 py-2">{l.landing_page ?? "—"}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="px-3 py-2">
                          <QualityBadge quality={l.lead_quality} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {l.revenue != null
                            ? formatMoney(Number(l.revenue))
                            : l.expected_value != null
                              ? `${formatMoney(Number(l.expected_value))} (verwacht)`
                              : "—"}
                        </td>
                      </tr>
                    ))}
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: alles</SelectItem>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

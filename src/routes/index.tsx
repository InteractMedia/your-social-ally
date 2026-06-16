import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  accounts,
  growthSeries,
  platformColorVar,
  platformLabel,
  topPosts,
} from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ZoetBezorgen Social" },
      { name: "description", content: "Overzicht van je social media performance over alle platformen." },
    ],
  }),
  component: Dashboard,
});

function nf(n: number) {
  return new Intl.NumberFormat("nl-NL").format(n);
}

function Dashboard() {
  const totalFollowers = accounts.reduce((a, b) => a + b.followers, 0);
  const avgEngagement =
    accounts.reduce((a, b) => a + b.engagementRate, 0) / accounts.length;
  const postsWeek = accounts.reduce((a, b) => a + b.postsThisWeek, 0);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle="Je social-performance over alle platformen — laatste 30 dagen."
        actions={
          <>
            <Button variant="outline" size="sm">
              Exporteer rapport
            </Button>
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Nieuwe post
            </Button>
          </>
        }
      />

      {/* Top KPI's */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Totaal volgers" value={nf(totalFollowers)} delta="+4.7%" />
        <KpiCard label="Engagement (gem.)" value={`${avgEngagement.toFixed(1)}%`} delta="+0.4 pt" />
        <KpiCard label="Posts deze week" value={String(postsWeek)} delta="planning vol" deltaTone="neutral" />
        <KpiCard label="Open inbox" value="6" delta="3 ongelezen" deltaTone="warning" />
      </div>

      {/* Per-platform tegels */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {accounts.map((a) => (
          <Card key={a.platform} className="bg-card">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <PlatformIcon platform={a.platform} />
              <div>
                <CardTitle className="text-sm">{platformLabel(a.platform)}</CardTitle>
                <p className="text-xs text-muted-foreground">{a.handle}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-xl font-semibold">{nf(a.followers)}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-success">
                  <TrendingUp className="h-3 w-3" />
                  {a.growth30d.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">eng. {a.engagementRate.toFixed(1)}%</span>
              </div>
              <Badge
                variant="outline"
                className="mt-2 text-[10px]"
                style={{
                  color: a.connection === "api" ? "var(--color-success)" : "var(--color-muted-foreground)",
                  borderColor:
                    a.connection === "api"
                      ? "color-mix(in oklab, var(--color-success) 40%, transparent)"
                      : "var(--color-border)",
                }}
              >
                {a.connection === "api" ? "Live via API" : "Handmatig"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volgersgroei — laatste 30 dagen</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthSeries}>
                <defs>
                  {accounts.map((a) => (
                    <linearGradient key={a.platform} id={`g-${a.platform}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={platformColorVar(a.platform)} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={platformColorVar(a.platform)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {accounts.map((a) => (
                  <Area
                    key={a.platform}
                    type="monotone"
                    dataKey={a.platform}
                    stroke={platformColorVar(a.platform)}
                    fill={`url(#g-${a.platform})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top posts deze week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPosts.map((p) => (
              <div
                key={p.id}
                className="flex gap-3 rounded-md border border-border bg-surface p-3"
              >
                <PlatformIcon platform={p.platform} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{p.caption}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>♥ {nf(p.likes)}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {nf(p.comments)}
                    </span>
                    <span>↗ {nf(p.shares)}</span>
                    <span className="ml-auto">{p.postedAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaTone = "positive",
}: {
  label: string;
  value: string;
  delta: string;
  deltaTone?: "positive" | "neutral" | "warning";
}) {
  const color =
    deltaTone === "positive"
      ? "text-success"
      : deltaTone === "warning"
        ? "text-warning"
        : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-2xl font-semibold">{value}</div>
          <div className={`flex items-center gap-1 text-xs ${color}`}>
            <ArrowUpRight className="h-3 w-3" />
            {delta}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

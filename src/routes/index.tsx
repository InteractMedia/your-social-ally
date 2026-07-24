import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Link2, Plug, Sparkles, Users } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformColorVar, type Platform } from "@/lib/demo-data";
import { getMetaStatus } from "@/lib/meta.functions";
import { getLinkedInProfile } from "@/lib/linkedin.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Social Cockpit" },
      { name: "description", content: "Overzicht van je gekoppelde social-accounts en snelle acties." },
    ],
  }),
  component: Dashboard,
});

type ChannelBlock = {
  platform: Platform;
  label: string;
  handle?: string;
  followers?: number;
};

function Dashboard() {
  const metaFn = useServerFn(getMetaStatus);
  const linkedInFn = useServerFn(getLinkedInProfile);

  const meta = useQuery({ queryKey: ["meta-status"], queryFn: () => metaFn() });
  const linkedin = useQuery({ queryKey: ["linkedin-profile"], queryFn: () => linkedInFn() });

  const fbConnected = meta.data?.page.connected ?? false;
  const igConnected = meta.data?.instagram.connected ?? false;
  const liConnected = linkedin.data?.connected ?? false;

  const channels: ChannelBlock[] = [];
  if (fbConnected) {
    channels.push({
      platform: "facebook",
      label: "Facebook",
      handle: meta.data?.page.name ?? undefined,
      followers: meta.data?.page.followers,
    });
  }
  if (igConnected) {
    channels.push({
      platform: "instagram",
      label: "Instagram",
      handle: meta.data?.instagram.username ? `@${meta.data.instagram.username}` : undefined,
      followers: meta.data?.instagram.followers,
    });
  }
  if (liConnected) {
    channels.push({
      platform: "linkedin",
      label: "LinkedIn",
      handle: linkedin.data?.name ?? undefined,
    });
  }

  const totalFollowers = channels.reduce((sum, c) => sum + (c.followers ?? 0), 0);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle="Welkom. Koppel je accounts en begin met plannen."
        actions={
          <Link to="/composer">
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Nieuwe post
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Gekoppelde kanalen" value={`${channels.length} / 5`} hint="TikTok, LinkedIn, Instagram, Facebook, YouTube" />
        <KpiCard
          label="Totaal volgers"
          value={totalFollowers > 0 ? totalFollowers.toLocaleString("nl-NL") : "—"}
          hint={totalFollowers > 0 ? "Live vanuit gekoppelde kanalen" : "Beschikbaar na koppeling"}
        />
        <KpiCard label="Posts deze week" value="0" hint="Nog geen posts gepubliceerd" />
        <KpiCard label="Open inbox" value="0" hint="Nog geen berichten binnen" />
      </div>

      {channels.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Gekoppelde kanalen
          </h2>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((c) => (
              <FollowerCard key={c.platform} channel={c} />
            ))}
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aan de slag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step done={channels.length > 0} text="Koppel minstens één social account via /meta of /settings." />
          <Step done={false} text="Schrijf je eerste post in de Composer en plan of publiceer direct." />
          <Step done={false} text="Zodra er posts live staan, verschijnen hier je volgers, top-posts en groeigrafieken automatisch." />
          {channels.length < 5 && (
            <div className="pt-2">
              <Link to="/settings">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plug className="h-4 w-4" /> Kanaal koppelen
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function FollowerCard({ channel }: { channel: ChannelBlock }) {
  const color = platformColorVar(channel.platform);
  return (
    <Card
      className="relative overflow-hidden border-0 text-white shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 70%, black) 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20"
        style={{ background: "white" }}
      />
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <PlatformIcon platform={channel.platform} size={40} />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base text-white">{channel.label}</CardTitle>
          {channel.handle && (
            <p className="truncate text-xs text-white/80">{channel.handle}</p>
          )}
        </div>
        <Badge className="gap-1 border-white/30 bg-white/15 text-[10px] text-white hover:bg-white/20">
          <CheckCircle2 className="h-3 w-3" /> Verbonden
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/80">
              <Users className="h-3 w-3" /> Volgers
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight">
              {typeof channel.followers === "number"
                ? channel.followers.toLocaleString("nl-NL")
                : "—"}
            </div>
          </div>
          <Link to={channel.platform === "linkedin" ? "/settings" : "/meta"}>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 border-0 bg-white/15 text-white hover:bg-white/25"
            >
              <Link2 className="h-4 w-4" /> Beheren
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
      ) : (
        <div className="mt-0.5 h-4 w-4 rounded-full border border-border" />
      )}
      <span className={done ? "text-muted-foreground line-through" : ""}>{text}</span>
    </div>
  );
}

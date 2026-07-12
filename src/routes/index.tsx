import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Link2, Plug, Sparkles, XCircle } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon, platformTintStyle } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function Dashboard() {
  const metaFn = useServerFn(getMetaStatus);
  const linkedInFn = useServerFn(getLinkedInProfile);

  const meta = useQuery({ queryKey: ["meta-status"], queryFn: () => metaFn() });
  const linkedin = useQuery({ queryKey: ["linkedin-profile"], queryFn: () => linkedInFn() });

  const fbConnected = meta.data?.page.connected ?? false;
  const igConnected = meta.data?.instagram.connected ?? false;
  const liConnected = linkedin.data?.connected ?? false;
  const connectedCount = [fbConnected, igConnected, liConnected].filter(Boolean).length;

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle="Welkom. Koppel je accounts en begin met plannen."
        actions={
          <>
            <Link to="/composer">
              <Button size="sm" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Nieuwe post
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Gekoppelde kanalen" value={`${connectedCount} / 5`} hint="TikTok, LinkedIn, Instagram, Facebook, YouTube" />
        <KpiCard label="Totaal volgers" value="—" hint="Beschikbaar na koppeling" />
        <KpiCard label="Posts deze week" value="0" hint="Nog geen posts gepubliceerd" />
        <KpiCard label="Open inbox" value="0" hint="Nog geen berichten binnen" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ConnectionCard
          platform="facebook"
          label="Facebook Page"
          connected={fbConnected}
          detail={fbConnected ? meta.data?.page.name : "Nog niet gekoppeld"}
          href="/meta"
          cta="Koppel Meta"
        />
        <ConnectionCard
          platform="instagram"
          label="Instagram Business"
          connected={igConnected}
          detail={
            igConnected
              ? `@${meta.data?.instagram.username ?? ""}${meta.data?.instagram.followers ? ` · ${meta.data.instagram.followers.toLocaleString("nl-NL")} volgers` : ""}`
              : "Nog niet gekoppeld"
          }
          href="/meta"
          cta="Koppel Meta"
        />
        <ConnectionCard
          platform="linkedin"
          label="LinkedIn"
          connected={liConnected}
          detail={liConnected ? linkedin.data?.name ?? "Verbonden" : "Nog niet gekoppeld"}
          href="/settings"
          cta="Koppel LinkedIn"
        />
        <ConnectionCard platform="tiktok" label="TikTok" connected={false} detail="Nog niet gekoppeld" href="/settings" cta="Koppelen" />
        <ConnectionCard platform="youtube" label="YouTube" connected={false} detail="Nog niet gekoppeld" href="/settings" cta="Koppelen" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aan de slag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step done={connectedCount > 0} text="Koppel minstens één social account via /meta of /settings." />
          <Step done={false} text="Schrijf je eerste post in de Composer en plan of publiceer direct." />
          <Step done={false} text="Zodra er posts live staan, verschijnen hier je volgers, top-posts en groeigrafieken automatisch." />
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

function ConnectionCard({
  platform,
  label,
  connected,
  detail,
  href,
  cta,
}: {
  platform: "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube";
  label: string;
  connected: boolean;
  detail?: string;
  href: string;
  cta: string;
}) {
  return (
    <Card className="platform-tint border-2" style={platformTintStyle(platform)}>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <PlatformIcon platform={platform} />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">{label}</CardTitle>
          <p className="truncate text-xs text-muted-foreground">{detail ?? "—"}</p>
        </div>
        <Badge
          variant="outline"
          className="gap-1 text-[10px]"
          style={{
            color: connected ? "var(--color-success)" : "var(--color-muted-foreground)",
            borderColor: connected
              ? "color-mix(in oklab, var(--color-success) 40%, transparent)"
              : "var(--color-border)",
          }}
        >
          {connected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {connected ? "Verbonden" : "Los"}
        </Badge>
      </CardHeader>
      <CardContent>
        <Link to={href}>
          <Button variant={connected ? "outline" : "default"} size="sm" className="w-full gap-1.5">
            {connected ? <Link2 className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
            {connected ? "Beheren" : cta}
          </Button>
        </Link>
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

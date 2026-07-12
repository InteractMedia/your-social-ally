import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, Copy, Link2, Loader2, Plug, Sparkles, Stethoscope } from "lucide-react";
import { toast } from "sonner";


import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon, platformTintStyle } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, accounts, platformLabel } from "@/lib/demo-data";
import { getLinkedInProfile } from "@/lib/linkedin.functions";
import { debugMetaToken, getMetaStatus } from "@/lib/meta.functions";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Instellingen — ZoetBezorgen Social" }] }),
  component: Settings,
});

function Settings() {
  return (
    <AppShell>
      <PageHeader
        title="Instellingen"
        subtitle="Koppelingen, handmatige cijfers en brand voice."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" /> Platform-koppelingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLATFORMS.map((p) => {
              const acc = accounts.find((a) => a.platform === p.id);
              if (p.id === "linkedin") return <LinkedInRow key={p.id} />;
              if (p.id === "facebook" || p.id === "instagram")
                return <MetaRow key={p.id} platform={p.id} />;
              const live = acc?.connection === "api";
              return (
                <div
                  key={p.id}
                  className="platform-row flex items-center gap-3 rounded-md border p-3"
                  style={platformTintStyle(p.id)}
                >
                  <PlatformIcon platform={p.id} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {acc ? acc.handle : "Nog niet gekoppeld"}
                    </div>
                  </div>
                  {live ? (
                    <Badge variant="outline" className="gap-1 text-success">
                      <Check className="h-3 w-3" /> Live
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Koppelen
                    </Button>
                  )}
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground">
              LinkedIn, Facebook en Instagram zijn nu echt gekoppeld via de Graph API. TikTok en YouTube volgen zodra hun connectoren beschikbaar zijn.
            </p>
          </CardContent>

        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand voice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Tone</Label>
              <Input defaultValue="warm, speels, ambachtelijk-trots" className="bg-surface" />
            </div>
            <div>
              <Label className="text-xs">Do's</Label>
              <Textarea
                rows={3}
                defaultValue="• Spreek de lezer aan als 'je'.\n• Noem ingrediënten bij naam.\n• Korte zinnen, één gedachte per zin."
                className="resize-none bg-surface"
              />
            </div>
            <div>
              <Label className="text-xs">Don'ts</Label>
              <Textarea
                rows={3}
                defaultValue="• Geen corporate jargon.\n• Geen overdadige emoji.\n• Niet over prijs in de hook."
                className="resize-none bg-surface"
              />
            </div>
            <Button size="sm" className="mt-2">Opslaan</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Handmatige cijfers (IG / FB / YT)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {accounts
                .filter((a) => a.connection === "manual")
                .map((a) => (
                  <div
                    key={a.platform}
                    className="platform-row rounded-md border p-3"
                    style={platformTintStyle(a.platform)}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <PlatformIcon platform={a.platform} />
                      <span className="text-sm font-medium">{platformLabel(a.platform)}</span>
                    </div>
                    <Label className="text-xs">Volgers</Label>
                    <Input type="number" defaultValue={a.followers} className="bg-background" />
                    <Label className="mt-2 text-xs">Engagement %</Label>
                    <Input type="number" step="0.1" defaultValue={a.engagementRate} className="bg-background" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function LinkedInRow() {
  const fn = useServerFn(getLinkedInProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["linkedin", "profile"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div
      className="platform-row flex items-center gap-3 rounded-md border p-3"
      style={platformTintStyle("linkedin")}
    >
      <PlatformIcon platform="linkedin" />
      <div className="flex-1">
        <div className="text-sm font-medium">LinkedIn</div>
        <div className="text-xs text-muted-foreground">
          {isLoading
            ? "Verbinding controleren…"
            : data?.connected
              ? `${data.name}${data.email ? ` · ${data.email}` : ""}`
              : data?.error ?? "Nog niet gekoppeld"}
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : data?.connected ? (
        <>
          {data.picture && (
            <img src={data.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <Badge variant="outline" className="gap-1 text-success">
            <Check className="h-3 w-3" /> Live
          </Badge>
        </>
      ) : (
        <Badge variant="outline">Niet gekoppeld</Badge>
      )}
    </div>
  );
}

function MetaRow({ platform }: { platform: "facebook" | "instagram" }) {
  const fn = useServerFn(getMetaStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["meta", "status"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const info = platform === "facebook" ? data?.page : data?.instagram;
  const connected = !!info?.connected;
  const label =
    platform === "facebook"
      ? info?.connected ? `${(info as { name?: string }).name ?? "Facebook Page"}` : ""
      : info?.connected ? `@${(info as { username?: string }).username ?? ""}` : "";

  return (
    <div
      className="platform-row flex items-center gap-3 rounded-md border p-3"
      style={platformTintStyle(platform)}
    >
      <PlatformIcon platform={platform} />
      <div className="flex-1">
        <div className="text-sm font-medium">{platform === "facebook" ? "Facebook" : "Instagram"}</div>
        <div className="text-xs text-muted-foreground">
          {isLoading
            ? "Verbinding controleren…"
            : connected
              ? label
              : info?.error ?? "Nog niet gekoppeld"}
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : connected ? (
        <Badge variant="outline" className="gap-1 text-success">
          <Check className="h-3 w-3" /> Live
        </Badge>
      ) : (
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/meta">
            <Sparkles className="h-3.5 w-3.5" />
            Wizard
          </Link>
        </Button>
      )}
    </div>
  );
}



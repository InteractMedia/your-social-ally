import { createFileRoute } from "@tanstack/react-router";
import { Check, Link2, Plug } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon, platformTintStyle } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, accounts, platformLabel } from "@/lib/demo-data";

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
              TikTok &amp; LinkedIn kunnen we direct via Lovable connectoren koppelen.
              Instagram, Facebook en YouTube vereisen Meta business-review of een eigen YouTube API key — daarom v1 als handmatige invoer.
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
                  <div key={a.platform} className="rounded-md border border-border bg-surface p-3">
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

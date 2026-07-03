import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Plus, TrendingUp } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon, platformTintStyle } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  competitorChannels,
  competitorPosts,
  competitors,
  platformLabel,
} from "@/lib/demo-data";

export const Route = createFileRoute("/competitors/")({
  component: CompetitorsIndex,
});

const nf = (n: number) => new Intl.NumberFormat("nl-NL").format(n);

function CompetitorsIndex() {
  return (
    <AppShell>
      <PageHeader
        title="Concurrentie-analyse"
        subtitle="Open een concurrent om al hun kanalen, posts, ads en thema's te zien."
        actions={
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Concurrent toevoegen
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {competitors.map((c) => {
          const channels = competitorChannels.filter((ch) => ch.competitorId === c.id);
          const posts = competitorPosts.filter((p) => p.competitorId === c.id);
          const totalAds = channels.reduce((s, ch) => s + ch.activeAdsCount, 0);
          const bestPost = [...posts].sort((a, b) => b.likes - a.likes)[0];

          return (
            <Link
              key={c.id}
              to="/competitors/$id"
              params={{ id: c.id }}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={c.primaryPlatform} size={28} />
                  <div>
                    <div className="text-base font-semibold">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.primaryHandle}</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{c.about}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-2 p-3 text-center text-xs">
                <div>
                  <div className="font-semibold text-foreground">{nf(c.totalFollowers)}</div>
                  <div className="text-muted-foreground">followers</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 font-semibold text-success">
                    <TrendingUp className="h-3 w-3" /> {c.growth30d}%
                  </div>
                  <div className="text-muted-foreground">30 dagen</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{totalAds}</div>
                  <div className="text-muted-foreground">actieve ads</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Actief op:</span>
                {channels.map((ch) => (
                  <Badge key={ch.platform} variant="outline" className="gap-1">
                    <PlatformIcon platform={ch.platform} size={14} />
                    {platformLabel(ch.platform)}
                  </Badge>
                ))}
              </div>

              {bestPost && (
                <div className="mt-3 rounded-md border border-border bg-surface p-2 text-xs">
                  <div className="text-muted-foreground">Top post:</div>
                  <div className="line-clamp-2 text-foreground">{bestPost.caption}</div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

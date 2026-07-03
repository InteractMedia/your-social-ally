import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityHeatmap } from "@/components/schedule/ActivityHeatmap";
import { TopSlotsCards } from "@/components/schedule/TopSlotsCards";
import { PublicationTimeline } from "@/components/schedule/PublicationTimeline";

export const Route = createFileRoute("/schedule")({
  head: () => ({ meta: [{ title: "Schedule — ZoetBezorgen Social" }] }),
  component: SchedulePage,
});

function SchedulePage() {
  return (
    <AppShell>
      <PageHeader
        title="Beste posttijd"
        subtitle="Wanneer is jouw audience actief? Post op piekslots voor 20-40% meer bereik."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top piekslots deze week</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSlotsCards />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience-activiteit heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publicatie-queue (14 dagen)</CardTitle>
          </CardHeader>
          <CardContent>
            <PublicationTimeline />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

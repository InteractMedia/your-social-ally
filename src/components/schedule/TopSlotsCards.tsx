import { Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "@/components/platform-icon";
import { computeTopSlots } from "@/lib/demo-schedule";
import { PLATFORMS, platformLabel } from "@/lib/demo-data";
import { DAY_LABELS } from "@/lib/demo-schedule";

export function TopSlotsCards() {
  const slots = computeTopSlots(
    PLATFORMS.map((p) => p.id),
    6,
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {slots.map((s, i) => (
        <Card key={i} className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {DAY_LABELS[s.day]} {String(s.hour).padStart(2, "0")}:00
                </span>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-success">
                  <TrendingUp className="h-3 w-3" />
                  {s.score}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <PlatformIcon platform={s.platform} size={14} />
                {platformLabel(s.platform)}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                #{i + 1} beste slot deze week
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

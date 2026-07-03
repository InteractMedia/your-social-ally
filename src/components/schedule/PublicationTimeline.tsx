import { useState } from "react";
import { Sparkles, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platform-icon";
import { initialQueue, activityByPlatform, DAY_LABELS, type QueuedPost } from "@/lib/demo-schedule";
import { platformLabel } from "@/lib/demo-data";

function bestSlotFor(post: QueuedPost) {
  // Zoek beste (dag, uur) in de komende 7 dagen over álle geselecteerde platforms
  let best = { day: post.scheduledFor.day, hour: post.scheduledFor.hour, score: 0 };
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const avg =
        post.platforms.reduce((s, p) => s + activityByPlatform[p][d][h], 0) / post.platforms.length;
      if (avg > best.score) best = { day: d, hour: h, score: Math.round(avg) };
    }
  }
  return best;
}

export function PublicationTimeline() {
  const [queue, setQueue] = useState<QueuedPost[]>(initialQueue);

  const applyBestSlot = (id: string) => {
    setQueue((cur) =>
      cur.map((q) => {
        if (q.id !== id) return q;
        const best = bestSlotFor(q);
        toast.success(`Verplaatst naar ${DAY_LABELS[best.day]} ${String(best.hour).padStart(2, "0")}:00`);
        return { ...q, scheduledFor: { day: best.day, hour: best.hour }, suggestedSlot: best };
      }),
    );
  };

  return (
    <div className="space-y-2">
      {queue
        .sort((a, b) => a.scheduledFor.day - b.scheduledFor.day || a.scheduledFor.hour - b.scheduledFor.hour)
        .map((post) => {
          const best = bestSlotFor(post);
          const isBest =
            post.scheduledFor.day === best.day && post.scheduledFor.hour === best.hour;
          return (
            <Card key={post.id} className="transition-colors hover:border-primary/30">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-md bg-surface text-center">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {DAY_LABELS[post.scheduledFor.day]}
                  </span>
                  <span className="text-sm font-semibold">
                    {String(post.scheduledFor.hour).padStart(2, "0")}:00
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{post.content}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {post.platforms.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                      >
                        <PlatformIcon platform={p} size={12} />
                        {platformLabel(p)}
                      </span>
                    ))}
                  </div>
                </div>
                {isBest ? (
                  <Badge variant="outline" className="border-success/40 text-success">
                    ✓ Piekslot
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={() => applyBestSlot(post.id)}
                    title={`Suggestie: ${DAY_LABELS[best.day]} ${String(best.hour).padStart(2, "0")}:00 (score ${best.score})`}
                  >
                    <Sparkles className="h-3 w-3" />
                    → {DAY_LABELS[best.day]} {String(best.hour).padStart(2, "0")}:00
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      <p className="pt-2 text-center text-xs text-muted-foreground">
        <Clock className="mr-1 inline h-3 w-3" />
        Suggesties gebaseerd op audience-activiteit per platform
      </p>
    </div>
  );
}

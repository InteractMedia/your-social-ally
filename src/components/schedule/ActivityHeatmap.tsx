import { useState } from "react";
import { activityByPlatform, DAY_LABELS } from "@/lib/demo-schedule";
import { PLATFORMS, type Platform } from "@/lib/demo-data";
import { PlatformIcon } from "@/components/platform-icon";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function scoreColor(score: number): string {
  if (score < 15) return "bg-surface-2";
  if (score < 30) return "bg-primary/10";
  if (score < 50) return "bg-primary/25";
  if (score < 70) return "bg-primary/45";
  if (score < 85) return "bg-primary/70";
  return "bg-primary";
}

export function ActivityHeatmap({ initial = "tiktok" }: { initial?: Platform }) {
  const [platform, setPlatform] = useState<Platform>(initial);
  const grid = activityByPlatform[platform];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const on = platform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <PlatformIcon platform={p.id} size={16} />
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Uur labels */}
          <div className="mb-1 flex pl-8 text-[10px] text-muted-foreground">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {/* Rijen */}
          {DAY_LABELS.map((label, d) => (
            <div key={d} className="mb-0.5 flex items-center gap-1">
              <div className="w-7 text-right text-[11px] text-muted-foreground">{label}</div>
              <div className="flex flex-1 gap-0.5">
                {HOURS.map((h) => {
                  const s = grid[d][h];
                  return (
                    <div
                      key={h}
                      title={`${label} ${h}:00 — score ${s}`}
                      className={cn("h-6 flex-1 rounded-sm", scoreColor(s))}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Weinig activiteit</span>
        {[15, 30, 50, 70, 85, 95].map((s) => (
          <div key={s} className={cn("h-3 w-6 rounded-sm", scoreColor(s))} />
        ))}
        <span>Piek</span>
      </div>
    </div>
  );
}

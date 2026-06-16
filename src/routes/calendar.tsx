import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { scheduled } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Kalender — ZoetBezorgen Social" }] }),
  component: Calendar,
});

const statusStyles: Record<string, string> = {
  concept: "bg-muted text-muted-foreground border-border",
  ingepland: "bg-primary/15 text-primary border-primary/30",
  gepost: "bg-success/15 text-success border-success/30",
  mislukt: "bg-destructive/15 text-destructive border-destructive/30",
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function Calendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startDow = (first.getDay() + 6) % 7; // monday-first
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null; iso: string }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, iso: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      cells.push({ date, iso: date.toISOString().slice(0, 10) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, iso: "" });
    return cells;
  }, [cursor]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, typeof scheduled>();
    for (const p of scheduled) {
      const key = p.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, []);

  const monthLabel = cursor.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <PageHeader
        title="Content kalender"
        subtitle="Plan posts in voor alle platformen. Sleep een post om opnieuw in te plannen (v2)."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nieuwe post
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-44 text-center text-sm font-medium capitalize">{monthLabel}</div>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(statusStyles).map(([k, v]) => (
                <span key={k} className={cn("rounded-full border px-2 py-0.5 capitalize", v)}>
                  {k}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
            {["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => (
              <div key={d} className="bg-surface px-2 py-1.5 text-center font-medium uppercase text-muted-foreground">
                {d}
              </div>
            ))}
            {grid.map((cell, i) => {
              const posts = cell.iso ? postsByDay.get(cell.iso) ?? [] : [];
              const isToday = cell.iso === todayISO;
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[120px] bg-card p-2",
                    !cell.date && "bg-background/40",
                    isToday && "ring-1 ring-inset ring-primary/50",
                  )}
                >
                  {cell.date && (
                    <div className="mb-1 flex items-center justify-between">
                      <span className={cn("text-xs", isToday ? "font-semibold text-primary" : "text-muted-foreground")}>
                        {cell.date.getDate()}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {posts.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-md border px-1.5 py-1 text-[11px] leading-tight",
                          statusStyles[p.status],
                        )}
                      >
                        <div className="mb-0.5 flex gap-1">
                          {p.platforms.map((pl) => (
                            <PlatformIcon key={pl} platform={pl} size={14} />
                          ))}
                        </div>
                        <div className="line-clamp-2">{p.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <h2 className="mt-8 mb-3 text-sm font-medium text-muted-foreground">Komende posts</h2>
      <div className="space-y-2">
        {scheduled
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-md border border-border bg-card p-3"
            >
              <div className="flex w-20 flex-col text-xs text-muted-foreground">
                <span>
                  {new Date(p.date).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}
                </span>
                <span>{new Date(p.date).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex gap-1">
                {p.platforms.map((pl) => (
                  <PlatformIcon key={pl} platform={pl} size={20} />
                ))}
              </div>
              <div className="flex-1 truncate text-sm">{p.content}</div>
              <Badge variant="outline" className={cn("capitalize", statusStyles[p.status])}>
                {p.status}
              </Badge>
            </div>
          ))}
      </div>
    </AppShell>
  );
}

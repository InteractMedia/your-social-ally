import { Clock, TrendingUp } from "lucide-react";
import { medianReplyTimeMinutes } from "@/lib/demo-schedule";
import { cn } from "@/lib/utils";

export function ReplyTimeMeter({ inboxCount, unread }: { inboxCount: number; unread: number }) {
  const median = medianReplyTimeMinutes();
  const good = median !== null && median < 60;
  return (
    <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-3 text-xs">
      <div className="flex items-center gap-2">
        <Clock className={cn("h-4 w-4", good ? "text-success" : "text-warning")} />
        <div>
          <div className="font-medium">
            Mediaan reactietijd: {median === null ? "—" : `${median} min`}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {median === null
              ? "Nog geen data"
              : good
                ? "✓ Onder 1u — algoritme boost"
                : "Boven 1u — mist algoritme window"}
          </div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <div>
          <div className="font-medium">
            {unread} van {inboxCount} onbeantwoord
          </div>
          <div className="text-[10px] text-muted-foreground">Snelheid = bereik</div>
        </div>
      </div>
    </div>
  );
}

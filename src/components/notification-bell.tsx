/**
 * Notificatiebel met ongelezen-teller.
 *
 * Leest uitsluitend via authenticated server functions; klikken op een melding
 * markeert hem als gelezen en opent het gekoppelde detail (bijv. de lead).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { NOTIFICATION_CATEGORY_LABELS } from "@/lib/notifications-shared";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "net";
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} uur`;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const readFn = useServerFn(markNotificationRead);
  const readAllFn = useServerFn(markAllNotificationsRead);

  const query = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listFn({ data: { limit: 20 } }),
    refetchInterval: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markOne = useMutation({
    mutationFn: (id: string) => readFn({ data: { id } }),
    onSuccess: invalidate,
  });
  const markAll = useMutation({ mutationFn: () => readAllFn({}), onSuccess: invalidate });

  const unread = query.data?.unread ?? 0;
  const items = query.data?.notifications ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Meldingen${unread ? ` (${unread} ongelezen)` : ""}`}
          className="border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent relative flex w-full items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium"
        >
          <Bell className="text-muted-foreground h-3.5 w-3.5" />
          Meldingen
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Meldingen</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Alles gelezen
          </Button>
        </div>
        <ScrollArea className="max-h-[360px]">
          {items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Geen meldingen. Nieuwe live aanvragen verschijnen hier direct.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    className={cn(
                      "hover:bg-muted/60 w-full px-3 py-2.5 text-left transition-colors",
                      !n.read_at && "bg-primary/5",
                    )}
                    onClick={() => {
                      if (!n.read_at) markOne.mutate(n.id);
                      setOpen(false);
                      if (n.link_path) navigate({ to: n.link_path });
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="bg-primary mt-1.5 h-2 w-2 rounded-full" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                          {NOTIFICATION_CATEGORY_LABELS[n.category] ?? n.category}
                          {n.is_test ? " · TEST" : ""}
                        </p>
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {n.body && (
                          <p className="text-muted-foreground truncate text-xs">{n.body}</p>
                        )}
                        <p className="text-muted-foreground mt-0.5 text-[11px]">
                          {timeAgo(n.created_at)} geleden
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

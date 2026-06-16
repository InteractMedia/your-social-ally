import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateAI } from "@/lib/ai.functions";
import { inboxItems, type InboxItem } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "Inbox — ZoetBezorgen Social" }] }),
  component: InboxPage,
});

const sentimentStyles: Record<string, string> = {
  positief: "text-success border-success/30",
  neutraal: "text-muted-foreground border-border",
  negatief: "text-destructive border-destructive/30",
};

function InboxPage() {
  const [selected, setSelected] = useState<InboxItem>(inboxItems[0]);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"alle" | "ongelezen">("alle");
  const fn = useServerFn(generateAI);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onSuccess: ({ output }) => setReply(output),
    onError: (err: Error) => toast.error(err.message),
  });

  const items = filter === "alle" ? inboxItems : inboxItems.filter((i) => i.status === "ongelezen");

  return (
    <AppShell>
      <PageHeader
        title="Inbox"
        subtitle="Reacties, vermeldingen en DM's van alle platformen op één plek."
        actions={
          <div className="flex gap-1 rounded-md border border-border bg-surface p-0.5 text-xs">
            {(["alle", "ongelezen"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded px-3 py-1 capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item);
                  setReply("");
                }}
                className={cn(
                  "flex w-full gap-3 p-4 text-left transition-colors hover:bg-surface",
                  selected.id === item.id && "bg-surface",
                )}
              >
                <PlatformIcon platform={item.platform} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{item.author}</span>
                    {item.status === "ongelezen" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{item.createdAt}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <PlatformIcon platform={selected.platform} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selected.author}</span>
                  <span className="text-xs text-muted-foreground">{selected.authorHandle}</span>
                  <Badge
                    variant="outline"
                    className={cn("ml-auto text-[10px] capitalize", sentimentStyles[selected.sentiment])}
                  >
                    {selected.sentiment}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Reactie op: <span className="text-foreground">{selected.postContext}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface p-3 text-sm">
              {selected.body}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Jouw antwoord</h4>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      data: {
                        action: "reply_suggestion",
                        content: selected.postContext,
                        context: selected.body,
                        platform: selected.platform,
                      },
                    })
                  }
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI-suggesties
                </Button>
              </div>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={6}
                placeholder="Typ je antwoord, of laat AI 3 varianten suggereren…"
                className="resize-none bg-surface"
              />
              <div className="flex justify-end">
                <Button size="sm" className="gap-1.5" disabled={!reply.trim()}>
                  <Send className="h-3.5 w-3.5" /> Verstuur antwoord
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

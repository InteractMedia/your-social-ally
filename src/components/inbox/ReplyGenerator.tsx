import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateAI } from "@/lib/ai.functions";
import type { InboxItem } from "@/lib/demo-data";

type Variant = { label: string; text: string };

function parseVariants(raw: string): Variant[] {
  // Verwacht: "1) warm: ...\n2) zakelijk: ...\n3) speels: ..."
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const variants: Variant[] = [];
  const labels = ["warm", "zakelijk", "speels"];
  for (const line of lines) {
    const m = line.match(/^(\d+)[\)\.]?\s*([^:]+):\s*(.+)$/);
    if (m) {
      variants.push({ label: m[2].trim().toLowerCase(), text: m[3].trim() });
      continue;
    }
    const m2 = line.match(/^(\d+)[\)\.]?\s*(.+)$/);
    if (m2) {
      const idx = Number(m2[1]) - 1;
      variants.push({ label: labels[idx] ?? `optie ${idx + 1}`, text: m2[2].trim() });
    }
  }
  return variants.slice(0, 3);
}

export function ReplyGenerator({
  item,
  onPick,
  onSend,
}: {
  item: InboxItem;
  onPick: (text: string) => void;
  onSend: (text: string) => void;
}) {
  const fn = useServerFn(generateAI);
  const [variants, setVariants] = useState<Variant[]>([]);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateAI>[0]) => fn(input),
    onSuccess: ({ output }) => {
      const parsed = parseVariants(output);
      if (parsed.length === 0) {
        toast.error("Kon suggesties niet parsen.");
        return;
      }
      setVariants(parsed);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const generate = () => {
    setVariants([]);
    mutation.mutate({
      data: {
        action: "reply_suggestion",
        content: item.postContext,
        context: item.body,
        platform: item.platform,
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">3 antwoord-varianten</span>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={mutation.isPending}
          onClick={generate}
        >
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {variants.length > 0 ? "Opnieuw" : "Genereer"}
        </Button>
      </div>

      {variants.length === 0 && !mutation.isPending && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Klik "Genereer" voor 3 antwoorden in verschillende tonen: warm / zakelijk / speels.
        </p>
      )}

      {variants.map((v, i) => (
        <div
          key={i}
          className="group rounded-md border border-border bg-surface p-3 transition-colors hover:border-primary/40"
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {v.label}
            </span>
            <span className="text-[10px] text-muted-foreground">Sneltoets: {i + 1}</span>
          </div>
          <p className="text-sm">{v.text}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => onPick(v.text)}>
              Kopiëer naar veld
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => onSend(v.text)}>
              <Send className="h-3 w-3" /> Verstuur direct
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

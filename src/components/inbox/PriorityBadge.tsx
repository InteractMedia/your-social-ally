import { AlertTriangle, HelpCircle, Heart, ShoppingCart, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type Priority = "high" | "medium" | "low";
export type Intent = "question" | "complaint" | "purchase_intent" | "praise" | "spam" | "other";

const intentMeta: Record<Intent, { icon: typeof Star; label: string; color: string }> = {
  purchase_intent: { icon: ShoppingCart, label: "Koopintentie", color: "text-success border-success/40 bg-success/10" },
  complaint: { icon: AlertTriangle, label: "Klacht", color: "text-destructive border-destructive/40 bg-destructive/10" },
  question: { icon: HelpCircle, label: "Vraag", color: "text-primary border-primary/40 bg-primary/10" },
  praise: { icon: Heart, label: "Lof", color: "text-pink-500 border-pink-500/40 bg-pink-500/10" },
  spam: { icon: AlertTriangle, label: "Spam", color: "text-muted-foreground border-border bg-surface" },
  other: { icon: Star, label: "Overig", color: "text-muted-foreground border-border bg-surface" },
};

export function PriorityBadge({ intent, priority }: { intent: Intent; priority: Priority }) {
  const meta = intentMeta[intent];
  const Icon = meta.icon;
  const priorityDot =
    priority === "high" ? "bg-destructive" : priority === "medium" ? "bg-warning" : "bg-muted-foreground/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        meta.color,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot)} />
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

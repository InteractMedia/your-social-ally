import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  QUALITY_LABELS,
  STATUS_LABELS,
  funnelSteps,
  statusesForFunnel,
  type FunnelType,
  type LeadQuality,
} from "@/lib/leads-shared";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "customer_won" || status === "active_customer" || status === "first_order"
      ? "bg-success/15 text-success"
      : status === "customer_lost"
        ? "bg-destructive/10 text-destructive"
        : status === "hot"
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function QualityBadge({ quality }: { quality: string }) {
  const tone =
    quality === "hot"
      ? "bg-primary/15 text-primary"
      : quality === "qualified"
        ? "bg-success/15 text-success"
        : quality === "poor"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {quality === "hot" ? "🔥 Hot" : (QUALITY_LABELS[quality as LeadQuality] ?? quality)}
    </span>
  );
}

/** Funnel visualisation: reached steps get a check, later steps an open circle. */
export function FunnelProgress({ funnel, status }: { funnel: FunnelType; status: string }) {
  const steps = funnelSteps(funnel);
  const order = statusesForFunnel(funnel);
  const currentIndex = order.indexOf(status);
  const lost = status === "customer_lost";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => {
        const reached = !lost && currentIndex >= 0 && i <= steps.indexOf(order[currentIndex] as string);
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                reached ? "border-success/40 bg-success/10 text-foreground" : "border-border text-muted-foreground",
              )}
            >
              {reached ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              {STATUS_LABELS[step] ?? step}
            </div>
            {i < steps.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
          </div>
        );
      })}
      {lost && (
        <span className="text-destructive rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          Verloren
        </span>
      )}
    </div>
  );
}

export function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value}</p>
    </div>
  );
}

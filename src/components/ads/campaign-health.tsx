import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type CampaignHealthReason = { code: string; label: string; hint: string | null };
export type CampaignHealthData = {
  primaryStatus: string | null;
  label: string;
  severity: "ok" | "warn" | "error";
  reasons: CampaignHealthReason[];
};

const TONE: Record<CampaignHealthData["severity"], string> = {
  ok: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-600 border-amber-500/25",
  error: "bg-destructive/10 text-destructive border-destructive/25",
};

/** Compacte statuspil voor tabellen/lijsten. */
export function CampaignHealthBadge({ health }: { health?: CampaignHealthData | null }) {
  if (!health) return null;
  const count = health.reasons.length;
  return (
    <span
      title={count ? health.reasons.map((r) => r.label).join("\n") : health.label}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[health.severity]}`}
    >
      {health.severity === "ok" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {health.label}
      {count > 0 && health.severity !== "ok" ? ` · ${count}` : ""}
    </span>
  );
}

/** Volledige melding met alle redenen die Google Ads bij de campagne toont. */
export function CampaignHealthAlert({ health }: { health?: CampaignHealthData | null }) {
  if (!health) return null;
  if (health.severity === "ok" && health.reasons.length === 0) return null;
  const Icon = health.severity === "error" ? AlertTriangle : Info;
  return (
    <div className={`rounded-lg border p-4 ${TONE[health.severity]}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Leverstatus in Google Ads: {health.label}</p>
          {health.reasons.length === 0 ? (
            <p className="opacity-90">Google Ads geeft geen specifieke reden op.</p>
          ) : (
            <ul className="space-y-1.5">
              {health.reasons.map((r) => (
                <li key={r.code}>
                  <span className="font-medium">{r.label}</span>
                  {r.hint ? <span className="block opacity-80">{r.hint}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

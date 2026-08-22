/** Client-safe period presets + formatters shared by all ad platforms (Google, later LinkedIn/TikTok). */

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "custom";

export type Period = { preset: PeriodPreset; start: string; end: string };

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Vandaag",
  yesterday: "Gisteren",
  last_7_days: "Laatste 7 dagen",
  last_30_days: "Laatste 30 dagen",
  this_month: "Deze maand",
  last_month: "Vorige maand",
  custom: "Aangepaste periode",
};

export function resolvePeriod(preset: PeriodPreset, custom?: { start: string; end: string }): Period {
  const now = new Date();
  const day = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d;
  };
  switch (preset) {
    case "today":
      return { preset, start: iso(now), end: iso(now) };
    case "yesterday":
      return { preset, start: iso(day(-1)), end: iso(day(-1)) };
    case "last_7_days":
      return { preset, start: iso(day(-7)), end: iso(day(-1)) };
    case "last_30_days":
      return { preset, start: iso(day(-30)), end: iso(day(-1)) };
    case "this_month":
      return { preset, start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { preset, start: iso(first), end: iso(last) };
    }
    case "custom":
      return {
        preset,
        start: custom?.start || iso(day(-30)),
        end: custom?.end || iso(day(-1)),
      };
  }
}

/**
 * Lead reporting includes today: leads arrive in real time, unlike ad stats
 * which lag a day. Presets that end "yesterday" are extended to today.
 */
export function resolveLeadPeriod(
  preset: PeriodPreset,
  custom?: { start: string; end: string },
): Period {
  const period = resolvePeriod(preset, custom);
  if (preset === "yesterday" || preset === "last_month" || preset === "custom") return period;
  const today = iso(new Date());
  return period.end < today ? { ...period, end: today } : period;
}

export const formatMoney = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const formatInt = (n: number) =>
  new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

export const formatDec = (n: number, digits = 2) =>
  new Intl.NumberFormat("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    Number.isFinite(n) ? n : 0,
  );

export const formatPct = (n: number) => `${formatDec(n, 2)}%`;

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
}

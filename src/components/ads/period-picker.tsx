import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERIOD_LABELS,
  type Period,
  type PeriodPreset,
  resolveLeadPeriod,
  resolvePeriod,
} from "@/lib/ads-period";

const PRESETS: PeriodPreset[] = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "custom",
];

export function PeriodPicker({
  period,
  onChange,
  includeToday = false,
}: {
  period: Period;
  onChange: (next: Period) => void;
  /** Lead reporting includes today; ad reporting ends yesterday. */
  includeToday?: boolean;
}) {
  const resolve = includeToday ? resolveLeadPeriod : resolvePeriod;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={period.preset}
        onValueChange={(value) =>
          onChange(resolve(value as PeriodPreset, { start: period.start, end: period.end }))
        }
      >
        <SelectTrigger className="w-[190px]">
          <SelectValue placeholder="Periode" />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period.preset === "custom" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={period.start}
            max={period.end}
            className="w-[150px]"
            onChange={(e) => onChange({ ...period, start: e.target.value })}
          />
          <span className="text-muted-foreground text-sm">t/m</span>
          <Input
            type="date"
            value={period.end}
            min={period.start}
            className="w-[150px]"
            onChange={(e) => onChange({ ...period, end: e.target.value })}
          />
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">
          {period.start} t/m {period.end}
        </span>
      )}
    </div>
  );
}

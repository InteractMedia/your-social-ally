import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Info, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OFFLINE_EVENTS,
  VALUE_SOURCE_LABELS,
  type ValueSource,
} from "@/lib/google-conversions-shared";
import {
  getOfflineConversionConfig,
  saveOfflineMapping,
  setOfflineUploadMode,
} from "@/lib/google-conversions.functions";

type Draft = {
  actionId: string;
  enabled: boolean;
  valueSource: ValueSource;
  fixedValue: string;
  currency: string;
};

const NONE = "__none__";

export function OfflineConversionMapping() {
  const queryClient = useQueryClient();
  const configFn = useServerFn(getOfflineConversionConfig);
  const saveFn = useServerFn(saveOfflineMapping);
  const modeFn = useServerFn(setOfflineUploadMode);

  const query = useQuery({
    queryKey: ["offline-conversions", "config"],
    queryFn: () => configFn(),
  });

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!query.data) return;
    const next: Record<string, Draft> = {};
    for (const event of OFFLINE_EVENTS) {
      const m = query.data.mappings.find((x: any) => x.internal_event_name === event.key);
      next[event.key] = {
        actionId: m?.google_conversion_action_id ?? NONE,
        enabled: Boolean(m?.enabled),
        valueSource: (m?.value_source ?? "none") as ValueSource,
        fixedValue: m?.fixed_value != null ? String(m.fixed_value) : "",
        currency: m?.currency ?? query.data.currency ?? "EUR",
      };
    }
    setDrafts(next);
  }, [query.data]);

  const save = useMutation({
    mutationFn: async (eventKey: string) => {
      const d = drafts[eventKey];
      if (!d) return;
      const action = query.data?.actions.find((a: any) => a.id === d.actionId);
      return saveFn({
        data: {
          internal_event_name: eventKey,
          google_conversion_action_id: d.actionId === NONE ? null : d.actionId,
          google_conversion_action_name: action?.name ?? null,
          enabled: d.enabled && d.actionId !== NONE,
          value_source: d.valueSource,
          fixed_value: d.fixedValue ? Number(d.fixedValue) : null,
          currency: d.currency || "EUR",
          primary_signal:
            OFFLINE_EVENTS.find((e) => e.key === eventKey)?.advisedPrimary ?? false,
        },
      });
    },
    onSuccess: () => {
      toast.success("Mapping opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["offline-conversions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeMode = useMutation({
    mutationFn: (mode: "manual" | "automatic") => modeFn({ data: { mode } }),
    onSuccess: () => {
      toast.success("Uploadmodus bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["offline-conversions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offline Conversion Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const actions = query.data?.actions ?? [];
  const uploadable = actions.filter((a: any) => a.supportsOfflineUpload);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Offline Conversion Mapping</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Uploadmodus</Label>
            <Select
              value={query.data?.mode ?? "manual"}
              onValueChange={(v) => changeMode.mutate(v as "manual" | "automatic")}
            >
              <SelectTrigger className="h-8 w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Handmatige goedkeuring</SelectItem>
                <SelectItem value="automatic">Automatisch uploaden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Koppel elk SocialCockpit funnel-event aan een echte Google Ads conversion action. Er
          wordt niets geüpload zolang de schakelaar uit staat.
        </p>
        {query.data?.error ? (
          <p className="text-destructive text-sm">{query.data.error}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 p-0 pb-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">SocialCockpit event</TableHead>
                <TableHead className="min-w-[240px]">Google Ads conversion action</TableHead>
                <TableHead>Upload</TableHead>
                <TableHead className="min-w-[190px]">Waarde</TableHead>
                <TableHead className="text-right">Opslaan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OFFLINE_EVENTS.map((event) => {
                const d = drafts[event.key];
                if (!d) return null;
                return (
                  <TableRow key={event.key}>
                    <TableCell>
                      <p className="font-medium">{event.label}</p>
                      <p className="text-muted-foreground text-xs">{event.advice}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={d.actionId}
                        onValueChange={(v) =>
                          setDrafts((p) => ({ ...p, [event.key]: { ...d, actionId: v } }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecteer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Nog geen conversion action</SelectItem>
                          {uploadable.map((a: any) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {d.actionId === NONE ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Nog geen Google Ads conversion action gekoppeld.
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={d.enabled}
                        disabled={d.actionId === NONE}
                        onCheckedChange={(v) =>
                          setDrafts((p) => ({ ...p, [event.key]: { ...d, enabled: v } }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={d.valueSource}
                          onValueChange={(v) =>
                            setDrafts((p) => ({
                              ...p,
                              [event.key]: { ...d, valueSource: v as ValueSource },
                            }))
                          }
                        >
                          <SelectTrigger className="h-9 w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(VALUE_SOURCE_LABELS) as ValueSource[]).map((v) => (
                              <SelectItem key={v} value={v}>
                                {VALUE_SOURCE_LABELS[v]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {d.valueSource !== "none" ? (
                          <Input
                            className="h-9 w-24"
                            inputMode="decimal"
                            placeholder={d.valueSource === "fixed" ? "bedrag" : "fallback"}
                            value={d.fixedValue}
                            onChange={(e) =>
                              setDrafts((p) => ({
                                ...p,
                                [event.key]: { ...d, fixedValue: e.target.value },
                              }))
                            }
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={save.isPending}
                        onClick={() => save.mutate(event.key)}
                      >
                        <Save className="mr-1 h-3.5 w-3.5" /> Opslaan
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mx-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Info className="h-4 w-4" /> Ontbreekt er een conversion action?
          </p>
          <p className="text-muted-foreground mt-1">
            Offline conversies kunnen alleen naar een conversion action van het type{" "}
            <span className="font-medium text-foreground">Import · klikken uploaden</span>. Maak die
            aan in Google Ads (Doelen → Conversies → Nieuwe conversieactie → Importeren → Handmatig
            via CSV/API) en klik daarna hierboven op vernieuwen. SocialCockpit maakt zelf nooit
            zonder jouw bevestiging iets aan in je Google Ads-account.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {uploadable.length} uploadbare van {actions.length} conversieacties
            </Badge>
            <Button asChild size="sm" variant="ghost">
              <a
                href="https://ads.google.com/aw/conversions"
                target="_blank"
                rel="noreferrer noopener"
              >
                Google Ads conversies <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["offline-conversions"] })}
            >
              Synchroniseren
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

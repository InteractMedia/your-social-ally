import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CloudUpload, SkipForward } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatMoney } from "@/lib/ads-period";
import {
  CLICK_ID_LABELS,
  OFFLINE_EVENT_LABELS,
  UPLOAD_STATUS_LABELS,
  reasonLabel,
} from "@/lib/google-conversions-shared";
import {
  approveOfflineConversions,
  getOfflineConversionQueue,
  skipOfflineConversions,
} from "@/lib/google-conversions.functions";

type Tab = "pending" | "uploaded" | "failed" | "skipped";

const TAB_LABELS: Record<Tab, string> = {
  pending: "Wachtend",
  uploaded: "Geüpload",
  failed: "Mislukt",
  skipped: "Overgeslagen",
};

export function OfflineConversionQueue() {
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const queueFn = useServerFn(getOfflineConversionQueue);
  const approveFn = useServerFn(approveOfflineConversions);
  const skipFn = useServerFn(skipOfflineConversions);

  const query = useQuery({
    queryKey: ["offline-conversions", "queue", tab],
    queryFn: () => queueFn({ data: { tab } }),
  });

  const items = query.data?.items ?? [];

  const refresh = () => {
    setSelected([]);
    queryClient.invalidateQueries({ queryKey: ["offline-conversions"] });
  };

  const approve = useMutation({
    mutationFn: (ids: string[]) => approveFn({ data: { ids } }),
    onSuccess: (res) => {
      toast.success(
        `${res.uploaded} geüpload · ${res.failed} mislukt · ${res.skipped} niet uploadbaar`,
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const skip = useMutation({
    mutationFn: (ids: string[]) => skipFn({ data: { ids } }),
    onSuccess: () => {
      toast.success("Overgeslagen");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const eligibleIds = items.filter((i: any) => i.eligible).map((i: any) => i.id);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Offline conversies naar Google Ads</CardTitle>
          <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelected([]); }}>
            <TabsList>
              {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                <TabsTrigger key={t} value={t}>
                  {TAB_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {tab === "pending" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={eligibleIds.length === 0}
              onClick={() => setSelected(selected.length === eligibleIds.length ? [] : eligibleIds)}
            >
              {selected.length === eligibleIds.length && eligibleIds.length > 0
                ? "Selectie wissen"
                : "Selecteer alles"}
            </Button>
            <Button
              size="sm"
              disabled={selected.length === 0 || approve.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              <CloudUpload className="mr-1 h-4 w-4" /> Upload geselecteerde ({selected.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={selected.length === 0 || skip.isPending}
              onClick={() => skip.mutate(selected)}
            >
              <SkipForward className="mr-1 h-4 w-4" /> Overslaan
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : query.data?.error ? (
          <p className="text-destructive p-4 text-sm">{query.data.error}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {tab === "pending"
              ? "Geen conversies wachten op upload."
              : "Nog geen conversies in dit overzicht."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {tab === "pending" ? <TableHead className="w-8" /> : null}
                  <TableHead>Datum</TableHead>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Conversion action</TableHead>
                  <TableHead>Click-ID</TableHead>
                  <TableHead className="text-right">Waarde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploadtijd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    {tab === "pending" ? (
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(item.id)}
                          disabled={!item.eligible}
                          onCheckedChange={() => toggle(item.id)}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(item.occurredAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.company}
                      {item.isTest ? (
                        <Badge className="ml-2" variant="outline">
                          test
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {OFFLINE_EVENT_LABELS[item.event] ?? item.event}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.actionName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.clickMasked
                        ? `${CLICK_ID_LABELS[item.clickType ?? ""] ?? "Click-ID"}: ${item.clickMasked}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.value == null ? "—" : formatMoney(item.value)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={
                            item.status === "uploaded"
                              ? "default"
                              : item.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {UPLOAD_STATUS_LABELS[item.status] ?? item.status}
                        </Badge>
                        {reasonLabel(item.reason) ? (
                          <p className="text-muted-foreground max-w-[240px] text-xs">
                            {reasonLabel(item.reason)}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {item.uploadedAt ? formatDateTime(item.uploadedAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conversies uploaden naar Google Ads</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt {selected.length} offline{" "}
              {selected.length === 1 ? "conversie" : "conversies"} naar Google Ads te uploaden. Dit
              kan niet worden teruggedraaid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                approve.mutate(selected);
              }}
            >
              {selected.length} {selected.length === 1 ? "conversie" : "conversies"} uploaden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

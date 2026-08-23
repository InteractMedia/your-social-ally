import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatMoney } from "@/lib/ads-period";
import {
  CLICK_ID_LABELS,
  OFFLINE_EVENT_LABELS,
  PROCESSING_STATUS_LABELS,
  UPLOAD_STATUS_LABELS,
  reasonLabel,
} from "@/lib/google-conversions-shared";

import { getLeadOfflineConversions } from "@/lib/google-conversions.functions";

export function LeadGoogleConversions({ leadId }: { leadId: string }) {
  const fn = useServerFn(getLeadOfflineConversions);
  const query = useQuery({
    queryKey: ["offline-conversions", "lead", leadId],
    queryFn: () => fn({ data: { leadId } }),
  });

  const events = query.data?.events ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google Ads conversies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </>
        ) : query.data?.error ? (
          <p className="text-destructive text-sm">{query.data.error}</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nog geen conversie-events voor deze lead.
          </p>
        ) : (
          events.map((e: any) => (
            <div key={e.id} className="border-b pb-3 text-sm last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {OFFLINE_EVENT_LABELS[e.conversion_event] ?? e.conversion_event}
                </p>
                <Badge
                  variant={
                    e.google_upload_status === "uploaded"
                      ? "default"
                      : e.google_upload_status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {UPLOAD_STATUS_LABELS[e.google_upload_status ?? "pending"] ??
                    e.google_upload_status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatDateTime(e.conversion_timestamp)}
                {e.google_conversion_action_name ? ` · ${e.google_conversion_action_name}` : ""}
                {e.google_conversion_value != null
                  ? ` · ${formatMoney(Number(e.google_conversion_value))}`
                  : ""}
                {e.click_identifier_type
                  ? ` · ${CLICK_ID_LABELS[e.click_identifier_type] ?? e.click_identifier_type}`
                  : " · geen click-ID"}
                {e.google_upload_timestamp
                  ? ` · verzonden ${formatDateTime(e.google_upload_timestamp)}`
                  : ""}
              </p>
              {e.google_processing_status ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {PROCESSING_STATUS_LABELS[e.google_processing_status] ??
                    e.google_processing_status}
                  {e.google_processing_checked_at
                    ? ` · gecheckt ${formatDateTime(e.google_processing_checked_at)}`
                    : ""}
                  {e.google_request_id ? ` · verzoek ${e.google_request_id}` : ""}
                </p>
              ) : null}

              {reasonLabel(e.google_upload_reason) ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {reasonLabel(e.google_upload_reason)}
                </p>
              ) : null}
              {e.google_upload_error ? (
                <p className="text-destructive mt-1 text-xs">{e.google_upload_error}</p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

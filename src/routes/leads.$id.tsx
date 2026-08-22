import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Euro } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CustomerValueDialog } from "@/components/leads/customer-value-dialog";
import { PoorReasonDialog } from "@/components/leads/poor-reason-dialog";
import { Field, FunnelProgress, QualityBadge, StatusBadge } from "@/components/leads/lead-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatMoney } from "@/lib/ads-period";
import {
  ATTRIBUTION_MODEL,
  QUALITY_LABELS,
  STATUS_LABELS,
  funnelForStatus,
  statusesForFunnel,
  type FunnelType,
} from "@/lib/leads-shared";
import {
  getLead,
  updateLeadNotes,
  updateLeadQuality,
  updateLeadStatus,
} from "@/lib/leads.functions";

export const Route = createFileRoute("/leads/$id")({ component: LeadDetailPage });

function LeadDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const getFn = useServerFn(getLead);
  const statusFn = useServerFn(updateLeadStatus);
  const qualityFn = useServerFn(updateLeadQuality);
  const notesFn = useServerFn(updateLeadNotes);

  const [notes, setNotes] = useState("");
  const [valueOpen, setValueOpen] = useState(false);

  const query = useQuery({
    queryKey: ["leads", "detail", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const lead = query.data?.lead as any;

  useEffect(() => {
    if (lead) setNotes(lead.notes ?? "");
  }, [lead?.id, lead?.notes]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const setStatus = useMutation({
    mutationFn: (status: string) => statusFn({ data: { id, status } }),
    onSuccess: () => {
      toast.success("Status bijgewerkt");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const setQuality = useMutation({
    mutationFn: (quality: string) => qualityFn({ data: { id, quality } }),
    onSuccess: () => {
      toast.success("Leadkwaliteit bijgewerkt");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveNotes = useMutation({
    mutationFn: () => notesFn({ data: { id, notes } }),
    onSuccess: () => {
      toast.success("Notitie opgeslagen");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }
  if (!lead) {
    return (
      <AppShell>
        <PageHeader title="Lead niet gevonden" />
        <Button asChild variant="outline" size="sm">
          <Link to="/leads">
            <ArrowLeft className="mr-1 h-4 w-4" /> Terug naar leads
          </Link>
        </Button>
      </AppShell>
    );
  }

  const funnel: FunnelType = (lead.funnel_type as FunnelType) ?? funnelForStatus(lead.status);
  const activities = query.data?.activities ?? [];
  const conversions = query.data?.conversions ?? [];

  return (
    <AppShell>
      <PageHeader
        title={lead.company_name}
        subtitle={`Ontvangen ${formatDateTime(lead.received_at)} · attributie: laatste niet-directe klik (${ATTRIBUTION_MODEL})`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/leads">
                <ArrowLeft className="mr-1 h-4 w-4" /> Alle leads
              </Link>
            </Button>
            <Button size="sm" onClick={() => setValueOpen(true)}>
              <Euro className="mr-1.5 h-4 w-4" /> Klantwaarde
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Funnel & kwaliteit</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={lead.status} />
              <QualityBadge quality={lead.lead_quality} />
              <Select value={lead.status} onValueChange={(v) => setStatus.mutate(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusesForFunnel(funnel).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={lead.lead_quality} onValueChange={(v) => setQuality.mutate(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUALITY_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <FunnelProgress funnel={funnel} status={lead.status} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bedrijf & contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Bedrijf" value={lead.company_name} />
              <Field label="Branche" value={lead.industry_name} />
              <Field label="Contactpersoon" value={lead.contact_name} />
              <Field label="E-mail" value={lead.email} />
              <Field label="Telefoon" value={lead.phone} />
              <Field label="Website" value={lead.website} />
              <Field label="Domein" value={lead.company_domain} />
              <Field label="Bedrijfsgrootte" value={lead.company_size} />
              <Field label="KvK-nummer" value={lead.kvk_number} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Marketingherkomst</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Platform" value={lead.platform} />
              <Field label="Campagne" value={lead.campaign_name ?? lead.campaign_id} />
              <Field label="Advertentiegroep" value={lead.ad_group_name} />
              <Field label="Zoekwoord" value={lead.keyword} />
              <Field label="Zoekterm" value={lead.search_term} />
              <Field label="Matchtype" value={lead.match_type} />
              <Field label="Landingspagina" value={lead.landing_page} />
              <Field label="Referrer" value={lead.referrer} />
              <Field label="utm_source" value={lead.utm_source} />
              <Field label="utm_medium" value={lead.utm_medium} />
              <Field label="utm_campaign" value={lead.utm_campaign} />
              <Field label="utm_content" value={lead.utm_content} />
              <Field label="utm_term" value={lead.utm_term} />
              <Field label="gclid" value={lead.gclid} />
              <Field label="gbraid" value={lead.gbraid} />
              <Field label="wbraid" value={lead.wbraid} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Klant & omzet</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Klant geworden" value={lead.became_customer ? "Ja" : "Nee"} />
              <Field label="Klantdatum" value={lead.customer_date} />
              <Field
                label="Omzet"
                value={lead.revenue != null ? formatMoney(Number(lead.revenue)) : null}
              />
              <Field
                label="Brutomarge"
                value={
                  lead.gross_margin != null ? formatMoney(Number(lead.gross_margin)) : null
                }
              />
              <Field
                label="Verwachte waarde"
                value={
                  lead.expected_value != null ? formatMoney(Number(lead.expected_value)) : null
                }
              />
              <Field
                label="Lifetime value"
                value={
                  lead.lifetime_value != null ? formatMoney(Number(lead.lifetime_value)) : null
                }
              />
              <Field label="Eerste bestelling" value={lead.first_order_date} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gespreksnotities, wensen, vervolgstappen…"
              />
              <Button
                size="sm"
                onClick={() => saveNotes.mutate()}
                disabled={saveNotes.isPending}
              >
                Notitie opslaan
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nog geen activiteit vastgelegd.</p>
              ) : (
                activities.map((a: any) => (
                  <div key={a.id} className="border-b pb-2 text-sm last:border-0 last:pb-0">
                    <p className="font-medium">{a.description ?? a.event_type}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(a.created_at)}
                      {a.actor_label ? ` · ${a.actor_label}` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversie-events (offline upload)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nog geen conversie-events. Deze worden automatisch vastgelegd bij Qualified, Hot,
                  Offerte uitgebracht en Klant geworden — klaar om later naar Google Ads te uploaden.
                </p>
              ) : (
                conversions.map((c: any) => (
                  <div key={c.id} className="border-b pb-2 text-sm last:border-0 last:pb-0">
                    <p className="font-medium">{c.conversion_event}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(c.conversion_timestamp)}
                      {c.value != null ? ` · ${formatMoney(Number(c.value))}` : ""} ·{" "}
                      {c.uploaded_to_google ? "geüpload naar Google Ads" : "wacht op upload"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CustomerValueDialog leadId={id} open={valueOpen} onOpenChange={setValueOpen} />
    </AppShell>
  );
}

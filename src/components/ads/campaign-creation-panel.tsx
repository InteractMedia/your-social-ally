/**
 * Google Ads Execution V1 — de enige plek waar een concept écht wordt
 * aangemaakt. Twee bewuste stappen: eerst de definitieve samenvatting bekijken,
 * daarna de campagnenaam typen en aanmaken. Niets gebeurt automatisch.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Rocket, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createDraftInGoogleAds,
  listGoogleAdsChangeLog,
  previewDraftCreation,
} from "@/lib/campaign-creation.functions";
import { changeLogStatusLabel, type CreationPlan } from "@/lib/campaign-creation-shared";
import type { SearchCampaignDraftRow } from "@/lib/campaign-builder-shared";

export function CampaignCreationPanel({ draft }: { draft: SearchCampaignDraftRow }) {
  const qc = useQueryClient();
  const previewFn = useServerFn(previewDraftCreation);
  const createFn = useServerFn(createDraftInGoogleAds);
  const logFn = useServerFn(listGoogleAdsChangeLog);

  const [plan, setPlan] = useState<CreationPlan | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const logQuery = useQuery({
    queryKey: ["ads-change-log", draft.id],
    queryFn: () => logFn({ data: { draftId: draft.id, limit: 20 } }),
  });

  const preview = useMutation({
    mutationFn: () => previewFn({ data: { id: draft.id } }),
    onSuccess: (res: any) => {
      if (!res.ok) return toast.error(res.error ?? "Samenvatting mislukt");
      setPlan(res.plan as CreationPlan);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: { id: draft.id, confirmCampaignName: (plan?.campaignName ?? confirmName).trim() },
      }),
    onSuccess: (res: any) => {
      if (!res.ok) return toast.error(res.error ?? "Aanmaken mislukt");
      toast.success("Campagne aangemaakt in Google Ads — gepauzeerd gestart");
      setConfirmName("");
      qc.invalidateQueries({ queryKey: ["builder-draft", draft.id] });
      qc.invalidateQueries({ queryKey: ["builder-drafts"] });
      qc.invalidateQueries({ queryKey: ["ads-change-log", draft.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const created = Boolean(draft.google_campaign_id);
  const approved = draft.status === "APPROVED_FOR_CREATION";
  const nameMatches = plan
    ? confirmName.trim().toLowerCase() === plan.campaignName.trim().toLowerCase()
    : false;
  const canCreate = Boolean(plan && plan.blockers.length === 0 && nameMatches && !create.isPending);

  return (
    <Card id="campaign-creation" className="scroll-mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-4 w-4" /> Aanmaken in Google Ads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {created ? (
          <div className="space-y-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4" /> Aangemaakt in Google Ads (gepauzeerd gestart)
            </p>
            <p className="text-muted-foreground">
              Campagne-ID {draft.google_campaign_id} · account {draft.google_customer_id} ·{" "}
              {draft.created_in_google_at?.slice(0, 16).replace("T", " ")}
            </p>
            <p className="text-muted-foreground">
              Er worden hierna geen wijzigingen automatisch doorgevoerd. Activeren doe je bewust, in
              Google Ads of via een goedgekeurd advies.
            </p>
            <a
              className="inline-flex items-center gap-1 underline"
              href={`https://ads.google.com/aw/campaigns?campaignId=${draft.google_campaign_id}`}
              target="_blank"
              rel="noreferrer"
            >
              Openen in Google Ads <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {approved
                ? "Bekijk eerst de definitieve samenvatting. Daarna typ je de campagnenaam om te bevestigen; pas dan wordt de campagne aangemaakt — altijd gepauzeerd."
                : "Alleen een goedgekeurd concept kan worden aangemaakt. Keur het concept eerst goed."}
            </p>
            {draft.creation_error ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
                Vorige poging mislukt: {draft.creation_error}
              </p>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => preview.mutate()}
              disabled={!approved || preview.isPending}
            >
              {preview.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Toon definitieve samenvatting
            </Button>

            {plan ? (
              <div className="space-y-3 rounded-md border p-3 text-xs">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Account {plan.customerName ?? plan.customerId}</Badge>
                  <Badge variant="outline">Start gepauzeerd</Badge>
                  <Badge variant="outline">
                    {plan.currency} {plan.dailyBudget}/dag
                  </Badge>
                  <Badge variant="outline">{plan.locationOption}</Badge>
                </div>
                <table className="w-full">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium">Onderdeel</th>
                      <th className="text-left font-medium">Nu</th>
                      <th className="text-left font-medium">Wordt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.steps.map((s, i) => (
                      <tr key={i} className="border-t align-top">
                        <td className="py-1 pr-2 font-medium">{s.label}</td>
                        <td className="py-1 pr-2 text-muted-foreground">{s.before}</td>
                        <td className="py-1">{s.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {plan.warnings.length ? (
                  <ul className="list-disc space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 pl-6">
                    {plan.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                {plan.blockers.length ? (
                  <ul className="list-disc space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2 pl-6">
                    {plan.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium">
                      Typ de campagnenaam om te bevestigen: {plan.campaignName}
                    </p>
                    <Input
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={plan.campaignName}
                    />
                    <Button size="sm" onClick={() => create.mutate()} disabled={!canCreate}>
                      {create.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Rocket className="mr-1 h-4 w-4" />
                      )}
                      Definitief aanmaken in Google Ads
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}

        <details className="rounded-md border p-3 text-xs">
          <summary className="cursor-pointer font-medium">Wijzigingslogboek</summary>
          {logQuery.data?.rows?.length ? (
            <ul className="mt-2 space-y-2">
              {(logQuery.data.rows as any[]).map((r) => (
                <li key={r.id} className="border-t pt-2">
                  <span className="font-medium">{r.change_type}</span> ·{" "}
                  {changeLogStatusLabel(r.status)} · {r.created_at?.slice(0, 16).replace("T", " ")}
                  {r.google_error ? (
                    <span className="text-destructive"> — {r.google_error}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted-foreground">Nog geen schrijfacties gelogd.</p>
          )}
        </details>
      </CardContent>
    </Card>
  );
}

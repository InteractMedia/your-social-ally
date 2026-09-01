import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  PencilLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";


import { AdsEmpty, AdsError, AdsLoading } from "@/components/ads/ads-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/ads-period";
import {
  ADVICE_STATUS_LABELS,
  CONFIDENCE_LABELS,
  REJECTION_REASONS,
  RISK_LABELS,
  adviceTone,
  adviceTypeLabel,
  type AdviceRow,
  type ConfidenceLevel,
} from "@/lib/ai-analyst-shared";
import {
  EXECUTION_ELIGIBILITY_LABELS,
  isWriteAction,
  type ExecutionEligibility,
} from "@/lib/ai-execution-guardrails";
import { executeAiAdvice, listAiAdvice, reviewAiAdvice } from "@/lib/ai-ads.functions";
import { isExecutableAdviceType } from "@/lib/ai-analyst-shared";

type StatusFilter = "new" | "approved" | "rejected" | "all";

function ConfidenceBadge({ score, level }: { score: number; level: string }) {
  const tone =
    level === "high"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : level === "medium"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", tone)}>
      {CONFIDENCE_LABELS[level as ConfidenceLevel] ?? level} · {score}%
    </span>
  );
}

function EvidenceList({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  const items = Array.isArray(value)
    ? value.map((v) => String(v))
    : typeof value === "object"
      ? Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`)
      : [String(value)];
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

const ELIGIBILITY_TONE: Record<ExecutionEligibility, string> = {
  ALLOWED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REVIEW_ONLY: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  BLOCKED: "border-destructive/40 bg-destructive/10 text-destructive",
};

/** AI-betrouwbaarheid, databetrouwbaarheid en server-side uitvoerbaarheid apart. */
function GuardrailPanel({ advice }: { advice: AdviceRow }) {
  const eligibility = (advice.execution_eligibility ?? "REVIEW_ONLY") as ExecutionEligibility;
  const dataLevel = (advice.data_confidence_level ?? "low") as ConfidenceLevel;
  const dataScore = advice.data_confidence_score ?? 0;

  return (
    <div className={cn("space-y-1 rounded-md border p-2.5 text-xs", ELIGIBILITY_TONE[eligibility])}>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-medium">
        <span>AI betrouwbaarheid: {advice.confidence_score}%</span>
        <span>
          Databetrouwbaarheid: {CONFIDENCE_LABELS[dataLevel] ?? dataLevel} ({dataScore}%)
        </span>
        <span className="flex items-center gap-1">
          {eligibility === "BLOCKED" ? (
            <Lock className="h-3.5 w-3.5" />
          ) : eligibility === "ALLOWED" ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5" />
          )}
          Uitvoerbaarheid: {EXECUTION_ELIGIBILITY_LABELS[eligibility]}
        </span>
      </div>
      {advice.execution_block_reason_label && (
        <div className="opacity-90">Reden: {advice.execution_block_reason_label}</div>
      )}
      {Array.isArray(advice.execution_blockers) && advice.execution_blockers.length > 1 && (
        <ul className="mt-1 space-y-0.5 opacity-80">
          {(advice.execution_blockers as any[]).slice(1).map((b, i) => (
            <li key={i}>• {b?.label ?? b?.code}</li>
          ))}
        </ul>
      )}
      <div className="opacity-75">
        Server-side beoordeeld — AI-betrouwbaarheid kan een blokkade niet opheffen. Uitvoeren is
        later uitsluitend mogelijk bij UITVOERBAAR.
      </div>
    </div>
  );
}

const ENTITY_LABELS: Record<string, string> = {
  campaign: "Campagne",
  ad_group: "Advertentiegroep",
  keyword: "Zoekwoord",
  search_term: "Zoekterm",
  landing_page: "Landingspagina",
  industry: "Branche",
  account: "Account",
};

function AdviceCard({
  advice,
  onApprove,
  onReject,
  onExecute,
  landingPageHref,
  busy,
}: {
  advice: AdviceRow;
  onApprove: () => void;
  onReject: () => void;
  onExecute?: () => void;
  landingPageHref?: string | null;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isNew = advice.status === "new";
  const isLanding = advice.entity_type === "landing_page";
  const write = !isLanding && isWriteAction(advice.advice_type);
  const blocked = (advice.execution_eligibility ?? "REVIEW_ONLY") === "BLOCKED";


  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-border pb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Advies van
          </span>
          <span className="text-sm font-bold text-foreground">
            {formatDateTime(advice.created_at)}
          </span>
          {advice.is_test && (
            <Badge variant="outline" className="text-[11px]">
              Test
            </Badge>
          )}
          {advice.entity_name && (
            <Badge
              variant="secondary"
              className="ml-auto gap-1 text-[12px] font-semibold"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {ENTITY_LABELS[advice.entity_type ?? ""] ?? advice.entity_type ?? "Onderdeel"}:
              </span>

              <span className="text-foreground">{advice.entity_name}</span>
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                  adviceTone(advice.advice_type),
                )}
              >
                {adviceTypeLabel(advice.advice_type)}
              </span>
              <ConfidenceBadge score={advice.confidence_score} level={advice.confidence_level} />
              <Badge variant="outline" className="text-[11px]">
                {RISK_LABELS[advice.risk_level] ?? advice.risk_level}
              </Badge>
              {!isNew && (
                <Badge variant="secondary" className="text-[11px]">
                  {ADVICE_STATUS_LABELS[advice.status as keyof typeof ADVICE_STATUS_LABELS] ?? advice.status}
                </Badge>
              )}
            </div>
            <div className="font-medium leading-snug">{advice.title}</div>
            <p className="mt-2 text-sm text-muted-foreground">{advice.summary}</p>
          </div>

          {isNew && (
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex gap-2">
                <Button size="sm" onClick={onApprove} disabled={busy} variant={write ? "default" : "secondary"}>
                  {write ? (
                    <>
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Goedkeuren voor uitvoering
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Advies accepteren
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
                  <X className="mr-1 h-3.5 w-3.5" /> Afwijzen
                </Button>
              </div>
              <span className="max-w-[15rem] text-right text-[10px] leading-tight text-muted-foreground">
                {isLanding
                  ? "Landingspagina-advies: na accepteren pas je de pagina hier zelf aan."
                  : write
                    ? blocked
                      ? "Uitvoering is server-side geblokkeerd. Goedkeuren legt alleen je intentie vast."
                      : "Na goedkeuring voer je de wijziging hier zelf uit; er gebeurt nooit iets automatisch."
                    : "Inhoudelijk advies: hier hoort geen uitvoering in Google Ads bij."}
              </span>
            </div>
          )}
        </div>

        {isLanding ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs">
            <span>
              {landingPageHref
                ? "Dit advies gaat over je eigen landingspagina, niet over een Google Ads-campagne. Je kunt de pagina direct bewerken."
                : "Dit advies gaat over je eigen landingspagina, niet over een Google Ads-campagne. De bijbehorende pagina kon niet worden gevonden."}
            </span>
            {landingPageHref && (
              <Button size="sm" asChild>
                <Link to={landingPageHref}>
                  <PencilLine className="mr-1 h-3.5 w-3.5" /> Landingspagina bewerken
                </Link>
              </Button>
            )}
          </div>
        ) : advice.status === "approved" && isExecutableAdviceType(advice.advice_type) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs">
            <span>
              {(advice.execution_eligibility ?? "REVIEW_ONLY") === "ALLOWED"
                ? "Goedgekeurd. Je kunt deze wijziging nu in Google Ads uitvoeren; alles wordt gelogd."
                : "Goedgekeurd, maar server-side niet uitvoerbaar. Deze wijziging blijft advies."}
            </span>
            <Button
              size="sm"
              onClick={onExecute}
              disabled={busy || (advice.execution_eligibility ?? "REVIEW_ONLY") !== "ALLOWED"}
            >
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Uitvoeren in Google Ads
            </Button>
          </div>
        ) : null}


        <GuardrailPanel advice={advice} />

        {advice.expected_impact && (
          <div className="rounded-md border border-border bg-surface p-2.5 text-xs">
            <span className="font-medium">Verwachte impact: </span>
            <span className="text-muted-foreground">{advice.expected_impact}</span>
          </div>
        )}

        {advice.guardrail_notes && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>{advice.guardrail_notes}</span>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          {open ? "Details verbergen" : "Onderbouwing & voorgestelde actie"}
        </button>

        {open && (
          <div className="grid gap-3 border-t border-border pt-3 text-sm md:grid-cols-2">
            {advice.reasoning && (
              <div className="md:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Onderbouwing
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{advice.reasoning}</p>
              </div>
            )}
            {advice.proposed_action && (
              <div className="md:col-span-2 rounded-md border border-border bg-surface p-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Voorstel (wordt niet automatisch uitgevoerd)
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs">{advice.proposed_action}</p>
              </div>
            )}
            <EvidenceList label="Cijfers" value={advice.evidence} />
            <EvidenceList label="Gebruikte data" value={advice.data_available} />
            <EvidenceList label="Ontbrekende data" value={advice.data_missing} />
            <EvidenceList label="Details voorstel" value={advice.proposed_payload} />
            <div className="md:col-span-2 text-[11px] text-muted-foreground">
              {advice.model_provider} · {advice.model_name} · {advice.prompt_version} ·{" "}
              {advice.analysis_period_start} t/m {advice.analysis_period_end} ·{" "}
              {formatDateTime(advice.created_at)}
              {advice.rejection_reason && ` · afgewezen: ${advice.rejection_reason}`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdviceInbox({ minConfidence = 0 }: { minConfidence?: number }) {
  const [status, setStatus] = useState<StatusFilter>("new");
  const [rejecting, setRejecting] = useState<AdviceRow | null>(null);
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  const listFn = useServerFn(listAiAdvice);
  const reviewFn = useServerFn(reviewAiAdvice);
  const executeFn = useServerFn(executeAiAdvice);

  // Execution V1: pas na expliciete menselijke goedkeuring én deze klik.
  const execute = useMutation({
    mutationFn: (adviceId: string) => executeFn({ data: { adviceId } }),
    onSuccess: (res: any) => {
      if (!res.ok) return toast.error(res.error ?? "Uitvoeren mislukt");
      toast.success("Wijziging uitgevoerd in Google Ads en gelogd");
      qc.invalidateQueries({ queryKey: ["ai-advice"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const query = useQuery({
    queryKey: ["ai-advice", status],
    queryFn: () => listFn({ data: { status, includeTest: false } }),
  });

  const review = useMutation({
    mutationFn: (input: {
      adviceId: string;
      decision: "approved" | "rejected";
      rejectionReason?: string;
      rejectionNotes?: string;
    }) => reviewFn({ data: input }),
    onSuccess: (res, input) => {
      if (!res.ok) {
        toast.error(res.error ?? "Beoordelen mislukt");
        return;
      }
      toast.success(input.decision === "approved" ? "Advies goedgekeurd" : "Advies afgewezen");
      setRejecting(null);
      setReason("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["ai-advice"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allAdvice = ((query.data?.advice ?? []) as AdviceRow[]).slice().sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
  const counts = query.data?.counts;
  const highlighted = allAdvice.filter((a) => a.confidence_score >= minConfidence);
  const rest = allAdvice.filter((a) => a.confidence_score < minConfidence);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> Adviesinbox
          {counts && (
            <span className="text-xs font-normal text-muted-foreground">
              {counts.new} nieuw · {counts.approved} goedgekeurd · {counts.rejected} afgewezen
            </span>
          )}
        </CardTitle>
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="new">Nieuw</TabsTrigger>
            <TabsTrigger value="approved">Goedgekeurd</TabsTrigger>
            <TabsTrigger value="rejected">Afgewezen</TabsTrigger>
            <TabsTrigger value="all">Alles</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-3">
        {query.isLoading ? (
          <AdsLoading label="Adviezen ophalen…" />
        ) : query.data?.error ? (
          <AdsError
            message={query.data.error}
            onRetry={() => qc.invalidateQueries({ queryKey: ["ai-advice"] })}
          />
        ) : allAdvice.length === 0 ? (
          <AdsEmpty
            title="Nog geen adviezen"
            description="Start een analyse om voorstellen te laten genereren op basis van je Google Ads- en leaddata."
          />
        ) : (
          <>
            {highlighted.map((a) => (
              <AdviceCard
                key={a.id}
                advice={a}
                busy={review.isPending || execute.isPending}
                onExecute={() => execute.mutate(a.id)}
                onApprove={() => review.mutate({ adviceId: a.id, decision: "approved" })}
                onReject={() => {
                  setRejecting(a);
                  setReason("");
                  setNotes("");
                }}
              />
            ))}

            {rest.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Lagere betrouwbaarheid dan {minConfidence}% ({rest.length})
                </div>
                {rest.map((a) => (
                  <AdviceCard
                    key={a.id}
                    advice={a}
                    busy={review.isPending || execute.isPending}
                    onExecute={() => execute.mutate(a.id)}
                    onApprove={() => review.mutate({ adviceId: a.id, decision: "approved" })}
                    onReject={() => {
                      setRejecting(a);
                      setReason("");
                      setNotes("");
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advies afwijzen</DialogTitle>
            <DialogDescription>
              Je reden helpt de analyse scherper te maken en wordt vastgelegd in het logboek.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-surface p-2.5 text-xs">
              {rejecting?.title}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reden</Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {REJECTION_REASONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setReason(r.key)}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
                      reason === r.key
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Toelichting (optioneel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none bg-surface"
                placeholder="Waarom past dit advies niet?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Annuleren
            </Button>
            <Button
              disabled={!reason || review.isPending}
              onClick={() =>
                rejecting &&
                review.mutate({
                  adviceId: rejecting.id,
                  decision: "rejected",
                  rejectionReason: reason,
                  rejectionNotes: notes || undefined,
                })
              }
            >
              {review.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

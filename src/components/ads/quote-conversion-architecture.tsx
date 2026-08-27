import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { reasonLabel } from "@/lib/google-conversions-shared";
import { getQuoteConversionArchitecture } from "@/lib/google-conversions.functions";

const BLOCKER_LABELS: Record<string, string> = {
  google_action_missing: "Conversieactie bestaat nog niet in Google Ads (moet aangemaakt worden).",
};

function blockerLabel(key: string) {
  return BLOCKER_LABELS[key] ?? reasonLabel(key) ?? key;
}

/**
 * Read-only overzicht van de generieke offerte-conversiearchitectuur.
 * Deze kaart wijzigt nooit iets in Google Ads.
 */
export function QuoteConversionArchitecture() {
  const fn = useServerFn(getQuoteConversionArchitecture);
  const query = useQuery({
    queryKey: ["quote-conversion-architecture"],
    queryFn: () => fn(),
  });

  const data = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" /> Offerte-conversiearchitectuur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Eén generieke structuur voor álle branche-landingspages. Branche, campagne,
          landingspagina, variant en click-ID blijven dimensies van de lead — er komen geen
          aparte Google-conversies per branche.
        </p>

        {query.isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : !data ? (
          <p className="text-destructive text-sm">Architectuur kon niet worden geladen.</p>
        ) : (
          <>
            {data.actionsError ? (
              <p className="text-muted-foreground text-xs">
                Live check bij Google niet beschikbaar: {data.actionsError}
              </p>
            ) : null}

            <div className="space-y-3">
              {data.events.map((e) => (
                <div key={e.key} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{e.googleActionName}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={e.initialBidding === "primary" ? "default" : "secondary"}>
                        {e.initialBidding === "primary" ? "Primair (biedt mee)" : "Alleen meten"}
                      </Badge>
                      <Badge variant={e.existsInGoogle ? "outline" : "destructive"}>
                        {e.existsInGoogle ? "Bestaat in Google Ads" : "Nog aanmaken"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">{e.description}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {e.createCategory} · {e.countingType} ·{" "}
                    {e.valueSource === "dynamic"
                      ? "werkelijke omzet"
                      : e.valueSource === "fixed"
                        ? "vaste waarde"
                        : "geen waarde"}{" "}
                    · {e.uploadedLast30Days} bevestigd in 30 dagen
                  </p>
                  {e.blockers.length === 0 ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Uploadbaar
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {e.blockers.map((b) => (
                        <li key={b} className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3.5 w-3.5" /> {blockerLabel(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">Optimalisatiedoel</p>
              <p className="text-muted-foreground mt-1 text-xs">{data.advice.reason}</p>
              {data.advice.criteria?.length ? (
                <ul className="mt-2 space-y-1">
                  {data.advice.criteria.map((c) => (
                    <li key={c.key} className="flex items-start gap-1.5 text-xs">
                      {c.passed ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      )}
                      <span>
                        <span className="font-medium">{c.label}:</span>{" "}
                        <span className="text-muted-foreground">{c.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-muted-foreground mt-2 text-xs">
                Advies: blijft <span className="font-medium">{data.advice.recommendedPrimary}</span>.
                Volume alleen is nooit voldoende — attributiekwaliteit, stabiliteit en
                campagne-specifieke data wegen even zwaar. Verschuiven gebeurt nooit automatisch:
                jij keurt het expliciet goed.
              </p>
            </div>

            {data.legacyQuoteActions.length > 0 ? (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Bestaande offerte-conversies (ongewijzigd)</p>
                <ul className="text-muted-foreground mt-1 space-y-1 text-xs">
                  {data.legacyQuoteActions.map((a) => (
                    <li key={a.id}>
                      {a.name} · {a.type ?? "onbekend type"}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-1 text-xs">
                  Deze blijven staan tot de nieuwe structuur meet; niets is gepauzeerd of
                  verwijderd.
                </p>
              </div>
            ) : null}

            <p className="text-muted-foreground text-xs">
              Uploadmodus:{" "}
              {data.uploadMode === "manual" ? "handmatige goedkeuring (actief)" : "automatisch"} ·
              TEST/preview-leads zijn nooit uploadbaar · click-ID prioriteit GCLID → GBRAID → WBRAID.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

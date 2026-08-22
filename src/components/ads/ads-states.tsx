import { AlertTriangle, Link2Off, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdsLoading({ label = "Google Ads-gegevens ophalen…" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{label}</span>
      </CardContent>
    </Card>
  );
}

export function AdsError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="space-y-3 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium">Gegevens konden niet worden geladen</p>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
        </div>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Opnieuw proberen
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdsNotConnected({ children }: { children?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <div className="flex items-start gap-3">
          <Link2Off className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Google Ads is nog niet gekoppeld</p>
            <p className="text-muted-foreground text-sm">
              Zodra een Google Ads-klantaccount aan dit project is gekoppeld, verschijnen hier je echte
              campagnes, kosten, klikken en conversies.
            </p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function AdsEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

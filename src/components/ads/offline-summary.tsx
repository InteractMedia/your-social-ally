import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, CloudUpload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getOfflineConversionSummary } from "@/lib/google-conversions.functions";

export function OfflineConversionSummary() {
  const fn = useServerFn(getOfflineConversionSummary);
  const query = useQuery({
    queryKey: ["offline-conversions", "summary"],
    queryFn: () => fn(),
  });

  const stats = [
    { label: "Wacht op goedkeuring", value: query.data?.pending ?? 0 },
    { label: "Vandaag geüpload", value: query.data?.uploadedToday ?? 0 },
    { label: "Mislukt", value: query.data?.failed ?? 0 },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudUpload className="h-4 w-4" /> Offline B2B-conversies
        </CardTitle>
        <Button asChild size="sm" variant="ghost">
          <Link to="/ads/google/conversions">
            Beheren <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                <p className="text-muted-foreground text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}
        {query.data?.error ? (
          <p className="text-destructive mt-2 text-sm">{query.data.error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

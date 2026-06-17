import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/ads/google")({
  head: () => ({ meta: [{ title: "Google Ads — ZoetBezorgen" }] }),
  notFoundComponent: () => (
    <AppShell><div className="p-8 text-sm">Campagne niet gevonden.</div></AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell><div className="p-8 text-sm text-destructive">Fout: {error.message}</div></AppShell>
  ),
  component: () => <Outlet />,
});

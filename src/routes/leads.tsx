import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "B2B Leads — SocialCockpit" },
      {
        name: "description",
        content:
          "Centrale B2B Lead Manager: leads, funnelstatus, leadkwaliteit, klantwaarde en marketingattributie in één overzicht.",
      },
      { property: "og:title", content: "B2B Leads — SocialCockpit" },
      {
        property: "og:description",
        content: "Alle zakelijke leads, hun kwaliteit, omzet en marketingbron in SocialCockpit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="p-8 text-sm">Lead niet gevonden.</div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="text-destructive p-8 text-sm">Fout: {error.message}</div>
    </AppShell>
  ),
  component: () => <Outlet />,
});

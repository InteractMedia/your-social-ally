import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ads")({
  head: () => ({ meta: [{ title: "Ads — ZoetBezorgen Social" }] }),
  component: () => <Outlet />,
});

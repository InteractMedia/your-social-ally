import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/competitors")({
  head: () => ({ meta: [{ title: "Concurrentie — ZoetBezorgen Social" }] }),
  component: () => <Outlet />,
});

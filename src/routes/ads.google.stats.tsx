import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ads/google/stats")({
  beforeLoad: () => {
    throw redirect({ to: "/ads/google" });
  },
});

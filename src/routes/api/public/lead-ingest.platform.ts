import { createFileRoute } from "@tanstack/react-router";

import { handleLeadIngest } from "@/lib/lead-ingest.server";

/**
 * Secured server-to-server endpoint for cadeauplatform-aanvragen.
 * Requires header `x-lead-ingest-secret` (or Bearer token) matching LEAD_INGEST_SECRET.
 */
export const Route = createFileRoute("/api/public/lead-ingest/platform")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleLeadIngest(request, {
          leadType: "cadeauplatform",
          funnelType: "platform",
          status: "application",
          ingestSource: "platform_api",
        }),
    },
  },
});

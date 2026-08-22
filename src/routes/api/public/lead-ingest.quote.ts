import { createFileRoute } from "@tanstack/react-router";

import { handleLeadIngest } from "@/lib/lead-ingest.server";

/**
 * Secured server-to-server endpoint for offerteaanvragen (Shopify-forms later, API now).
 * Requires header `x-lead-ingest-secret` (or Bearer token) matching LEAD_INGEST_SECRET.
 */
export const Route = createFileRoute("/api/public/lead-ingest/quote")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleLeadIngest(request, {
          leadType: "offerte",
          funnelType: "quote",
          status: "quote_request",
          ingestSource: "quote_api",
        }),
    },
  },
});

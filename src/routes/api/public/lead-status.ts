import { createFileRoute } from "@tanstack/react-router";

import { handleLeadStatusUpdate } from "@/lib/lead-external.server";

/**
 * Secured server-to-server endpoint for status updates from the external
 * cadeauplatform app. Requires header `x-lead-ingest-secret` (or Bearer token)
 * with a workspace ingest key; the workspace is derived from the credential.
 */
export const Route = createFileRoute("/api/public/lead-status")({
  server: {
    handlers: {
      POST: ({ request }) => handleLeadStatusUpdate(request, "zoetbezorgen_app"),
    },
  },
});

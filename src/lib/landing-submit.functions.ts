import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Public form endpoint for landing pages. Unauthenticated by design: validation,
 * spam protection and idempotency all happen server-side. The raw request is
 * forwarded so IP-based rate limiting actually has an IP to work with.
 */
export const submitLandingForm = createServerFn({ method: "POST" })
  .inputValidator(async (d: unknown) => {
    const { submitSchema } = await import("./landing-submit-schema");
    return submitSchema.parse(d);
  })
  .handler(async ({ data }) => {
    const { handleLandingSubmit } = await import("./landing-submit.server");
    return handleLandingSubmit(data, getRequest());
  });

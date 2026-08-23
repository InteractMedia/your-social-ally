import { createServerFn } from "@tanstack/react-start";

/**
 * Public form endpoint for landing pages. Unauthenticated by design: validation,
 * spam protection and idempotency all happen server-side.
 */
export const submitLandingForm = createServerFn({ method: "POST" })
  .inputValidator(async (d: unknown) => {
    const { submitSchema } = await import("./landing-submit-schema");
    return submitSchema.parse(d);
  })
  .handler(async ({ data }) => {
    const { handleLandingSubmit } = await import("./landing-submit.server");
    return handleLandingSubmit(data);
  });

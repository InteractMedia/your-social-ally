import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { evaluatePublicHostScope, PUBLIC_HOST_SCOPE_MODE } from "./lib/public-host-scope";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/**
 * Dry-run scoping of the public landing host. Logs only; changes no response.
 * See src/lib/public-host-scope.ts for the allowlist and the enforce switch.
 */
const publicHostScopeMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { decision, host, pathname } = evaluatePublicHostScope(request);
  if (decision === "WOULD_BLOCK") {
    console.warn(
      `[public-host-scope] ${PUBLIC_HOST_SCOPE_MODE} WOULD_BLOCK host=${host} path=${pathname}`,
    );
  }
  return next();
});


const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [publicHostScopeMiddleware, errorMiddleware],
}));

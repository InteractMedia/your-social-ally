/**
 * Host-aware scoping for the public landing-page host.
 *
 * zakelijk.zoetbezorgen.nl and socialcockpit.nl are two custom domains on the
 * SAME Lovable deployment, so the entire route tree currently answers 200 on
 * both hosts. This module decides which paths belong on the public host.
 *
 * MODE = "dry-run": nothing is blocked, we only log WOULD_BLOCK lines so the
 * allowlist can be verified against real traffic before enforcing.
 */

export const PUBLIC_LANDING_HOSTS = ["zakelijk.zoetbezorgen.nl"];

/** Flip to "enforce" only after the dry-run log is clean. */
export const PUBLIC_HOST_SCOPE_MODE: "dry-run" | "enforce" = "dry-run";

/** Public landing routes + technically required assets/endpoints. */
const ALLOW: RegExp[] = [
  /^\/offerte(\/|$)/,
  /^\/cadeauplatform(\/|$)/,
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
  /^\/favicon\.ico$/,
  /^\/api\/public\//,
  /^\/_serverFn\//,
  /^\/_server\//,
  /^\/_build\//,
  /^\/assets\//,
  /^\/zp\//,
  /^\/__l5e\//,
  /^\/~/, // Lovable-injected runtime scripts (e.g. /~flock.js)

  /^\/@id\//,
  /^\/@vite\//,
  /^\/@fs\//,
  /^\/node_modules\//,
  /^\/src\//,
  /^\/\.well-known\//,
  /\.(js|mjs|cjs|css|map|woff2?|ttf|otf|eot|png|jpe?g|avif|webp|gif|svg|ico|txt|xml|json|webmanifest)$/i,
];

export function isPublicLandingHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = host.split(",")[0]!.trim().toLowerCase().split(":")[0]!;
  return PUBLIC_LANDING_HOSTS.includes(bare);
}

export function isPublicLandingPath(pathname: string): boolean {
  return ALLOW.some((re) => re.test(pathname));
}

/** Host as the visitor sees it (proxies/edge use x-forwarded-host). */
export function resolveRequestHost(request: Request): string | null {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-host");
  if (forwarded) return forwarded;
  const host = headers.get("host");
  if (host) return host;
  try {
    return new URL(request.url).host;
  } catch {
    return null;
  }
}

export type ScopeDecision = "IGNORED" | "ALLOWED" | "WOULD_BLOCK";

export function evaluatePublicHostScope(request: Request): {
  decision: ScopeDecision;
  host: string | null;
  pathname: string;
} {
  const host = resolveRequestHost(request);
  let pathname = "/";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    /* keep default */
  }

  // socialcockpit.nl and every other host are never touched by this logic.
  if (!isPublicLandingHost(host)) return { decision: "IGNORED", host, pathname };

  return {
    decision: isPublicLandingPath(pathname) ? "ALLOWED" : "WOULD_BLOCK",
    host,
    pathname,
  };
}

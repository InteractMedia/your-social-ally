/**
 * Reverse proxy Worker: zakelijk.zoetbezorgen.nl -> SocialCockpit (Lovable).
 *
 * Doel: de publieke Landing Page Engine (offerte-funnel) rechtstreeks met
 * HTTP 200 serveren op zakelijk.zoetbezorgen.nl, terwijl socialcockpit.nl
 * ongewijzigd het primaire Lovable-domein en dashboard blijft.
 *
 * Ontwerpprincipes
 * - Alleen expliciet toegestane publieke paden worden geproxied (allowlist).
 *   Dashboard/admin/auth blijven onbereikbaar via dit domein (404).
 * - Origin is het *stabiele project-hostname*, niet socialcockpit.nl, zodat de
 *   Lovable-edge geen primary-domain redirect naar socialcockpit.nl uitvoert.
 * - Loop-protectie via de X-Zb-Proxy header + host-check.
 * - Redirects van de origin naar een andere host worden teruggeschreven naar
 *   de publieke host, zodat de browser nooit ongemerkt wegspringt.
 * - Cookies: Domain-attribuut wordt gestript zodat cookies host-only op
 *   zakelijk.zoetbezorgen.nl worden gezet (geen cross-domain lek).
 *
 * Rollback: verwijder de route in Cloudflare (of `wrangler delete`). Zonder
 * Worker valt het domein terug op het huidige gedrag. Zie README.md.
 */

const PUBLIC_HOST = "zakelijk.zoetbezorgen.nl";

// Origin = het primaire Lovable-domein: het enige hostname dat rechtstreeks 200
// geeft. De fetch gebeurt server-side, de browser blijft op de publieke host.
const ORIGIN_HOST = "socialcockpit.nl";

const LOOP_HEADER = "x-zb-proxy";

/** Paden die publiek via zakelijk.zoetbezorgen.nl mogen. */
const ALLOW_EXACT = new Set([
  "/sitemap.xml",
  "/robots.txt",
  "/favicon.ico",
]);

const ALLOW_PREFIX = [
  "/offerte/", // publieke offerte-landingspagina's
  "/_serverFn/", // TanStack Start server functions (formulier + tracking)
  "/api/public/", // publieke API-routes (assets, lead-ingest)
  "/assets/", // gebouwde JS/CSS bundles
  "/_build/",
  "/zp/", // statische productbeelden
];

function isAllowed(pathname) {
  if (ALLOW_EXACT.has(pathname)) return true;
  return ALLOW_PREFIX.some((p) => pathname.startsWith(p));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // --- loop-protectie -----------------------------------------------------
    if (request.headers.get(LOOP_HEADER)) {
      return new Response("Proxy loop detected", { status: 508 });
    }

    if (!isAllowed(url.pathname)) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const originUrl = new URL(url.toString());
    originUrl.protocol = "https:";
    originUrl.host = ORIGIN_HOST;
    originUrl.port = "";

    const headers = new Headers(request.headers);
    headers.set("host", ORIGIN_HOST);
    headers.set(LOOP_HEADER, "1");
    // Publieke host/protocol-context bewaren voor de applicatie.
    headers.set("x-forwarded-host", PUBLIC_HOST);
    headers.set("x-forwarded-proto", "https");
    headers.set("origin", `https://${PUBLIC_HOST}`);
    headers.delete("cf-connecting-ip-original");
    headers.delete("accept-encoding"); // laat Cloudflare de compressie doen

    const originResponse = await fetch(
      new Request(originUrl.toString(), {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : request.body,
        redirect: "manual",
      }),
    );

    const out = new Headers(originResponse.headers);

    // --- redirects nooit naar een andere host laten wegspringen -------------
    const location = out.get("location");
    if (location) {
      try {
        const target = new URL(location, `https://${ORIGIN_HOST}`);
        if (
          target.host === ORIGIN_HOST ||
          target.host === "socialcockpit.nl" ||
          target.host === "www.socialcockpit.nl"
        ) {
          target.host = PUBLIC_HOST;
          target.protocol = "https:";
        }
        out.set("location", target.toString());
      } catch {
        /* laat onbruikbare Location ongemoeid */
      }
    }

    // --- cookies host-only maken -------------------------------------------
    const cookies = originResponse.headers.getAll
      ? originResponse.headers.getAll("set-cookie")
      : [];
    if (cookies.length) {
      out.delete("set-cookie");
      for (const cookie of cookies) {
        out.append(
          "set-cookie",
          cookie.replace(/;\s*domain=[^;]*/gi, ""),
        );
      }
    }

    // --- CORS voor server functions/API vanaf de publieke host -------------
    if (
      url.pathname.startsWith("/_serverFn/") ||
      url.pathname.startsWith("/api/public/")
    ) {
      out.set("access-control-allow-origin", `https://${PUBLIC_HOST}`);
      out.set("access-control-allow-credentials", "true");
      out.append("vary", "Origin");
    }

    // --- security headers ---------------------------------------------------
    out.set("x-content-type-options", "nosniff");
    out.set("referrer-policy", "strict-origin-when-cross-origin");
    out.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
    out.set("x-zb-proxied-by", "zakelijk-proxy");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: out,
    });
  },
};

/**
 * Cloudflare Worker: reverse proxy voor zakelijk.zoetbezorgen.nl
 *
 * Doel: de publieke Landing Page Engine (offertefunnel) draait op
 * zakelijk.zoetbezorgen.nl, maar wordt intern geserveerd door dezelfde
 * Lovable-app achter socialcockpit.nl. Bezoeker en Google Ads zien
 * uitsluitend zakelijk.zoetbezorgen.nl (geen 301/302, geen hostwissel).
 *
 * Rollback: verwijder de Worker-route in Cloudflare (Workers Routes ->
 * zakelijk.zoetbezorgen.nl/*) of zet DISABLED = "1" als env var. Daarmee valt
 * alles direct terug op het normale Lovable-gedrag; er is geen state.
 */

const ORIGIN = "socialcockpit.nl";
const PUBLIC_HOST = "zakelijk.zoetbezorgen.nl";

/** Alleen publieke landingpage-routes + technische dependencies. */
const ALLOW = [
  /^\/offerte(\/|$)/,
  /^\/cadeauplatform(\/|$)/,
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
  /^\/favicon\.ico$/,
  /^\/api\/public\//, // landing-assets + publieke ingest
  /^\/_serverFn\//, // TanStack server functions (formulier + tracking)
  /^\/_build\//,
  /^\/assets\//,
  /^\/zp\//,
  /^\/@id\//,
  /\.(js|mjs|css|map|woff2?|ttf|otf|png|jpe?g|avif|webp|svg|ico|txt|xml|json)$/,
];

function isAllowed(pathname) {
  return ALLOW.some((re) => re.test(pathname));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (env && env.DISABLED === "1") {
      return new Response("Proxy disabled", { status: 404 });
    }

    // Loop-bescherming: nooit onze eigen proxy opnieuw aanroepen.
    if (request.headers.get("x-zb-proxy") === "1") {
      return new Response("Proxy loop", { status: 508 });
    }

    if (!isAllowed(url.pathname)) {
      // Dashboard/admin/auth blijven op socialcockpit.nl, niet hier.
      return new Response("Not found", { status: 404 });
    }

    const originUrl = new URL(url.toString());
    originUrl.hostname = ORIGIN;
    originUrl.protocol = "https:";
    originUrl.port = "";

    const headers = new Headers(request.headers);
    headers.set("host", ORIGIN);
    headers.set("x-zb-proxy", "1");
    headers.set("x-forwarded-host", PUBLIC_HOST);
    headers.set("x-forwarded-proto", "https");

    const originResponse = await fetch(originUrl.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    const out = new Headers(originResponse.headers);

    // Redirects naar de origin-host herschrijven naar de publieke host,
    // zodat de browser nooit ongemerkt naar socialcockpit.nl springt.
    const location = out.get("location");
    if (location) {
      try {
        const loc = new URL(location, originUrl);
        if (loc.hostname === ORIGIN) {
          loc.hostname = PUBLIC_HOST;
          out.set("location", loc.toString());
        }
      } catch {
        /* relatieve of ongeldige Location: onaangeroerd laten */
      }
    }

    // Cookies horen bij de publieke host; origin-domain verwijderen.
    const cookies = out.getAll ? out.getAll("set-cookie") : [];
    if (cookies.length) {
      out.delete("set-cookie");
      for (const cookie of cookies) {
        out.append("set-cookie", cookie.replace(/;\s*domain=[^;]+/i, ""));
      }
    }

    out.delete("x-frame-options");
    out.set("x-content-type-options", "nosniff");
    out.set("referrer-policy", "strict-origin-when-cross-origin");

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: out,
    });
  },
};

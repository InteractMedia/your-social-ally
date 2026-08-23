/**
 * Sitemap-generatie voor de Landing Page Engine.
 *
 * URL's zijn nooit hardcoded: per pagina geldt `base_url` (bewuste override)
 * en anders het globale productiedomein uit de configuratie. Een domeinwissel
 * is daarmee één configuratiewijziging.
 */
import { admin } from "@/integrations/supabase/client.server";

import { landingAbsoluteUrl } from "./landing-shared";

export async function buildLandingSitemapXml() {
  const db = await admin();
  const { data } = await db
    .from("landing_pages")
    .select("slug,funnel_type,base_url,noindex,status,updated_at,is_test")
    .eq("status", "published");

  const entries = (data ?? [])
    .filter((p) => !p.noindex && !p.is_test)
    .map((p) => ({
      loc: landingAbsoluteUrl(p.base_url ?? null, p.funnel_type, p.slug),
      lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : null,
    }));

  const urls = entries
    .map(
      (e) =>
        `  <url><loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

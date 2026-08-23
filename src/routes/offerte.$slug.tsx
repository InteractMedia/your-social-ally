import { createFileRoute, notFound } from "@tanstack/react-router";

import { LandingPageView } from "@/components/landing/landing-page-view";
import { getPublicLandingPage } from "@/lib/landing.functions";

export const Route = createFileRoute("/offerte/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    preview: typeof search["preview"] === "string" ? (search["preview"] as string) : undefined,
    v: typeof search["v"] === "string" ? (search["v"] as string) : undefined,
  }),
  loaderDeps: ({ search }) => ({ preview: search.preview, v: search.v }),
  loader: async ({ params, deps }) => {
    const { page } = await getPublicLandingPage({
      data: {
        funnel: "quote",
        slug: params.slug,
        preview_token: deps.preview ?? null,
        variant_key: deps.v ?? null,
      },
    });
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.page) {
      return { meta: [{ title: "Pagina niet gevonden" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.page;
    const title = p.seo_title || `${p.name} — ZoetBezorgen zakelijk`;
    const description =
      p.seo_description ||
      "Zakelijke snoep- en chocoladegeschenken met eigen logo, vanaf 25 stuks. Vraag je offerte aan.";
    const canonical = p.canonical || null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: p.noindex ? "noindex,nofollow" : "index,follow" },
        { property: "og:title", content: p.og_title || title },
        { property: "og:description", content: p.og_description || description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(p.og_image_url
          ? [
              { property: "og:image", content: p.og_image_url },
              { name: "twitter:image", content: p.og_image_url },
            ]
          : []),
      ],
      links: canonical ? [{ rel: "canonical", href: canonical }] : [],
    };
  },
  component: QuoteLandingPage,
});

function QuoteLandingPage() {
  const { page } = Route.useLoaderData();
  const { preview } = Route.useSearch();
  return <LandingPageView page={page} previewToken={preview ?? null} />;
}

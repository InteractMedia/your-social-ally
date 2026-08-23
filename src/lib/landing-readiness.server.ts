/**
 * Server-side content readiness builder.
 *
 * Deterministic counts from the database feed the pure scoring function. The
 * result is shown in the manager and included in the AI dataset so Claude knows
 * exactly which content actually exists before it designs a page.
 */
import { ZOETBEZORGEN_BRAND } from "./landing-brand";
import { computeContentReadiness, type ReadinessFacts } from "./landing-content-readiness";
import { visualIsMissing, type SectionVisual } from "./landing-visual";

type Db = any;

export async function buildContentReadiness(args: {
  db: Db;
  workspaceId: string;
  pageId?: string | null;
}) {
  const { db, workspaceId } = args;

  const [{ data: products }, { data: productImages }, { data: assets }, { data: testimonials }] =
    await Promise.all([
      db
        .from("landing_products")
        .select("id,active,image_url,personalization_options")
        .eq("workspace_id", workspaceId),
      db.from("landing_product_images").select("product_id,image_type").eq("workspace_id", workspaceId),
      db
        .from("landing_assets")
        .select("id,asset_type,active,approval_status")
        .eq("workspace_id", workspaceId),
      db
        .from("landing_page_testimonials")
        .select("id,enabled")
        .eq("workspace_id", workspaceId),
    ]);

  const activeProducts = (products ?? []).filter((p: any) => p.active !== false);
  const productIdsWithImage = new Set<string>([
    ...activeProducts.filter((p: any) => p.image_url).map((p: any) => p.id),
    ...(productImages ?? []).map((i: any) => i.product_id),
  ]);
  const usable = (assets ?? []).filter(
    (a: any) => a.active !== false && a.approval_status === "approved",
  );
  const byType = (types: string[]) => usable.filter((a: any) => types.includes(a.asset_type)).length;

  let pageViews = 0;
  let leads = 0;
  if (args.pageId) {
    const [{ count: views }, { count: leadCount }] = await Promise.all([
      db
        .from("landing_page_events")
        .select("id", { count: "exact", head: true })
        .eq("landing_page_id", args.pageId)
        .eq("event_type", "page_view")
        .eq("is_preview", false),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("landing_page_id", args.pageId)
        .eq("is_test", false),
    ]);
    pageViews = views ?? 0;
    leads = leadCount ?? 0;
  }

  const facts: ReadinessFacts = {
    activeProducts: activeProducts.length,
    productsWithImage: [...productIdsWithImage].filter((id) =>
      activeProducts.some((p: any) => p.id === id),
    ).length,
    productsWithPersonalizationOptions: activeProducts.filter(
      (p: any) => (p.personalization_options ?? []).length > 0,
    ).length,
    personalizationAssets: byType(["personalized_product", "personalization_example"]),
    productAssets: byType(["product_cutout", "product_group", "product_lifestyle"]),
    customerLogoAssets: byType(["customer_logo"]),
    industryAssets: byType(["industry_context", "business_context"]),
    usps: ZOETBEZORGEN_BRAND.usps.length,
    testimonials: (testimonials ?? []).filter((t: any) => t.enabled !== false).length,
    pageViews,
    leads,
  };

  const readiness = computeContentReadiness(facts);

  /* missing image slots on this page — a pre-publish content warning */
  let missingVisuals: { block_type: string; visual_type: string; brief: string | null }[] = [];
  if (args.pageId) {
    const { data: sections } = await db
      .from("landing_page_sections")
      .select("block_type,enabled,content")
      .eq("landing_page_id", args.pageId)
      .order("sort_order", { ascending: true });
    missingVisuals = (sections ?? [])
      .filter((s: any) => s.enabled !== false)
      .filter((s: any) => visualIsMissing(s.content?.visual as SectionVisual, s.content?.image_url))
      .map((s: any) => ({
        block_type: s.block_type,
        visual_type: (s.content?.visual?.visual_type as string) ?? "onbekend",
        brief: (s.content?.visual?.visual_brief as string) ?? null,
      }));
  }

  return { readiness, facts, missingVisuals };
}

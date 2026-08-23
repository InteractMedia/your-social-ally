/**
 * Server-only core of the Landing Page Engine.
 *
 * Public visitors never touch the database directly: every read and write goes
 * through server functions that call this module with the service-role client.
 * Published pages are served from an immutable version snapshot, so analytics
 * can always be tied to the content that was actually live.
 */
import {
  DEFAULT_FORM_CONFIG,
  
  landingAbsoluteUrl,
  type BlockContent,
  type FormFieldConfig,
  type LandingFormConfig,
  type LandingFunnel,
  type LandingSection,
} from "./landing-shared";
import { buildTemplateSections, TEMPLATE_KEY } from "./landing-template";

export type PublicProduct = {
  id: string;
  name: string;
  image_url: string | null;
  image_alt: string | null;
  short_text: string | null;
  price_from: number | null;
  personalization_options: string[];
  cta_label: string | null;
  cta_url: string | null;
};

export type PublicTestimonial = {
  id: string;
  author: string;
  role_title: string | null;
  company: string | null;
  quote: string;
  image_url: string | null;
};

export type PublicPage = {
  id: string;
  name: string;
  slug: string;
  funnel_type: string;
  status: string;
  template_key: string;
  industry_id: string | null;
  industry_name: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical: string | null;
  /** Absolute productie-URL van deze pagina (null in preview). */
  page_url: string | null;
  noindex: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  version_id: string | null;
  version_number: number | null;
  variant_key: string;
  sections: LandingSection[];
  form: LandingFormConfig;
  products: PublicProduct[];
  testimonials: PublicTestimonial[];
  is_preview: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------------------------------------ snapshotting */

/** Full, self-contained content snapshot of the page's current draft state. */
export async function buildSnapshot(pageId: string) {
  const db = await admin();
  const [{ data: page }, { data: sections }, { data: form }, { data: pageProducts }, { data: tms }] =
    await Promise.all([
      db.from("landing_pages").select("*").eq("id", pageId).single(),
      db
        .from("landing_page_sections")
        .select("*")
        .eq("landing_page_id", pageId)
        .order("sort_order", { ascending: true }),
      db.from("landing_page_forms").select("*").eq("landing_page_id", pageId).maybeSingle(),
      db
        .from("landing_page_products")
        .select("sort_order,overrides,product:landing_products(*)")
        .eq("landing_page_id", pageId)
        .order("sort_order", { ascending: true }),
      db
        .from("landing_page_testimonials")
        .select("*")
        .eq("landing_page_id", pageId)
        .eq("enabled", true)
        .order("sort_order", { ascending: true }),
    ]);
  if (!page) throw new Error("landing page not found");

  let industryName: string | null = null;
  if (page.industry_id) {
    const { data: ind } = await db
      .from("industries")
      .select("name")
      .eq("id", page.industry_id)
      .maybeSingle();
    industryName = ind?.name ?? null;
  }

  const globalKeys = (sections ?? [])
    .filter((s) => s.use_global && s.global_key)
    .map((s) => s.global_key as string);
  let globals: Record<string, BlockContent> = {};
  if (globalKeys.length) {
    const { data: rows } = await db
      .from("landing_global_content")
      .select("key,content")
      .eq("workspace_id", page.workspace_id!)
      .in("key", globalKeys);
    globals = Object.fromEntries((rows ?? []).map((r) => [r.key, (r.content ?? {}) as BlockContent]));
  }

  return {
    page: {
      id: page.id,
      name: page.name,
      slug: page.slug,
      funnel_type: page.funnel_type,
      template_key: page.template_key ?? TEMPLATE_KEY,
      theme: page.theme ?? {},
      industry_id: page.industry_id,
      industry_name: industryName,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      canonical_url: page.canonical_url,
      base_url: page.base_url,
      noindex: page.noindex,
      og_title: page.og_title,
      og_description: page.og_description,
      og_image_url: page.og_image_url,
    },
    sections: (sections ?? []).map((s) => ({
      id: s.id,
      block_type: s.block_type,
      sort_order: s.sort_order,
      enabled: s.enabled,
      use_global: s.use_global,
      global_key: s.global_key,
      variant_key: s.variant_key,
      content:
        s.use_global && s.global_key
          ? { ...(globals[s.global_key] ?? {}), ...((s.content ?? {}) as BlockContent) }
          : ((s.content ?? {}) as BlockContent),
    })) as LandingSection[],
    form: normalizeForm(form),
    products: (pageProducts ?? [])
      .map((row) => {
        const p = row.product as unknown as Record<string, unknown> | null;
        if (!p || p["active"] === false) return null;
        const ov = (row.overrides ?? {}) as Record<string, unknown>;
        return {
          id: String(p["id"]),
          name: String(ov["name"] ?? p["name"]),
          image_url: (ov["image_url"] ?? p["image_url"] ?? null) as string | null,
          image_alt: (ov["image_alt"] ?? p["image_alt"] ?? null) as string | null,
          short_text: (ov["short_text"] ?? p["short_text"] ?? null) as string | null,
          price_from: (ov["price_from"] ?? p["price_from"] ?? null) as number | null,
          personalization_options: (p["personalization_options"] ?? []) as string[],
          cta_label: (ov["cta_label"] ?? p["cta_label"] ?? null) as string | null,
          cta_url: (ov["cta_url"] ?? p["cta_url"] ?? null) as string | null,
        } satisfies PublicProduct;
      })
      .filter(Boolean) as PublicProduct[],
    testimonials: (tms ?? []).map((t) => ({
      id: t.id,
      author: t.author,
      role_title: t.role_title,
      company: t.company,
      quote: t.quote,
      image_url: t.image_url,
    })) as PublicTestimonial[],
  };
}

export type PageSnapshot = Awaited<ReturnType<typeof buildSnapshot>>;

function normalizeForm(row: unknown): LandingFormConfig {
  const r = (row ?? null) as Record<string, unknown> | null;
  if (!r) return DEFAULT_FORM_CONFIG;
  const fields = Array.isArray(r["fields"]) && (r["fields"] as unknown[]).length
    ? (r["fields"] as FormFieldConfig[])
    : DEFAULT_FORM_CONFIG.fields;
  return {
    id: r["id"] as string | undefined,
    title: (r["title"] ?? null) as string | null,
    intro: (r["intro"] ?? null) as string | null,
    submit_label: (r["submit_label"] as string) || DEFAULT_FORM_CONFIG.submit_label,
    success_title: (r["success_title"] as string) || DEFAULT_FORM_CONFIG.success_title,
    success_body: (r["success_body"] as string) || DEFAULT_FORM_CONFIG.success_body,
    fields,
  };
}

/* --------------------------------------------------------------- rendering */

/**
 * Resolves a public page. Published pages render the live version snapshot;
 * draft/paused pages require the page's preview token.
 */
export async function resolvePublicPage(args: {
  funnel: LandingFunnel;
  slug: string;
  previewToken?: string | null;
  variantKey?: string | null;
}): Promise<PublicPage | null> {
  const db = await admin();
  const { data: page } = await db
    .from("landing_pages")
    .select(
      "id,name,slug,funnel_type,status,preview_token,current_version_id,version_counter,base_url,canonical_url,noindex,seo_title,seo_description,og_title,og_description,og_image_url,workspace_id,industry_id,template_key",
    )
    .eq("funnel_type", args.funnel)
    .eq("slug", args.slug)
    .maybeSingle();
  if (!page || page.status === "archived") return null;

  const isPreview = !!args.previewToken && args.previewToken === page.preview_token;
  const published = page.status === "published";
  if (!published && !isPreview) return null;

  let snapshot: PageSnapshot | null = null;
  let versionId: string | null = null;
  let versionNumber: number | null = null;

  if (published && page.current_version_id && !isPreview) {
    const { data: version } = await db
      .from("landing_page_versions")
      .select("id,version_number,snapshot")
      .eq("id", page.current_version_id)
      .maybeSingle();
    if (version) {
      snapshot = version.snapshot as unknown as PageSnapshot;
      versionId = version.id;
      versionNumber = version.version_number;
    }
  }
  if (!snapshot) snapshot = await buildSnapshot(page.id);

  // Canonical/og:url wijzen altijd naar de productie-URL van de pagina zelf
  // (default: het zakelijk.-subdomein). Previews krijgen nooit een canonical,
  // zodat testverkeer nooit als productiepagina geïndexeerd wordt.
  const productionUrl = landingAbsoluteUrl(snapshot.page.base_url ?? null, page.funnel_type, page.slug);
  return {
    id: page.id,
    name: snapshot.page.name,
    slug: page.slug,
    funnel_type: page.funnel_type,
    status: page.status,
    template_key: snapshot.page.template_key ?? TEMPLATE_KEY,
    industry_id: snapshot.page.industry_id ?? null,
    industry_name: snapshot.page.industry_name ?? null,
    seo_title: snapshot.page.seo_title ?? snapshot.page.name,
    seo_description: snapshot.page.seo_description ?? null,
    canonical: isPreview ? null : snapshot.page.canonical_url || productionUrl,
    page_url: isPreview ? null : productionUrl,

    noindex: snapshot.page.noindex !== false || isPreview,
    og_title: snapshot.page.og_title ?? null,
    og_description: snapshot.page.og_description ?? null,
    og_image_url: snapshot.page.og_image_url ?? null,
    version_id: versionId,
    version_number: versionNumber,
    variant_key: args.variantKey || "A",
    sections: (snapshot.sections ?? []).filter((s) => s.enabled),
    form: snapshot.form ?? DEFAULT_FORM_CONFIG,
    products: snapshot.products ?? [],
    testimonials: snapshot.testimonials ?? [],
    is_preview: isPreview,
  };
}

/* ------------------------------------------------------------ page writing */

export async function createPageWithTemplate(args: {
  workspaceId: string;
  userId: string;
  name: string;
  slug: string;
  funnel: LandingFunnel;
  industryId?: string | null;
  baseUrl?: string | null;
}) {
  const db = await admin();
  let industryName: string | null = null;
  if (args.industryId) {
    const { data } = await db.from("industries").select("name").eq("id", args.industryId).maybeSingle();
    industryName = data?.name ?? null;
  }
  const { data: page, error } = await db
    .from("landing_pages")
    .insert({
      workspace_id: args.workspaceId,
      user_id: args.userId,
      name: args.name,
      slug: args.slug,
      funnel_type: args.funnel,
      industry_id: args.industryId ?? null,
      status: "draft",
      template_key: TEMPLATE_KEY,
      // Leeg laten = volgt automatisch het globale productiedomein.
      // Alleen een bewuste override wordt hier opgeslagen.
      base_url: args.baseUrl?.trim() || null,

      noindex: true,
      seo_title: `${args.name} — ZoetBezorgen zakelijk`,
      active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const sections = buildTemplateSections({ funnel: args.funnel, industryName }).map((s) => ({
    workspace_id: args.workspaceId,
    landing_page_id: page.id,
    block_type: s.block_type,
    sort_order: s.sort_order,
    enabled: s.enabled,
    content: s.content as never,
  }));
  await db.from("landing_page_sections").insert(sections);
  await db.from("landing_page_forms").insert({
    workspace_id: args.workspaceId,
    landing_page_id: page.id,
    title: DEFAULT_FORM_CONFIG.title,
    intro: DEFAULT_FORM_CONFIG.intro,
    submit_label: args.funnel === "platform" ? "Account aanvragen" : DEFAULT_FORM_CONFIG.submit_label,
    success_title: DEFAULT_FORM_CONFIG.success_title,
    success_body: DEFAULT_FORM_CONFIG.success_body,
    fields: DEFAULT_FORM_CONFIG.fields as never,
  });
  await db.from("landing_page_variants").insert({
    workspace_id: args.workspaceId,
    landing_page_id: page.id,
    variant_key: "A",
    name: "Variant A",
  });
  return page.id;
}

/** Full copy: structure, blocks, CTA's, form, styling, products, testimonials. */
export async function duplicatePage(args: {
  workspaceId: string;
  userId: string;
  sourceId: string;
  name: string;
  slug: string;
  industryId?: string | null;
}) {
  const db = await admin();
  const { data: source } = await db
    .from("landing_pages")
    .select("*")
    .eq("id", args.sourceId)
    .eq("workspace_id", args.workspaceId)
    .single();
  if (!source) throw new Error("Bronpagina niet gevonden");

  const { data: page, error } = await db
    .from("landing_pages")
    .insert({
      workspace_id: args.workspaceId,
      user_id: args.userId,
      name: args.name,
      slug: args.slug,
      funnel_type: source.funnel_type,
      industry_id: args.industryId ?? source.industry_id,
      status: "draft",
      template_key: source.template_key,
      theme: source.theme as never,
      base_url: source.base_url,
      canonical_url: null,
      noindex: source.noindex,
      seo_title: source.seo_title,
      seo_description: source.seo_description,
      og_title: source.og_title,
      og_description: source.og_description,
      og_image_url: source.og_image_url,
      notify_channel: source.notify_channel,
      notify_target: source.notify_target,
      active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const [{ data: sections }, { data: form }, { data: products }, { data: tms }, { data: variants }] =
    await Promise.all([
      db.from("landing_page_sections").select("*").eq("landing_page_id", args.sourceId),
      db.from("landing_page_forms").select("*").eq("landing_page_id", args.sourceId).maybeSingle(),
      db.from("landing_page_products").select("*").eq("landing_page_id", args.sourceId),
      db.from("landing_page_testimonials").select("*").eq("landing_page_id", args.sourceId),
      db.from("landing_page_variants").select("*").eq("landing_page_id", args.sourceId),
    ]);

  if (sections?.length) {
    await db.from("landing_page_sections").insert(
      sections.map((s) => ({
        workspace_id: args.workspaceId,
        landing_page_id: page.id,
        block_type: s.block_type,
        sort_order: s.sort_order,
        enabled: s.enabled,
        use_global: s.use_global,
        global_key: s.global_key,
        variant_key: s.variant_key,
        content: s.content as never,
      })),
    );
  }
  await db.from("landing_page_forms").insert({
    workspace_id: args.workspaceId,
    landing_page_id: page.id,
    title: form?.title ?? DEFAULT_FORM_CONFIG.title,
    intro: form?.intro ?? DEFAULT_FORM_CONFIG.intro,
    submit_label: form?.submit_label ?? DEFAULT_FORM_CONFIG.submit_label,
    success_title: form?.success_title ?? DEFAULT_FORM_CONFIG.success_title,
    success_body: form?.success_body ?? DEFAULT_FORM_CONFIG.success_body,
    fields: (form?.fields ?? DEFAULT_FORM_CONFIG.fields) as never,
  });
  if (products?.length) {
    await db.from("landing_page_products").insert(
      products.map((p) => ({
        workspace_id: args.workspaceId,
        landing_page_id: page.id,
        product_id: p.product_id,
        sort_order: p.sort_order,
        overrides: p.overrides as never,
      })),
    );
  }
  if (tms?.length) {
    await db.from("landing_page_testimonials").insert(
      tms.map((t) => ({
        workspace_id: args.workspaceId,
        landing_page_id: page.id,
        author: t.author,
        role_title: t.role_title,
        company: t.company,
        quote: t.quote,
        image_url: t.image_url,
        sort_order: t.sort_order,
        enabled: t.enabled,
      })),
    );
  }
  await db.from("landing_page_variants").insert(
    (variants?.length ? variants : [{ variant_key: "A", name: "Variant A", weight: 100, active: true }]).map(
      (v) => ({
        workspace_id: args.workspaceId,
        landing_page_id: page.id,
        variant_key: v.variant_key,
        name: v.name,
        weight: v.weight,
        active: v.active,
      }),
    ),
  );
  return page.id;
}

/** Publishes the current draft as an immutable version and points the page at it. */
export async function publishPage(args: {
  workspaceId: string;
  pageId: string;
  userId: string;
  userEmail?: string | null;
  note?: string | null;
}) {
  const db = await admin();
  const snapshot = await buildSnapshot(args.pageId);
  const { data: page } = await db
    .from("landing_pages")
    .select("version_counter")
    .eq("id", args.pageId)
    .eq("workspace_id", args.workspaceId)
    .single();
  const versionNumber = (page?.version_counter ?? 0) + 1;
  const { data: version, error } = await db
    .from("landing_page_versions")
    .insert({
      workspace_id: args.workspaceId,
      landing_page_id: args.pageId,
      version_number: versionNumber,
      snapshot: snapshot as never,
      note: args.note ?? null,
      published_by: args.userId,
      published_by_email: args.userEmail ?? null,
    })
    .select("id,version_number,published_at")
    .single();
  if (error) throw new Error(error.message);

  await db
    .from("landing_pages")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      published_by: args.userId,
      current_version_id: version.id,
      version_counter: versionNumber,
    })
    .eq("id", args.pageId)
    .eq("workspace_id", args.workspaceId);
  return version;
}

/** Restores a previous published version into the draft state and republishes it. */
export async function rollbackToVersion(args: {
  workspaceId: string;
  pageId: string;
  versionId: string;
  userId: string;
  userEmail?: string | null;
}) {
  const db = await admin();
  const { data: version } = await db
    .from("landing_page_versions")
    .select("id,version_number,snapshot")
    .eq("id", args.versionId)
    .eq("landing_page_id", args.pageId)
    .eq("workspace_id", args.workspaceId)
    .single();
  if (!version) throw new Error("Versie niet gevonden");
  const snap = version.snapshot as unknown as PageSnapshot;

  await db
    .from("landing_pages")
    .update({
      name: snap.page.name,
      seo_title: snap.page.seo_title,
      seo_description: snap.page.seo_description,
      canonical_url: snap.page.canonical_url,
      base_url: snap.page.base_url,
      noindex: snap.page.noindex,
      og_title: snap.page.og_title,
      og_description: snap.page.og_description,
      og_image_url: snap.page.og_image_url,
      theme: (snap.page.theme ?? {}) as never,
    })
    .eq("id", args.pageId)
    .eq("workspace_id", args.workspaceId);

  await db.from("landing_page_sections").delete().eq("landing_page_id", args.pageId);
  if (snap.sections?.length) {
    await db.from("landing_page_sections").insert(
      snap.sections.map((s) => ({
        workspace_id: args.workspaceId,
        landing_page_id: args.pageId,
        block_type: s.block_type,
        sort_order: s.sort_order,
        enabled: s.enabled,
        use_global: s.use_global,
        global_key: s.global_key,
        variant_key: s.variant_key,
        content: s.content as never,
      })),
    );
  }
  if (snap.form) {
    await db
      .from("landing_page_forms")
      .update({
        title: snap.form.title,
        intro: snap.form.intro,
        submit_label: snap.form.submit_label,
        success_title: snap.form.success_title,
        success_body: snap.form.success_body,
        fields: snap.form.fields as never,
      })
      .eq("landing_page_id", args.pageId);
  }
  return publishPage({
    workspaceId: args.workspaceId,
    pageId: args.pageId,
    userId: args.userId,
    userEmail: args.userEmail,
    note: `Rollback naar versie ${version.version_number}`,
  });
}

/* ---------------------------------------------------------------- tracking */

export async function recordEvent(args: {
  pageId: string;
  versionId?: string | null;
  variantKey?: string | null;
  sessionId: string;
  eventType: string;
  path?: string | null;
  attribution?: Record<string, unknown> | null;
  isPreview?: boolean;
  meta?: Record<string, unknown> | null;
}) {
  const db = await admin();
  const { data: page } = await db
    .from("landing_pages")
    .select("workspace_id,is_test")
    .eq("id", args.pageId)
    .maybeSingle();
  if (!page?.workspace_id) return { ok: false };
  // Preview traffic is stored but flagged, so it never pollutes reporting.
  const { error } = await db.from("landing_page_events").insert({
    workspace_id: page.workspace_id,
    landing_page_id: args.pageId,
    landing_page_version_id: args.versionId ?? null,
    variant_key: args.variantKey || "A",
    session_id: args.sessionId,
    event_type: args.eventType,
    path: args.path ?? null,
    attribution: (args.attribution ?? {}) as never,
    is_preview: args.isPreview === true,
    is_test: page.is_test === true,
    meta: (args.meta ?? {}) as never,
  });
  // 23505 = duplicate unique event for this session → silently ignored.
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("[landing] event insert failed", { message: error.message });
    return { ok: false };
  }
  return { ok: true };
}

export async function hashIp(value: string | null) {
  if (!value) return null;
  const salt = process.env.LEAD_INGEST_SECRET ?? "landing";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${value}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

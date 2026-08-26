import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyticsInput,
  createPageInput,
  duplicatePageInput,
  formUpdateInput,
  pageIdInput,
  pageProductInput,
  productInput,
  publicEventInput,
  publicPageInput,
  publishInput,
  rollbackInput,
  sectionAddInput,
  sectionReorderInput,
  sectionUpdateInput,
  testimonialInput,
  updatePageInput,
} from "./landing-schemas";
import { slugify } from "./landing-shared";
import { requireUserWorkspace } from "./workspaces.server";

const PAGE_COLUMNS =
  "id,name,slug,funnel_type,status,industry_id,template_key,base_url,canonical_url,noindex,seo_title,seo_description,og_title,og_description,og_image_url,published_at,version_counter,preview_token,notify_channel,notify_target,is_test,theme,current_version_id,created_at,updated_at";

/* ------------------------------------------------------------------ public */

/** Public read used by the renderer. Unauthenticated by design. */
export const getPublicLandingPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => publicPageInput.parse(d))
  .handler(async ({ data }) => {
    const { resolvePublicPage } = await import("./landing.server");
    const page = await resolvePublicPage({
      funnel: data.funnel,
      slug: data.slug,
      previewToken: data.preview_token ?? null,
      variantKey: data.variant_key ?? null,
    });
    return { page };
  });

/** First-party analytics event from the public page. */
export const trackLandingEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => publicEventInput.parse(d))
  .handler(async ({ data }) => {
    const { recordEvent } = await import("./landing.server");
    return recordEvent({
      pageId: data.page_id,
      versionId: data.version_id ?? null,
      variantKey: data.variant_key ?? null,
      sessionId: data.session_id,
      eventType: data.event_type,
      path: data.path ?? null,
      attribution: (data.attribution ?? {}) as Record<string, unknown>,
      isPreview: data.is_preview === true,
      meta: (data.meta ?? {}) as Record<string, unknown>,
    });
  });

/* ------------------------------------------------------------- page manager */

export const listLandingPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: pages, error } = await context.supabase
      .from("landing_pages")
      .select(PAGE_COLUMNS)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: industries } = await context.supabase
      .from("industries")
      .select("id,name")
      .order("name", { ascending: true });

    const ids = (pages ?? []).map((p) => p.id);
    const stats: Record<string, { leads: number; views: number }> = {};
    if (ids.length) {
      const { data: leadRows } = await context.supabase
        .from("leads")
        .select("landing_page_id")
        .in("landing_page_id", ids)
        .eq("is_test", false);
      const { data: eventRows } = await context.supabase
        .from("landing_page_events")
        .select("landing_page_id,event_type")
        .in("landing_page_id", ids)
        .eq("is_preview", false)
        .eq("event_type", "page_view");
      for (const id of ids) stats[id] = { leads: 0, views: 0 };
      for (const r of leadRows ?? []) if (r.landing_page_id) stats[r.landing_page_id]!.leads += 1;
      for (const r of eventRows ?? []) if (r.landing_page_id) stats[r.landing_page_id]!.views += 1;
    }
    return { pages: pages ?? [], industries: industries ?? [], stats };
  });

export const createLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createPageInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const { createPageWithTemplate } = await import("./landing.server");
    const id = await createPageWithTemplate({
      workspaceId: workspaceId,
      userId: context.userId,
      name: data.name,
      slug: slugify(data.slug),
      funnel: data.funnel,
      industryId: data.industry_id ?? null,
      baseUrl: data.base_url ?? null,
    });
    return { id };
  });

/** Duplicate an existing page with a new slug and optional other industry. */
export const duplicateLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => duplicatePageInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const { duplicatePage } = await import("./landing.server");
    const id = await duplicatePage({
      workspaceId: workspaceId,
      userId: context.userId,
      sourceId: data.source_id,
      name: data.name,
      slug: slugify(data.slug),
      industryId: data.industry_id ?? null,
    });
    return { id };
  });

export const getLandingPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pageIdInput.parse(d))
  .handler(async ({ context, data }) => {
    const [{ data: page, error }, { data: sections }, { data: form }, { data: versions }] =
      await Promise.all([
        context.supabase.from("landing_pages").select(PAGE_COLUMNS).eq("id", data.id).single(),
        context.supabase
          .from("landing_page_sections")
          .select("id,block_type,sort_order,enabled,use_global,global_key,variant_key,content")
          .eq("landing_page_id", data.id)
          .order("sort_order", { ascending: true }),
        context.supabase
          .from("landing_page_forms")
          .select("id,title,intro,submit_label,success_title,success_body,fields")
          .eq("landing_page_id", data.id)
          .maybeSingle(),
        context.supabase
          .from("landing_page_versions")
          .select("id,version_number,note,published_at,published_by_email")
          .eq("landing_page_id", data.id)
          .order("version_number", { ascending: false })
          .limit(20),
      ]);
    if (error) throw new Error(error.message);

    const [{ data: products }, { data: linked }, { data: testimonials }, { data: industries }] =
      await Promise.all([
        context.supabase
          .from("landing_products")
          .select("*")
          .order("sort_order", { ascending: true }),
        context.supabase
          .from("landing_page_products")
          .select("product_id,sort_order")
          .eq("landing_page_id", data.id)
          .order("sort_order", { ascending: true }),
        context.supabase
          .from("landing_page_testimonials")
          .select("*")
          .eq("landing_page_id", data.id)
          .order("sort_order", { ascending: true }),
        context.supabase.from("industries").select("id,name").order("name", { ascending: true }),
      ]);

    return {
      page,
      sections: sections ?? [],
      form,
      versions: versions ?? [],
      products: products ?? [],
      selectedProductIds: (linked ?? []).map((l) => l.product_id),
      testimonials: testimonials ?? [],
      industries: industries ?? [],
    };
  });

export const updateLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatePageInput.parse(d))
  .handler(async ({ context, data }) => {
    const { id, slug, ...rest } = data;
    const patch = { ...rest, updated_at: new Date().toISOString() };
    const { error } = await context.supabase
      .from("landing_pages")
      .update(slug ? { ...patch, slug: slugify(slug) } : patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pageIdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("landing_pages")
      .update({ status: "archived", active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------------------- sections */

export const updateLandingSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sectionUpdateInput.parse(d))
  .handler(async ({ context, data }) => {
    const { id, page_id: _page, ...rest } = data;
    const { error } = await context.supabase
      .from("landing_page_sections")
      .update({ ...rest, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addLandingSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sectionAddInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const { data: last } = await context.supabase
      .from("landing_page_sections")
      .select("sort_order")
      .eq("landing_page_id", data.page_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await context.supabase.from("landing_page_sections").insert({
      workspace_id: workspaceId,
      landing_page_id: data.page_id,
      block_type: data.block_type,
      sort_order: (last?.sort_order ?? 0) + 10,
      enabled: true,
      content: {} as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLandingSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pageIdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("landing_page_sections")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderLandingSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sectionReorderInput.parse(d))
  .handler(async ({ context, data }) => {
    let order = 10;
    for (const id of data.order) {
      await context.supabase
        .from("landing_page_sections")
        .update({ sort_order: order })
        .eq("id", id)
        .eq("landing_page_id", data.page_id);
      order += 10;
    }
    return { ok: true };
  });

/* -------------------------------------------------------------------- form */

export const updateLandingForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => formUpdateInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const payload = {
      workspace_id: workspaceId,
      landing_page_id: data.page_id,
      title: data.title ?? null,
      intro: data.intro ?? null,
      submit_label: data.submit_label,
      success_title: data.success_title,
      success_body: data.success_body,
      fields: data.fields as never,
      updated_at: new Date().toISOString(),
    };
    const { error } = await context.supabase
      .from("landing_page_forms")
      .upsert(payload, { onConflict: "landing_page_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------- products & testimonials */

export const upsertLandingProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const row = {
      workspace_id: workspaceId,
      name: data.name,
      slug: slugify(data.slug || data.name),
      image_url: data.image_url ?? null,
      image_alt: data.image_alt ?? null,
      short_text: data.short_text ?? null,
      price_from: data.price_from ?? null,
      personalization_options: data.personalization_options ?? [],
      cta_label: data.cta_label ?? null,
      cta_url: data.cta_url ?? null,
      active: data.active ?? true,
      updated_at: new Date().toISOString(),
    };
    const query = data.id
      ? context.supabase.from("landing_products").update(row).eq("id", data.id)
      : context.supabase.from("landing_products").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setLandingPageProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pageProductInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    await context.supabase
      .from("landing_page_products")
      .delete()
      .eq("landing_page_id", data.page_id);
    if (data.product_ids.length) {
      const { error } = await context.supabase.from("landing_page_products").insert(
        data.product_ids.map((productId, i) => ({
          workspace_id: workspaceId,
          landing_page_id: data.page_id,
          product_id: productId,
          sort_order: (i + 1) * 10,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertLandingTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => testimonialInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const row = {
      workspace_id: workspaceId,
      landing_page_id: data.page_id,
      author: data.author,
      role_title: data.role_title ?? null,
      company: data.company ?? null,
      quote: data.quote,
      image_url: data.image_url ?? null,
      enabled: data.enabled ?? true,
    };
    const query = data.id
      ? context.supabase.from("landing_page_testimonials").update(row).eq("id", data.id)
      : context.supabase.from("landing_page_testimonials").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLandingTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pageIdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("landing_page_testimonials")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------- publish & versions */

export const publishLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => publishInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);

    /* V1.8B quality gate: a visual-first page may not silently go live with
     * empty required image slots. Override only via explicit confirmation. */
    const { buildContentReadiness } = await import("./landing-readiness.server");
    const { missingVisuals } = await buildContentReadiness({
      db: context.supabase,
      workspaceId,
      pageId: data.id,
    });
    if (missingVisuals.length && !data.allow_missing_visuals) {
      const list = missingVisuals
        .map((v) => `- ${v.block_type} (${v.visual_type})`)
        .join("\n");
      throw new Error(
        `PUBLICEREN GEBLOKKEERD: ${missingVisuals.length} vereiste visual(s) zonder goedgekeurd beeld:\n${list}\n\nKoppel eerst een goedgekeurd asset in de blok-editor, of bevestig bewust dat je met lege beeldslots wilt publiceren.`,
      );
    }

    const { publishPage } = await import("./landing.server");
    const version = await publishPage({
      workspaceId: workspaceId,
      pageId: data.id,
      userId: context.userId,
      userEmail: (context.claims as { email?: string } | null)?.email ?? null,
      note: data.note ?? null,
    });
    return { version };
  });

export const rollbackLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rollbackInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const { rollbackToVersion } = await import("./landing.server");
    const version = await rollbackToVersion({
      workspaceId: workspaceId,
      pageId: data.id,
      versionId: data.version_id,
      userId: context.userId,
      userEmail: (context.claims as { email?: string } | null)?.email ?? null,
    });
    return { version };
  });

/* --------------------------------------------------------------- analytics */

/**
 * Per-page funnel: views → form started → submitted → leads → qualified →
 * customers, plus the marketing dimensions behind them. Test/preview traffic is
 * excluded so reporting stays honest.
 */
export const getLandingAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => analyticsInput.parse(d))
  .handler(async ({ context, data }) => {
    const from = `${data.start}T00:00:00.000Z`;
    const to = `${data.end}T23:59:59.999Z`;

    const [{ data: events }, { data: leads }, { data: submissions }] = await Promise.all([
      context.supabase
        .from("landing_page_events")
        .select("event_type,variant_key,session_id,created_at,attribution")
        .eq("landing_page_id", data.id)
        .eq("is_preview", false)
        .eq("is_test", false)
        .gte("created_at", from)
        .lte("created_at", to),
      context.supabase
        .from("leads")
        .select(
          "id,status,lead_quality,became_customer,revenue,platform,campaign_name,keyword,search_term,utm_source,utm_medium,utm_campaign,industry_name,landing_page_variant,received_at",
        )
        .eq("landing_page_id", data.id)
        .eq("is_test", false)
        .gte("received_at", from)
        .lte("received_at", to),
      context.supabase
        .from("landing_form_submissions")
        .select("status,reject_reason,created_at")
        .eq("landing_page_id", data.id)
        .eq("is_test", false)
        .gte("created_at", from)
        .lte("created_at", to),
    ]);

    const count = (type: string) => (events ?? []).filter((e) => e.event_type === type).length;
    const views = count("page_view");
    const leadRows = leads ?? [];
    const qualified = leadRows.filter((l) => ["qualified", "hot"].includes(l.lead_quality ?? "")).length;
    const customers = leadRows.filter((l) => l.became_customer).length;
    const revenue = leadRows.reduce((sum, l) => sum + Number(l.revenue ?? 0), 0);

    const group = (key: keyof (typeof leadRows)[number]) => {
      const map = new Map<string, number>();
      for (const l of leadRows) {
        const value = (l[key] as string | null) || "(onbekend)";
        map.set(value, (map.get(value) ?? 0) + 1);
      }
      return [...map.entries()]
        .map(([label, leads]) => ({ label, leads }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 12);
    };

    return {
      funnel: {
        views,
        cta_clicks: count("cta_click"),
        form_started: count("form_started"),
        form_submitted: count("form_submitted"),
        leads: leadRows.length,
        qualified,
        customers,
        revenue,
        conversion_rate: views > 0 ? (leadRows.length / views) * 100 : null,
      },
      byVariant: [...new Set((events ?? []).map((e) => e.variant_key))].map((variant) => ({
        variant,
        views: (events ?? []).filter((e) => e.variant_key === variant && e.event_type === "page_view")
          .length,
        leads: leadRows.filter((l) => (l.landing_page_variant ?? "A") === variant).length,
      })),
      byPlatform: group("platform"),
      byCampaign: group("campaign_name"),
      byKeyword: group("keyword"),
      byIndustry: group("industry_name"),
      submissions: {
        accepted: (submissions ?? []).filter((s) => s.status === "accepted").length,
        duplicate: (submissions ?? []).filter((s) => s.status === "duplicate").length,
        rejected: (submissions ?? []).filter((s) => s.status === "rejected").length,
      },
    };
  });

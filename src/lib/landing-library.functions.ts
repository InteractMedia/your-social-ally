/**
 * Central Product Library, Asset Library (Beeldbank) and Visual Briefs.
 *
 * Products and assets are managed once per workspace and reused by every
 * landing page and by the AI Landing Page Strategist. Hard product facts
 * (price, minimum quantity, shipping) are only ever written from human input:
 * AI suggestions are stored separately in `ai_suggestions` and require explicit
 * approval before they become product data.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assetInput,
  idInput,
  productImageInput,
  productImageMutateInput,
  productLibraryInput,
  quickProductInput,
  sectionVisualUpdateInput,
  uploadUrlInput,
  visualBriefInput,
} from "./landing-schemas";
import { slugify } from "./landing-shared";
import { requireUserWorkspace } from "./workspaces.server";

const PRODUCT_COLUMNS =
  "id,name,slug,sku,category,short_text,long_text,min_quantity,price_from,personalization_options,occasions,industries,tags,letterbox_friendly,individually_shippable,featured,product_url,notes,image_url,image_alt,active,sort_order,ai_suggestions,cta_label,cta_url";

const ASSET_COLUMNS =
  "id,name,url,storage_path,asset_type,alt_text,product_id,industry_id,tags,desktop_ok,mobile_ok,source,approval_status,active,mime_type,created_at";

/* ------------------------------------------------------------- products */

export const listProductLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: products, error }, { data: images }, { data: industries }] = await Promise.all([
      context.supabase
        .from("landing_products")
        .select(PRODUCT_COLUMNS)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      context.supabase
        .from("landing_product_images")
        .select("id,product_id,asset_id,url,alt_text,image_type,is_primary,sort_order")
        .order("sort_order", { ascending: true }),
      context.supabase.from("industries").select("id,name").order("name", { ascending: true }),
    ]);
    if (error) throw new Error(error.message);

    const byProduct = new Map<string, any[]>();
    for (const img of images ?? []) {
      const list = byProduct.get(img.product_id) ?? [];
      list.push(img);
      byProduct.set(img.product_id, list);
    }
    return {
      products: (products ?? []).map((p) => ({ ...p, images: byProduct.get(p.id) ?? [] })),
      industries: industries ?? [],
    };
  });

export const upsertProductLibraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productLibraryInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const row = {
      workspace_id: workspaceId,
      name: data.name,
      slug: slugify(data.slug || data.name),
      sku: data.sku ?? null,
      category: data.category ?? null,
      short_text: data.short_text ?? null,
      long_text: data.long_text ?? null,
      min_quantity: data.min_quantity ?? null,
      price_from: data.price_from ?? null,
      personalization_options: data.personalization_options ?? [],
      occasions: data.occasions ?? [],
      industries: data.industries ?? [],
      tags: data.tags ?? [],
      letterbox_friendly: data.letterbox_friendly ?? null,
      individually_shippable: data.individually_shippable ?? null,
      featured: data.featured ?? false,
      product_url: data.product_url ?? null,
      notes: data.notes ?? null,
      cta_label: data.cta_label ?? null,
      cta_url: data.cta_url ?? null,
      active: data.active ?? true,
      sort_order: data.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("landing_products")
        .update(row)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("landing_products")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

/**
 * Quick entry: only the facts the user actually has. Everything AI-relevant
 * (category tags, occasions, industries) may be proposed later by Claude and
 * must be approved before it is stored as product data.
 */
export const quickCreateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => quickProductInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const { data: product, error } = await context.supabase
      .from("landing_products")
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        slug: `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`,
        category: data.category ?? null,
        product_url: data.product_url ?? null,
        min_quantity: data.min_quantity ?? null,
        price_from: data.price_from ?? null,
        notes: data.notes ?? null,
        active: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const images = data.images ?? [];
    if (images.length) {
      const assetRows = images.map((img, i) => ({
        workspace_id: workspaceId,
        name: `${data.name} ${i + 1}`,
        url: img.url,
        storage_path: img.storage_path ?? null,
        asset_type: img.image_type === "personalized_product" ? "personalized_product" : "product_cutout",
        alt_text: img.alt_text ?? data.name,
        product_id: product.id,
        source: "upload",
        approval_status: "approved",
        mime_type: img.mime_type ?? null,
        created_by: context.userId,
      }));
      const { data: assets } = await context.supabase
        .from("landing_assets")
        .insert(assetRows)
        .select("id,url");

      await context.supabase.from("landing_product_images").insert(
        images.map((img, i) => ({
          workspace_id: workspaceId,
          product_id: product.id,
          asset_id: (assets ?? []).find((a) => a.url === img.url)?.id ?? null,
          url: img.url,
          alt_text: img.alt_text ?? data.name,
          image_type: img.image_type ?? "product_cutout",
          is_primary: i === 0,
          sort_order: i,
        })),
      );
      await context.supabase
        .from("landing_products")
        .update({ image_url: images[0]!.url, image_alt: images[0]!.alt_text ?? data.name })
        .eq("id", product.id);
    }
    return { id: product.id, images: images.length };
  });

export const deleteProductLibraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("landing_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------- product images */

export const addProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productImageInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    let assetId = data.asset_id ?? null;
    if (!assetId) {
      const { data: asset } = await context.supabase
        .from("landing_assets")
        .insert({
          workspace_id: workspaceId,
          name: data.alt_text || "Productvisual",
          url: data.url,
          storage_path: data.storage_path ?? null,
          asset_type: data.image_type === "detail" || data.image_type === "packaging"
            ? "product_cutout"
            : data.image_type,
          alt_text: data.alt_text ?? null,
          product_id: data.product_id,
          source: "upload",
          approval_status: "approved",
          mime_type: data.mime_type ?? null,
          created_by: context.userId,
        })
        .select("id")
        .single();
      assetId = asset?.id ?? null;
    }

    const { count } = await context.supabase
      .from("landing_product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", data.product_id);
    const isPrimary = data.is_primary ?? (count ?? 0) === 0;

    if (isPrimary) {
      await context.supabase
        .from("landing_product_images")
        .update({ is_primary: false })
        .eq("product_id", data.product_id);
    }

    const { error } = await context.supabase.from("landing_product_images").insert({
      workspace_id: workspaceId,
      product_id: data.product_id,
      asset_id: assetId,
      url: data.url,
      alt_text: data.alt_text ?? null,
      image_type: data.image_type,
      is_primary: isPrimary,
      sort_order: count ?? 0,
    });
    if (error) throw new Error(error.message);

    if (isPrimary) {
      await context.supabase
        .from("landing_products")
        .update({ image_url: data.url, image_alt: data.alt_text ?? null })
        .eq("id", data.product_id);
    }
    return { ok: true };
  });

export const updateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productImageMutateInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: image } = await context.supabase
      .from("landing_product_images")
      .select("id,product_id,url,alt_text")
      .eq("id", data.id)
      .maybeSingle();
    if (!image) throw new Error("Afbeelding niet gevonden");

    if (data.is_primary) {
      await context.supabase
        .from("landing_product_images")
        .update({ is_primary: false })
        .eq("product_id", image.product_id);
      await context.supabase
        .from("landing_products")
        .update({ image_url: image.url, image_alt: data.alt_text ?? image.alt_text })
        .eq("id", image.product_id);
    }
    const patch: Record<string, any> = {};
    if (data.is_primary !== undefined) patch["is_primary"] = data.is_primary;
    if (data.image_type) patch["image_type"] = data.image_type;
    if (data.alt_text !== undefined) patch["alt_text"] = data.alt_text;
    const { error } = await context.supabase
      .from("landing_product_images")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: image } = await context.supabase
      .from("landing_product_images")
      .select("id,product_id,is_primary")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("landing_product_images")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (image?.is_primary) {
      const { data: next } = await context.supabase
        .from("landing_product_images")
        .select("url,alt_text")
        .eq("product_id", image.product_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      await context.supabase
        .from("landing_products")
        .update({ image_url: next?.url ?? null, image_alt: next?.alt_text ?? null })
        .eq("id", image.product_id);
    }
    return { ok: true };
  });

/* --------------------------------------------------------- asset library */

export const listLandingAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: assets, error }, { data: products }, { data: industries }] = await Promise.all([
      context.supabase
        .from("landing_assets")
        .select(ASSET_COLUMNS)
        .order("created_at", { ascending: false }),
      context.supabase.from("landing_products").select("id,name").order("name"),
      context.supabase.from("industries").select("id,name").order("name"),
    ]);
    if (error) throw new Error(error.message);
    return { assets: assets ?? [], products: products ?? [], industries: industries ?? [] };
  });

export const upsertLandingAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assetInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const row: Record<string, any> = {
      workspace_id: workspaceId,
      name: data.name,
      asset_type: data.asset_type,
      alt_text: data.alt_text ?? null,
      product_id: data.product_id ?? null,
      industry_id: data.industry_id ?? null,
      tags: data.tags ?? [],
      desktop_ok: data.desktop_ok ?? true,
      mobile_ok: data.mobile_ok ?? true,
      source: data.source ?? "upload",
      approval_status: data.approval_status ?? (data.source === "ai" ? "pending" : "approved"),
      active: data.active ?? true,
      mime_type: data.mime_type ?? null,
      visual_brief_id: data.visual_brief_id ?? null,
      updated_at: new Date().toISOString(),
    };
    if (data.url) row["url"] = data.url;
    if (data.storage_path !== undefined) row["storage_path"] = data.storage_path;

    if (data.id) {
      const { error } = await context.supabase
        .from("landing_assets")
        .update(row as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    if (!data.url) throw new Error("Een nieuw asset heeft een bestand of URL nodig.");
    const { data: inserted, error } = await context.supabase
      .from("landing_assets")
      .insert({ ...row, created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteLandingAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("landing_assets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------- visual briefs */

export const listVisualBriefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.partial().parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let query = context.supabase
      .from("landing_visual_briefs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data?.id) query = query.eq("landing_page_id", data.id);
    const { data: briefs, error } = await query;
    if (error) throw new Error(error.message);
    return { briefs: briefs ?? [] };
  });

export const upsertVisualBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => visualBriefInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const row = {
      workspace_id: workspaceId,
      landing_page_id: data.landing_page_id ?? null,
      section_id: data.section_id ?? null,
      block_type: data.block_type ?? null,
      proposal_id: data.proposal_id ?? null,
      title: data.title,
      visual_type: data.visual_type,
      purpose: data.purpose ?? null,
      composition: data.composition ?? null,
      desktop_position: data.desktop_position ?? null,
      mobile_position: data.mobile_position ?? null,
      aspect_ratio: data.aspect_ratio ?? null,
      background_treatment: data.background_treatment ?? null,
      product_ids: data.product_ids ?? [],
      brief_text: data.brief_text ?? null,
      asset_status: data.asset_status ?? "missing",
      asset_id: data.asset_id ?? null,
      generation_status: data.generation_status ?? "not_started",
      approval_status: data.approval_status ?? "pending",
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("landing_visual_briefs")
        .update(row)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("landing_visual_briefs")
      .insert({ ...row, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteVisualBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("landing_visual_briefs")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------- section image slot editing */

/** Writes the structured visual plan + selected asset into a section. */
export const updateSectionVisual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sectionVisualUpdateInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: section } = await context.supabase
      .from("landing_page_sections")
      .select("id,content")
      .eq("id", data.section_id)
      .maybeSingle();
    if (!section) throw new Error("Sectie niet gevonden");

    const content = { ...((section.content ?? {}) as Record<string, unknown>) };
    content["visual"] = data.visual;
    if (data.image_url !== undefined) content["image_url"] = data.image_url ?? undefined;
    if (data.image_alt !== undefined) content["image_alt"] = data.image_alt ?? undefined;

    const { error } = await context.supabase
      .from("landing_page_sections")
      .update({ content: content as never, updated_at: new Date().toISOString() })
      .eq("id", data.section_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------ content readiness */

export const getLandingContentReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.partial().parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const { buildContentReadiness } = await import("./landing-readiness.server");
    return buildContentReadiness({
      db: context.supabase,
      workspaceId,
      pageId: data?.id ?? null,
    });
  });

/* ------------------------------------------------------ storage uploads */

/**
 * Signed upload URL inside the workspace folder of the private
 * `landing-assets` bucket. Landing pages read the file back through the public
 * streaming route, so URLs stay stable and never expire.
 */
export const createAssetUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uploadUrlInput.parse(d))
  .handler(async ({ context, data }) => {
    const workspaceId = await requireUserWorkspace(context.supabase, context.userId);
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const path = `${workspaceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { data: signed, error } = await context.supabase.storage
      .from("landing-assets")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

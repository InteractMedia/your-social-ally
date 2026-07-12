import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GRAPH = "https://graph.facebook.com/v21.0";

function creds() {
  const pageId = process.env.META_PAGE_ID;
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igId = process.env.META_IG_BUSINESS_ID;
  if (!pageId || !token) {
    throw new Error(
      "Meta niet volledig geconfigureerd — controleer META_PAGE_ID en META_PAGE_ACCESS_TOKEN.",
    );
  }
  return { pageId, token, igId };
}

async function graph<T = any>(
  path: string,
  init: RequestInit & { token: string; params?: Record<string, string> },
): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  url.searchParams.set("access_token", init.token);
  if (init.params) {
    for (const [k, v] of Object.entries(init.params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body,
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Meta Graph API [${res.status}]: ${text.slice(0, 300)}`);
  }
  if (!res.ok || json?.error) {
    const msg = json?.error?.message ?? text;
    throw new Error(`Meta Graph API [${res.status}]: ${msg}`);
  }
  return json as T;
}

/** Verify Page + IG business ID connectivity and return account names. */
export const getMetaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const pageId = process.env.META_PAGE_ID;
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    const igId = process.env.META_IG_BUSINESS_ID;

    const status: {
      page: { connected: boolean; id?: string; name?: string; category?: string; error?: string };
      instagram: { connected: boolean; id?: string; username?: string; name?: string; followers?: number; error?: string };
      secretsPresent: { pageId: boolean; token: boolean; igId: boolean };
    } = {
      page: { connected: false },
      instagram: { connected: false },
      secretsPresent: { pageId: !!pageId, token: !!token, igId: !!igId },
    };

    if (!pageId || !token) {
      status.page.error = "META_PAGE_ID of META_PAGE_ACCESS_TOKEN ontbreekt.";
      return status;
    }

    try {
      const page = await graph<{ id: string; name: string; category?: string }>(
        `/${pageId}`,
        { token, params: { fields: "id,name,category" } },
      );
      status.page = { connected: true, id: page.id, name: page.name, category: page.category };
    } catch (err) {
      status.page.error = (err as Error).message;
    }

    if (igId) {
      try {
        const ig = await graph<{
          id: string;
          username: string;
          name?: string;
          followers_count?: number;
        }>(`/${igId}`, {
          token,
          params: { fields: "id,username,name,followers_count" },
        });
        status.instagram = {
          connected: true,
          id: ig.id,
          username: ig.username,
          name: ig.name,
          followers: ig.followers_count,
        };
      } catch (err) {
        status.instagram.error = (err as Error).message;
      }
    } else {
      status.instagram.error = "META_IG_BUSINESS_ID ontbreekt.";
    }

    return status;
  });

async function signMediaUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("post-media")
    .createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(`Kon media-URL's niet ondertekenen: ${error.message}`);
  return (data ?? []).map((d) => {
    if (!d.signedUrl) throw new Error(`Signed URL faalde voor ${d.path}`);
    return d.signedUrl;
  });
}

/** Publish to the connected Facebook Page (text, or single/multi-photo). */
export const publishFacebookPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        message: z.string().min(1).max(63206),
        mediaPaths: z.array(z.string()).max(10).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { pageId, token } = creds();
    const paths = data.mediaPaths ?? [];
    const urls = await signMediaUrls(paths);

    // No media → simple text post
    if (urls.length === 0) {
      const res = await graph<{ id: string }>(`/${pageId}/feed`, {
        method: "POST",
        token,
        params: { message: data.message },
      });
      return { ok: true, id: res.id };
    }

    // Single photo → publish directly with caption
    if (urls.length === 1) {
      const res = await graph<{ id: string; post_id?: string }>(`/${pageId}/photos`, {
        method: "POST",
        token,
        params: { url: urls[0], caption: data.message, published: "true" },
      });
      return { ok: true, id: res.post_id ?? res.id };
    }

    // Multi-photo → upload unpublished, then create a feed post with attached_media
    const mediaIds: string[] = [];
    for (const url of urls) {
      const uploaded = await graph<{ id: string }>(`/${pageId}/photos`, {
        method: "POST",
        token,
        params: { url, published: "false" },
      });
      mediaIds.push(uploaded.id);
    }
    const attached = mediaIds.map((id) => ({ media_fbid: id }));
    const res = await graph<{ id: string }>(`/${pageId}/feed`, {
      method: "POST",
      token,
      params: { message: data.message, attached_media: JSON.stringify(attached) },
    });
    return { ok: true, id: res.id };
  });

/** Publish an Instagram feed post (single image or carousel). Image required. */
export const publishInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        caption: z.string().max(2200).optional(),
        mediaPaths: z.array(z.string()).min(1).max(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { token, igId } = creds();
    if (!igId) throw new Error("META_IG_BUSINESS_ID ontbreekt.");
    const urls = await signMediaUrls(data.mediaPaths);

    const createContainer = async (params: Record<string, string>) => {
      const r = await graph<{ id: string }>(`/${igId}/media`, {
        method: "POST",
        token,
        params,
      });
      return r.id;
    };

    let creationId: string;

    if (urls.length === 1) {
      creationId = await createContainer({
        image_url: urls[0],
        ...(data.caption ? { caption: data.caption } : {}),
      });
    } else {
      // Carousel: upload each child, then create carousel container
      const childIds: string[] = [];
      for (const url of urls) {
        const id = await createContainer({ image_url: url, is_carousel_item: "true" });
        childIds.push(id);
      }
      creationId = await createContainer({
        media_type: "CAROUSEL",
        children: childIds.join(","),
        ...(data.caption ? { caption: data.caption } : {}),
      });
    }

    // Publish the container
    const publish = await graph<{ id: string }>(`/${igId}/media_publish`, {
      method: "POST",
      token,
      params: { creation_id: creationId },
    });
    return { ok: true, id: publish.id };
  });

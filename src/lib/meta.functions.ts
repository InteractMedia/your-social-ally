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

async function graph<T = unknown>(
  path: string,
  init: { method?: string; token: string; params?: Record<string, string>; body?: BodyInit; headers?: HeadersInit },
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
  let json: { error?: { message?: string } } & Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Meta Graph API [${res.status}]: ${text.slice(0, 300)}`);
  }
  if (!res.ok || json?.error) {
    throw new Error(`Meta Graph API [${res.status}]: ${json?.error?.message ?? text}`);
  }
  return json as T;
}

export const debugMetaToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    const currentPageId = process.env.META_PAGE_ID;
    const currentIgId = process.env.META_IG_BUSINESS_ID;

    if (!token) {
      return { ok: false as const, error: "META_PAGE_ACCESS_TOKEN ontbreekt." };
    }

    const result: {
      ok: true;
      me?: { id: string; name?: string };
      tokenInfo?: {
        type?: string;
        app_id?: string;
        application?: string;
        expires_at?: number;
        is_valid?: boolean;
        scopes?: string[];
        user_id?: string;
      };
      pages: Array<{
        id: string;
        name: string;
        category?: string;
        tasks?: string[];
        access_token?: string;
        instagram?: { id: string; username?: string; name?: string; followers_count?: number };
        matchesCurrentPageId: boolean;
        matchesCurrentIgId: boolean;
      }>;
      current: { pageId?: string; igId?: string };
      errors: string[];
    } = { ok: true, pages: [], current: { pageId: currentPageId, igId: currentIgId }, errors: [] };

    try {
      result.me = await graph<{ id: string; name?: string }>("/me", {
        token,
        params: { fields: "id,name" },
      });
    } catch (err) {
      result.errors.push(`/me: ${(err as Error).message}`);
    }

    try {
      const debug = await graph<{
        data: {
          type?: string;
          app_id?: string;
          application?: string;
          expires_at?: number;
          is_valid?: boolean;
          scopes?: string[];
          user_id?: string;
        };
      }>("/debug_token", { token, params: { input_token: token } });
      result.tokenInfo = debug.data;
    } catch (err) {
      result.errors.push(`/debug_token: ${(err as Error).message}`);
    }

    try {
      const accounts = await graph<{
        data: Array<{
          id: string;
          name: string;
          category?: string;
          tasks?: string[];
          access_token?: string;
          instagram_business_account?: {
            id: string;
            username?: string;
            name?: string;
            followers_count?: number;
          };
        }>;
      }>("/me/accounts", {
        token,
        params: {
          fields:
            "id,name,category,tasks,access_token,instagram_business_account{id,username,name,followers_count}",
          limit: "50",
        },
      });
      result.pages = (accounts.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        tasks: p.tasks,
        access_token: p.access_token,
        instagram: p.instagram_business_account,
        matchesCurrentPageId: p.id === currentPageId,
        matchesCurrentIgId: p.instagram_business_account?.id === currentIgId,
      }));
    } catch (err) {
      result.errors.push(`/me/accounts: ${(err as Error).message}`);
    }

    return result;
  });

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
      const page = await graph<{ id: string; name: string; category?: string }>(`/${pageId}`, {
        token,
        params: { fields: "id,name,category" },
      });
      status.page = { connected: true, id: page.id, name: page.name, category: page.category };
    } catch (err) {
      status.page.error = (err as Error).message;
    }

    if (igId) {
      try {
        const ig = await graph<{ id: string; username: string; name?: string; followers_count?: number }>(
          `/${igId}`,
          { token, params: { fields: "id,username,name,followers_count" } },
        );
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

    if (urls.length === 0) {
      const res = await graph<{ id: string }>(`/${pageId}/feed`, {
        method: "POST",
        token,
        params: { message: data.message },
      });
      return { ok: true, id: res.id };
    }

    if (urls.length === 1) {
      const res = await graph<{ id: string; post_id?: string }>(`/${pageId}/photos`, {
        method: "POST",
        token,
        params: { url: urls[0], caption: data.message, published: "true" },
      });
      return { ok: true, id: res.post_id ?? res.id };
    }

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

    const publish = await graph<{ id: string }>(`/${igId}/media_publish`, {
      method: "POST",
      token,
      params: { creation_id: creationId },
    });
    return { ok: true, id: publish.id };
  });

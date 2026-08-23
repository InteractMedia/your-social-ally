/**
 * Public, cache-friendly image endpoint for the Landing Asset Library.
 *
 * The storage bucket is private (workspace-scoped RLS), but landing pages are
 * public. This route streams only assets that are explicitly active and
 * approved, by id — no listing, no path traversal, no other columns exposed.
 */
import { createFileRoute } from "@tanstack/react-router";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/landing-asset/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!UUID.test(id)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: asset } = await supabaseAdmin
          .from("landing_assets")
          .select("storage_path,mime_type,active,approval_status")
          .eq("id", id)
          .maybeSingle();

        if (
          !asset ||
          asset.active === false ||
          asset.approval_status !== "approved" ||
          !asset.storage_path
        ) {
          return new Response("Not found", { status: 404 });
        }

        const { data: file, error } = await supabaseAdmin.storage
          .from("landing-assets")
          .download(asset.storage_path);
        if (error || !file) return new Response("Not found", { status: 404 });

        return new Response(file, {
          headers: {
            "content-type": asset.mime_type || file.type || "image/jpeg",
            "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
          },
        });
      },
    },
  },
});

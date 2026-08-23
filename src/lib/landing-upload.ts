/**
 * Client-side upload helper for the Landing Asset Library.
 *
 * The bucket is private: we ask the server for a signed upload URL inside the
 * workspace folder and read the file back through the public asset route, so
 * landing page image URLs are stable and never expire.
 */
import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function assetPublicUrl(assetId: string) {
  return `/api/public/landing-asset/${assetId}`;
}

export async function uploadLandingFile(
  file: File,
  getUrl: (args: {
    data: { filename: string; mime_type?: string | null };
  }) => Promise<{ path: string; token: string }>,
) {
  if (!file.type.startsWith("image/")) throw new Error("Alleen afbeeldingen zijn toegestaan.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Maximaal 8 MB per afbeelding.");

  const { path, token } = await getUrl({
    data: { filename: file.name, mime_type: file.type },
  });
  const { error } = await supabase.storage
    .from("landing-assets")
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return { path, mimeType: file.type };
}

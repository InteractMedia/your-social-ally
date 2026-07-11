import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/linkedin";

function authHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const linkedinKey = process.env.LINKEDIN_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY ontbreekt.");
  if (!linkedinKey)
    throw new Error("LinkedIn is niet gekoppeld — koppel de connector in Instellingen.");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": linkedinKey,
  };
}

/** Fetch the connected LinkedIn member's profile (name, avatar, email). */
export const getLinkedInProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const res = await fetch(`${GATEWAY}/v2/userinfo`, { headers: authHeaders() });
      if (!res.ok) {
        const body = await res.text();
        return { connected: false as const, error: `LinkedIn API ${res.status}: ${body}` };
      }
      const data = (await res.json()) as {
        sub: string;
        name: string;
        given_name?: string;
        family_name?: string;
        email?: string;
        picture?: string;
      };
      return {
        connected: true as const,
        sub: data.sub,
        name: data.name,
        email: data.email,
        picture: data.picture,
      };
    } catch (err) {
      return { connected: false as const, error: (err as Error).message };
    }
  });

/** Publish a plain-text post to the connected member's personal LinkedIn feed. */
export const publishLinkedInPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ text: z.string().min(1).max(3000) }).parse(data))
  .handler(async ({ data }) => {
    const headers = authHeaders();

    // Get member URN
    const meRes = await fetch(`${GATEWAY}/v2/userinfo`, { headers });
    if (!meRes.ok) {
      const body = await meRes.text();
      throw new Error(`LinkedIn userinfo faalde [${meRes.status}]: ${body}`);
    }
    const me = (await meRes.json()) as { sub: string };
    const authorUrn = `urn:li:person:${me.sub}`;

    const payload = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: data.text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch(`${GATEWAY}/v2/ugcPosts`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LinkedIn publiceren faalde [${res.status}]: ${body}`);
    }
    const result = (await res.json()) as { id?: string };
    return { ok: true, postId: result.id };
  });

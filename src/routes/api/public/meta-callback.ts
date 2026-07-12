import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/meta-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        const redirectUri = `${url.origin}/api/public/meta-callback`;

        if (error) {
          return renderCallback({
            error: `${error}: ${errorDescription || "geen details"}`,
            state: state ?? undefined,
          });
        }

        if (!code) {
          return renderCallback({ error: "Geen OAuth code ontvangen.", state: state ?? undefined });
        }

        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;

        if (!appId || !appSecret) {
          return renderCallback({
            error: "META_APP_ID of META_APP_SECRET is niet geconfigureerd in de backend.",
            state: state ?? undefined,
          });
        }

        try {
          const tokenRes = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
              redirectUri,
            )}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`,
          );
          const tokenData = await tokenRes.json();
          if (!tokenRes.ok || tokenData.error) {
            return renderCallback({
              error: `Token exchange mislukt: ${tokenData.error?.message || tokenRes.statusText}`,
              state: state ?? undefined,
            });
          }

          return renderCallback({
            token: tokenData.access_token,
            state: state ?? undefined,
          });
        } catch (err) {
          return renderCallback({
            error: `Netwerkfout bij token exchange: ${(err as Error).message}`,
            state: state ?? undefined,
          });
        }
      },
    },
  },
});

function renderCallback(payload: { token?: string; error?: string; state?: string }) {
  const body = `<!doctype html>
<html>
  <head><title>Meta OAuth callback</title></head>
  <body>
    <p>Bezig met doorsluizen...</p>
    <script>
      window.opener.postMessage(${JSON.stringify({ type: "META_OAUTH_CALLBACK", ...payload })}, "*");
      setTimeout(() => window.close(), 500);
    </script>
  </body>
</html>`;
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

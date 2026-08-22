/** Shared server-side ingest handler for the secured lead endpoints. */
import { conversionEventForStatus, ingestSchema, normalizeLead } from "./leads.server";
import { resolveIngestWorkspace } from "./workspaces.server";

type IngestOptions = {
  leadType: string;
  funnelType: "platform" | "quote";
  status: string;
  ingestSource: string;
};

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Verifies the ingest credential, resolves the workspace (tenant) it belongs to
 * and stores the lead under that owner. Never returns internals to the caller.
 */
export async function handleLeadIngest(request: Request, options: IngestOptions) {
  const token =
    request.headers.get("x-lead-ingest-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return unauthorized();

  let workspaceId: string;
  try {
    const resolved = await resolveIngestWorkspace(token);
    if (!resolved) return unauthorized();
    workspaceId = resolved.workspaceId;
  } catch (e) {
    console.error("[lead-ingest] credential resolve failed", {
      message: e instanceof Error ? e.message : "unknown error",
    });
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_payload", issues: parsed.error.issues.map((i) => i.path.join(".")) }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
  }
  const payload = parsed.data;


  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let industryId: string | null = null;
    if (payload.industry_slug || payload.industry_name) {
      const { data: industry } = await supabaseAdmin
        .from("industries")
        .select("id,name")
        .or(
          [
            payload.industry_slug ? `slug.eq.${payload.industry_slug}` : null,
            payload.industry_name ? `name.eq.${payload.industry_name}` : null,
          ]
            .filter(Boolean)
            .join(","),
        )
        .limit(1)
        .maybeSingle();
      industryId = industry?.id ?? null;
      if (industry?.name) payload.industry_name = industry.name;
    }

    let landingPageId: string | null = null;
    const slug = payload.landing_page_slug || payload.landing_page;
    if (slug) {
      const { data: page } = await supabaseAdmin
        .from("landing_pages")
        .select("id")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle();
      landingPageId = page?.id ?? null;
    }

    const row = normalizeLead(payload, { ...options, industryId, landingPageId });
    const { data: inserted, error } = await supabaseAdmin
      .from("leads")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("lead_activities").insert({
      lead_id: inserted.id,
      actor_label: options.ingestSource,
      event_type: "lead_received",
      description: `Lead ontvangen via ${row.platform ?? options.ingestSource}`,
      meta: { ingest_source: options.ingestSource },
    });

    const conversionEvent = conversionEventForStatus(options.status);
    if (conversionEvent) {
      await supabaseAdmin.from("lead_conversion_events").insert({
        lead_id: inserted.id,
        conversion_event: conversionEvent,
        value: payload.expected_value ?? null,
      });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[lead-ingest] failed", {
      source: options.ingestSource,
      message: e instanceof Error ? e.message : "unknown error",
    });
    return new Response(JSON.stringify({ error: "ingest_failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

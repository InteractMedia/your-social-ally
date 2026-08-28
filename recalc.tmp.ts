import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { evaluateDraftExecution } from "@/lib/campaign-builder.server";
const ws = "83ed4e09-afd5-4243-a1e8-1ddb4a12d2da";
const { data: rows } = await supabaseAdmin.from("search_campaign_drafts").select("id,landing_page_name,status,landing_page_id,landing_page_url,funnel").eq("workspace_id", ws);
for (const r of rows ?? []) {
  const { data: page } = await supabaseAdmin.from("landing_pages").select("status,slug").eq("id", r.landing_page_id).maybeSingle();
  const res = await evaluateDraftExecution({ ctx: { supabase: supabaseAdmin } as any, workspaceId: ws, landingPageId: r.landing_page_id, landingStatus: page?.status ?? null, url: r.landing_page_url, funnel: r.funnel });
  console.log(JSON.stringify({ name: r.landing_page_name, slug: page?.slug, url: r.landing_page_url, ...res }, null, 1));
}
console.log("done");

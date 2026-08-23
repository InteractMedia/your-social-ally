import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CUSTOMER_STATUSES,
  LEAD_TYPE_BY_FUNNEL,
  QUALIFIED_STATUSES,
  STATUS_LABELS,
  QUALITY_LABELS,
  periodBounds,
} from "./leads-shared";
import { conversionEventForStatus } from "./leads.server";
import { requireUserWorkspace } from "./workspaces.server";
import {
  attributionInput,
  createLeadInput,
  customerInput,
  idInput,
  industryInput,
  listLeadsInput,
  notesInput,
  periodInput,
  poorReasonInput,
  qualityInput,
  statusInput,
} from "./leads-schemas";

const LEAD_COLUMNS =
  "id,created_at,received_at,updated_at,lead_type,funnel_type,status,lead_quality,poor_reason_id,poor_reason,poor_reason_label,poor_reason_notes,poor_marked_at,company_name,contact_name,email,phone,website,company_domain,company_size,kvk_number,notes,industry_id,industry_name,source,medium,platform,campaign_id,campaign_name,ad_group_id,ad_group_name,ad_id,ad_name,keyword,search_term,match_type,landing_page,landing_page_id,landing_page_variant,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid,gbraid,wbraid,li_fat_id,ttclid,fbclid,attribution_model,first_touch,became_customer,customer_date,order_value,revenue,gross_margin,expected_value,lifetime_value,first_order_date,ingest_source";

/** Configurable "why is this a poor lead" catalogue: global defaults + own additions. */
export const listPoorLeadReasons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("poor_lead_reasons")
      .select("id,key,label,requires_notes,sort_order,user_id")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { reasons: data ?? [] };
  });

export const createPoorLeadReason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => poorReasonInput.parse(d))
  .handler(async ({ context, data }) => {
    const key = data.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
    const { data: row, error } = await context.supabase
      .from("poor_lead_reasons")
      .insert({
        user_id: context.userId,
        key,
        label: data.label.trim(),
        requires_notes: data.requires_notes ?? false,
        sort_order: 500,
      })
      .select("id,key,label,requires_notes")
      .single();
    if (error) throw new Error(error.message);
    return { reason: row };
  });

/**
 * Poor-lead analysis: counts per reason, broken down by the marketing
 * dimensions the AI Ads Analyst needs (platform, campagne, branche,
 * zoekwoord, zoekterm, landingspagina).
 */
export const getPoorLeadAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    const { from, to } = periodBounds(data.start, data.end);
    const { data: rows, error } = await context.supabase
      .from("leads")
      .select(
        "id,poor_reason,poor_reason_label,poor_reason_notes,poor_marked_at,platform,campaign_id,campaign_name,industry_name,keyword,search_term,landing_page",
      )
      .eq("lead_quality", "poor")
      .gte("received_at", from)
      .lt("received_at", to);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const group = (pick: (r: (typeof list)[number]) => string | null) => {
      const map = new Map<string, { value: string; reasons: Record<string, number>; total: number }>();
      for (const row of list) {
        const value = pick(row) ?? "Onbekend";
        const reason = row.poor_reason_label ?? row.poor_reason ?? "Onbekend";
        const bucket = map.get(value) ?? { value, reasons: {}, total: 0 };
        bucket.reasons[reason] = (bucket.reasons[reason] ?? 0) + 1;
        bucket.total += 1;
        map.set(value, bucket);
      }
      return [...map.values()].sort((a, b) => b.total - a.total);
    };
    const byReason = new Map<string, { reason: string; label: string; count: number }>();
    for (const row of list) {
      const key = row.poor_reason ?? "unknown";
      const bucket =
        byReason.get(key) ??
        { reason: key, label: row.poor_reason_label ?? row.poor_reason ?? "Onbekend", count: 0 };
      bucket.count += 1;
      byReason.set(key, bucket);
    }
    return {
      total: list.length,
      byReason: [...byReason.values()].sort((a, b) => b.count - a.count),
      byPlatform: group((r) => r.platform),
      byCampaign: group((r) => r.campaign_name ?? r.campaign_id),
      byIndustry: group((r) => r.industry_name),
      byKeyword: group((r) => r.keyword),
      bySearchTerm: group((r) => r.search_term),
      byLandingPage: group((r) => r.landing_page),
    };
  });

export const listIndustries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("industries")
      .select("id,name,slug,sort_order,active")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { industries: data ?? [] };
  });

export const createIndustry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => industryInput.parse(d))
  .handler(async ({ context, data }) => {
    const slug = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const { data: row, error } = await context.supabase
      .from("industries")
      .insert({ name: data.name.trim(), slug, user_id: context.userId, sort_order: 500 })
      .select("id,name,slug")
      .single();
    if (error) throw new Error(error.message);
    return { industry: row };
  });

export const listLandingPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("landing_pages")
      .select("id,name,slug,url,funnel_type,industry_id,active")
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { pages: data ?? [] };
  });

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listLeadsInput.parse(d))
  .handler(async ({ context, data }) => {
    const { from, to } = periodBounds(data.start, data.end);
    let query = context.supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .gte("received_at", from)
      .lt("received_at", to)
      .order("received_at", { ascending: false })
      .limit(500);
    if (data.funnel) query = query.eq("funnel_type", data.funnel);
    if (data.leadType) query = query.eq("lead_type", data.leadType);
    if (data.industryId) query = query.eq("industry_id", data.industryId);
    if (data.platform) query = query.eq("platform", data.platform);
    if (data.campaignId) query = query.eq("campaign_id", data.campaignId);
    if (data.status) query = query.eq("status", data.status);
    if (data.quality) query = query.eq("lead_quality", data.quality);
    if (data.poorReason) query = query.eq("poor_reason", data.poorReason);
    if (data.search) {
      const term = `%${data.search.replace(/[%,]/g, "")}%`;
      query = query.or(
        `company_name.ilike.${term},contact_name.ilike.${term},email.ilike.${term}`,
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { leads: rows ?? [] };
  });

export const getLeadsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    const { from, to } = periodBounds(data.start, data.end);
    const { data: rows, error } = await context.supabase
      .from("leads")
      .select("id,status,lead_quality,funnel_type,became_customer,revenue,order_value,platform")
      .gte("received_at", from)
      .lt("received_at", to);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const qualified = list.filter(
      (l) => l.lead_quality === "qualified" || QUALIFIED_STATUSES.includes(l.status),
    ).length;
    const hot = list.filter((l) => l.lead_quality === "hot" || l.status === "hot").length;
    const customers = list.filter(
      (l) => l.became_customer || CUSTOMER_STATUSES.includes(l.status),
    ).length;
    const revenue = list.reduce((sum, l) => sum + Number(l.revenue ?? l.order_value ?? 0), 0);
    return {
      totalLeads: list.length,
      qualified,
      hot,
      customers,
      revenue,
      attributedLeads: list.filter((l) => Boolean(l.platform)).length,
    };
  });

export const getFunnelAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    const { from, to } = periodBounds(data.start, data.end);
    const { data: rows, error } = await context.supabase
      .from("leads")
      .select("id,funnel_type,status,lead_quality,became_customer,revenue,order_value")
      .gte("received_at", from)
      .lt("received_at", to);
    if (error) throw new Error(error.message);
    return { leads: rows ?? [] };
  });

export const getBranchAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    const { from, to } = periodBounds(data.start, data.end);
    const [leadsRes, industriesRes] = await Promise.all([
      context.supabase
        .from("leads")
        .select("id,industry_id,industry_name,status,lead_quality,became_customer,revenue,order_value")
        .gte("received_at", from)
        .lt("received_at", to),
      context.supabase.from("industries").select("id,name").eq("active", true),
    ]);
    if (leadsRes.error) throw new Error(leadsRes.error.message);
    if (industriesRes.error) throw new Error(industriesRes.error.message);
    const names = new Map((industriesRes.data ?? []).map((i) => [i.id, i.name]));
    const buckets = new Map<
      string,
      { key: string; name: string; leads: number; qualified: number; hot: number; customers: number; revenue: number }
    >();
    for (const lead of leadsRes.data ?? []) {
      const key = lead.industry_id ?? "unknown";
      const name = lead.industry_id
        ? (names.get(lead.industry_id) ?? lead.industry_name ?? "Onbekend")
        : (lead.industry_name ?? "Onbekend");
      const bucket =
        buckets.get(key) ??
        { key, name, leads: 0, qualified: 0, hot: 0, customers: 0, revenue: 0 };
      bucket.leads += 1;
      if (lead.lead_quality === "qualified" || QUALIFIED_STATUSES.includes(lead.status))
        bucket.qualified += 1;
      if (lead.lead_quality === "hot" || lead.status === "hot") bucket.hot += 1;
      if (lead.became_customer || CUSTOMER_STATUSES.includes(lead.status)) bucket.customers += 1;
      bucket.revenue += Number(lead.revenue ?? lead.order_value ?? 0);
      buckets.set(key, bucket);
    }
    return { branches: [...buckets.values()].sort((a, b) => b.leads - a.leads) };
  });

/** Per-campaign B2B lead results, keyed by Google Ads campaign id / campaign name. */
export const getCampaignLeadStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    const { from, to } = periodBounds(data.start, data.end);
    const { data: rows, error } = await context.supabase
      .from("leads")
      .select(
        "id,campaign_id,campaign_name,platform,status,lead_quality,became_customer,revenue,order_value",
      )
      .gte("received_at", from)
      .lt("received_at", to)
      .not("platform", "is", null);
    if (error) throw new Error(error.message);
    const buckets = new Map<
      string,
      {
        campaignId: string | null;
        campaignName: string | null;
        platform: string | null;
        leads: number;
        qualified: number;
        hot: number;
        customers: number;
        revenue: number;
      }
    >();
    for (const lead of rows ?? []) {
      if (!lead.campaign_id && !lead.campaign_name) continue;
      const key = lead.campaign_id ?? `name:${lead.campaign_name}`;
      const bucket =
        buckets.get(key) ??
        {
          campaignId: lead.campaign_id,
          campaignName: lead.campaign_name,
          platform: lead.platform,
          leads: 0,
          qualified: 0,
          hot: 0,
          customers: 0,
          revenue: 0,
        };
      bucket.leads += 1;
      if (lead.lead_quality === "qualified" || QUALIFIED_STATUSES.includes(lead.status))
        bucket.qualified += 1;
      if (lead.lead_quality === "hot" || lead.status === "hot") bucket.hot += 1;
      if (lead.became_customer || CUSTOMER_STATUSES.includes(lead.status)) bucket.customers += 1;
      bucket.revenue += Number(lead.revenue ?? lead.order_value ?? 0);
      buckets.set(key, bucket);
    }
    return { campaigns: [...buckets.values()].sort((a, b) => b.leads - a.leads) };
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ context, data }) => {
    const [leadRes, actRes, convRes] = await Promise.all([
      context.supabase.from("leads").select(LEAD_COLUMNS).eq("id", data.id).maybeSingle(),
      context.supabase
        .from("lead_activities")
        .select("id,event_type,description,meta,created_at,actor_label")
        .eq("lead_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("lead_conversion_events")
        .select(
          "id,conversion_event,conversion_timestamp,value,currency,platform,uploaded_to_google,google_upload_timestamp,google_upload_status,google_upload_error",
        )
        .eq("lead_id", data.id)
        .order("conversion_timestamp", { ascending: false }),
    ]);
    if (leadRes.error) throw new Error(leadRes.error.message);
    return {
      lead: leadRes.data ?? null,
      activities: actRes.data ?? [],
      conversions: convRes.data ?? [],
    };
  });

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createLeadInput.parse(d))
  .handler(async ({ context, data }) => {
    const funnel = data.funnel_type;
    const status = funnel === "platform" ? "application" : "quote_request";
    const workspaceId = await requireUserWorkspace(
      context.supabase,
      context.userId,
      (context.claims as { email?: string } | undefined)?.email ?? null,
    );
    const { funnel_type: _funnel, ...rest } = data;
    const clickIds: Record<string, string> = {};
    for (const key of ["gclid", "gbraid", "wbraid"] as const) {
      if (rest[key]) clickIds[key] = rest[key] as string;
    }
    let industryName: string | null = null;
    if (rest.industry_id) {
      const { data: ind } = await context.supabase
        .from("industries")
        .select("name")
        .eq("id", rest.industry_id)
        .maybeSingle();
      industryName = ind?.name ?? null;
    }
    const platform =
      rest.platform ||
      (rest.gclid || rest.gbraid || rest.wbraid
        ? "google_ads"
        : rest.utm_source
          ? rest.utm_source
          : null);
    const { data: row, error } = await context.supabase
      .from("leads")
      .insert({
        ...rest,
        workspace_id: workspaceId,
        user_id: context.userId,
        funnel_type: funnel,
        lead_type: LEAD_TYPE_BY_FUNNEL[funnel],
        status,
        lead_quality: "unknown",
        industry_name: industryName,
        platform,
        source: rest.source || rest.utm_source || null,
        medium: rest.medium || rest.utm_medium || null,
        campaign_name: rest.campaign_name || rest.utm_campaign || null,
        keyword: rest.keyword || rest.utm_term || null,
        click_ids: clickIds,
        ingest_source: "manual",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_activities").insert({
      lead_id: row.id,
      actor_id: context.userId,
      event_type: "lead_received",
      description: `Lead handmatig toegevoegd${platform ? ` (bron: ${platform})` : ""}`,
    });
    const conversionEvent = conversionEventForStatus(status);
    if (conversionEvent) {
      await context.supabase.from("lead_conversion_events").insert({
        lead_id: row.id,
        conversion_event: conversionEvent,
      });
    }
    return { id: row.id as string };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusInput.parse(d))
  .handler(async ({ context, data }) => {
    const patch: {
      status: string;
      first_order_date?: string;
      lead_quality?: string;
      status_history?: unknown;
    } = { status: data.status };
    if (data.status === "first_order") patch.first_order_date = new Date().toISOString().slice(0, 10);
    if (data.status === "hot") patch.lead_quality = "hot";
    if (data.status === "qualified") patch.lead_quality = "qualified";
    // Volledige statushistorie blijft bewaard op de lead zelf (naast lead_activities),
    // zodat funnel-doorlooptijden en attributie later reconstrueerbaar zijn.
    const { data: current } = await context.supabase
      .from("leads")
      .select("status_history")
      .eq("id", data.id)
      .maybeSingle();
    const history = Array.isArray(current?.status_history)
      ? (current!.status_history as unknown[])
      : [];
    patch.status_history = [
      ...history,
      { status: data.status, at: new Date().toISOString(), by: context.userId },
    ];
    const { error } = await context.supabase
      .from("leads")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_activities").insert({
      lead_id: data.id,
      actor_id: context.userId,
      event_type: "status_changed",
      description: `Status gewijzigd naar ${STATUS_LABELS[data.status] ?? data.status}`,
      meta: { status: data.status },
    });
    const conversionEvent = conversionEventForStatus(data.status);
    if (conversionEvent) {
      await context.supabase.from("lead_conversion_events").insert({
        lead_id: data.id,
        conversion_event: conversionEvent,
      });
    }
    return { ok: true as const };
  });

export const updateLeadQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => qualityInput.parse(d))
  .handler(async ({ context, data }) => {
    const patch: {
      lead_quality: string;
      poor_reason_id: string | null;
      poor_reason: string | null;
      poor_reason_label: string | null;
      poor_reason_notes: string | null;
      poor_marked_at: string | null;
    } = {
      lead_quality: data.quality,
      poor_reason_id: null,
      poor_reason: null,
      poor_reason_label: null,
      poor_reason_notes: null,
      poor_marked_at: null,
    };
    let reasonLabel: string | null = null;
    if (data.quality === "poor") {
      if (!data.poorReasonKey) throw new Error("Kies een reden waarom deze lead slecht is.");
      const { data: reason, error: reasonError } = await context.supabase
        .from("poor_lead_reasons")
        .select("id,key,label,requires_notes")
        .eq("key", data.poorReasonKey)
        .eq("active", true)
        .order("user_id", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (reasonError) throw new Error(reasonError.message);
      if (!reason) throw new Error("Onbekende reden voor slechte lead.");
      const notes = data.poorReasonNotes?.trim() || null;
      if (reason.requires_notes && !notes)
        throw new Error(`Toelichting is verplicht bij "${reason.label}".`);
      reasonLabel = reason.label;
      patch.poor_reason_id = reason.id;
      patch.poor_reason = reason.key;
      patch.poor_reason_label = reason.label;
      patch.poor_reason_notes = notes;
      patch.poor_marked_at = new Date().toISOString();
    }
    const { error } = await context.supabase.from("leads").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_activities").insert({
      lead_id: data.id,
      actor_id: context.userId,
      event_type: data.quality === "poor" ? "poor_reason_set" : "quality_changed",
      description:
        data.quality === "poor"
          ? `Kwaliteit gezet op Slecht — reden: ${reasonLabel}${
              patch.poor_reason_notes ? ` (${patch.poor_reason_notes as string})` : ""
            }`
          : `Kwaliteit gezet op ${QUALITY_LABELS[data.quality]}`,
      meta: {
        quality: data.quality,
        poor_reason: patch.poor_reason ?? null,
        poor_reason_label: patch.poor_reason_label ?? null,
        poor_reason_notes: patch.poor_reason_notes ?? null,
      },
    });
    if (data.quality === "qualified" || data.quality === "hot") {
      await context.supabase.from("lead_conversion_events").insert({
        lead_id: data.id,
        conversion_event: "qualified_lead",
      });
    }
    return { ok: true as const };
  });

export const markLeadAsCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => customerInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: lead, error: readError } = await context.supabase
      .from("leads")
      .select("funnel_type,lifetime_value")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    const status = lead?.funnel_type === "platform" ? "first_order" : "customer_won";
    const { error } = await context.supabase
      .from("leads")
      .update({
        became_customer: true,
        customer_date: data.customer_date,
        revenue: data.revenue,
        order_value: data.revenue,
        gross_margin: data.gross_margin ?? null,
        lifetime_value: Number(lead?.lifetime_value ?? 0) + data.revenue,
        first_order_date: data.customer_date,
        status,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_activities").insert([
      {
        lead_id: data.id,
        actor_id: context.userId,
        event_type: "customer_won",
        description: `Klant geworden op ${data.customer_date}`,
      },
      {
        lead_id: data.id,
        actor_id: context.userId,
        event_type: "revenue_added",
        description: `Omzet toegevoegd: € ${data.revenue.toFixed(2)}${
          data.gross_margin != null ? ` · marge € ${data.gross_margin.toFixed(2)}` : ""
        }`,
        meta: { revenue: data.revenue, gross_margin: data.gross_margin ?? null },
      },
    ]);
    await context.supabase.from("lead_conversion_events").insert({
      lead_id: data.id,
      conversion_event: "customer_won",
      value: data.revenue,
      conversion_timestamp: new Date(`${data.customer_date}T12:00:00.000Z`).toISOString(),
    });
    return { ok: true as const };
  });

export const updateLeadNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => notesInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ notes: data.notes })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_activities").insert({
      lead_id: data.id,
      actor_id: context.userId,
      event_type: "note_added",
      description: "Notitie bijgewerkt",
    });
    return { ok: true as const };
  });

export const updateLeadAttribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attributionInput.parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("leads").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_activities").insert({
      lead_id: id,
      actor_id: context.userId,
      event_type: "attribution_changed",
      description: "Marketingattributie aangepast",
      meta: patch,
    });
    return { ok: true as const };
  });

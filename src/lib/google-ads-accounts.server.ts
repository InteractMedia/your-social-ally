/** Server-only: account resolution + sync of Google Ads customer accounts. */
import { gaql, defaultCustomerId, GoogleAdsApiError } from "./google-ads.server";

export type AdsContext = { supabase: any; userId: string };

export type AdsAccount = {
  customerId: string;
  name: string;
  currencyCode: string | null;
  timeZone: string | null;
  isManager: boolean;
  managerCustomerId: string | null;
  isSelected: boolean;
  lastSyncedAt: string | null;
};

/** The customer id the app should query: user's selected account, else the project default. */
export async function resolveCustomerId(ctx: AdsContext, requested?: string | null): Promise<string> {
  if (requested) {
    const cid = requested.replace(/[^0-9]/g, "");
    if (cid) return cid;
  }
  const { data } = await ctx.supabase
    .from("google_ads_accounts")
    .select("customer_id")
    .eq("user_id", ctx.userId)
    .eq("is_selected", true)
    .maybeSingle();
  const stored = data?.customer_id as string | undefined;
  const fallback = defaultCustomerId();
  const cid = stored || fallback;
  if (!cid)
    throw new GoogleAdsApiError(
      "Er is nog geen Google Ads klantaccount gekoppeld aan dit project.",
      412,
    );
  return cid;
}

/** Read the live account tree (MCC-aware) and mirror it into the database. */
export async function syncAccounts(ctx: AdsContext): Promise<AdsAccount[]> {
  const root = defaultCustomerId();
  if (!root) throw new GoogleAdsApiError("Er is nog geen Google Ads klantaccount gekoppeld.", 412);

  const rows = await gaql(
    root,
    `SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager,
            customer_client.currency_code, customer_client.time_zone, customer_client.level,
            customer_client.status
     FROM customer_client
     WHERE customer_client.status = 'ENABLED'`,
  );

  const now = new Date().toISOString();
  const accounts = rows
    .map((r: any) => r.customerClient)
    .filter(Boolean)
    .map((c: any) => ({
      customerId: String(c.id),
      name: c.descriptiveName || String(c.id),
      currencyCode: c.currencyCode ?? null,
      timeZone: c.timeZone ?? null,
      isManager: Boolean(c.manager),
      managerCustomerId: Number(c.level) > 0 ? root : null,
    }));

  const { data: existing } = await ctx.supabase
    .from("google_ads_accounts")
    .select("customer_id, is_selected")
    .eq("user_id", ctx.userId);

  const hasSelection = (existing ?? []).some((r: any) => r.is_selected);
  const selectedFallback = accounts.find((a) => !a.isManager)?.customerId ?? accounts[0]?.customerId;

  for (const a of accounts) {
    const { error } = await ctx.supabase.from("google_ads_accounts").upsert(
      {
        user_id: ctx.userId,
        customer_id: a.customerId,
        descriptive_name: a.name,
        currency_code: a.currencyCode,
        time_zone: a.timeZone,
        is_manager: a.isManager,
        manager_customer_id: a.managerCustomerId,
        is_selected: hasSelection
          ? (existing ?? []).find((r: any) => r.customer_id === a.customerId)?.is_selected ?? false
          : a.customerId === selectedFallback,
        last_synced_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,customer_id" },
    );
    if (error) console.error("[GoogleAds] account upsert failed", error);
  }

  return listAccounts(ctx);
}

export async function listAccounts(ctx: AdsContext): Promise<AdsAccount[]> {
  const { data, error } = await ctx.supabase
    .from("google_ads_accounts")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("is_manager", { ascending: true })
    .order("descriptive_name", { ascending: true });
  if (error) {
    console.error("[GoogleAds] account list failed", error);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    customerId: r.customer_id,
    name: r.descriptive_name ?? r.customer_id,
    currencyCode: r.currency_code,
    timeZone: r.time_zone,
    isManager: r.is_manager,
    managerCustomerId: r.manager_customer_id,
    isSelected: r.is_selected,
    lastSyncedAt: r.last_synced_at,
  }));
}

export async function touchSync(ctx: AdsContext, customerId: string) {
  const now = new Date().toISOString();
  await ctx.supabase
    .from("google_ads_accounts")
    .update({ last_synced_at: now, updated_at: now })
    .eq("user_id", ctx.userId)
    .eq("customer_id", customerId);
  return now;
}

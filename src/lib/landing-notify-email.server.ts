/**
 * Server-only e-mailnotificatie bij nieuwe offerte-/platformaanvragen.
 *
 * - Live aanvragen sturen een normale notificatie naar het geconfigureerde adres
 *   (pagina-niveau, met fallback naar workspace-niveau).
 * - Test/preview-aanvragen sturen alleen een mail wanneer testnotificaties
 *   expliciet aan staan op de pagina, en dan altijd duidelijk als TEST gemarkeerd.
 *
 * Secrets (RESEND_API_KEY) worden uitsluitend hier gelezen — nooit in clientcode.
 */
import process from "node:process";

export const APP_BASE_URL = "https://socialcockpit.nl";

export type LeadNotificationInput = {
  to: string;
  isTest: boolean;
  leadId: string;
  pageName: string;
  slug: string;
  funnel: "quote" | "platform";
  industry: string | null;
  company: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  quantity: string | null;
  budget: string | null;
  deliveryDate: string | null;
  interests: string | null;
  personalization: string | null
  message: string | null;
  utm: Record<string, string | null>;
};

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | null | undefined) {
  const shown = value && value.trim() ? esc(value.trim()) : "—";
  return `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${esc(
    label,
  )}</td><td style="padding:6px 0;color:#111827;font-size:14px">${shown}</td></tr>`;
}

function campaignSource(utm: Record<string, string | null>) {
  const parts = [
    utm["utm_source"] && `source: ${utm["utm_source"]}`,
    utm["utm_medium"] && `medium: ${utm["utm_medium"]}`,
    utm["utm_campaign"] && `campagne: ${utm["utm_campaign"]}`,
    utm["utm_content"] && `content: ${utm["utm_content"]}`,
    utm["utm_term"] && `term: ${utm["utm_term"]}`,
    utm["gclid"] && "GCLID aanwezig",
    utm["gbraid"] && "GBRAID aanwezig",
    utm["wbraid"] && "WBRAID aanwezig",
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "Direct / geen campagneparameters";
}

function buildEmail(input: LeadNotificationInput) {
  const prefix = input.isTest ? "[TEST] " : "";
  const funnelLabel = input.funnel === "quote" ? "Offerteaanvraag" : "Cadeauplatform-aanvraag";
  const subject = `${prefix}Nieuwe ${funnelLabel.toLowerCase()}: ${input.company ?? "onbekend bedrijf"}`;
  const leadUrl = `${APP_BASE_URL}/leads/${input.leadId}`;

  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f7f5f2;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    ${
      input.isTest
        ? `<div style="background:#b45309;color:#ffffff;padding:10px 20px;font-size:13px;font-weight:700;letter-spacing:.04em">TESTAANVRAAG — DIT IS GEEN ECHTE LEAD</div>`
        : ""
    }
    <div style="padding:24px 20px 8px">
      <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.08em">${esc(funnelLabel)}</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#111827">${esc(input.company ?? "Onbekend bedrijf")}</h1>
    </div>
    <div style="padding:8px 20px 4px">
      <table style="width:100%;border-collapse:collapse">
        ${row("Bedrijfsnaam", input.company)}
        ${row("Contactpersoon", input.contact)}
        ${row("E-mail", input.email)}
        ${row("Telefoon", input.phone)}
        ${row("Branche", input.industry)}
        ${row("Aantal ontvangers", input.quantity)}
        ${row("Budgetindicatie", input.budget)}
        ${row("Gewenste leverdatum", input.deliveryDate)}
        ${row("Interesses", input.interests)}
        ${row("Personalisatie", input.personalization)}
        ${row("Toelichting", input.message)}
        ${row("Landingspagina", `${input.pageName} (${input.slug})`)}
        ${row("Campagne / bron", campaignSource(input.utm))}
      </table>
    </div>
    <div style="padding:16px 20px 28px">
      <a href="${leadUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:6px;font-size:14px;font-weight:600">Open lead in SocialCockpit</a>
    </div>
  </div>
</body></html>`;

  return { subject, html };
}

/** Verstuurt de notificatie. Ontbrekende configuratie logt alleen, nooit een throw. */
export async function sendLeadNotificationEmail(input: LeadNotificationInput) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.warn("[landing] e-mailnotificatie overgeslagen: RESEND_API_KEY ontbreekt");
    return { sent: false as const, reason: "missing_api_key" };
  }
  const from = process.env["LEAD_NOTIFY_FROM"] ?? "SocialCockpit <leads@zoetbezorgen.app>";
  const { subject, html } = buildEmail(input);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [input.to], subject, html }),
    });
    if (!res.ok) {
      console.error("[landing] e-mailnotificatie mislukt", { status: res.status });
      return { sent: false as const, reason: "provider_error" };
    }
    return { sent: true as const };
  } catch (e) {
    console.error("[landing] e-mailnotificatie fout", {
      message: e instanceof Error ? e.message : "unknown",
    });
    return { sent: false as const, reason: "network_error" };
  }
}

/**
 * Client-safe shared model for the ZoetBezorgen B2B Landing Page Engine.
 *
 * The engine is data-driven: one template renders any page from its
 * configuration (sections + form + products). Adding a page never requires code.
 */

import type { SectionDesign } from "./landing-design-system";
import type { ProductImageType, SectionVisual } from "./landing-visual";

export type LandingFunnel = "quote" | "platform";

export const LANDING_FUNNEL_LABELS: Record<LandingFunnel, string> = {
  quote: "Offerte",
  platform: "Cadeauplatform",
};

/** URL prefix per funnel — keeps routing flexible for future funnels/domains. */
export const LANDING_FUNNEL_PREFIX: Record<LandingFunnel, string> = {
  quote: "offerte",
  platform: "cadeauplatform",
};

export const LANDING_FUNNEL_BY_PREFIX: Record<string, LandingFunnel> = {
  offerte: "quote",
  cadeauplatform: "platform",
};

export type LandingStatus = "draft" | "published" | "paused" | "archived";

export const LANDING_STATUS_LABELS: Record<LandingStatus, string> = {
  draft: "Concept",
  published: "Gepubliceerd",
  paused: "Gepauzeerd",
  archived: "Gearchiveerd",
};

/** Block types the base template supports. Order here is the default order. */
export const BLOCK_TYPES = [
  "hero",
  "usps",
  "intro",
  "products",
  "personalization",
  "how_it_works",
  "why_us",
  "use_cases",
  "social_proof",
  "testimonials",
  "faq",
  "cta_banner",
  "form",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  usps: "USP's",
  intro: "Intro",
  products: "Producten / cadeauvoorbeelden",
  personalization: "Personalisatie",
  how_it_works: "Hoe werkt het",
  why_us: "Waarom ZoetBezorgen",
  use_cases: "Voor wie / toepassingen",
  social_proof: "Social proof / logo's",
  testimonials: "Testimonials & cases",
  faq: "FAQ",
  cta_banner: "CTA-banner",
  form: "Offerteformulier",
};

export type BlockItem = {
  title?: string;
  text?: string;
  /** Optional lucide-ish keyword, rendered as a neutral badge (no HTML). */
  badge?: string;
};

export type BlockContent = {
  /** Controlled visual direction (design system variants only). */
  design?: SectionDesign;
  /** Structured visual plan — the section's image slot. */
  visual?: SectionVisual;
  title?: string;
  subtitle?: string;
  body?: string;
  image_url?: string;
  image_alt?: string;
  mobile_image_url?: string;
  /** Second image slot — used by the before/after composition (V1.9). */
  image_url_2?: string;
  image_alt_2?: string;
  /** Extra beeldslots 3 & 4 — o.a. de 4-foto moments-compositie (V2.1). */
  image_url_3?: string;
  image_alt_3?: string;
  image_url_4?: string;
  image_alt_4?: string;
  /** Vrije fotowand (product_showcase_polaroids) — polaroid-raster (V2.1). */
  gallery?: { url: string; alt?: string; caption?: string }[];
  /** Logo-cloud (social_proof logo_cloud_stats) (V2.1). */
  logos?: { url: string; alt?: string }[];
  /** Statistieken zoals reviewscore (social_proof logo_cloud_stats) (V2.1). */
  stats?: { value: string; label: string }[];
  cta_label?: string;
  cta_url?: string;
  secondary_cta_label?: string;
  secondary_cta_url?: string;
  /** Pill/badge-tekst boven de kop (V2.0 ZB-composities). */
  badge?: string;
  /** Microcopy onder de CTA's, bv. risk-reversal (V2.0). */
  footnote?: string;
  /** Zwevend label op de hero-afbeelding (V2.0 candy_hero_collage). */
  image_badge?: string;
  items?: BlockItem[];
};

export type LandingSection = {
  id: string;
  block_type: BlockType | string;
  sort_order: number;
  enabled: boolean;
  use_global: boolean;
  global_key: string | null;
  variant_key: string;
  content: BlockContent;
};

/* ------------------------------------------------------------------ forms */

export type FieldState = "required" | "optional" | "hidden" | "disabled";

export const FIELD_STATE_LABELS: Record<FieldState, string> = {
  required: "Verplicht",
  optional: "Optioneel",
  hidden: "Verborgen",
  disabled: "Uitgeschakeld",
};

export type FormFieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "boolean"
  | "textarea";

export type FormFieldConfig = {
  key: string;
  label: string;
  type: FormFieldType;
  state: FieldState;
  placeholder?: string;
  help?: string;
  options?: string[];
  /** Custom fields added from the manager (not part of the base set). */
  custom?: boolean;
};

/** Base B2B quote field set — every page starts from this and can override. */
export const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  { key: "company_name", label: "Bedrijfsnaam", type: "text", state: "required" },
  { key: "contact_name", label: "Contactpersoon", type: "text", state: "required" },
  { key: "email", label: "Zakelijk e-mailadres", type: "email", state: "required" },
  { key: "phone", label: "Telefoonnummer", type: "tel", state: "required" },
  { key: "website", label: "Website", type: "url", state: "optional" },
  {
    key: "quantity",
    label: "Aantal ontvangers",
    type: "number",
    state: "required",
    placeholder: "bijv. 75",
  },
  { key: "delivery_date", label: "Gewenste leverdatum", type: "date", state: "optional" },
  {
    key: "budget",
    label: "Budgetindicatie per geschenk",
    type: "select",
    state: "optional",
    options: ["Tot € 10", "€ 10 – € 20", "€ 20 – € 35", "€ 35 – € 50", "Meer dan € 50", "Nog onbekend"],
  },
  {
    key: "interests",
    label: "Soort geschenk / interesse",
    type: "multiselect",
    state: "optional",
    options: [
      "Puntzak snoep",
      "Snoeppot",
      "Bonbons",
      "Chocoladeletter",
      "Kerstgeschenk",
      "Weet ik nog niet",
    ],
  },
  { key: "personalization", label: "Personalisatie gewenst", type: "boolean", state: "optional" },
  {
    key: "message",
    label: "Toelichting",
    type: "textarea",
    state: "optional",
    placeholder: "Waarvoor is het geschenk bedoeld?",
  },
];

export type LandingFormConfig = {
  id?: string;
  title: string | null;
  intro: string | null;
  submit_label: string;
  success_title: string;
  success_body: string;
  fields: FormFieldConfig[];
};

export const DEFAULT_FORM_CONFIG: LandingFormConfig = {
  title: "Vraag je zakelijke offerte aan",
  intro: "Je ontvangt binnen één werkdag een voorstel op maat — zonder verplichtingen.",
  submit_label: "Offerte aanvragen",
  success_title: "Bedankt voor je aanvraag",
  success_body: "We nemen zo snel mogelijk contact met je op — meestal binnen één werkdag.",
  fields: DEFAULT_FORM_FIELDS,
};

/* ---------------------------------------------------------- attribution */

export const ATTRIBUTION_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "fbclid",
  "ttclid",
  "li_fat_id",
  "msclkid",
] as const;

export type AttributionSnapshot = {
  first_touch?: Record<string, string | null>;
  last_non_direct?: Record<string, string | null>;
  first_landing_at?: string;
  landing_page?: string;
  landing_page_slug?: string;
  landing_page_id?: string;
  industry_name?: string | null;
  referrer?: string | null;
  session_id?: string;
};

export const LANDING_EVENT_TYPES = [
  "page_view",
  "cta_click",
  "form_started",
  "form_submitted",
  "thank_you",
] as const;

export type LandingEventType = (typeof LANDING_EVENT_TYPES)[number];

export const LANDING_EVENT_LABELS: Record<LandingEventType, string> = {
  page_view: "Paginabezoek",
  cta_click: "CTA-klik",
  form_started: "Formulier gestart",
  form_submitted: "Formulier verzonden",
  thank_you: "Bedankpagina",
};

export type LandingPageRow = {
  id: string;
  name: string;
  slug: string;
  funnel_type: string;
  status: string;
  industry_id: string | null;
  template_key: string;
  base_url: string | null;
  canonical_url: string | null;
  noindex: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  published_at: string | null;
  version_counter: number;
  preview_token: string;
  notify_channel: string | null;
  notify_target: string | null;
  notify_email: string | null;
  notify_test_email: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Productie-domein van de B2B Landing Page Engine — één bron van waarheid.
 *
 * Configureerbaar via env `VITE_LANDING_PRODUCTION_BASE_URL`. Wisselen van
 * domein (bijv. naar https://zoetbezorgen.nl) is daarmee één configuratie-
 * wijziging: alle pagina's zonder expliciete page-level override volgen
 * automatisch. Pagina-ID's, slugs, versies, analytics, leads en attributie
 * zijn hostname-onafhankelijk en blijven ongewijzigd.
 */
const LANDING_BASE_URL_FALLBACK = "https://zakelijk.zoetbezorgen.nl";

function readEnvBaseUrl(): string {
  const fromEnv =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env?.[
          "VITE_LANDING_PRODUCTION_BASE_URL"
        ]
      : undefined;
  const value = (fromEnv ?? "").trim();
  return (value || LANDING_BASE_URL_FALLBACK).replace(/\/+$/, "");
}

export const LANDING_PRODUCTION_BASE_URL = readEnvBaseUrl();


/** Public path for a page (funnel prefix + slug), optionally absolute. */
export function landingPath(funnel: string, slug: string) {
  const prefix = LANDING_FUNNEL_PREFIX[(funnel as LandingFunnel) ?? "quote"] ?? "offerte";
  return `/${prefix}/${slug}`;
}

export function landingUrl(baseUrl: string | null, funnel: string, slug: string) {
  const path = landingPath(funnel, slug);
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/** Altijd absolute productie-URL: valt terug op het productie-subdomein. */
export function landingAbsoluteUrl(baseUrl: string | null, funnel: string, slug: string) {
  return landingUrl(baseUrl?.trim() || LANDING_PRODUCTION_BASE_URL, funnel, slug);
}


export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Safe paragraph split — CMS content is always rendered as plain text. */
export function paragraphs(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/* ------------------------------------------------- central product library */

export type LandingProductImageRow = {
  id: string;
  product_id: string;
  asset_id: string | null;
  url: string;
  alt_text: string | null;
  image_type: ProductImageType;
  is_primary: boolean;
  sort_order: number;
};

export type LandingProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string | null;
  short_text: string | null;
  long_text: string | null;
  min_quantity: number | null;
  price_from: number | null;
  personalization_options: string[];
  occasions: string[];
  industries: string[];
  tags: string[];
  letterbox_friendly: boolean | null;
  individually_shippable: boolean | null;
  featured: boolean;
  product_url: string | null;
  notes: string | null;
  image_url: string | null;
  image_alt: string | null;
  active: boolean;
  sort_order: number;
  ai_suggestions: Record<string, unknown>;
  images?: LandingProductImageRow[];
};

export type LandingAssetRow = {
  id: string;
  name: string;
  url: string;
  storage_path: string | null;
  asset_type: string;
  alt_text: string | null;
  product_id: string | null;
  industry_id: string | null;
  tags: string[];
  desktop_ok: boolean;
  mobile_ok: boolean;
  source: string;
  approval_status: string;
  active: boolean;
  created_at: string;
};

export type LandingVisualBriefRow = {
  id: string;
  landing_page_id: string | null;
  section_id: string | null;
  block_type: string | null;
  title: string;
  visual_type: string;
  purpose: string | null;
  composition: string | null;
  desktop_position: string | null;
  mobile_position: string | null;
  aspect_ratio: string | null;
  background_treatment: string | null;
  product_ids: string[];
  brief_text: string | null;
  asset_status: string;
  asset_id: string | null;
  generation_status: string;
  approval_status: string;
  created_at: string;
};

/** Occasions/use cases we support as suggestions in the manager UI. */
export const PRODUCT_OCCASIONS = [
  "Kerst",
  "Jubileum",
  "Oplevering / project",
  "Teamwaardering",
  "Relatiegeschenk",
  "Beurs / event",
  "Welkomstpakket",
  "Sinterklaas",
  "Pasen",
  "Excuus / herstel",
] as const;

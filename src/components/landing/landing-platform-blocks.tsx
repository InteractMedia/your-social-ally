/**
 * Cadeauplatform-composities (V2.3).
 *
 * Eigen designtaal voor de platform-funnel, 1-op-1 afgestemd op
 * zoetbezorgen.app/cadeaus: antiquewhite canvas, Quicksand-koppen, Inter-body,
 * roze primaire CTA's, teal accenten, witte kaarten met 22px radius en
 * gestippelde stappenlijn.
 *
 * Alle content komt uit de paginaconfiguratie (BlockContent) — nooit hardcoded.
 * Iconen worden gekozen via een keyword in het `badge`-veld van een item, zodat
 * de beheerder ze in de editor kan wijzigen zonder code.
 */
import {
  Award,
  Baby,
  Building2,
  CalendarDays,
  Cake,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Gift,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  Leaf,
  Mail,
  PartyPopper,
  Palette,
  Phone,
  Receipt,
  Shield,
  Smile,
  Snowflake,
  Sparkles,
  Store,
  ThumbsUp,
  Truck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { paragraphs, type BlockContent, type BlockItem, type LandingSection } from "@/lib/landing-shared";
import type { PublicPage } from "@/lib/landing.server";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------- compositions */

export const PLATFORM_COMPOSITIONS = [
  "platform_hero",
  "platform_feature_cards",
  "platform_steps_dashed",
  "platform_logo_gift",
  "platform_shop_preview",
  "platform_occasion_grid",
  "platform_agenda_service",
  "platform_helpdesk",
  "platform_form",
] as const;

export type PlatformComposition = (typeof PLATFORM_COMPOSITIONS)[number];

export function isPlatformComposition(value?: string | null): value is PlatformComposition {
  return Boolean(value) && (PLATFORM_COMPOSITIONS as readonly string[]).includes(value as string);
}

/* -------------------------------------------------------------------- icons */

const ICONS: Record<string, LucideIcon> = {
  party: PartyPopper,
  receipt: Receipt,
  store: Store,
  palette: Palette,
  users: Users,
  clock: Clock,
  heart: Heart,
  shield: Shield,
  leaf: Leaf,
  check: CheckCircle2,
  cake: Cake,
  home: Home,
  award: Award,
  welcome: UserPlus,
  gift: Gift,
  snow: Snowflake,
  handshake: Handshake,
  baby: Baby,
  smile: Smile,
  thumbsup: ThumbsUp,
  truck: Truck,
  calendar: CalendarDays,
  excel: FileSpreadsheet,
  sparkles: Sparkles,
  company: Building2,
  care: HeartHandshake,
  phone: Phone,
  mail: Mail,
};

function itemIcon(item: BlockItem, fallbackIndex: number): LucideIcon {
  const key = (item.badge ?? "").trim().toLowerCase();
  if (key && ICONS[key]) return ICONS[key];
  const cycle = [Gift, Receipt, Store, Palette, Users, Clock, Heart, Shield];
  return cycle[fallbackIndex % cycle.length]!;
}

/* --------------------------------------------------------------- primitives */

function ZpSection({
  id,
  children,
  tone = "canvas",
  className,
  bgImage,
  bgMode = "wash",
}: {
  id?: string;
  children: React.ReactNode;
  tone?: "canvas" | "surface";
  className?: string;
  bgImage?: string;
  bgMode?: "wash" | "hero";
}) {
  return (
    <section
      id={id}
      className={cn(
        "zp relative isolate overflow-hidden px-5 py-16 md:px-8 md:py-24",
        tone === "surface" && "bg-zp-surface",
        className,
      )}
    >
      {bgImage && (
        <>
          <img
            src={bgImage}
            alt=""
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center",
              bgMode === "hero" ? "opacity-70" : "scale-105 opacity-30 blur-sm",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 -z-10",
              bgMode === "hero"
                ? "bg-gradient-to-r from-[color-mix(in_oklab,var(--zp-canvas)_92%,transparent)] via-[color-mix(in_oklab,var(--zp-canvas)_72%,transparent)] to-[color-mix(in_oklab,var(--zp-canvas)_35%,transparent)]"
                : "bg-[color-mix(in_oklab,var(--zp-canvas)_70%,transparent)]",
            )}
          />
        </>
      )}
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

function ZpPill({ text, tone }: { text?: string; tone: "pink" | "teal" }) {
  if (!text) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase",
        tone === "pink" ? "bg-zp-pink text-zp-surface" : "bg-zp-teal/30 text-zp-ink",
      )}
    >
      <Sparkles className={cn("h-3.5 w-3.5", tone === "pink" ? "text-zp-surface" : "text-zp-pink")} />
      {text}
    </span>
  );
}

function ZpTitle({
  text,
  as: As = "h2",
  className,
}: {
  text?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  if (!text) return null;
  return <As className={cn("zp-title text-zp-ink text-balance", className)}>{text}</As>;
}

function ZpBody({ body, className }: { body?: string; className?: string }) {
  const parts = paragraphs(body);
  if (!parts.length) return null;
  return (
    <div className={cn("space-y-4", className)}>
      {parts.map((p, i) => (
        <p key={i} className="text-zp-muted text-base leading-relaxed md:text-lg">
          {p}
        </p>
      ))}
    </div>
  );
}

function ZpCtaPink({
  label,
  url,
  onClick,
}: {
  label?: string;
  url?: string;
  onClick?: (label: string) => void;
}) {
  if (!label) return null;
  return (
    <a
      href={url || "#offerte"}
      onClick={() => onClick?.(label)}
      className="bg-zp-pink text-zp-surface hover:bg-zp-pink/90 inline-flex h-14 items-center justify-center rounded-[7px] px-8 text-base font-medium shadow-lg transition-colors"
    >
      {label}
    </a>
  );
}

function ZpCtaGhost({
  label,
  url,
  onClick,
}: {
  label?: string;
  url?: string;
  onClick?: (label: string) => void;
}) {
  if (!label) return null;
  return (
    <a
      href={url || "#offerte"}
      onClick={() => onClick?.(label)}
      className="border-zp-ink/15 bg-zp-surface text-zp-ink hover:bg-zp-surface/70 inline-flex h-14 items-center justify-center rounded-[7px] border px-8 text-base font-medium transition-colors"
    >
      {label}
    </a>
  );
}

function ZpCheckRow({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <span className="text-zp-muted inline-flex items-center gap-2 text-sm">
      <CheckCircle2 className="text-zp-pink h-4 w-4 shrink-0" />
      {text}
    </span>
  );
}

function ZpPhoto({
  src,
  alt,
  className,
  eager,
}: {
  src?: string;
  alt?: string;
  className?: string;
  eager?: boolean;
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt ?? ""}
      loading={eager ? "eager" : "lazy"}
      className={cn("border-zp-surface w-full rounded-[22px] border-4 object-cover shadow-2xl", className)}
    />
  );
}

function ZpIconTile({ icon: Icon, index, size = "md" }: { icon: LucideIcon; index: number; size?: "sm" | "md" }) {
  const pink = index % 2 === 0;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        size === "sm" ? "h-10 w-10" : "h-12 w-12",
        pink ? "bg-zp-pink/12 text-zp-pink" : "bg-zp-teal/25 text-zp-teal",
      )}
    >
      <Icon className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} />
    </span>
  );
}

function ZpSectionHeading({
  title,
  subtitle,
  align = "center",
}: {
  title?: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  if (!title && !subtitle) return null;
  return (
    <div className={cn("mb-12", align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl")}>
      <ZpTitle text={title} className="text-3xl md:text-4xl" />
      {subtitle && <p className="text-zp-muted mt-3 text-base md:text-lg">{subtitle}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ blocks */

export function PlatformBlock({
  section,
  composition,
  formSlot,
  onCtaClick,
}: {
  section: LandingSection;
  composition: PlatformComposition;
  page: PublicPage;
  formSlot?: React.ReactNode;
  onCtaClick?: (label: string) => void;
}) {
  const c = (section.content ?? {}) as BlockContent;
  const items = (c.items ?? []).filter((i) => i.title || i.text);
  const secondary = (c.secondary_items ?? []).filter((i) => i.title || i.text);

  switch (composition) {
    /* ---------------------------------------------------------------- hero */
    case "platform_hero":
      return (
        <ZpSection bgImage={c.image_url_4} bgMode="hero">
          {!c.image_url_4 && (
            <div
              aria-hidden
              className="from-zp-pink/12 pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br via-transparent to-transparent"
            />
          )}
          <div className="grid items-center gap-14 md:grid-cols-2">
            <div>
              <ZpPill text={c.badge} tone="teal" />
              <ZpTitle
                text={c.title}
                as="h1"
                className="mt-5 text-4xl leading-[1.06] md:text-6xl"
              />
              {c.subtitle && (
                <p className="zp-title text-zp-teal mt-3 text-2xl leading-tight md:text-3xl">
                  {c.subtitle}
                </p>
              )}
              <ZpBody body={c.body} className="mt-5 max-w-xl" />
              {(c.cta_label || c.secondary_cta_label) && (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ZpCtaPink label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                  <ZpCtaGhost
                    label={c.secondary_cta_label}
                    url={c.secondary_cta_url}
                    onClick={onCtaClick}
                  />
                </div>
              )}
              {items.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                  {items.map((item, i) => (
                    <ZpCheckRow key={i} text={item.title || item.text} />
                  ))}
                </div>
              )}
              {c.footnote && <p className="text-zp-muted mt-4 text-sm">{c.footnote}</p>}
            </div>
            <div className="relative">
              <div className="relative">
                <ZpPhoto src={c.image_url} alt={c.image_alt} eager className="aspect-[4/3]" />
                {c.image_badge && c.image_url && (
                  <span className="bg-zp-pink text-zp-surface absolute top-4 left-4 rounded-full px-4 py-1.5 text-sm font-medium shadow-md">
                    {c.image_badge}
                  </span>
                )}
              </div>
              {c.image_url_2 && (
                <div className="absolute -bottom-10 -right-2 w-[52%] sm:-right-6">
                  <ZpPhoto src={c.image_url_2} alt={c.image_alt_2} className="aspect-square rounded-[18px]" />
                </div>
              )}
            </div>
          </div>
        </ZpSection>
      );

    /* ------------------------------------------------------- feature cards */
    case "platform_feature_cards": {
      if (!items.length) return null;
      const cols = items.length % 4 === 0 ? "lg:grid-cols-4" : "lg:grid-cols-3";
      return (
        <ZpSection>
          <ZpSectionHeading title={c.title} subtitle={c.subtitle} />
          <div className={cn("grid gap-5 sm:grid-cols-2", cols)}>
            {items.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-[22px] p-6",
                  i === 0
                    ? "from-zp-pink/15 to-zp-canvas ring-zp-pink/20 bg-gradient-to-br ring-1"
                    : "bg-zp-surface border-zp-ink/5 border shadow-sm",
                )}
              >
                <ZpIconTile icon={itemIcon(item, i)} index={i} />
                {item.title && (
                  <h3 className="zp-card-title text-zp-ink mt-4 text-xl">{item.title}</h3>
                )}
                {item.text && (
                  <p className="zp-card-body text-zp-muted mt-2 text-sm leading-relaxed">{item.text}</p>
                )}
              </div>
            ))}
          </div>
        </ZpSection>
      );
    }

    /* --------------------------------------------------- steps (gestippeld) */
    case "platform_steps_dashed": {
      if (!items.length) return null;
      return (
        <ZpSection>
          <ZpSectionHeading title={c.title} subtitle={c.subtitle} />
          <div className="relative">
            <div
              aria-hidden
              className="border-zp-ink/20 absolute top-12 right-[10%] left-[10%] hidden border-t-2 border-dashed md:block"
            />
            <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
              {items.map((item, i) => {
                const Icon = itemIcon(item, i);
                const pink = i % 2 === 1;
                return (
                  <div key={i} className={cn("text-center", pink ? "md:mt-12" : "md:mt-0")}>
                    <span className="relative mx-auto inline-block">
                      <span
                        className={cn(
                          "grid h-24 w-24 place-items-center rounded-full shadow-lg",
                          pink ? "bg-zp-pink" : "bg-zp-teal",
                        )}
                      >
                        <Icon className="text-zp-surface h-9 w-9" />
                      </span>
                      <span className="bg-zp-canvas text-zp-ink border-zp-ink/10 absolute -right-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold">
                        {i + 1}
                      </span>
                    </span>
                    <ZpTitle text={item.title} as="h3" className="mt-4 text-base" />
                    {item.text && <p className="text-zp-muted mt-2 text-sm leading-relaxed">{item.text}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </ZpSection>
      );
    }

    /* --------------------------------------- geschenk met logo (optietabel) */
    case "platform_logo_gift": {
      const headers = (c.subtitle ?? "").split("|").map((h) => h.trim());
      const photos = [
        { url: c.image_url, alt: c.image_alt },
        { url: c.image_url_2, alt: c.image_alt_2 },
        { url: c.image_url_3, alt: c.image_alt_3 },
      ].filter((p) => p.url);
      return (
        <ZpSection bgImage={c.image_url_4}>
          <div className="grid items-center gap-14 md:grid-cols-2">
            <div>
              <ZpPill text={c.badge} tone="pink" />
              <ZpTitle text={c.title} className="mt-5 text-3xl md:text-4xl" />
              <ZpBody body={c.body} className="mt-4" />
              {items.length > 0 && (
                <div className="border-zp-ink/10 bg-zp-surface/70 mt-7 overflow-hidden rounded-[18px] border">
                  {headers.length === 2 && (
                    <div className="bg-zp-canvas/80 border-zp-ink/10 text-zp-ink grid grid-cols-[1fr_1.6fr] gap-4 border-b px-5 py-3 text-sm font-semibold">
                      <span>{headers[0]}</span>
                      <span>{headers[1]}</span>
                    </div>
                  )}
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "grid grid-cols-[1fr_1.6fr] gap-4 px-5 py-3.5 text-sm",
                        i > 0 && "border-zp-ink/10 border-t",
                      )}
                    >
                      <span className="text-zp-ink font-medium">{item.title}</span>
                      <span className="text-zp-muted">{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p.url}
                    alt={p.alt ?? ""}
                    loading="lazy"
                    className="border-zp-surface aspect-[3/4] w-full rounded-[16px] border-4 object-cover shadow-lg"
                  />
                ))}
              </div>
            )}
          </div>
        </ZpSection>
      );
    }

    /* ------------------------------------------- eigen shop-omgeving (split) */
    case "platform_shop_preview":
      return (
        <ZpSection>
          <div className="grid items-center gap-14 md:grid-cols-2">
            <ZpPhoto src={c.image_url} alt={c.image_alt} className="aspect-[4/3]" />
            <div>
              <ZpPill text={c.badge} tone="teal" />
              <ZpTitle text={c.title} className="mt-5 text-3xl md:text-4xl" />
              <ZpBody body={c.body} className="mt-4" />
              {items.length > 0 && (
                <ul className="mt-6 space-y-2.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="text-zp-pink mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-zp-ink text-sm">
                        {item.title}
                        {item.text && <span className="text-zp-muted"> — {item.text}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {c.cta_label && (
                <div className="mt-8">
                  <ZpCtaPink label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                </div>
              )}
            </div>
          </div>
        </ZpSection>
      );

    /* ------------------------------------------------- voor elke gelegenheid */
    case "platform_occasion_grid": {
      if (!items.length) return null;
      return (
        <ZpSection bgImage={c.image_url_4}>
          <ZpSectionHeading title={c.title} subtitle={c.subtitle} align="left" />
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((item, i) => (
              <div
                key={i}
                className="bg-zp-surface border-zp-ink/5 rounded-[22px] border p-5 shadow-sm"
              >
                <ZpIconTile icon={itemIcon(item, i)} index={i} size="sm" />
                <ZpTitle text={item.title} as="h3" className="mt-3 text-base" />
                {item.text && <p className="text-zp-muted mt-1.5 text-xs leading-relaxed">{item.text}</p>}
              </div>
            ))}
          </div>
        </ZpSection>
      );
    }

    /* ------------------------------------------------- verjaardagsservice */
    case "platform_agenda_service":
      return (
        <ZpSection>
          <div className="grid items-start gap-14 md:grid-cols-2">
            <div>
              <ZpPill text={c.badge} tone="teal" />
              <ZpTitle text={c.title} className="mt-5 text-3xl md:text-4xl" />
              <ZpBody body={c.body} className="mt-4" />
              {items.length > 0 && (
                <ul className="mt-6 space-y-2.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="text-zp-pink mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-zp-ink text-sm">{item.title || item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {secondary.length > 0 && (
              <div className="bg-zp-surface border-zp-ink/5 rounded-[22px] border p-5 shadow-lg md:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <CalendarDays className="text-zp-pink h-5 w-5" />
                  <ZpTitle text={c.subtitle} as="h3" className="text-lg" />
                </div>
                <div className="space-y-3">
                  {secondary.map((row, i) => (
                    <div
                      key={i}
                      className="bg-zp-canvas/70 flex items-center justify-between gap-4 rounded-[14px] px-4 py-3"
                    >
                      <span>
                        {row.text && (
                          <span className="text-zp-muted block text-xs font-semibold tracking-wide uppercase">
                            {row.text}
                          </span>
                        )}
                        <span className="text-zp-ink text-sm font-medium">{row.title}</span>
                      </span>
                      {row.badge && (
                        <span className="bg-zp-surface border-zp-ink/10 text-zp-ink rounded-full border px-3 py-1 text-xs">
                          {row.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ZpSection>
      );

    /* ------------------------------------------------------------- helpdesk */
    case "platform_helpdesk":
      return (
        <ZpSection>
          <div className="bg-zp-surface grid overflow-hidden rounded-[22px] shadow-lg md:grid-cols-2">
            {c.image_url ? (
              <img
                src={c.image_url}
                alt={c.image_alt ?? ""}
                loading="lazy"
                className="h-full min-h-64 w-full object-cover"
              />
            ) : null}
            <div className="p-7 md:p-10">
              <ZpTitle text={c.title} className="text-3xl md:text-4xl" />
              <ZpBody body={c.body} className="mt-4" />
              {items.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {items.map((item, i) => {
                    const Icon = itemIcon(item, i);
                    const value = item.title ?? "";
                    const href = value.includes("@")
                      ? `mailto:${value}`
                      : /[0-9]/.test(value)
                        ? `tel:${value.replace(/\s/g, "")}`
                        : undefined;
                    return (
                      <li key={i} className="flex items-center gap-3">
                        <Icon className="text-zp-pink h-5 w-5 shrink-0" />
                        {href ? (
                          <a href={href} className="zp-title text-zp-ink text-lg hover:underline">
                            {value}
                          </a>
                        ) : (
                          <span className="zp-title text-zp-ink text-lg">{value}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </ZpSection>
      );

    /* ----------------------------------------------------------- formulier */
    case "platform_form":
      return (
        <ZpSection id="offerte">
          <div className="mx-auto max-w-3xl text-center">
            <ZpPill text={c.badge} tone="pink" />
            <ZpTitle text={c.title} className="mt-5 text-3xl md:text-4xl" />
            {c.subtitle && <p className="text-zp-muted mt-3 text-base md:text-lg">{c.subtitle}</p>}
          </div>
          <div className="bg-zp-surface mx-auto mt-10 max-w-3xl rounded-[22px] p-6 shadow-lg md:p-8">
            {formSlot}
          </div>
          {c.footnote && (
            <p className="text-zp-muted mx-auto mt-4 max-w-3xl text-center text-sm">{c.footnote}</p>
          )}
        </ZpSection>
      );

    default:
      return null;
  }
}

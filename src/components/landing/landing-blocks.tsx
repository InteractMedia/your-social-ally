/**
 * Presentational block renderer for the Landing Page Engine.
 *
 * All content comes from the page configuration — never hardcoded copy — and all
 * styling comes from the central ZoetBezorgen Landing Design System. A section
 * can only pick pre-approved design variants, so AI-generated pages stay on
 * brand and can never inject markup or arbitrary styling.
 */
import {
  ArrowRight,
  Check,
  Gift,
  HeartHandshake,
  ImageOff,
  Package,
  Palette,
  Plus,
  Quote,
  Sparkles,
  Truck,
} from "lucide-react";

import {
  LANDING_DESIGN_TOKENS as T,
  resolveSectionDesign,
} from "@/lib/landing-design-system";
import { paragraphs, type LandingSection } from "@/lib/landing-shared";
import {
  ASPECT_RATIO_CLASS,
  VISUAL_TYPE_LABELS,
  visualIsMissing,
  type SectionVisual,
} from "@/lib/landing-visual";
import type { PublicPage } from "@/lib/landing.server";
import { cn } from "@/lib/utils";

type Design = ReturnType<typeof resolveSectionDesign>;

function Section({
  id,
  design,
  children,
}: {
  id?: string;
  design: Design;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={design.sectionClass}>
      <div className={design.innerClass}>{children}</div>
    </section>
  );
}

function Heading({
  title,
  subtitle,
  design,
}: {
  title?: string;
  subtitle?: string;
  design: Design;
}) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-8 max-w-2xl">
      {title && <h2 className={design.headingClass}>{title}</h2>}
      {subtitle && <p className="text-muted-foreground mt-3 text-base">{subtitle}</p>}
    </div>
  );
}

function Body({ body }: { body?: string }) {
  const parts = paragraphs(body);
  if (!parts.length) return null;
  return (
    <div className="space-y-4">
      {parts.map((p, i) => (
        <p key={i} className={T.typography.body}>
          {p}
        </p>
      ))}
    </div>
  );
}

function Cta({
  label,
  url,
  className,
  onClick,
}: {
  label?: string;
  url?: string;
  className: string;
  onClick?: (label: string) => void;
}) {
  if (!label) return null;
  return (
    <a href={url || "#offerte"} onClick={() => onClick?.(label)} className={className}>
      {label}
    </a>
  );
}

/* =========================================================== V2.0 — ZB primitives
 * ZoetBezorgen Conversion Design System visuele primitieven.
 * Gedeeld door alle ZB-composities (candy_hero, industry_story,
 * product_showcase, premium_form). Data-driven, geen hardcoded content. */

function ZbPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-zb-ink text-zb-cream inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

function ZbCandyDots() {
  return (
    <>
      <span className="zb-dot bg-primary/70 h-4 w-4" style={{ top: "8%", left: "4%" }} />
      <span className="zb-dot bg-secondary h-3 w-3" style={{ top: "16%", right: "8%" }} />
      <span className="zb-dot bg-zb-teal/60 h-2.5 w-2.5" style={{ bottom: "12%", left: "10%" }} />
      <span className="zb-dot bg-zb-honey h-5 w-5" style={{ bottom: "6%", right: "14%" }} />
    </>
  );
}

/** Arch-shaped (boogvormig) fotokader — kenmerkend voor ZB-hero's. */
function ZbArchFrame({ src, alt, eager, className }: { src: string; alt: string; eager?: boolean; className?: string }) {
  return (
    <div className={cn("border-zb-ink/10 overflow-hidden rounded-t-[999px] rounded-b-3xl border-4 shadow-2xl", className)}>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        className="aspect-[4/5] w-full object-cover"
      />
    </div>
  );
}

/** Display-serif heading met optionele <em> accent. */
function ZbHeading({
  text,
  accent,
  className,
  as: As = "h2",
}: {
  text: string;
  accent?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  // Als accent aanwezig is in de tekst, vervang dat deel door een <em>
  if (accent && text.includes(accent)) {
    const [before, after] = text.split(accent);
    return (
      <As className={cn("font-display leading-[1.05] font-semibold tracking-tight text-balance", className)}>
        {before}
        <em className="text-primary not-italic">{accent}</em>
        {after}
      </As>
    );
  }
  return (
    <As className={cn("font-display leading-[1.05] font-semibold tracking-tight text-balance", className)}>
      {text}
    </As>
  );
}

/** Rond (cirkelvormig) fotokader — V2.2 alternatief voor de boogvorm. */
function ZbRoundFrame({ src, alt, eager, className }: { src: string; alt: string; eager?: boolean; className?: string }) {
  return (
    <div className={cn("border-zb-ink/10 aspect-square overflow-hidden rounded-full border-4 shadow-2xl", className)}>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function ZbCtaSolid({ label, url, onClick }: { label?: string; url?: string; onClick?: (l: string) => void }) {
  if (!label) return null;
  return (
    <a
      href={url || "#offerte"}
      onClick={() => onClick?.(label)}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center justify-center gap-2 rounded-sm px-7 text-sm font-semibold shadow-lg transition-colors"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}

function ZbCtaGhost({ label, url, dark, onClick }: { label?: string; url?: string; dark?: boolean; onClick?: (l: string) => void }) {
  if (!label) return null;
  return (
    <a
      href={url || "#offerte"}
      onClick={() => onClick?.(label)}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-sm border px-7 text-sm font-semibold transition-colors",
        dark ? "border-white/60 text-white hover:bg-white/10" : "border-zb-ink/30 text-zb-ink hover:bg-zb-ink/5",
      )}
    >
      {label}
    </a>
  );
}

/**
 * Structured image slot.
 *
 * Every visual-carrying section has a slot. When the slot has an approved
 * asset it renders the image; when the visual plan says an image is required
 * but none exists yet, editors and previews see an explicit "AI VISUAL NEEDED"
 * placeholder with the brief. Live visitors never see the placeholder — the
 * section then falls back to its text layout.
 */
function MediaSlot({
  src,
  alt,
  visual,
  design,
  eager,
  showPlaceholder,
}: {
  src?: string;
  alt?: string;
  visual?: SectionVisual;
  design: Design;
  eager?: boolean;
  showPlaceholder?: boolean;
}) {
  if (design.image_treatment === "none") return null;
  const ratioClass = ASPECT_RATIO_CLASS[visual?.aspect_ratio ?? "4:3"] ?? "aspect-4/3";
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? visual?.purpose ?? ""}
        loading={eager ? "eager" : "lazy"}
        className={cn(ratioClass, "w-full object-cover", design.imageClass)}
      />
    );
  }
  if (!showPlaceholder || !visualIsMissing(visual, src)) return null;
  return (
    <div
      className={cn(
        ratioClass,
        "border-primary/40 bg-primary/5 text-primary flex w-full flex-col justify-center gap-2 rounded-xl border-2 border-dashed p-5",
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <ImageOff className="h-4 w-4" /> AI visual needed
      </span>
      <span className="text-foreground text-sm font-medium">
        {VISUAL_TYPE_LABELS[visual?.visual_type ?? "product_lifestyle"]}
      </span>
      {visual?.purpose && <span className="text-muted-foreground text-xs">{visual.purpose}</span>}
      {visual?.visual_brief && (
        <span className="text-muted-foreground line-clamp-4 text-xs italic">
          {visual.visual_brief}
        </span>
      )}
    </div>
  );
}

export function LandingBlock({
  section,
  page,
  onCtaClick,
  formSlot,
  showVisualPlaceholders,
}: {
  section: LandingSection;
  page: PublicPage;
  onCtaClick?: (label: string) => void;
  formSlot?: React.ReactNode;
  /** Editors/previews see missing-visual placeholders; live visitors never do. */
  showVisualPlaceholders?: boolean;
}) {
  const c = section.content ?? {};
  const items = c.items ?? [];
  const design = resolveSectionDesign(c.design);
  const visual = c.visual;
  const slotVisible = Boolean(c.image_url) || (showVisualPlaceholders && visualIsMissing(visual));

  /* Generieke leeg-regel (geldt voor alle huidige en toekomstige pagina's):
     content-afhankelijke secties zonder data renderen helemaal niet — geen
     titel, achtergrond of whitespace. Alleen componenten met een expliciet
     ontworpen lege/placeholder-staat (hero, form, cta_banner, personalization)
     mogen zonder data blijven staan. */
  const itemsDependent = ["usps", "faq", "how_it_works", "use_cases", "social_proof"].includes(
    section.block_type,
  );
  const designedEmptyState = ["hero", "form", "cta_banner", "personalization"].includes(
    section.block_type,
  );
  const hasAnyContent =
    items.length > 0 ||
    Boolean(
      c.title || c.subtitle || c.body || c.badge || c.cta_label || c.secondary_cta_label || c.image_url,
    );
  /* social_proof mag ook leven op logo's/stats (logo_cloud_stats, V2.1). */
  const socialProofHasData =
    (c.logos?.filter((l) => l.url).length ?? 0) > 0 ||
    (c.stats?.filter((s) => s.value).length ?? 0) > 0;
  if (
    (section.block_type === "testimonials" && page.testimonials.length === 0) ||
    (section.block_type === "products" &&
      page.products.length === 0 &&
      (c.gallery?.filter((g) => g.url).length ?? 0) === 0) ||
    (itemsDependent &&
      items.length === 0 &&
      !(section.block_type === "social_proof" && socialProofHasData)) ||
    (!designedEmptyState && !itemsDependent && !hasAnyContent)
  ) {
    return null;
  }



  switch (section.block_type) {
    case "hero": {
      const heroDesign = resolveSectionDesign({
        background: "warm",
        layout: "split_media_right",
        ...(c.design ?? {}),
      });
      const copy = (
        <div>
          {page.industry_name && (
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Zakelijke geschenken voor {page.industry_name}
            </span>
          )}
          <h1 className={cn("mt-4", heroDesign.heroHeadingClass)}>{c.title}</h1>
          {c.subtitle && <p className={cn("mt-4", T.typography.lead)}>{c.subtitle}</p>}
          {c.body && (
            <div className="mt-4">
              <Body body={c.body} />
            </div>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Cta
              label={c.cta_label}
              url={c.cta_url}
              className={heroDesign.buttonClass}
              onClick={onCtaClick}
            />
            <Cta
              label={c.secondary_cta_label}
              url={c.secondary_cta_url}
              className={T.buttons.outline}
              onClick={onCtaClick}
            />
          </div>
        </div>
      );
      const media = <MediaSlot
          src={c.image_url}
          alt={c.image_alt}
          visual={visual}
          design={heroDesign}
          showPlaceholder={showVisualPlaceholders}
          eager
        />;

      /* V1.9 — layered_hero: beeld als grote basis, copy als zwevende kaart
         die eroverheen breekt. Geen stille fallback: ontbreekt het beeld,
         dan toont de preview een expliciete AI VISUAL NEEDED-placeholder
         in dezelfde gelaagde compositie. */
      const layeredMissing =
        !c.image_url && showVisualPlaceholders && visualIsMissing(visual);
      if (heroDesign.composition === "layered_hero" && (c.image_url || layeredMissing)) {
        return (
          <Section design={heroDesign}>
            <div className="relative">
              <div className="md:ml-[22%]">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.image_alt ?? visual?.purpose ?? ""}
                    loading="eager"
                    className={cn(
                      ASPECT_RATIO_CLASS[visual?.aspect_ratio ?? "4:3"] ?? "aspect-4/3",
                      "w-full object-cover shadow-xl",
                      design.imageClass,
                    )}
                  />
                ) : (
                  <MediaSlot
                    src={undefined}
                    alt={c.image_alt}
                    visual={visual}
                    design={heroDesign}
                    showPlaceholder={showVisualPlaceholders}
                    eager
                  />
                )}
              </div>
              <div className="bg-background relative z-10 -mt-10 max-w-xl rounded-2xl border p-6 shadow-xl md:absolute md:top-1/2 md:left-0 md:mt-0 md:-translate-y-1/2 md:p-8">
                {copy}
              </div>
            </div>
          </Section>
        );
      }

      /* V1.9 — collage_hero: hoofdbeeld + tot 2 productbeelden als collage.
         Geen stille fallback bij ontbrekend hoofdbeeld. */
      if (heroDesign.composition === "collage_hero" && (c.image_url || layeredMissing)) {
        const collageProducts = page.products.filter((p) => p.image_url).slice(0, 2);
        return (
          <Section design={heroDesign}>
            <div className="grid items-center gap-10 md:grid-cols-2">
              {copy}
              <div className="grid grid-cols-2 gap-3">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.image_alt ?? visual?.purpose ?? ""}
                    loading="eager"
                    className={cn(
                      "col-span-2 w-full object-cover shadow-lg",
                      ASPECT_RATIO_CLASS[visual?.aspect_ratio ?? "16:9"] ?? "aspect-16/9",
                      design.imageClass,
                    )}
                  />
                ) : (
                  <div className="col-span-2">
                    <MediaSlot
                      src={undefined}
                      alt={c.image_alt}
                      visual={visual}
                      design={heroDesign}
                      showPlaceholder={showVisualPlaceholders}
                      eager
                    />
                  </div>
                )}
                {collageProducts.map((p) => (
                  <img
                    key={p.id}
                    src={p.image_url!}
                    alt={p.image_alt ?? p.name}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl border object-cover"
                  />
                ))}
              </div>
            </div>
          </Section>
        );
      }

      /* V1.9C — full_bleed_hero: sfeerbeeld over de volle breedte als
         achtergrond, copy in een contrastpaneel eroverheen. Editorial
         photography in plaats van een card. */
      if (heroDesign.composition === "full_bleed_hero" && (c.image_url || layeredMissing)) {
        return (
          <section className="relative overflow-hidden">
            {c.image_url ? (
              <img
                src={c.image_url}
                alt={c.image_alt ?? visual?.purpose ?? ""}
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="bg-primary/10 absolute inset-0" />
            )}
            <div className="from-foreground/70 via-foreground/40 absolute inset-0 bg-gradient-to-r to-transparent" />
            <div className="relative mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-36">
              <div className="max-w-xl text-white">
                {page.industry_name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                    <Sparkles className="h-3.5 w-3.5" /> Zakelijke geschenken voor {page.industry_name}
                  </span>
                )}
                <h1 className="mt-4 text-4xl font-semibold tracking-tight drop-shadow md:text-6xl">
                  {c.title}
                </h1>
                {c.subtitle && <p className="mt-4 text-lg leading-relaxed text-white/90">{c.subtitle}</p>}
                {c.body && <p className="mt-3 leading-relaxed text-white/80">{c.body}</p>}
                <div className="mt-7 flex flex-wrap gap-3">
                  <Cta label={c.cta_label} url={c.cta_url} className={heroDesign.buttonClass} onClick={onCtaClick} />
                  <Cta
                    label={c.secondary_cta_label}
                    url={c.secondary_cta_url}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/60 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    onClick={onCtaClick}
                  />
                </div>
              </div>
            </div>
            {layeredMissing && (
              <div className="relative mx-auto -mt-16 w-full max-w-6xl px-5 pb-6 md:px-8">
                <MediaSlot
                  src={undefined}
                  alt={c.image_alt}
                  visual={visual}
                  design={heroDesign}
                  showPlaceholder={showVisualPlaceholders}
                  eager
                />
              </div>
            )}
          </section>
        );
      }

      /* V1.9C — cutout_hero: sfeerbeeld als basis met een product-cutout die
         over de sectiegrens heen breekt (layered product + lifestyle). */
      if (heroDesign.composition === "cutout_hero" && (c.image_url || layeredMissing)) {
        const cutout = page.products.find((p) => p.image_url);
        return (
          <section className="relative overflow-visible">
            <div className="relative overflow-hidden rounded-none">
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.image_alt ?? visual?.purpose ?? ""}
                  loading="eager"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="bg-primary/10 absolute inset-0" />
              )}
              <div className="from-background via-background/60 absolute inset-0 bg-gradient-to-t to-transparent" />
              <div className="relative mx-auto grid w-full max-w-6xl items-end gap-8 px-5 pt-20 pb-16 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:pt-28 md:pb-24">
                <div>
                  {page.industry_name && (
                    <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                      <Sparkles className="h-3.5 w-3.5" /> Zakelijke geschenken voor {page.industry_name}
                    </span>
                  )}
                  <h1 className={cn("mt-4", heroDesign.heroHeadingClass)}>{c.title}</h1>
                  {c.subtitle && <p className={cn("mt-4", T.typography.lead)}>{c.subtitle}</p>}
                  {c.body && (
                    <div className="mt-4">
                      <Body body={c.body} />
                    </div>
                  )}
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Cta label={c.cta_label} url={c.cta_url} className={heroDesign.buttonClass} onClick={onCtaClick} />
                    <Cta
                      label={c.secondary_cta_label}
                      url={c.secondary_cta_url}
                      className={T.buttons.outline}
                      onClick={onCtaClick}
                    />
                  </div>
                </div>
                {cutout?.image_url && (
                  <img
                    src={cutout.image_url}
                    alt={cutout.image_alt ?? cutout.name}
                    loading="eager"
                    className="mx-auto w-56 rotate-3 drop-shadow-2xl md:-mb-24 md:w-72"
                  />
                )}
              </div>
            </div>
            {layeredMissing && (
              <div className="mx-auto w-full max-w-6xl px-5 pt-4 md:px-8">
                <MediaSlot
                  src={undefined}
                  alt={c.image_alt}
                  visual={visual}
                  design={heroDesign}
                  showPlaceholder={showVisualPlaceholders}
                  eager
                />
              </div>
            )}
          </section>
        );
      }

      /* V2.0 — candy_hero_collage: warme cream canvas, display-serif headline,
         boogvormige (arch) foto met product-polaroid die over het kader breekt,
         candy-dots en hazard-stripe als merkmotief. Data-driven uit BlockContent. */
      if (heroDesign.composition === "candy_hero_collage" && (c.image_url || layeredMissing)) {
        const heroProduct = page.products.find((p) => p.image_url);
        return (
          <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
            <ZbCandyDots />
            <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-28">
              <div>
                {(c.badge || page.industry_name) && (
                  <ZbPill>
                    <Sparkles className="h-3.5 w-3.5" />{" "}
                    {c.badge ?? `Zakelijke geschenken voor ${page.industry_name}`}
                  </ZbPill>
                )}
                <ZbHeading as="h1" text={c.title ?? ""} className="mt-6 text-5xl md:text-7xl" />
                {c.subtitle && (
                  <p className="text-zb-ink/70 mt-6 max-w-md text-lg leading-relaxed">{c.subtitle}</p>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <ZbCtaSolid label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                  <ZbCtaGhost label={c.secondary_cta_label} url={c.secondary_cta_url} onClick={onCtaClick} />
                </div>
                {c.footnote && (
                  <p className="text-zb-ink/55 mt-3 text-xs font-medium">{c.footnote}</p>
                )}
                <div className="mt-7 flex items-center gap-3">
                  <span className="zb-hazard h-2.5 w-24 rounded-full" />
                  {c.body && (
                    <span className="text-zb-ink/60 text-xs font-semibold tracking-wide uppercase">
                      {c.body.split("\n")[0]}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                {c.image_url ? (
                  /* V2.1 — hoofdbeeld als rond portret (i.p.v. boogvorm) */
                  <div className="border-zb-ink/10 aspect-square overflow-hidden rounded-full border-4 shadow-2xl">
                    <img
                      src={c.image_url}
                      alt={c.image_alt ?? visual?.purpose ?? ""}
                      loading="eager"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="border-primary/40 bg-primary/5 text-primary flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed p-5">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs font-semibold tracking-wide uppercase">AI visual needed</span>
                    {visual?.visual_brief && (
                      <span className="text-muted-foreground line-clamp-3 text-center text-xs italic">
                        {visual.visual_brief}
                      </span>
                    )}
                  </div>
                )}
                {heroProduct?.image_url && (
                  <img
                    src={heroProduct.image_url}
                    alt={heroProduct.image_alt ?? heroProduct.name}
                    loading="eager"
                    className="absolute -bottom-10 -left-6 w-44 -rotate-6 rounded-2xl border-4 border-white object-cover shadow-2xl md:-left-16 md:w-72"
                  />
                )}
                {c.image_badge && (
                  <span className="bg-card text-zb-ink absolute top-10 -right-3 rotate-3 rounded-full px-4 py-2 text-xs font-bold shadow-xl md:-right-6">
                    {c.image_badge}
                  </span>
                )}
              </div>
            </div>
          </section>
        );
      }

      /* V2.0 — candy_hero_editorial: full-bleed sfeerbeeld met warm verloop,
         witte display-typografie en product-polaroid die over de sectiegrens
         breekt. Data-driven. */
      if (heroDesign.composition === "candy_hero_editorial" && (c.image_url || layeredMissing)) {
        const heroProduct = page.products.find((p) => p.image_url);
        return (
          <section className="relative overflow-visible text-white">
            <div className="relative overflow-hidden">
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.image_alt ?? visual?.purpose ?? ""}
                  loading="eager"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="bg-primary/15 absolute inset-0" />
              )}
              <div className="from-zb-ink/85 via-zb-ink/45 absolute inset-0 bg-gradient-to-r to-transparent" />
              <div className="relative mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-40">
                <div className="max-w-xl">
                  {(c.badge || page.industry_name) && (
                    <ZbPill className="bg-white/15 text-white backdrop-blur">
                      <Sparkles className="h-3.5 w-3.5" />{" "}
                      {c.badge ?? `${page.industry_name} · vanaf 25 stuks`}
                    </ZbPill>
                  )}
                  <ZbHeading as="h1" text={c.title ?? ""} className="mt-6 text-5xl md:text-7xl drop-shadow-lg" />
                  {c.subtitle && (
                    <p className="mt-6 max-w-md text-lg leading-relaxed text-white/85">{c.subtitle}</p>
                  )}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <ZbCtaSolid label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                    <ZbCtaGhost label={c.secondary_cta_label} url={c.secondary_cta_url} dark onClick={onCtaClick} />
                  </div>
                  {c.footnote && (
                    <p className="mt-3 text-xs font-medium text-white/60">{c.footnote}</p>
                  )}
                </div>
              </div>
            </div>
            {heroProduct?.image_url && (
              <img
                src={heroProduct.image_url}
                alt={heroProduct.image_alt ?? heroProduct.name}
                loading="eager"
                className="absolute right-6 -bottom-8 z-10 w-32 rotate-6 rounded-2xl border-4 border-white object-cover shadow-2xl md:right-24 md:-bottom-10 md:w-52"
              />
            )}
            {layeredMissing && (
              <div className="relative mx-auto -mt-16 w-full max-w-6xl px-5 pb-6 md:px-8">
                <MediaSlot
                  src={undefined}
                  alt={c.image_alt}
                  visual={visual}
                  design={heroDesign}
                  showPlaceholder={showVisualPlaceholders}
                  eager
                />
              </div>
            )}
          </section>
        );
      }

      return (
        <Section design={heroDesign}>
          {heroDesign.isSplit && slotVisible ? (
            <div className={heroDesign.gridClass}>
              {heroDesign.mediaFirst ? (
                <>
                  {media}
                  {copy}
                </>
              ) : (
                <>
                  {copy}
                  {media}
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-8">
              {copy}
              {media}
            </div>
          )}
        </Section>
      );
    }

    case "usps": {
      const uspDesign = resolveSectionDesign({
        background: "bordered",
        layout: "grid_4",
        density: "compact",
        ...(c.design ?? {}),
      });
      /* V1.9 — asymmetric_grid: eerste USP groot, de rest compact ernaast. */
      const asymmetric = uspDesign.composition === "asymmetric_grid" && items.length >= 3;
      /* V1.9C — usp_strip: één compacte horizontale strip met scheidingstekens
         i.p.v. cards. Scant in één oogopslag. */
      if (uspDesign.composition === "usp_strip") {
        return (
          <section className="border-border/60 bg-card/30 border-y px-5 py-8 md:px-8 md:py-10">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-5">
              {items.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-3 text-base font-semibold md:text-lg"
                >
                  <span className="bg-zb-teal/15 text-zb-teal flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:h-10 md:w-10">
                    <Check className="h-5 w-5 md:h-6 md:w-6" />
                  </span>
                  {item.title}
                </span>
              ))}
            </div>
          </section>
        );
      }
      return (
        <Section design={uspDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={uspDesign} />
          <div className={asymmetric ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : uspDesign.gridClass}>
            {items.map((item, i) => (
              <div
                key={i}
                className={cn(
                  T.cards.default,
                  asymmetric && i === 0 && "bg-primary/5 border-primary/30 sm:col-span-2 lg:row-span-2 p-6",
                )}
              >
                <Check className={cn("text-primary", asymmetric && i === 0 ? "h-6 w-6" : "h-4 w-4")} />
                <p className={cn("mt-2", asymmetric && i === 0 ? "text-lg font-semibold" : T.typography.h3)}>
                  {item.title}
                </p>
                {item.text && <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      );
    }

    case "products": {
      const productDesign = resolveSectionDesign({ layout: "cards", ...(c.design ?? {}) });
      const composition = productDesign.composition;
      const productCard = (p: (typeof page.products)[number], featured = false) => (
        <article
          key={p.id}
          className={cn(
            "overflow-hidden rounded-xl border",
            featured && "bg-card grid sm:grid-cols-2",
            composition === "floating_products" && "shadow-lg",
          )}
        >
          {p.image_url && (
            <img
              src={p.image_url}
              alt={p.image_alt ?? p.name}
              loading="lazy"
              className={cn(
                "w-full object-cover",
                featured ? "h-full min-h-56" : "aspect-4/3",
                composition === "floating_products" && !featured && "m-3 w-[calc(100%-1.5rem)] rounded-lg shadow-md",
              )}
            />
          )}
          <div className={cn("p-4", featured && "flex flex-col justify-center p-6")}>
            <h3 className={featured ? "text-lg font-semibold" : T.typography.h3}>{p.name}</h3>
            {p.short_text && (
              <p className="text-muted-foreground mt-1 text-sm">{p.short_text}</p>
            )}
            {p.price_from !== null && (
              <p className="mt-2 text-sm font-medium">
                vanaf € {Number(p.price_from).toFixed(2).replace(".", ",")}
              </p>
            )}
            {p.personalization_options.length > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                {p.personalization_options.join(" · ")}
              </p>
            )}
          </div>
        </article>
      );
      /* V2.0 — featured-blok als herbruikbare closure (ook gebruikt door de
         polaroid-wand variant, V2.1). Data-driven. */
      const featuredShowcase = () => {
        /* V2.2 — twee tips naast elkaar op het blush canvas. Valt terug op
           één product als er maar één gekoppeld is. Data-driven. */
        const tips = page.products.slice(0, 2);
        const tipAccents = [
          "bg-primary/15",
          "bg-zb-teal/15",
        ];
        const benefits =
          items.length > 0
            ? items
            : [
                { title: "Vanaf 25 stuks — ook voor één team of project" },
                { title: "Volledig gepersonaliseerd in jullie huisstijl" },
                { title: "Levering op locatie of thuis bij medewerkers" },
              ];
        return (
          <section className="bg-zb-blush text-zb-ink relative overflow-hidden">
            <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <ZbPill className="bg-primary text-primary-foreground">
                  {tips.length > 1 ? "Twee favorieten" : "Featured · meest gekozen"}
                </ZbPill>
                
              </div>
              <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-14">
                {tips.map((p, i) => (
                  <div key={p.id} className="relative text-center">
                    {/* V2.3 — eerst de titel, daarna de foto (recht, niet gekanteld). */}
                    <ZbHeading text={p.name} className="text-3xl md:text-4xl" />
                    {p.short_text && (
                      <p className="text-zb-ink/70 mx-auto mt-3 max-w-sm leading-relaxed">
                        {p.short_text}
                      </p>
                    )}
                    <div className="relative mt-8">
                      <div
                        className={cn(
                          "absolute inset-0 -z-0 scale-105 rounded-full blur-3xl",
                          tipAccents[i % tipAccents.length],
                        )}
                      />
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.image_alt ?? p.name}
                          loading="lazy"
                          className="relative mx-auto w-56 drop-shadow-2xl transition-transform hover:scale-[1.03] md:w-80"
                        />
                      )}
                    </div>
                    {p.price_from !== null && (
                      <p className="text-zb-ink/80 mt-3 text-sm font-semibold">
                        vanaf € {Number(p.price_from).toFixed(2).replace(".", ",")}
                      </p>
                    )}
                    {p.personalization_options.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {p.personalization_options.slice(0, 3).map((o) => (
                          <span
                            key={o}
                            className="border-zb-ink/20 text-zb-ink/75 rounded-full border px-3 py-1 text-xs font-semibold"
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <ul className="mx-auto mt-14 flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-3">
                {benefits.map((u, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm font-medium md:text-base">
                    <span className="bg-zb-teal/15 text-zb-teal flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {u.title}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <ZbCtaSolid label={c.cta_label ?? "Vraag offerte aan"} url={c.cta_url} onClick={onCtaClick} />
                <ZbCtaGhost
                  label={c.secondary_cta_label ?? "Bekijk alle geschenken"}
                  url={c.secondary_cta_url}
                  onClick={onCtaClick}
                />
              </div>
            </div>
          </section>
        );
      };
      /* V2.1 — polaroid-wand: content.gallery (of productbeelden als
         fallback) als speelse, licht geroteerde polaroids. Data-driven. */
      const polaroids = (
        (c.gallery ?? []).filter((g) => g.url).length > 0
          ? (c.gallery ?? []).filter((g) => g.url)
          : page.products
              .filter((p) => p.image_url)
              .map((p) => ({ url: p.image_url!, alt: p.image_alt ?? p.name, caption: p.name }))
      ).slice(0, 10);
      const polaroidRotations = [
        "-rotate-3",
        "rotate-2",
        "-rotate-2",
        "rotate-3",
        "-rotate-1",
        "rotate-1",
        "-rotate-2",
        "rotate-2",
        "-rotate-3",
        "rotate-1",
      ];
      /* V2.3 — polaroids: groter en met veel minder overlap, zodat elke foto
         goed leesbaar blijft maar de wand speels blijft staan. */
      const polaroidWall =
        polaroids.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-8 md:gap-x-3">
            {polaroids.map((g, i) => (
              <figure
                key={i}
                className={cn(
                  "bg-card border-zb-ink/10 relative w-40 shrink-0 rounded-md border p-2 pb-3 shadow-xl transition-transform hover:z-30 hover:scale-105 hover:rotate-0 sm:w-48 md:w-56",
                  polaroidRotations[i % polaroidRotations.length],
                  i > 0 && "-ml-1 sm:-ml-2 md:-ml-3",
                  i % 2 === 1 ? "z-10 mt-6 md:mt-10" : "z-20",
                )}
              >
                <img
                  src={g.url}
                  alt={g.alt ?? ""}
                  loading="lazy"
                  className="aspect-square w-full rounded-sm object-cover"
                />
                {g.caption && (
                  <figcaption className="text-zb-ink/75 mt-2.5 line-clamp-1 text-center text-sm font-semibold md:text-base">
                    {g.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : null;
      return (
        <Section id="producten" design={productDesign}>
          {composition === "product_showcase_polaroids" ? (
            /* V2.2 — sierlijke display-serif kop voor de fotowand. */
            <div className="mb-10 max-w-2xl">
              {c.title && (
                <ZbHeading text={c.title} className="text-zb-ink text-4xl md:text-5xl" />
              )}
              {c.subtitle && (
                <p className="text-zb-ink/70 mt-3 text-lg leading-relaxed">{c.subtitle}</p>
              )}
            </div>
          ) : (
            <Heading title={c.title} subtitle={c.subtitle} design={productDesign} />
          )}
          {page.products.length === 0 && polaroids.length === 0 ? (
            <Body body={c.body} />
          ) : composition === "masonry_showcase" ? (
            /* V1.9C — masonry_showcase: echte asymmetrische masonry met
               wisselende tegelgroottes i.p.v. een uniform card-grid. */
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
              {page.products.map((p, i) => (
                <article key={p.id} className="bg-card overflow-hidden rounded-2xl border shadow-sm">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.image_alt ?? p.name}
                      loading="lazy"
                      className={cn(
                        "w-full object-cover",
                        i % 3 === 0 ? "aspect-[4/5]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/3]",
                      )}
                    />
                  )}
                  <div className="p-4">
                    <h3 className={T.typography.h3}>{p.name}</h3>
                    {p.short_text && <p className="text-muted-foreground mt-1 text-sm">{p.short_text}</p>}
                    {p.price_from !== null && (
                      <p className="mt-2 text-sm font-medium">
                        vanaf € {Number(p.price_from).toFixed(2).replace(".", ",")}
                      </p>
                    )}
                    {p.personalization_options.length > 0 && (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {p.personalization_options.join(" · ")}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : composition === "product_showcase_polaroids" ? (
            /* V2.1 — polaroid-wand + featured: eerst een speelse fotowand
               onder de titel, daarna het featured-blok. */
            <div className="space-y-16">
              {polaroidWall}
              {page.products.length > 0 && featuredShowcase()}
            </div>
          ) : composition === "product_showcase_featured" && page.products.length > 0 ? (
            featuredShowcase()
          ) : composition === "product_showcase_trio" && page.products.length >= 2 ? (
            /* V2.0 — ProductShowcase trio: drie producten overlappen elkaar
               met rotatie op een cream canvas met zachte blob; pill-labels
               i.p.v. cards. Data-driven. */
            (() => {
              const trio = page.products.filter((p) => p.image_url).slice(0, 3);
              const rotations = ["-rotate-6", "rotate-2", "rotate-6"];
              const zIndices = ["z-10", "z-20", "z-10"];
              return (
                <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
                  <ZbCandyDots />
                  <div className="relative mx-auto w-full max-w-6xl px-5 py-20 text-center md:px-8 md:py-28">
                    <ZbPill className="bg-zb-teal text-white">Onze favorieten</ZbPill>
                    {c.title && (
                      <ZbHeading text={c.title} className="mx-auto mt-6 max-w-2xl text-4xl md:text-6xl" />
                    )}
                    {c.subtitle && (
                      <p className="text-zb-ink/70 mx-auto mt-4 max-w-md text-lg leading-relaxed">{c.subtitle}</p>
                    )}
                    <div className="relative mx-auto mt-16 flex max-w-4xl items-end justify-center">
                      <div className="bg-secondary/25 absolute inset-x-10 bottom-0 -z-0 h-56 rounded-full blur-3xl" />
                      {trio.map((p, i) => (
                        <figure key={p.id} className={cn("relative", zIndices[i], i > 0 && "-ml-6 md:-ml-10")}>
                          <img
                            src={p.image_url!}
                            alt={p.image_alt ?? p.name}
                            loading="lazy"
                            className={cn(
                              "aspect-[3/4] w-32 rounded-2xl border-4 border-white object-cover shadow-2xl transition-transform hover:scale-105 sm:w-44 md:w-56",
                              rotations[i],
                              i === 1 && "md:-mb-6 md:w-64",
                            )}
                          />
                          <figcaption className="relative z-30 mt-4">
                            <span className="bg-card text-zb-ink inline-block rounded-full px-4 py-1.5 text-xs font-bold shadow-md">
                              {p.name}
                            </span>
                            {p.price_from !== null && (
                              <span className="text-zb-ink/60 mt-1.5 block text-xs font-medium">
                                vanaf € {Number(p.price_from).toFixed(2).replace(".", ",")}
                              </span>
                            )}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="mt-14 flex flex-wrap justify-center gap-3">
                      <ZbCtaSolid label={c.cta_label ?? "Stel je geschenk samen"} url={c.cta_url} onClick={onCtaClick} />
                      <ZbCtaGhost label={c.secondary_cta_label ?? "Offerte binnen 1 werkdag"} url={c.secondary_cta_url} onClick={onCtaClick} />
                    </div>
                  </div>
                </section>
              );
            })()
          ) : (
            <div className={productDesign.gridClass}>
              {page.products.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(composition === "staggered_grid" && i % 2 === 1 && "sm:mt-10")}
                >
                  {productCard(p)}
                </div>
              ))}
            </div>
          )}
        </Section>
      );
    }

    case "testimonials": {
      const tDesign = resolveSectionDesign({
        background: "card",
        layout: "grid_2",
        ...(c.design ?? {}),
      });
      /* V2.1 — testimonial_cards: speelse, licht geroteerde kaartjes op een
         cream canvas met candy-dots — alsof ze op een prikbord hangen.
         Data-driven uit page.testimonials. */
      if (tDesign.composition === "testimonial_cards" && page.testimonials.length > 0) {
        const cardRotations = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "-rotate-3", "rotate-1"];
        return (
          <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
            <ZbCandyDots />
            <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
              <div className="mx-auto max-w-2xl text-center">
                {c.badge && <ZbPill>{c.badge}</ZbPill>}
                {c.title && (
                  <ZbHeading text={c.title} className="mt-6 text-4xl md:text-5xl" />
                )}
                {c.subtitle && (
                  <p className="text-zb-ink/70 mt-4 text-lg leading-relaxed">{c.subtitle}</p>
                )}
              </div>
              <div className="mt-14 flex flex-wrap justify-center gap-6">
                {page.testimonials.map((t, i) => (
                  <blockquote
                    key={t.id}
                    className={cn(
                      "bg-card border-zb-ink/10 w-full max-w-xs rounded-2xl border-2 p-6 shadow-lg transition-transform hover:scale-[1.03] hover:rotate-0",
                      cardRotations[i % cardRotations.length],
                    )}
                  >
                    <Quote className="text-primary h-5 w-5" />
                    <p className="mt-3 text-sm leading-relaxed">{t.quote}</p>
                    <footer className="mt-5">
                      <span className="bg-zb-ink text-zb-cream inline-block rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide uppercase">
                        {t.author}
                        {t.company ? ` — ${t.company}` : ""}
                      </span>
                      {t.role_title && (
                        <span className="text-zb-ink/55 mt-2 block text-xs font-medium">
                          {t.role_title}
                        </span>
                      )}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        );
      }
      /* V1.9 — large_quote: eerste quote groot en centraal, rest compact. */
      if (tDesign.composition === "large_quote" && page.testimonials.length > 0) {
        /* V2.0 — large_quote op ZB-niveau: blush canvas met candy-dots,
           oversized display-serif quote en auteur als ink-pill. Data-driven. */
        const [first, ...rest] = page.testimonials;
        return (
          <section className="bg-zb-blush text-zb-ink relative overflow-hidden">
            <ZbCandyDots />
            <div className="relative mx-auto w-full max-w-5xl px-5 py-20 md:px-8 md:py-28">
              {(c.badge || c.title) && (
                <div className="text-center">
                  {c.badge && <ZbPill>{c.badge}</ZbPill>}
                  {c.title && (
                    <ZbHeading text={c.title} className="mx-auto mt-6 max-w-2xl text-4xl md:text-5xl" />
                  )}
                  {c.subtitle && (
                    <p className="text-zb-ink/70 mx-auto mt-4 max-w-xl text-lg leading-relaxed">
                      {c.subtitle}
                    </p>
                  )}
                </div>
              )}
              <blockquote className="mx-auto mt-12 max-w-3xl text-center">
                <Quote className="text-primary mx-auto h-10 w-10" />
                <p className="font-display mt-6 text-2xl leading-snug font-semibold tracking-tight text-balance md:text-4xl">
                  {first.quote}
                </p>
                <footer className="mt-8">
                  <span className="bg-zb-ink text-zb-cream inline-block rounded-full px-5 py-2 text-xs font-bold tracking-wide uppercase">
                    {first.author}
                    {first.role_title ? ` · ${first.role_title}` : ""}
                    {first.company ? ` — ${first.company}` : ""}
                  </span>
                </footer>
              </blockquote>
              {rest.length > 0 && (
                <div className="mt-14 grid gap-5 sm:grid-cols-2">
                  {rest.map((t) => (
                    <blockquote
                      key={t.id}
                      className="bg-card border-zb-ink/10 rounded-2xl border-2 p-6 shadow-sm"
                    >
                      <Quote className="text-primary h-4 w-4" />
                      <p className="mt-3 text-sm leading-relaxed">{t.quote}</p>
                      <footer className="text-zb-ink/60 mt-4 text-xs font-semibold">
                        {t.author}
                        {t.role_title ? `, ${t.role_title}` : ""}
                        {t.company ? ` — ${t.company}` : ""}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      }
      return (
        <Section design={tDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={tDesign} />
          <div className={tDesign.gridClass}>
            {page.testimonials.map((t) => (
              <blockquote key={t.id} className={T.cards.elevated}>
                <Quote className="text-primary h-4 w-4" />
                <p className="mt-3 text-sm leading-relaxed">{t.quote}</p>
                <footer className="text-muted-foreground mt-4 text-xs">
                  {t.author}
                  {t.role_title ? `, ${t.role_title}` : ""}
                  {t.company ? ` — ${t.company}` : ""}
                </footer>
              </blockquote>
            ))}
          </div>
        </Section>
      );
    }

    case "personalization": {
      /* V1.9 — before_after: standaard vs. gepersonaliseerd naast elkaar. */
      const pDesign = resolveSectionDesign(c.design);
      /* Geen stille fallback: zonder beeld toont de preview de before/after-
         compositie met expliciete AI VISUAL NEEDED-placeholders. */
      const beforeAfterMissing =
        !c.image_url && !c.image_url_2 && showVisualPlaceholders && visualIsMissing(visual);
      if (pDesign.composition === "before_after" && (c.image_url || c.image_url_2 || beforeAfterMissing)) {
        const beforeLabel = items[0]?.title ?? "Standaard cadeau";
        const afterLabel = items[1]?.title ?? "Met jouw merk";
        return (
          <Section design={pDesign}>
            <Heading title={c.title} subtitle={c.subtitle} design={pDesign} />
            <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
              <figure className="grid gap-2">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.image_alt ?? beforeLabel}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-2xl border object-cover"
                  />
                ) : (
                  <MediaSlot
                    src={undefined}
                    alt={beforeLabel}
                    visual={visual}
                    design={pDesign}
                    showPlaceholder={showVisualPlaceholders}
                  />
                )}
                <figcaption className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                  {beforeLabel}
                </figcaption>
              </figure>
              <div className="bg-primary/10 text-primary mx-auto flex h-11 w-11 items-center justify-center rounded-full">
                <ArrowRight className="h-5 w-5" />
              </div>
              <figure className="grid gap-2">
                {c.image_url_2 ? (
                  <img
                    src={c.image_url_2}
                    alt={c.image_alt_2 ?? afterLabel}
                    loading="lazy"
                    className="border-primary/40 aspect-4/3 w-full rounded-2xl border-2 object-cover shadow-lg"
                  />
                ) : (
                  <MediaSlot
                    src={undefined}
                    alt={afterLabel}
                    visual={visual}
                    design={pDesign}
                    showPlaceholder={showVisualPlaceholders}
                  />
                )}
                <figcaption className="text-primary text-center text-xs font-semibold tracking-wide uppercase">
                  {afterLabel}
                </figcaption>
              </figure>
            </div>
            <div className="mt-6">
              <Body body={c.body} />
            </div>
            {items.length > 2 && (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {items.slice(2).map((item, i) => (
                  <li key={i} className="flex gap-2.5 rounded-lg border p-3">
                    <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className={T.typography.h3}>{item.title}</p>
                      {item.text && <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {(c.cta_label || c.secondary_cta_label) && (
              <div className="mt-7 flex flex-wrap gap-3">
                <Cta label={c.cta_label} url={c.cta_url} className={pDesign.buttonClass} onClick={onCtaClick} />
                <Cta
                  label={c.secondary_cta_label}
                  url={c.secondary_cta_url}
                  className={T.buttons.outline}
                  onClick={onCtaClick}
                />
              </div>
            )}
          </Section>
        );
      }
      /* V2.0 — PersonalizationShowcase (editorial_split): cream canvas met
         candy-dots, boogfoto met hazard-streep en zwevend label links,
         display-serif copy en personalisatie-checks rechts. Data-driven. */
      if (pDesign.composition === "editorial_split" && (c.image_url || (showVisualPlaceholders && visualIsMissing(visual)))) {
        return (
          <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
            <ZbCandyDots />
            <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[0.95fr_1.05fr] md:px-8 md:py-28">
              <div className="relative">
                {c.image_url ? (
                  <ZbRoundFrame src={c.image_url} alt={c.image_alt ?? visual?.purpose ?? ""} />
                ) : (
                  <div className="border-primary/40 bg-primary/5 text-primary flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed p-5">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs font-semibold tracking-wide uppercase">AI visual needed</span>
                    {visual?.visual_brief && (
                      <span className="text-muted-foreground line-clamp-3 text-center text-xs italic">
                        {visual.visual_brief}
                      </span>
                    )}
                  </div>
                )}
                <span className="zb-hazard absolute -bottom-5 left-8 h-3 w-40 rotate-[-2deg] rounded-full shadow-md" />
                {c.image_badge && (
                  <span className="bg-card text-zb-ink absolute top-8 -right-3 rotate-3 rounded-full px-4 py-2 text-xs font-bold shadow-xl md:-right-6">
                    {c.image_badge}
                  </span>
                )}
              </div>
              <div>
                {c.badge && (
                  <ZbPill className="bg-primary text-primary-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> {c.badge}
                  </ZbPill>
                )}
                {c.title && <ZbHeading text={c.title} className="mt-6 text-4xl md:text-6xl" />}
                {c.subtitle && (
                  <p className="text-zb-ink/70 mt-6 max-w-md text-lg leading-relaxed">{c.subtitle}</p>
                )}
                {c.body && (
                  <div className="mt-4 max-w-md">
                    <Body body={c.body} />
                  </div>
                )}
                {items.length > 0 && (
                  <ul className="mt-8 space-y-3">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-base font-medium">
                        <span className="bg-zb-teal/15 text-zb-teal mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>
                          {item.title}
                          {item.text && (
                            <span className="text-zb-ink/60 mt-0.5 block text-sm font-normal">
                              {item.text}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {(c.cta_label || c.secondary_cta_label) && (
                  <div className="mt-8 flex flex-wrap gap-3">
                    <ZbCtaSolid label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                    <ZbCtaGhost label={c.secondary_cta_label} url={c.secondary_cta_url} onClick={onCtaClick} />
                  </div>
                )}
                {c.footnote && (
                  <p className="text-zb-ink/55 mt-3 text-xs font-medium">{c.footnote}</p>
                )}
              </div>
            </div>
          </section>
        );
      }
      /* Andere composities vallen terug op de standaard intro-rendering. */
      const media = <MediaSlot
          src={c.image_url}
          alt={c.image_alt}
          visual={visual}
          design={pDesign}
          showPlaceholder={showVisualPlaceholders}
        />;
      return (
        <Section design={pDesign}>
          {pDesign.isSplit && slotVisible ? (
            <div className={pDesign.gridClass}>
              {pDesign.mediaFirst ? (
                <>
                  {media}
                  <div>
                    <Heading title={c.title} subtitle={c.subtitle} design={pDesign} />
                    <Body body={c.body} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Heading title={c.title} subtitle={c.subtitle} design={pDesign} />
                    <Body body={c.body} />
                  </div>
                  {media}
                </>
              )}
            </div>
          ) : (
            <>
              <Heading title={c.title} subtitle={c.subtitle} design={pDesign} />
              <Body body={c.body} />
              {slotVisible && <div className="mt-8">{media}</div>}
            </>
          )}
        </Section>
      );
    }

    case "faq":
      /* V2.0 — FAQ op ZB-niveau: cream canvas, display-serif kop en
         afgeronde kaarten met plus-pill i.p.v. een kale scheidingslijst.
         Data-driven. */
      return (
        <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
          <div className="relative mx-auto w-full max-w-4xl px-5 py-20 md:px-8 md:py-24">
            <div className="max-w-2xl">
              {c.badge && <ZbPill>{c.badge}</ZbPill>}
              {c.title && <ZbHeading text={c.title} className="mt-6 text-4xl md:text-5xl" />}
              {c.subtitle && (
                <p className="text-zb-ink/70 mt-4 text-lg leading-relaxed">{c.subtitle}</p>
              )}
            </div>
            <div className="mt-12 space-y-4">
              {items.map((item, i) => (
                <details
                  key={i}
                  className="group bg-card border-zb-ink/10 open:border-primary/40 rounded-2xl border-2 p-5 shadow-sm transition-colors open:shadow-md"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                    {item.title}
                    <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-45">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  {item.text && (
                    <p className="text-zb-ink/70 mt-3 text-sm leading-relaxed">{item.text}</p>
                  )}
                </details>
              ))}
            </div>
            {c.footnote && (
              <p className="text-zb-ink/55 mt-8 text-xs font-medium">{c.footnote}</p>
            )}
          </div>
        </section>
      );

    case "cta_banner": {
      const bannerDesign = resolveSectionDesign({ layout: "banner", ...(c.design ?? {}) });
      /* V1.9 — visual_cta: sfeerbeeld rechts in de banner. Geen stille
         fallback: ontbreekt het beeld, toont de preview een placeholder. */
      /* V1.9C — editorial_cta: full-bleed beeld als achtergrond met een
         contrasterend conversiepaneel. Geen rechthoekige card meer. */
      if (bannerDesign.composition === "editorial_cta" && (c.image_url || (showVisualPlaceholders && visualIsMissing(visual)))) {
        return (
          <section className="relative overflow-hidden">
            {c.image_url ? (
              <img
                src={c.image_url}
                alt={c.image_alt ?? ""}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="bg-primary/15 absolute inset-0" />
            )}
            <div className="from-foreground/75 via-foreground/45 absolute inset-0 bg-gradient-to-t to-transparent" />
            <div className="relative mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-32">
              <div className="max-w-xl text-white">
                <h2 className="text-3xl font-semibold tracking-tight drop-shadow md:text-5xl">{c.title}</h2>
                {c.subtitle && <p className="mt-3 text-lg text-white/90">{c.subtitle}</p>}
                {c.body && <p className="mt-2 text-white/80">{c.body}</p>}
                <div className="mt-6">
                  <Cta label={c.cta_label} url={c.cta_url} className={bannerDesign.buttonClass} onClick={onCtaClick} />
                </div>
              </div>
            </div>
            {!c.image_url && showVisualPlaceholders && visualIsMissing(visual) && (
              <div className="relative mx-auto -mt-14 w-full max-w-6xl px-5 pb-6 md:px-8">
                <MediaSlot
                  src={undefined}
                  alt={c.image_alt}
                  visual={visual}
                  design={bannerDesign}
                  showPlaceholder={showVisualPlaceholders}
                />
              </div>
            )}
          </section>
        );
      }
      const isVisualCta = bannerDesign.composition === "visual_cta";
      const withImage = isVisualCta && Boolean(c.image_url);
      const ctaMissing =
        isVisualCta && !c.image_url && showVisualPlaceholders && visualIsMissing(visual);
      return (
        <Section design={bannerDesign}>
          <div className="from-primary/15 to-primary/5 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-gradient-to-r p-8">
            <div className="max-w-xl">
              <h2 className={bannerDesign.headingClass}>{c.title}</h2>
              {c.subtitle && <p className="text-muted-foreground mt-2 text-sm">{c.subtitle}</p>}
              {c.body && (
                <div className="mt-2">
                  <Body body={c.body} />
                </div>
              )}
              <div className="mt-5">
                <Cta
                  label={c.cta_label}
                  url={c.cta_url}
                  className={bannerDesign.buttonClass}
                  onClick={onCtaClick}
                />
              </div>
            </div>
            {withImage ? (
              <img
                src={c.image_url}
                alt={c.image_alt ?? ""}
                loading="lazy"
                className="aspect-square w-40 rounded-2xl object-cover shadow-lg md:w-52"
              />
            ) : ctaMissing ? (
              <div className="w-40 md:w-52">
                <MediaSlot
                  src={undefined}
                  alt={c.image_alt}
                  visual={visual}
                  design={bannerDesign}
                  showPlaceholder={showVisualPlaceholders}
                />
              </div>
            ) : (
              <Cta
                label={c.cta_label}
                url={c.cta_url}
                className={bannerDesign.buttonClass}
                onClick={onCtaClick}
              />
            )}
          </div>
        </Section>
      );
    }

    case "form": {
      const formDesign = resolveSectionDesign({ background: "card", ...(c.design ?? {}) });
      /* V1.9C — premium_form: beeld + benefits-links, formulier rechts in een
         verhoogd paneel. Commerciële afsluiter i.p.v. kale card. */
      if (formDesign.composition === "premium_form") {
        const formImage = c.image_url ?? page.products.find((p) => p.image_url)?.image_url;
        return (
          <section id="offerte" className="bg-zb-ink text-zb-cream relative overflow-hidden">
            <div className="zb-hazard absolute inset-x-0 top-0 h-3" />
            <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-28">
              <div>
                {c.badge && (
                  <ZbPill className="bg-zb-honey text-zb-ink">
                    <Sparkles className="h-3.5 w-3.5" /> {c.badge}
                  </ZbPill>
                )}
                {c.title && (
                  <h2 className="font-display mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
                    {c.title}
                  </h2>
                )}
                {c.subtitle && (
                  <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">{c.subtitle}</p>
                )}
                {c.body && (
                  <div className="mt-4 max-w-md text-white/70">
                    <Body body={c.body} />
                  </div>
                )}
                {items.length > 0 && (
                  <ul className="mt-8 space-y-3">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-base font-medium">
                        <span className="bg-zb-teal/20 text-zb-teal mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-white/90">{item.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {c.footnote && (
                  <p className="mt-6 text-xs font-medium text-white/50">{c.footnote}</p>
                )}
              </div>
              <div className="bg-card text-foreground rounded-3xl border-4 border-white/10 p-6 shadow-2xl md:p-8">
                {formSlot}
              </div>
            </div>
          </section>
        );
      }
      return (
        <Section id="offerte" design={formDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={formDesign} />
          {formSlot}
        </Section>
      );
    }

    case "how_it_works":
    case "use_cases": {
      const stepDesign = resolveSectionDesign({ layout: "grid_4", ...(c.design ?? {}) });
      /* V2.1 — steps_dots: speelse stappenstippen zoals het cadeauplatform —
         grote gekleurde cirkels met icoon, nummer-badge en een golvende
         stippellijn als connector. Data-driven. */
      if (section.block_type === "how_it_works" && stepDesign.composition === "steps_dots") {
        const stepIcons = [Gift, Palette, Truck, HeartHandshake, Package, Sparkles];
        const stepColors = [
          "bg-secondary text-zb-ink",
          "bg-primary text-primary-foreground",
          "bg-zb-teal text-white",
          "bg-zb-honey text-zb-ink",
        ];
        return (
          <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
            <ZbCandyDots />
            <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
              <div className="mx-auto max-w-2xl text-center">
                {c.badge && (
                  <ZbPill>
                    <Sparkles className="h-3.5 w-3.5" /> {c.badge}
                  </ZbPill>
                )}
                {c.title && <ZbHeading text={c.title} className="mt-6 text-4xl md:text-5xl" />}
                {c.subtitle && (
                  <p className="text-zb-ink/70 mt-4 text-lg leading-relaxed">{c.subtitle}</p>
                )}
              </div>
              <div className="relative mt-16">
                <svg
                  className="text-zb-ink/25 absolute top-12 left-0 hidden w-full lg:block"
                  viewBox="0 0 1000 100"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M 0 50 Q 125 0 250 50 T 500 50 T 750 50 T 1000 50"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="1 14"
                    strokeLinecap="round"
                  />
                </svg>
                <ol className="relative grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((item, i) => {
                    const StepIcon = stepIcons[i % stepIcons.length];
                    return (
                      <li key={i} className={cn("group text-center", i % 2 === 1 && "lg:mt-10")}>
                        <div
                          className={cn(
                            "relative mx-auto flex h-24 w-24 items-center justify-center rounded-full shadow-xl transition-transform group-hover:scale-110",
                            stepColors[i % stepColors.length],
                          )}
                        >
                          <StepIcon className="h-10 w-10" />
                          <span className="bg-zb-ink text-zb-cream font-display absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shadow-md">
                            {i + 1}
                          </span>
                        </div>
                        <p className="font-display mt-5 text-xl leading-snug font-semibold">
                          {(item.title ?? "").replace(/^\d+\.\s*/, "")}
                        </p>
                        {item.text && (
                          <p className="text-zb-ink/65 mt-2 text-sm leading-relaxed">{item.text}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
              {c.footnote && (
                <p className="text-zb-ink/55 mt-12 text-center text-xs font-medium">{c.footnote}</p>
              )}
            </div>
          </section>
        );
      }
      /* V1.9C — steps_strip: compacte horizontale stappenlijst met verbinding,
         geen cards. */
      if (section.block_type === "how_it_works" && stepDesign.composition === "steps_strip") {
        /* V2.0 — StepsTimeline op ZB-niveau: cream canvas, display-serif kop,
           ink-nummerballen met display-cijfers en een dashed connector in
           merkkleur. Royale whitespace, geen cards. Data-driven. */
        return (
          <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
            <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
              <div className="max-w-2xl">
                {c.badge && (
                  <ZbPill>
                    <Sparkles className="h-3.5 w-3.5" /> {c.badge}
                  </ZbPill>
                )}
                {c.title && <ZbHeading text={c.title} className="mt-6 text-4xl md:text-5xl" />}
                {c.subtitle && (
                  <p className="text-zb-ink/70 mt-4 max-w-xl text-lg leading-relaxed">{c.subtitle}</p>
                )}
              </div>
              <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((item, i) => (
                  <li key={i} className="relative">
                    <div className="flex items-center gap-3">
                      <span className="bg-zb-ink text-zb-cream font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold shadow-lg">
                        {i + 1}
                      </span>
                      {i < items.length - 1 && (
                        <span className="border-zb-ink/25 hidden h-px flex-1 border-t-2 border-dashed lg:block" />
                      )}
                    </div>
                    <p className="font-display mt-5 text-xl leading-snug font-semibold">
                      {(item.title ?? "").replace(/^\d+\.\s*/, "")}
                    </p>
                    {item.text && (
                      <p className="text-zb-ink/65 mt-2 text-sm leading-relaxed">{item.text}</p>
                    )}
                  </li>
                ))}
              </ol>
              {c.footnote && (
                <p className="text-zb-ink/55 mt-10 text-xs font-medium">{c.footnote}</p>
              )}
            </div>
          </section>
        );
      }
      /* V2.1 — industry_story_moments: vier grote foto's als versprongen,
         geroteerde collage; moment-labels zweven over de beelden. Geen cards.
         Data-driven (image_url t/m image_url_4 + items als labels). */
      if (
        section.block_type === "use_cases" &&
        stepDesign.composition === "industry_story_moments" &&
        (c.image_url || (showVisualPlaceholders && visualIsMissing(visual)))
      ) {
        const momentImages = [
          { src: c.image_url, alt: c.image_alt },
          {
            src: c.image_url_2 || page.products.find((p) => p.image_url)?.image_url,
            alt: c.image_alt_2,
          },
          { src: c.image_url_3, alt: c.image_alt_3 },
          { src: c.image_url_4, alt: c.image_alt_4 },
        ].filter((m) => m.src);
        const momentRotations = ["-rotate-1", "rotate-2", "rotate-1", "-rotate-2"];
        /* V2.2 — foto's vallen een klein beetje over elkaar heen. */
        const momentOffsets = ["", "md:mt-14", "md:-mt-8", "md:mt-6"];
        const momentLabelColors = [
          "bg-primary text-primary-foreground -rotate-3",
          "bg-zb-teal text-white rotate-2",
          "bg-zb-ink text-zb-cream -rotate-2",
          "bg-zb-honey text-zb-ink rotate-3",
        ];
        return (
          <section className="bg-zb-blush text-zb-ink relative overflow-hidden">
            <ZbCandyDots />
            <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-28">
              <div className="max-w-3xl">
                {(c.badge || page.industry_name) && (
                  <ZbPill>
                    <Sparkles className="h-3.5 w-3.5" /> {c.badge ?? `Momenten in ${page.industry_name}`}
                  </ZbPill>
                )}
                {c.title && (
                  <ZbHeading text={c.title} className="mt-6 text-4xl md:text-6xl" />
                )}
              </div>
              <div className="mt-14 grid gap-6 sm:grid-cols-2 md:gap-0">
                {momentImages.map((m, i) => (
                  <figure
                    key={i}
                    className={cn(
                      "relative transition-transform hover:z-30",
                      i % 2 === 1 ? "z-10 md:-ml-6" : "z-20",
                      momentOffsets[i % 4],
                    )}
                  >
                    <img
                      src={m.src!}
                      alt={m.alt ?? ""}
                      loading="lazy"
                      className={cn(
                        "aspect-[4/3] w-full rounded-3xl border-4 border-white object-cover shadow-2xl",
                        momentRotations[i % 4],
                      )}
                    />
                    {items[i]?.title && (
                      <span
                        className={cn(
                          "absolute -top-4 left-6 rounded-full px-4 py-2 text-xs font-bold shadow-lg",
                          momentLabelColors[i % 4],
                        )}
                      >
                        {items[i].title}
                      </span>
                    )}
                  </figure>
                ))}
              </div>
              {c.subtitle && (
                <p className="text-zb-ink/70 mt-12 max-w-xl text-lg leading-relaxed">{c.subtitle}</p>
              )}
              {items.length > momentImages.length && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {items.slice(momentImages.length).map((m) => (
                    <span
                      key={m.title}
                      className="border-zb-ink/20 text-zb-ink/80 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                    >
                      {m.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      }
      /* V1.9 — asymmetric_grid voor use_cases: eerste moment groot, de rest
         compact. Ontbreekt het geplande icoon/illustratie-beeld, dan toont de
         preview een expliciete placeholder i.p.v. stille fallback. */
      const asymmetric =
        section.block_type === "use_cases" &&
        stepDesign.composition === "asymmetric_grid" &&
        items.length >= 3;
      const iconsMissing =
        section.block_type === "use_cases" &&
        showVisualPlaceholders &&
        visualIsMissing(visual);
      return (
        <Section design={stepDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={stepDesign} />
          {iconsMissing && (
            <div className="mb-4 max-w-md">
              <MediaSlot
                src={undefined}
                alt={c.title}
                visual={visual ? { ...visual, aspect_ratio: "16:9" } : visual}
                design={stepDesign}
                showPlaceholder={showVisualPlaceholders}
              />
            </div>
          )}
          <ol className={asymmetric ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : stepDesign.gridClass}>
            {items.map((item, i) => (
              <li
                key={i}
                className={cn(
                  T.cards.quiet,
                  asymmetric && i === 0 && "bg-primary/5 border-primary/30 sm:col-span-2 lg:row-span-2 p-6",
                )}
              >
                <span
                  className={cn(
                    "bg-primary/10 text-primary inline-flex items-center justify-center rounded-full text-xs font-semibold",
                    asymmetric && i === 0 ? "h-9 w-9 text-sm" : "h-7 w-7",
                  )}
                >
                  {i + 1}
                </span>
                <p className={cn("mt-2", asymmetric && i === 0 ? "text-lg font-semibold" : T.typography.h3)}>
                  {item.title}
                </p>
                {item.text && <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>}
              </li>
            ))}
          </ol>
        </Section>
      );
    }

    case "social_proof": {
      const spDesign = resolveSectionDesign({
        background: "bordered",
        density: "compact",
        ...(c.design ?? {}),
      });
      /* V2.1 — logo_cloud_stats: donker ink-paneel met klantlogo's (witte
         varianten) en KPI-stats zoals reviewscore. Data-driven via
         content.logos / content.stats. */
      if (spDesign.composition === "logo_cloud_stats") {
        const logos = (c.logos ?? []).filter((l) => l.url);
        const stats = (c.stats ?? []).filter((s) => s.value);
        return (
          <section className="bg-zb-ink text-zb-cream relative overflow-hidden">
            <div className="zb-hazard absolute inset-x-0 top-0 h-2.5" />
            <div className="relative mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-20">
              <div className="mx-auto max-w-2xl text-center">
                {c.title && (
                  <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
                    {c.title}
                  </h2>
                )}
                {c.subtitle && <p className="mt-3 text-white/70">{c.subtitle}</p>}
              </div>
              {stats.length > 0 && (
                <div className="mt-10 flex flex-wrap items-stretch justify-center gap-4">
                  {stats.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-center"
                    >
                      <p className="font-display text-zb-honey text-2xl font-semibold md:text-3xl">
                        {s.value}
                      </p>
                      <p className="mt-1 text-xs font-medium text-white/60">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {logos.length > 0 && (
                /* V2.3 — logo-slider: doorlopende marquee met grotere logo's;
                   pauzeert bij hover. Track is verdubbeld voor een naadloze loop. */
                <div className="zb-marquee relative mt-12 -mx-5 overflow-hidden md:-mx-8">
                  <div className="from-zb-ink pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r to-transparent md:w-20" />
                  <div className="from-zb-ink pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l to-transparent md:w-20" />
                  <div className="zb-marquee-track flex items-stretch gap-3 md:gap-4">
                    {[...logos, ...logos].map((l, i) => (
                      <span
                        key={i}
                        className="flex w-36 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] px-4 py-4 transition hover:bg-white/[0.12] sm:w-44 md:w-52"
                      >
                        <img
                          src={l.url}
                          alt={l.alt ?? ""}
                          loading="lazy"
                          className="h-8 w-full object-contain opacity-90 transition hover:opacity-100 sm:h-10 md:h-12"
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      }
      /* V1.9 — trust_strip: compacte pillen-strip zonder koppen. */
      if (spDesign.composition === "trust_strip") {
        /* V2.0 — trust_strip op ZB-niveau: donker ink-bandje met cream
           pillen en teal checks. Data-driven. */
        return (
          <section className="bg-zb-ink text-zb-cream px-5 py-10 md:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3">
              {c.title && (
                <span className="text-zb-cream/60 mr-2 text-xs font-semibold tracking-widest uppercase">
                  {c.title}
                </span>
              )}
              {items.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium"
                >
                  <Check className="text-zb-teal h-4 w-4 shrink-0" />
                  {item.title}
                </span>
              ))}
            </div>
          </section>
        );
      }
      /* V2.0 — social proof default: ZB-pillen i.p.v. kale tekstregel. */
      return (
        <Section design={spDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={spDesign} />
          <div className="flex flex-wrap gap-3">
            {items.map((item, i) => (
              <span
                key={i}
                className="border-zb-ink/15 bg-card text-zb-ink/80 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm"
              >
                <Check className="text-primary h-4 w-4 shrink-0" />
                {item.title}
              </span>
            ))}
          </div>
        </Section>
      );
    }

    default: {
      // intro / personalization / why_us and any future block type
      /* V2.0 — trust_strip voor why_us: donker ink-paneel met hazard-rand,
         display-serif kop en trust-tegels met teal checks. Data-driven. */
      if (design.composition === "trust_strip") {
        return (
          <section className="bg-zb-ink text-zb-cream relative overflow-hidden">
            <div className="zb-hazard absolute inset-x-0 top-0 h-3" />
            <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
              <div className="max-w-2xl">
                {c.badge && (
                  <ZbPill className="bg-zb-honey text-zb-ink">
                    <Sparkles className="h-3.5 w-3.5" /> {c.badge}
                  </ZbPill>
                )}
                {c.title && (
                  <h2 className="font-display mt-6 text-3xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
                    {c.title}
                  </h2>
                )}
                {c.subtitle && (
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">{c.subtitle}</p>
                )}
                {c.body && (
                  <div className="mt-4 max-w-xl text-white/70">
                    <Body body={c.body} />
                  </div>
                )}
              </div>
              {items.length > 0 && (
                /* V2.2 — speelse, licht gekantelde tegels met groot serif-cijfer. */
                <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, i) => {
                    const tilt = ["-rotate-1", "rotate-1", "rotate-[-0.5deg]"][i % 3];
                    const dot = ["bg-primary", "bg-zb-honey", "bg-zb-teal"][i % 3];
                    return (
                      <li
                        key={i}
                        className={cn(
                          "group relative rounded-lg border border-white/15 bg-white/[0.06] p-6 pt-8 transition-transform hover:rotate-0 hover:bg-white/[0.1]",
                          tilt,
                        )}
                      >
                        <span
                          className={cn(
                            "text-zb-ink absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-lg",
                            dot,
                          )}
                        >
                          {i + 1}
                        </span>
                        <p className="font-display text-2xl leading-tight">{item.title}</p>
                        {item.text && (
                          <p className="mt-2 text-sm leading-relaxed text-white/65">{item.text}</p>
                        )}
                        <span
                          className={cn(
                            "mt-5 block h-1 w-10 rounded-full transition-all group-hover:w-16",
                            dot,
                          )}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              {(c.cta_label || c.secondary_cta_label) && (
                <div className="mt-10 flex flex-wrap gap-3">
                  <ZbCtaSolid label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                  <ZbCtaGhost label={c.secondary_cta_label} url={c.secondary_cta_url} dark onClick={onCtaClick} />
                </div>
              )}
            </div>
          </section>
        );
      }

      /* V1.9C — statement_intro: editorial statement met oversized typografie,
         subtiele decoratieve laag en geen card. */
      if (design.composition === "statement_intro") {
        return (
          <section className="relative overflow-hidden px-5 py-20 md:px-8 md:py-28">
            <div
              aria-hidden
              className="bg-primary/10 pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl"
            />
            <div className="relative mx-auto w-full max-w-4xl">
              {c.title && (
                <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
                  {c.title}
                </h2>
              )}
              {c.subtitle && <p className="text-muted-foreground mt-4 text-lg">{c.subtitle}</p>}
              {c.body && (
                <div className="mt-6 max-w-2xl">
                  <Body body={c.body} />
                </div>
              )}
              {(c.cta_label || c.secondary_cta_label) && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <Cta label={c.cta_label} url={c.cta_url} className={design.buttonClass} onClick={onCtaClick} />
                  <Cta
                    label={c.secondary_cta_label}
                    url={c.secondary_cta_url}
                    className={T.buttons.outline}
                    onClick={onCtaClick}
                  />
                </div>
              )}
            </div>
          </section>
        );
      }

      /* V2.0 — industry_story_split: magazine-achtige split: boogfoto links,
         oversized quote in display-serif rechts, hazard-stripe als scheiding.
         Data-driven. */
      if (design.composition === "industry_story_split" && (c.image_url || (showVisualPlaceholders && visualIsMissing(visual)))) {
        return (
          <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
            <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:px-8 md:py-28">
              <div className="relative">
                {c.image_url ? (
                  <ZbRoundFrame src={c.image_url} alt={c.image_alt ?? visual?.purpose ?? ""} />
                ) : (
                  <div className="border-primary/40 bg-primary/5 text-primary flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed p-5">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs font-semibold tracking-wide uppercase">AI visual needed</span>
                    {visual?.visual_brief && (
                      <span className="text-muted-foreground line-clamp-3 text-center text-xs italic">
                        {visual.visual_brief}
                      </span>
                    )}
                  </div>
                )}
                <span className="zb-hazard absolute -bottom-5 left-8 h-3 w-40 rotate-[-2deg] rounded-full shadow-md" />
              </div>
              <div>
                {page.industry_name && (
                  <ZbPill className="bg-zb-teal text-white">
                    <Sparkles className="h-3.5 w-3.5" /> {page.industry_name}
                  </ZbPill>
                )}
                {c.title && (
                  <blockquote className="font-display mt-6 text-3xl leading-snug font-semibold tracking-tight text-balance md:text-5xl">
                    <Quote className="text-primary mb-3 h-8 w-8" />
                    {c.title}
                  </blockquote>
                )}
                {c.subtitle && (
                  <p className="text-zb-ink/70 mt-6 max-w-md text-lg leading-relaxed">{c.subtitle}</p>
                )}
                {c.body && (
                  <div className="mt-4">
                    <Body body={c.body} />
                  </div>
                )}
                {items.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {items.map((m) => (
                      <span
                        key={m.title}
                        className="border-zb-ink/20 text-zb-ink/80 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                      >
                        {m.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      }

      /* V2.0 — industry_story_moments: statement-headline met twee versprongen,
         geroteerde foto's die elkaar overlappen; moment-labels zweven over de
         beelden. Geen cards. Data-driven. */
      if (design.composition === "industry_story_moments" && (c.image_url || (showVisualPlaceholders && visualIsMissing(visual)))) {
        const moment2 = c.image_url_2 || page.products.find((p) => p.image_url)?.image_url;
        return (
          <section className="bg-zb-blush text-zb-ink relative overflow-hidden">
            <ZbCandyDots />
            <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-28">
              <div className="max-w-3xl">
                {(c.badge || page.industry_name) && (
                  <ZbPill>
                    <Sparkles className="h-3.5 w-3.5" /> {c.badge ?? `Momenten in ${page.industry_name}`}
                  </ZbPill>
                )}
                {c.title && (
                  <ZbHeading text={c.title} className="mt-6 text-4xl md:text-6xl" />
                )}
              </div>
              <div className="relative mt-14 grid gap-10 md:grid-cols-12 md:gap-0">
                <div className="relative md:col-span-7">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.image_alt ?? ""}
                      loading="lazy"
                      className="w-full -rotate-1 rounded-3xl border-4 border-white object-cover shadow-2xl"
                    />
                  ) : (
                    <div className="border-primary/40 bg-primary/5 text-primary flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-5">
                      <ImageOff className="h-8 w-8" />
                      <span className="text-xs font-semibold tracking-wide uppercase">AI visual needed</span>
                    </div>
                  )}
                  {items[0]?.title && (
                    <span className="bg-primary text-primary-foreground absolute -top-4 left-6 -rotate-3 rounded-full px-4 py-2 text-xs font-bold shadow-lg">
                      {items[0].title}
                    </span>
                  )}
                </div>
                <div className="relative md:col-span-5 md:-ml-16 md:mt-24">
                  {moment2 ? (
                    <img
                      src={moment2}
                      alt={c.image_alt_2 ?? ""}
                      loading="lazy"
                      className="w-full rotate-2 rounded-3xl border-4 border-white object-cover shadow-2xl"
                    />
                  ) : (
                    <div className="border-zb-teal/40 bg-zb-teal/5 text-zb-teal flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-5">
                      <ImageOff className="h-8 w-8" />
                      <span className="text-xs font-semibold tracking-wide uppercase">AI visual needed</span>
                    </div>
                  )}
                  {items[1]?.title && (
                    <span className="bg-zb-teal absolute -bottom-4 right-6 rotate-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg">
                      {items[1].title}
                    </span>
                  )}
                </div>
              </div>
              {c.subtitle && (
                <p className="text-zb-ink/70 mt-12 max-w-xl text-lg leading-relaxed">{c.subtitle}</p>
              )}
              {c.body && (
                <div className="mt-4 max-w-xl">
                  <Body body={c.body} />
                </div>
              )}
              {(c.cta_label || c.secondary_cta_label) && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <ZbCtaSolid label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                  <ZbCtaGhost label={c.secondary_cta_label} url={c.secondary_cta_url} onClick={onCtaClick} />
                </div>
              )}
            </div>
          </section>
        );
      }

      const media = <MediaSlot
          src={c.image_url}
          alt={c.image_alt}
          visual={visual}
          design={design}
          showPlaceholder={showVisualPlaceholders}
        />;
      const copy = (
        <div>
          <Heading title={c.title} subtitle={c.subtitle} design={design} />
          <Body body={c.body} />
          {items.length > 0 && (
            <ul className={cn("mt-6", design.isSplit ? T.grids.list : T.grids.grid_2)}>
              {items.map((item, i) => (
                <li key={i} className="flex gap-2.5 rounded-lg border p-3">
                  <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className={T.typography.h3}>{item.title}</p>
                    {item.text && <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(c.cta_label || c.secondary_cta_label) && (
            <div className="mt-7 flex flex-wrap gap-3">
              <Cta
                label={c.cta_label}
                url={c.cta_url}
                className={design.buttonClass}
                onClick={onCtaClick}
              />
              <Cta
                label={c.secondary_cta_label}
                url={c.secondary_cta_url}
                className={T.buttons.outline}
                onClick={onCtaClick}
              />
            </div>
          )}
        </div>
      );
      return (
        <Section design={design}>
          {design.isSplit && slotVisible ? (
            <div className={design.gridClass}>
              {design.mediaFirst ? (
                <>
                  {media}
                  {copy}
                </>
              ) : (
                <>
                  {copy}
                  {media}
                </>
              )}
            </div>
          ) : (
            <>
              {copy}
              {slotVisible && <div className="mt-8">{media}</div>}
            </>
          )}
        </Section>
      );
    }
  }
}

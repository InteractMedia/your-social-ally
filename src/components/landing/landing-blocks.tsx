/**
 * Presentational block renderer for the Landing Page Engine.
 *
 * All content comes from the page configuration — never hardcoded copy — and all
 * styling comes from the central ZoetBezorgen Landing Design System. A section
 * can only pick pre-approved design variants, so AI-generated pages stay on
 * brand and can never inject markup or arbitrary styling.
 */
import { Check, Quote, Sparkles } from "lucide-react";

import {
  LANDING_DESIGN_TOKENS as T,
  resolveSectionDesign,
} from "@/lib/landing-design-system";
import { paragraphs, type LandingSection } from "@/lib/landing-shared";
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
      const media = <Media src={c.image_url} alt={c.image_alt} design={heroDesign} eager />;
      return (
        <Section design={heroDesign}>
          {heroDesign.isSplit && c.image_url ? (
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
      return (
        <Section design={uspDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={uspDesign} />
          <div className={uspDesign.gridClass}>
            {items.map((item, i) => (
              <div key={i} className={T.cards.default}>
                <Check className="text-primary h-4 w-4" />
                <p className={cn("mt-2", T.typography.h3)}>{item.title}</p>
                {item.text && <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      );
    }

    case "products": {
      const productDesign = resolveSectionDesign({ layout: "cards", ...(c.design ?? {}) });
      return (
        <Section id="producten" design={productDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={productDesign} />
          {page.products.length === 0 ? (
            <Body body={c.body} />
          ) : (
            <div className={productDesign.gridClass}>
              {page.products.map((p) => (
                <article key={p.id} className="overflow-hidden rounded-xl border">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.image_alt ?? p.name}
                      loading="lazy"
                      className="aspect-4/3 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className={T.typography.h3}>{p.name}</h3>
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
      return (
        <Section design={tDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={tDesign} />
          {page.testimonials.length === 0 ? (
            <Body body={c.body} />
          ) : (
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
          )}
        </Section>
      );
    }

    case "faq":
      return (
        <Section design={design}>
          <Heading title={c.title} subtitle={c.subtitle} design={design} />
          <div className="divide-border divide-y rounded-xl border">
            {items.map((item, i) => (
              <details key={i} className="group p-4">
                <summary className="cursor-pointer text-sm font-medium">{item.title}</summary>
                {item.text && (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.text}</p>
                )}
              </details>
            ))}
          </div>
        </Section>
      );

    case "cta_banner": {
      const bannerDesign = resolveSectionDesign({ layout: "banner", ...(c.design ?? {}) });
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
            </div>
            <Cta
              label={c.cta_label}
              url={c.cta_url}
              className={bannerDesign.buttonClass}
              onClick={onCtaClick}
            />
          </div>
        </Section>
      );
    }

    case "form": {
      const formDesign = resolveSectionDesign({ background: "card", ...(c.design ?? {}) });
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
      return (
        <Section design={stepDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={stepDesign} />
          <ol className={stepDesign.gridClass}>
            {items.map((item, i) => (
              <li key={i} className={T.cards.quiet}>
                <span className="bg-primary/10 text-primary inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
                  {i + 1}
                </span>
                <p className={cn("mt-2", T.typography.h3)}>{item.title}</p>
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
      return (
        <Section design={spDesign}>
          <Heading title={c.title} subtitle={c.subtitle} design={spDesign} />
          <div className="text-muted-foreground flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
            {items.map((item, i) => (
              <span key={i}>{item.title}</span>
            ))}
          </div>
        </Section>
      );
    }

    default: {
      // intro / personalization / why_us and any future block type
      const media = <Media src={c.image_url} alt={c.image_alt} design={design} />;
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
          {design.isSplit && c.image_url ? (
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
              {c.image_url && <div className="mt-8">{media}</div>}
            </>
          )}
        </Section>
      );
    }
  }
}

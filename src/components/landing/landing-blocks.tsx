/**
 * Presentational block renderer for the Landing Page Engine.
 * All content comes from the page configuration — never hardcoded copy.
 */
import { Check, Quote, Sparkles } from "lucide-react";

import { paragraphs, type LandingSection } from "@/lib/landing-shared";
import type { PublicPage } from "@/lib/landing.server";
import { cn } from "@/lib/utils";

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("px-5 py-14 md:px-8 md:py-20", className)}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

function Heading({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-8 max-w-2xl">
      {title && <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>}
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
        <p key={i} className="text-muted-foreground leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}

function Cta({
  label,
  url,
  variant = "primary",
  onClick,
}: {
  label?: string;
  url?: string;
  variant?: "primary" | "ghost";
  onClick?: (label: string) => void;
}) {
  if (!label) return null;
  return (
    <a
      href={url || "#offerte"}
      onClick={() => onClick?.(label)}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border text-foreground hover:bg-accent",
      )}
    >
      {label}
    </a>
  );
}

export function LandingBlock({
  section,
  page,
  onCtaClick,
  formSlot,
}: {
  section: LandingSection;
  page: PublicPage;
  onCtaClick?: (label: string) => void;
  formSlot?: React.ReactNode;
}) {
  const c = section.content ?? {};
  const items = c.items ?? [];

  switch (section.block_type) {
    case "hero":
      return (
        <Section className="bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              {page.industry_name && (
                <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> Zakelijke geschenken voor {page.industry_name}
                </span>
              )}
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">{c.title}</h1>
              {c.subtitle && (
                <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{c.subtitle}</p>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                <Cta label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
                <Cta
                  label={c.secondary_cta_label}
                  url={c.secondary_cta_url}
                  variant="ghost"
                  onClick={onCtaClick}
                />
              </div>
            </div>
            {c.image_url && (
              <img
                src={c.image_url}
                alt={c.image_alt ?? ""}
                loading="eager"
                className="aspect-4/3 w-full rounded-2xl object-cover shadow-lg"
              />
            )}
          </div>
        </Section>
      );

    case "usps":
      return (
        <Section className="border-border/60 border-y bg-card/40">
          <Heading title={c.title} subtitle={c.subtitle} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
              <div key={i} className="bg-background rounded-xl border p-4">
                <Check className="text-primary h-4 w-4" />
                <p className="mt-2 text-sm font-semibold">{item.title}</p>
                {item.text && <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      );

    case "products":
      return (
        <Section id="producten">
          <Heading title={c.title} subtitle={c.subtitle} />
          {page.products.length === 0 ? (
            <Body body={c.body} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                    <h3 className="text-sm font-semibold">{p.name}</h3>
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

    case "testimonials":
      return (
        <Section className="bg-card/40">
          <Heading title={c.title} subtitle={c.subtitle} />
          {page.testimonials.length === 0 ? (
            <Body body={c.body} />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {page.testimonials.map((t) => (
                <blockquote key={t.id} className="bg-background rounded-xl border p-5">
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

    case "faq":
      return (
        <Section>
          <Heading title={c.title} subtitle={c.subtitle} />
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

    case "cta_banner":
      return (
        <Section>
          <div className="from-primary/15 to-primary/5 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-gradient-to-r p-8">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold md:text-2xl">{c.title}</h2>
              {c.subtitle && <p className="text-muted-foreground mt-2 text-sm">{c.subtitle}</p>}
            </div>
            <Cta label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
          </div>
        </Section>
      );

    case "form":
      return (
        <Section id="offerte" className="bg-card/40">
          <Heading title={c.title} subtitle={c.subtitle} />
          {formSlot}
        </Section>
      );

    case "how_it_works":
    case "use_cases":
      return (
        <Section>
          <Heading title={c.title} subtitle={c.subtitle} />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
              <li key={i} className="rounded-xl border p-4">
                <span className="bg-primary/10 text-primary inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
                  {i + 1}
                </span>
                <p className="mt-2 text-sm font-semibold">{item.title}</p>
                {item.text && <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>}
              </li>
            ))}
          </ol>
        </Section>
      );

    case "social_proof":
      return (
        <Section className="border-border/60 border-y">
          <Heading title={c.title} subtitle={c.subtitle} />
          <div className="text-muted-foreground flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
            {items.map((item, i) => (
              <span key={i}>{item.title}</span>
            ))}
          </div>
        </Section>
      );

    default:
      // intro / personalization / why_us and any future block type
      return (
        <Section>
          <Heading title={c.title} subtitle={c.subtitle} />
          <Body body={c.body} />
          {items.length > 0 && (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {items.map((item, i) => (
                <li key={i} className="flex gap-2.5 rounded-lg border p-3">
                  <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.text && <p className="text-muted-foreground mt-0.5 text-sm">{item.text}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {c.image_url && (
            <img
              src={c.image_url}
              alt={c.image_alt ?? ""}
              loading="lazy"
              className="mt-8 w-full rounded-2xl object-cover"
            />
          )}
          <div className="mt-6">
            <Cta label={c.cta_label} url={c.cta_url} onClick={onCtaClick} />
          </div>
        </Section>
      );
  }
}

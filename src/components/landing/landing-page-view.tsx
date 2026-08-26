/**
 * Public renderer: renders any configured landing page and handles first-party
 * tracking (page_view, cta_click, form_started, form_submitted, thank_you).
 */
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { LandingBlock } from "@/components/landing/landing-blocks";
import { LandingForm } from "@/components/landing/landing-form";
import { captureAttribution, getSessionId } from "@/lib/landing-attribution";
import type { AttributionSnapshot, LandingFunnel } from "@/lib/landing-shared";
import type { PublicPage } from "@/lib/landing.server";
import { trackLandingEvent } from "@/lib/landing.functions";

export function LandingPageView({
  page,
  previewToken,
}: {
  page: PublicPage;
  previewToken?: string | null;
}) {
  const track = useServerFn(trackLandingEvent);
  const [attribution, setAttribution] = useState<AttributionSnapshot>({});
  const sessionId = useMemo(() => (typeof window === "undefined" ? "ssr" : getSessionId()), []);
  const viewSent = useRef(false);

  useEffect(() => {
    const snapshot = captureAttribution({
      slug: page.slug,
      funnel: page.funnel_type,
      pageId: page.id,
      industryName: page.industry_name,
    });
    setAttribution(snapshot);
    if (viewSent.current) return;
    viewSent.current = true;
    void track({
      data: {
        page_id: page.id,
        version_id: page.version_id,
        variant_key: page.variant_key,
        session_id: snapshot.session_id ?? sessionId,
        event_type: "page_view",
        path: window.location.pathname,
        attribution: snapshot as Record<string, unknown>,
        is_preview: page.is_preview,
      },
    }).catch(() => undefined);
  }, [page, sessionId, track]);

  const send = (
    eventType: "cta_click" | "form_started" | "form_submitted" | "thank_you",
    meta?: Record<string, unknown>,
  ) => {
    void track({
      data: {
        page_id: page.id,
        version_id: page.version_id,
        variant_key: page.variant_key,
        session_id: attribution.session_id ?? sessionId,
        event_type: eventType,
        path: typeof window === "undefined" ? null : window.location.pathname,
        attribution: attribution as Record<string, unknown>,
        is_preview: page.is_preview,
        meta: meta ?? {},
      },
    }).catch(() => undefined);
  };

  const formSlot = (
    <LandingForm
      form={page.form}
      funnel={page.funnel_type as LandingFunnel}
      slug={page.slug}
      previewToken={previewToken}
      variantKey={page.variant_key}
      versionId={page.version_id}
      attribution={attribution}
      sessionId={attribution.session_id ?? sessionId}
      onStarted={() => send("form_started")}
      onSubmitted={() => send("thank_you")}
    />
  );

  const themeVars = {
    ...(page.theme?.hazard_color_1 ? { "--zb-hazard-1": page.theme.hazard_color_1 } : {}),
    ...(page.theme?.hazard_color_2 ? { "--zb-hazard-2": page.theme.hazard_color_2 } : {}),
  } as CSSProperties;

  const isPlatform = page.funnel_type === "platform";

  return (
    <div className="bg-background text-foreground min-h-screen" style={themeVars}>
      {isPlatform && (
        <PlatformTopBar
          ctaLabel={page.form?.submit_label || "Account aanvragen"}
          onCtaClick={(label) => send("cta_click", { label })}
        />
      )}
      {page.is_preview && (
        <div className="bg-warning/15 text-foreground px-4 py-2 text-center text-xs font-medium">
          Preview — deze pagina is nog niet gepubliceerd en wordt niet meegeteld in de statistieken.
        </div>
      )}
      {page.sections.map((section) => (
        <LandingBlock
          key={section.id}
          section={section}
          page={page}
          onCtaClick={(label) => send("cta_click", { label })}
          formSlot={formSlot}
          showVisualPlaceholders={page.is_preview}
        />
      ))}
      {!page.sections.some((s) => s.block_type === "form") && (
        <section id="offerte" className="bg-card/40 px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto w-full max-w-5xl">{formSlot}</div>
        </section>
      )}
      <footer className="text-muted-foreground border-t px-5 py-8 text-center text-xs md:px-8">
        ZoetBezorgen · zakelijke snoep- en chocoladegeschenken
      </footer>
    </div>
  );
}

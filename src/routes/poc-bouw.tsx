/**
 * Visuele POC — ZoetBezorgen Conversion Design System (Bouw).
 *
 * Losse demo-route om het designniveau van drie componentfamilies
 * (CandyHero, IndustryStory, ProductShowcase) te beoordelen. Geen Claude,
 * geen strategist-run, geen database — alleen presentatie met bestaande
 * Bouw-content en approved assets.
 */
import { createFileRoute } from "@tanstack/react-router";

import {
  CandyHeroCollage,
  CandyHeroEditorial,
  IndustryStoryMoments,
  IndustryStorySplit,
  PremiumFormSection,
  ProofStrip,
  ShowcaseFeatured,
  ShowcaseTrio,
} from "@/components/landing/poc/poc-blocks";

export const Route = createFileRoute("/poc-bouw")({
  head: () => ({
    meta: [
      { title: "POC Bouw — ZoetBezorgen Conversion Design System" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PocBouwPage,
});

function VariantLabel({ family, variant, name }: { family: string; variant: string; name: string }) {
  return (
    <div className="bg-zb-ink text-zb-cream px-5 py-2.5 text-center text-xs font-semibold tracking-widest uppercase">
      {family} · variant {variant} — {name}
    </div>
  );
}

function PocBouwPage() {
  return (
    <main className="bg-zb-cream min-h-screen">
      <VariantLabel family="CandyHero" variant="A" name="Collage" />
      <CandyHeroCollage />
      <VariantLabel family="CandyHero" variant="B" name="Full-bleed editorial" />
      <CandyHeroEditorial />
      <VariantLabel family="ProofStrip" variant="—" name="Social proof (boven de vouw na hero)" />
      <ProofStrip />
      <VariantLabel family="IndustryStory" variant="A" name="Editorial split" />
      <IndustryStorySplit />
      <VariantLabel family="IndustryStory" variant="B" name="Staggered moments" />
      <IndustryStoryMoments />
      <VariantLabel family="ProductShowcase" variant="A" name="Featured product" />
      <ShowcaseFeatured />
      <VariantLabel family="ProductShowcase" variant="B" name="Product trio overlapping" />
      <ShowcaseTrio />
      <VariantLabel family="PremiumForm" variant="—" name="Offertefunnel + risk reversal" />
      <PremiumFormSection />
    </main>
  );
}

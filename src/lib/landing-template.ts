/**
 * Base template for the ZoetBezorgen B2B Landing Page Engine.
 *
 * Template = structure + default copy. Page content lives in the database, so
 * improving this template never requires touching existing pages, and pages can
 * override every value locally.
 */
import {
  BLOCK_TYPES,
  type BlockContent,
  type BlockType,
  type LandingFunnel,
} from "./landing-shared";

export const TEMPLATE_KEY = "zoet-b2b-v1";

type Draft = {
  block_type: BlockType;
  enabled: boolean;
  sort_order: number;
  content: BlockContent;
};

/**
 * Default copy for a new page. `industry` personalises far more than one word:
 * headline, situations, use cases and the intro all change.
 */
export function buildTemplateSections(args: {
  funnel: LandingFunnel;
  industryName?: string | null;
}): Draft[] {
  const industry = args.industryName?.trim() || null;
  const audience = industry ? `${industry.toLowerCase()}` : "zakelijke teams";
  const isPlatform = args.funnel === "platform";
  const primaryCta = isPlatform ? "Account aanvragen" : "Offerte aanvragen";

  const content: Record<BlockType, BlockContent> = {
    hero: {
      title: industry
        ? `Een zoete verrassing voor jouw ${audience}-team`
        : "Een zoete verrassing voor jouw team",
      subtitle: isPlatform
        ? "Regel zakelijke cadeaus via het ZoetBezorgen Cadeauplatform: eigen budget, eigen huisstijl, ontvangers kiezen zelf."
        : `Persoonlijke snoep- en chocoladegeschenken voor ${audience}. Vanaf 25 stuks, met eigen logo, kaartje en bezorging op elk adres.`,
      image_alt: "Zakelijke snoep- en chocoladegeschenken van ZoetBezorgen",
      cta_label: primaryCta,
      cta_url: "#offerte",
      secondary_cta_label: "Bekijk cadeauvoorbeelden",
      secondary_cta_url: "#producten",
    },
    usps: {
      items: [
        { title: "Vanaf 25 stuks", text: "Klein beginnen mag — ook voor een enkel team of project." },
        { title: "Eigen logo & kaartje", text: "Volledig gepersonaliseerd in jullie huisstijl." },
        { title: "Levering op elk adres", text: "Naar één locatie of rechtstreeks naar alle medewerkers thuis." },
        { title: "Reactie binnen 1 werkdag", text: "Een echte cadeau-adviseur, geen chatbot." },
      ],
    },
    intro: {
      title: industry ? `Zakelijke cadeaus voor de ${audience}` : "Zakelijke cadeaus met impact",
      body: industry
        ? `In de ${audience} draait alles om mensen die dag in dag uit doorgaan. Een klein, persoonlijk geschenk laat zien dat je dat ziet. Wij denken mee over moment, budget en boodschap — en zorgen dat het er verzorgd uitziet én lekker is.`
        : "Een klein, persoonlijk geschenk doet meer dan een mail. Wij denken mee over moment, budget en boodschap en zorgen voor een geschenk dat er verzorgd uitziet én lekker is.",
    },
    products: {
      title: "Cadeauvoorbeelden",
      subtitle: "Alles is te combineren en te personaliseren.",
    },
    personalization: {
      title: "Personalisatie staat centraal",
      body: "Van een sticker met jullie logo tot een volledig eigen doos met persoonlijke kaartjes per ontvanger.",
      items: [
        { title: "Logo & huisstijl", text: "Sticker, banderol, wikkel of volledig bedrukte doos." },
        { title: "Persoonlijk kaartje", text: "Eén tekst voor iedereen of per ontvanger een eigen boodschap." },
        { title: "Eigen samenstelling", text: "Kies zelf de mix van snoep, chocolade en bonbons." },
      ],
    },
    how_it_works: {
      title: "Hoe werkt het",
      items: [
        { title: "1. Aanvraag", text: `Vul het formulier in met aantal, moment en budget.` },
        { title: "2. Voorstel", text: "Binnen één werkdag een voorstel met prijs en proefbeeld." },
        { title: "3. Personalisatie", text: "Wij verwerken logo, kleuren en kaartteksten." },
        { title: "4. Bezorging", text: "Op de afgesproken datum, naar één of honderden adressen." },
      ],
    },
    why_us: {
      title: "Waarom ZoetBezorgen",
      items: [
        { title: "Zelf makend en verpakkend", text: "Korte lijnen, dus ook haalbare spoedaanvragen." },
        { title: "Zakelijk gemak", text: "Eén factuur, duidelijke levertijden, vaste contactpersoon." },
        { title: "Verrassend, niet standaard", text: "Vrolijke cadeaus die mensen echt uitpakken." },
      ],
    },
    use_cases: {
      title: industry ? `Momenten in de ${audience}` : "Waarvoor teams ons inschakelen",
      items: industry
        ? [
            { title: "Medewerkers bedanken", text: "Na een drukke periode of geslaagd project." },
            { title: "Oplevering vieren", text: "Een zoete afsluiting op de bouw- of projectlocatie." },
            { title: "Kerstgeschenk", text: "Persoonlijk en praktisch, ook naar huisadressen." },
            { title: "Veiligheidsprestatie", text: "Belonen van een mijlpaal zonder incidenten." },
            { title: "Jubileum", text: "Voor het bedrijf, een team of een individuele medewerker." },
            { title: "Relatie bedanken", text: "Opdrachtgevers, onderaannemers en leveranciers." },
          ]
        : [
            { title: "Medewerkers bedanken", text: "Na een drukke periode of geslaagd project." },
            { title: "Kerst & feestdagen", text: "Persoonlijk en praktisch, ook naar huisadressen." },
            { title: "Jubileum", text: "Voor het bedrijf, een team of een individuele medewerker." },
            { title: "Relatiegeschenk", text: "Klanten en leveranciers bedanken." },
          ],
    },
    social_proof: {
      title: "Zij verrasten hun team al",
      subtitle: "Van MKB-teams tot organisaties met honderden medewerkers.",
    },
    testimonials: {
      title: "Wat opdrachtgevers zeggen",
    },
    faq: {
      title: "Veelgestelde vragen",
      items: [
        { title: "Wat is de minimale afname?", text: "Vanaf 25 stuks. Voor grotere aantallen geldt een staffelprijs." },
        { title: "Kan ik naar huisadressen leveren?", text: "Ja, wij versturen ook individueel naar medewerkers thuis." },
        { title: "Hoe snel kan het?", text: "Standaard 10 werkdagen; spoed is in overleg vaak mogelijk." },
        { title: "Kan ik eerst een proef ontvangen?", text: "Ja, we sturen graag een sample met jullie personalisatie." },
      ],
    },
    cta_banner: {
      title: "Klaar om je team te verrassen?",
      body: "Vraag een voorstel aan — vrijblijvend en binnen één werkdag.",
      cta_label: primaryCta,
      cta_url: "#offerte",
    },
    form: {
      title: isPlatform ? "Vraag een platformaccount aan" : "Vraag je zakelijke offerte aan",
      subtitle: "Je gegevens gebruiken we uitsluitend voor dit voorstel.",
    },
  };

  return BLOCK_TYPES.map((block, index) => ({
    block_type: block,
    enabled: true,
    sort_order: (index + 1) * 10,
    content: content[block],
  }));
}

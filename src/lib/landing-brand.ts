/**
 * Central, editable ZoetBezorgen brand context for the AI Landing Page Strategist.
 *
 * Everything here is a fact we ourselves confirm. The AI may only use these
 * facts — it may never invent quantities, prices, guarantees, customer names or
 * reviews. Update this file when the proposition changes; every future AI run
 * follows automatically.
 */

export const ZOETBEZORGEN_BRAND = {
  name: "ZoetBezorgen",
  segment: "B2B zakelijke snoep- en chocoladegeschenken (Nederland)",
  proposition:
    "Persoonlijke snoep- en chocoladegeschenken voor zakelijke teams en relaties, zelf gemaakt en verpakt, volledig te personaliseren met logo, huisstijl en kaartteksten.",
  tone: "Menselijk, concreet en zakelijk. Vrolijk maar niet kinderlijk. Geen overdreven marketingtaal.",
  usps: [
    "Vanaf 25 stuks — ook voor één team of project",
    "Personalisatie met eigen logo, huisstijl en kaartje",
    "Levering naar één locatie of rechtstreeks naar medewerkers thuis",
    "Reactie op een aanvraag binnen één werkdag, met een vaste contactpersoon",
    "Zelf makend en verpakkend, dus korte lijnen en spoed vaak mogelijk",
  ],
  personalization: [
    "Sticker, banderol of wikkel met logo",
    "Volledig bedrukte doos in huisstijl",
    "Eén kaarttekst voor iedereen of per ontvanger een eigen boodschap",
    "Eigen samenstelling van snoep, chocolade en bonbons",
  ],
  logistics: {
    minimumQuantity: "25 stuks",
    standardLeadTime: "circa 10 werkdagen, spoed in overleg",
    delivery: "Eén adres, meerdere locaties of individuele huisadressen",
    sampling: "Sample met eigen personalisatie is mogelijk",
    invoicing: "Eén zakelijke factuur",
  },
  productCategories: [
    "Puntzak snoep",
    "Snoeppot",
    "Bonbons",
    "Chocoladeletter",
    "Kerst- en feestdagengeschenken",
  ],
  notAllowedClaims: [
    "Aantallen klanten, reviews of beoordelingscijfers",
    "Namen of logo's van klanten die wij niet hebben aangeleverd",
    "Prijzen, kortingen of garanties die niet in de productbibliotheek staan",
    "Conversie- of prestatiebeloftes",
  ],
} as const;

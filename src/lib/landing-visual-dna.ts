/**
 * ZoetBezorgen Visual DNA (V1.9) — client-safe.
 *
 * Afgeleid van de bestaande ZoetBezorgen-uitingen (o.a. het cadeauplatform op
 * /cadeaus). Dit is de visuele en emotionele stijl waar elke AI-landingspagina
 * aan moet voldoen. De Creative Director-fase van de Strategist krijgt dit als
 * verplicht vertrekpunt; het is geen suggestie maar het merkkader.
 */

export const ZOETBEZORGEN_VISUAL_DNA = {
  /** Waar het merk voor staat, visueel vertaald. */
  essence:
    "Zoet, warm en persoonlijk: het geefmóment staat centraal — een mens die iets zoets overhandigt of verrast ontvangt, niet een anoniem product op een plank.",
  photography: [
    "Echte geefmomenten: overhandigen, uitpakken, verraste ontvangers — warm en menselijk, geen koude stockfoto's.",
    "Productfotografie is rijk en appetijtelijk: snoepgoed, bonbons en chocolade groot en kleurrijk in beeld, graag los gestyled of als cutout.",
    "Personalisatie wordt altijd zichtbaar gemaakt: verpakking met logo, wikkel in huisstijl, kaartje met boodschap.",
    "Achtergronden mogen speels: snoep-patronen, zachte kleurvlakken, subtiele confetti — nooit kil grijs of corporate blauw.",
  ],
  composition: [
    "Vraag- of uitroepheadlines die direct persoonlijk zijn ('Wie wil jij zoet bezorgen?').",
    "Ritme met contrast: een grote emotionele hero, dan compacte bewijsblokken, dan weer een groot product- of personalisatiemoment.",
    "Beelden mogen overlappen, uitsteken en verspringen; een strakke kolom van gelijke kaartjes is expliciet NIET de merkstijl.",
    "Ronde vormen en pillen passen bij het merk; harde zakelijke rasters alleen voor feitelijke bewijsstukken (stappen, specificaties).",
  ],
  emotional_direction:
    "Van 'moet ik regelen' naar 'wat leuk om te geven'. De bezoeker moet het geefmoment kunnen voelen vóór de eerste CTA.",
  anti_patterns: [
    "Card-first design: alle secties als identieke kaartjes in een grid.",
    "Generieke zakelijke stockbeelden (handen schudden, laptops, glazen kantoren).",
    "Eén lange grijze tekstkolom zonder visuele adempauzes.",
    "Producten als kleine thumbnails in een uniform productraster zonder hiërarchie.",
    "Hero zonder groot emotioneel of productbeeld.",
  ],
  /** Concrete richting voor de hero van een commerciële branchepagina. */
  hero_ideal:
    "Grote, warme hero met echt beeld (geefmoment of productgroep), persoonlijke vraag-headline, zichtbare personalisatie en één dominante CTA. Beeld mag uit de container breken (overlap/layered).",
} as const;

/** Korte prompt-versie voor in de Strategist-prompts. */
export const VISUAL_DNA_PROMPT = [
  `Merkessentie: ${ZOETBEZORGEN_VISUAL_DNA.essence}`,
  `Fotografie: ${ZOETBEZORGEN_VISUAL_DNA.photography.join(" ")}`,
  `Compositie: ${ZOETBEZORGEN_VISUAL_DNA.composition.join(" ")}`,
  `Emotionele richting: ${ZOETBEZORGEN_VISUAL_DNA.emotional_direction}`,
  `Verboden (anti-patterns): ${ZOETBEZORGEN_VISUAL_DNA.anti_patterns.join(" ")}`,
  `Hero-ideaal: ${ZOETBEZORGEN_VISUAL_DNA.hero_ideal}`,
].join("\n");

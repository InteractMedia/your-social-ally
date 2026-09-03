/**
 * Server-only AI-logica voor de LinkedIn Prospect Radar.
 * Genereert doelgroepprofielen (ICP) en persoonlijke uitnodigingsteksten.
 */
import { ZOETBEZORGEN_BRAND } from "./landing-brand";
import { LINKEDIN_LIMITS } from "./linkedin-prospects-shared";

const BRAND_BLOCK = `Bedrijf: ${ZOETBEZORGEN_BRAND.name}
Segment: ${ZOETBEZORGEN_BRAND.segment}
Propositie: ${ZOETBEZORGEN_BRAND.proposition}
Tone of voice: ${ZOETBEZORGEN_BRAND.tone}
USP's: ${ZOETBEZORGEN_BRAND.usps.join(" | ")}
Minimumafname: ${ZOETBEZORGEN_BRAND.logistics.minimumQuantity}
Niet toegestaan om te claimen: ${ZOETBEZORGEN_BRAND.notAllowedClaims.join(" | ")}`;

function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI gaf geen bruikbare JSON terug.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function stringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
}

export type IcpGenerationInput = {
  industry?: string | null;
  companySize?: string | null;
  region?: string | null;
  occasion?: string | null;
  keywords?: string | null;
  jobTitles?: string | null;
};

export type IcpGenerationResult = {
  name: string;
  companyProfile: string;
  decisionMaker: string;
  rationale: string;
  jobTitles: string[];
  keywords: string[];
  exclusions: string[];
};

export async function generateIcpProfile(input: IcpGenerationInput): Promise<IcpGenerationResult> {
  const { callLovableAI } = await import("./ai-gateway.server");
  const prompt = `Je bent B2B-prospectstrateeg. Bepaal het ideale klantprofiel (ICP) voor onderstaand bedrijf en zoekopdracht.

${BRAND_BLOCK}

Zoekcriteria van de gebruiker:
- Branche: ${input.industry || "niet opgegeven"}
- Bedrijfsgrootte: ${input.companySize || "niet opgegeven"}
- Regio: ${input.region || "Nederland"}
- Aanleiding: ${input.occasion || "niet opgegeven"}
- Trefwoorden: ${input.keywords || "niet opgegeven"}
- Functietitels: ${input.jobTitles || "bepaal zelf"}

Antwoord ALLEEN met geldige JSON, geen markdown:
{"name":"korte naam van dit doelgroepprofiel (max 6 woorden)","companyProfile":"2 zinnen over het ideale bedrijf","decisionMaker":"2 zinnen over de beslisser en zijn/haar drijfveer","rationale":"2 zinnen waarom dit past bij het aanbod","jobTitles":["8 functietitels, mix Nederlands en Engels"],"keywords":["6 zoektrefwoorden"],"exclusions":["3 termen om uit te sluiten"]}

Regels: Nederlands, concreet, geen verzonnen cijfers, prijzen of garanties.`;

  const raw = await callLovableAI({
    messages: [
      { role: "system", content: "Je antwoordt uitsluitend met geldige JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
  });
  const parsed = extractJson(raw) as Record<string, unknown>;
  return {
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Doelgroepprofiel",
    companyProfile: typeof parsed.companyProfile === "string" ? parsed.companyProfile.trim() : "",
    decisionMaker: typeof parsed.decisionMaker === "string" ? parsed.decisionMaker.trim() : "",
    rationale: typeof parsed.rationale === "string" ? parsed.rationale.trim() : "",
    jobTitles: stringArray(parsed.jobTitles, 10),
    keywords: stringArray(parsed.keywords, 8),
    exclusions: stringArray(parsed.exclusions, 5),
  };
}

export type InviteInput = {
  fullName: string;
  jobTitle?: string | null;
  companyName?: string | null;
  headline?: string | null;
  profileContext?: string | null;
};

/**
 * Schrijft een uitnodiging van maximaal 300 tekens. Bij overschrijding laten we
 * de AI herschrijven — nooit afkappen.
 */
export async function generateInviteMessage(input: InviteInput): Promise<string> {
  const { callLovableAI } = await import("./ai-gateway.server");
  const max = LINKEDIN_LIMITS.inviteMessageMaxChars;
  const base = `Schrijf een LinkedIn-connectieverzoek van ${ZOETBEZORGEN_BRAND.name}.

${BRAND_BLOCK}

Ontvanger:
- Naam: ${input.fullName}
- Functie: ${input.jobTitle || "onbekend"}
- Bedrijf: ${input.companyName || "onbekend"}
- Profielregel: ${input.headline || "onbekend"}
- Doelgroepcontext: ${input.profileContext || "geen"}

Eisen: Nederlands, je-vorm, maximaal ${max} tekens inclusief spaties, geen hashtags, geen emoji-spam (hooguit één), geen verkooppitch maar een concrete aanleiding om te connecten. Spreek de persoon aan bij voornaam. Antwoord met alleen de berichttekst, zonder aanhalingstekens.`;

  let text = (await callLovableAI({ messages: [{ role: "user", content: base }], temperature: 0.7 })).trim();
  if (text.length > max) {
    text = (
      await callLovableAI({
        messages: [
          {
            role: "user",
            content: `Herschrijf dit LinkedIn-connectieverzoek zodat het maximaal ${max} tekens telt. Behoud de kern en maak volledige zinnen — nooit afkappen. Antwoord met alleen de tekst.\n\n${text}`,
          },
        ],
        temperature: 0.4,
      })
    ).trim();
  }
  if (text.length > max) {
    throw new Error(
      `De AI kreeg de tekst niet onder ${max} tekens. Pas de tekst handmatig aan of probeer opnieuw.`,
    );
  }
  return text;
}

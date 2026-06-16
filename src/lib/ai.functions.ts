import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PlatformEnum = z.enum(["tiktok", "linkedin", "instagram", "facebook", "youtube"]);
const ActionEnum = z.enum([
  "ideas",
  "rewrite",
  "hashtags",
  "shorter",
  "longer",
  "adapt_competitor",
  "reply_suggestion",
  "trend_hook",
  "competitor_channel_insight",
]);

const Input = z.object({
  action: ActionEnum,
  content: z.string().default(""),
  platform: PlatformEnum.optional(),
  context: z.string().optional(),
  tone: z.string().optional().default("warm, speels, bakkerij-trots"),
  // Feedback-loop: korte samenvatting van wat eerder werkte (komt uit client localStorage).
  learnings: z.string().optional(),
});

const BRAND = `Je bent een social media copywriter voor ZoetBezorgen, een Nederlandse bakkerij/chocolatier die patisserie en bedrijfsontbijten bezorgt.
Tone of voice: warm, speels, ambachtelijk-trots, Nederlands. Geen corporate jargon. Gebruik soms een passende emoji, niet overdreven.`;

function learningsBlock(l?: string) {
  if (!l) return "";
  return `\n\nWat bij ZoetBezorgen eerder werkte (gebruik dit subtiel als richtlijn, niet letterlijk overnemen):\n${l}`;
}

function buildPrompt(data: z.infer<typeof Input>) {
  const p = data.platform ? ` voor ${data.platform.toUpperCase()}` : "";
  const L = learningsBlock(data.learnings);
  switch (data.action) {
    case "ideas":
      return `Genereer 5 korte post-ideeën${p}. Genummerde lijst, één zin per idee.${data.content ? `\n\nThema: ${data.content}` : ""}${L}`;
    case "rewrite":
      return `Herschrijf onderstaande post${p} in onze tone of voice. Behoud de boodschap.\n\nPost:\n${data.content}${L}`;
    case "hashtags":
      return `Geef 8 relevante hashtags${p} voor onderstaande post. Alleen hashtags, gescheiden door spaties.\n\nPost:\n${data.content}`;
    case "shorter":
      return `Maak onderstaande post korter en krachtiger${p}. Behoud de hook.\n\nPost:\n${data.content}`;
    case "longer":
      return `Maak onderstaande post langer en uitgebreider${p} met meer detail, in dezelfde tone.\n\nPost:\n${data.content}`;
    case "adapt_competitor":
      return `Een concurrent plaatste deze succesvolle post:\n"""${data.context ?? ""}"""\n\nMaak hier 3 varianten van in onze tone of voice${p}. Nummer ze: 1) in onze stem, 2) gedurfder, 3) veiliger. Eén korte alinea per variant.${L}`;
    case "reply_suggestion":
      return `Iemand reageerde met:\n"""${data.context ?? ""}"""\n\nOp onze post: "${data.content}".\nGeef 3 korte antwoordsuggesties, vriendelijk en behulpzaam. Nummer ze 1) warm, 2) zakelijk, 3) speels.`;
    case "trend_hook":
      return `Haak in op deze trend in de snoep/chocolade-markt:\n"""${data.context ?? ""}"""\n\nMaak voor ZoetBezorgen${p}:\n1) Een concept-idee (één zin, hoe sluiten wij hier authentiek op aan)\n2) Een hook / openingsregel\n3) Een complete post-tekst klaar voor publicatie\n4) 6 relevante hashtags\n\nMaak het concreet voor onze bakkerij, niet generiek.${L}`;
    case "competitor_channel_insight":
      return `Analyseer hoe deze concurrent het doet op ${p.trim() || "dit kanaal"}:\n"""${data.context ?? ""}"""\n\nGeef:\n1) Wat werkt voor hen (3 bullets, concreet)\n2) Wat kunnen wij overnemen (2 bullets)\n3) Eén concreet post-idee dat wij morgen kunnen maken om hier tegenin te gaan of op in te haken.${L}`;
  }
}

export const generateAI = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const { callLovableAI } = await import("./ai-gateway.server");
    const prompt = buildPrompt(data);
    const output = await callLovableAI({
      messages: [
        { role: "system", content: BRAND },
        { role: "user", content: prompt },
      ],
    });
    return { output };
  });

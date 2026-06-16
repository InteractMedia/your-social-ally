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
]);

const Input = z.object({
  action: ActionEnum,
  content: z.string().default(""),
  platform: PlatformEnum.optional(),
  context: z.string().optional(), // bv. concurrent-post om aan te passen, of comment om op te reageren
  tone: z.string().optional().default("warm, speels, bakkerij-trots"),
});

const BRAND = `Je bent een social media copywriter voor ZoetBezorgen, een Nederlandse bakkerij die patisserie en bedrijfsontbijten bezorgt.
Tone of voice: warm, speels, ambachtelijk-trots, Nederlands. Geen corporate jargon. Gebruik soms een passende emoji, niet overdreven.`;

function buildPrompt(data: z.infer<typeof Input>) {
  const platformHint = data.platform ? ` voor ${data.platform.toUpperCase()}` : "";
  switch (data.action) {
    case "ideas":
      return `Genereer 5 korte post-ideeën${platformHint}. Geef ze als genummerde lijst, één zin per idee.${data.content ? `\n\nThema: ${data.content}` : ""}`;
    case "rewrite":
      return `Herschrijf onderstaande post${platformHint} volgens de tone of voice. Behoud de boodschap.\n\nPost:\n${data.content}`;
    case "hashtags":
      return `Geef 8 relevante hashtags${platformHint} voor onderstaande post. Geef alleen de hashtags, gescheiden door spaties.\n\nPost:\n${data.content}`;
    case "shorter":
      return `Maak onderstaande post korter en krachtiger${platformHint}. Behoud de hook.\n\nPost:\n${data.content}`;
    case "longer":
      return `Maak onderstaande post langer en uitgebreider${platformHint} met meer detail, in dezelfde tone.\n\nPost:\n${data.content}`;
    case "adapt_competitor":
      return `Een concurrent plaatste deze succesvolle post:\n"""${data.context ?? ""}"""\n\nMaak hier 3 varianten van in onze tone of voice${platformHint}. Nummer ze: 1) in onze stem, 2) gedurfder, 3) veiliger. Eén korte alinea per variant.`;
    case "reply_suggestion":
      return `Iemand reageerde met:\n"""${data.context ?? ""}"""\n\nOp onze post: "${data.content}".\nGeef 3 korte antwoordsuggesties, vriendelijk en behulpzaam. Nummer ze 1) warm, 2) zakelijk, 3) speels.`;
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

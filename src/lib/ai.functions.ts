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
  // Nieuw voor groei-stack
  "classify_comment",
  "hooks_ab",
  "hashtag_tiers",
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
      return `Iemand reageerde met:\n"""${data.context ?? ""}"""\n\nOp onze post: "${data.content}".\nGeef 3 korte antwoordsuggesties, vriendelijk en behulpzaam. Nummer ze 1) warm, 2) zakelijk, 3) speels. Elke suggestie op één regel, geen extra uitleg.`;
    case "trend_hook":
      return `Haak in op deze trend in de snoep/chocolade-markt:\n"""${data.context ?? ""}"""\n\nMaak voor ZoetBezorgen${p}:\n1) Een concept-idee (één zin, hoe sluiten wij hier authentiek op aan)\n2) Een hook / openingsregel\n3) Een complete post-tekst klaar voor publicatie\n4) 6 relevante hashtags\n\nMaak het concreet voor onze bakkerij, niet generiek.${L}`;
    case "competitor_channel_insight":
      return `Analyseer hoe deze concurrent het doet op ${p.trim() || "dit kanaal"}:\n"""${data.context ?? ""}"""\n\nGeef:\n1) Wat werkt voor hen (3 bullets, concreet)\n2) Wat kunnen wij overnemen (2 bullets)\n3) Eén concreet post-idee dat wij morgen kunnen maken om hier tegenin te gaan of op in te haken.${L}`;
    case "classify_comment":
      return `Classificeer deze inkomende comment/DM voor een social media manager:\n"""${data.context ?? ""}"""\n\nContext: post over "${data.content}".\n\nAntwoord ALLEEN met geldige JSON in exact dit formaat, geen markdown, geen uitleg:\n{"priority":"high"|"medium"|"low","intent":"question"|"complaint"|"purchase_intent"|"praise"|"spam"|"other","sentiment":"positive"|"neutral"|"negative","suggestedAction":"korte NL zin (max 8 woorden) wat te doen"}\n\nRegels: purchase_intent = "high"; klacht = "high"; vraag = "medium"; lof = "low".`;
    case "hooks_ab":
      return `Genereer 3 verschillende openingszinnen (hooks) voor deze post${p}. Elke hook in een andere stijl:\n1) Vraag-hook (nieuwsgierigheid triggeren)\n2) Statement-hook (bold uitspraak)\n3) Cijfer-hook (concreet getal)\n\nDe post gaat over: "${data.content || "geen thema opgegeven — bedenk zelf"}"\n\nAntwoord ALLEEN met geldige JSON, geen markdown:\n{"hooks":[{"style":"vraag","text":"..."},{"style":"statement","text":"..."},{"style":"cijfer","text":"..."}]}\n\nMax 12 woorden per hook. Nederlands. Onze tone: warm, speels, bakkerij-trots.${L}`;
    case "hashtag_tiers":
      return `Genereer 12 hashtags${p} in 3 tiers voor deze post: "${data.content || "bakkerij content"}".\n\nAntwoord ALLEEN met geldige JSON, geen markdown:\n{"tiers":{"high":[{"tag":"#voorbeeld","volume":150000},{"tag":"...","volume":...},{"tag":"...","volume":...}],"mid":[{"tag":"...","volume":45000},{"tag":"...","volume":...},{"tag":"...","volume":...},{"tag":"...","volume":...},{"tag":"...","volume":...}],"niche":[{"tag":"...","volume":4500},{"tag":"...","volume":...},{"tag":"...","volume":...},{"tag":"...","volume":...}]}}\n\nRegels:\n- high: 3 hashtags met volume >100000 (breed bereik)\n- mid: 5 hashtags met volume 10000-100000 (sweet spot)\n- niche: 4 hashtags met volume <10000 (hoge conversie, specifiek voor bakkerij/Nederland)\n- Volume is een schatting; wees realistisch.`;
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

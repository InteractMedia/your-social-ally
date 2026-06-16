// Server-only helper voor Lovable AI Gateway (direct fetch, geen AI SDK).
// Importeer alleen vanuit createServerFn handlers.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callLovableAI({
  model = "google/gemini-3-flash-preview",
  messages,
  temperature = 0.8,
}: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ontbreekt");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({ model, messages, temperature }),
  });

  if (res.status === 429) throw new Error("AI rate limit bereikt — even wachten en opnieuw proberen.");
  if (res.status === 402) throw new Error("AI credits op — voeg credits toe in je workspace settings.");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI Gateway fout ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

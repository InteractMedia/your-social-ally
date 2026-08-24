/**
 * Server-only, provider-independent AI layer.
 *
 * Nothing here may be imported from client code: API keys are read inside the
 * call and never leave the server. Adding a provider means adding one entry to
 * `PROVIDERS` — callers only speak in terms of system prompt + data blocks.
 */

export type AiProvider = "anthropic" | "lovable";

export type AiCompletionRequest = {
  provider: AiProvider;
  model: string;
  /** Instructions. Never contains untrusted campaign/lead data. */
  system: string;
  /** Untrusted data + the task, sent as a user message. */
  user: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiCompletionResult = {
  text: string;
  provider: AiProvider;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  runtimeMs: number;
};

export class AiProviderError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
  }
}

/** USD per 1M tokens; only used for a rough cost estimate in the run log. */
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-5": { in: 3, out: 15 },
  "claude-opus-4-1": { in: 15, out: 75 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "google/gemini-3-flash-preview": { in: 0.3, out: 2.5 },
  "google/gemini-2.5-pro": { in: 1.25, out: 10 },
  "openai/gpt-5": { in: 1.25, out: 10 },
};

function estimateCost(model: string, inTok: number | null, outTok: number | null): number | null {
  const p = PRICING[model];
  if (!p || inTok == null || outTok == null) return null;
  return Number(((inTok / 1_000_000) * p.in + (outTok / 1_000_000) * p.out).toFixed(5));
}

/** Which providers can actually run right now (based on server configuration). */
export function providerAvailability(): Record<AiProvider, boolean> {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    lovable: Boolean(process.env.LOVABLE_API_KEY),
  };
}

/**
 * Picks the configured provider when it is usable, otherwise falls back to the
 * Lovable gateway so an analysis is still possible while a key is missing.
 */
export function resolveProvider(
  requested: AiProvider,
  requestedModel: string,
): { provider: AiProvider; model: string; fallbackReason: string | null } {
  const available = providerAvailability();
  if (available[requested]) return { provider: requested, model: requestedModel, fallbackReason: null };
  if (requested === "anthropic" && available.lovable) {
    return {
      provider: "lovable",
      model: "google/gemini-3-flash-preview",
      fallbackReason:
        "ANTHROPIC_API_KEY ontbreekt — analyse uitgevoerd met het Lovable AI-fallbackmodel.",
    };
  }
  throw new AiProviderError("Geen AI-provider geconfigureerd op de server.", 412);
}

export async function runAiCompletion(req: AiCompletionRequest): Promise<AiCompletionResult> {
  const started = Date.now();
  const result =
    req.provider === "anthropic" ? await callAnthropic(req) : await callLovableGateway(req);
  return {
    ...result,
    provider: req.provider,
    model: req.model,
    estimatedCostUsd: estimateCost(req.model, result.inputTokens, result.outputTokens),
    runtimeMs: Date.now() - started,
  };
}

const FALLBACK_MODEL = "google/gemini-3-flash-preview";

/**
 * Runs the completion and, when the primary provider is unusable (missing
 * credits, invalid key, outage), retries once on the Lovable gateway so an
 * analysis still produces advice. The reason is reported back to the UI.
 */
export async function runAiCompletionWithFallback(
  req: AiCompletionRequest,
): Promise<AiCompletionResult & { fallbackReason: string | null }> {
  try {
    const result = await runAiCompletion(req);
    return { ...result, fallbackReason: null };
  } catch (err) {
    const message = (err as Error).message;
    const canFallback = req.provider !== "lovable" && Boolean(process.env.LOVABLE_API_KEY);
    if (!canFallback) throw err;
    console.warn("[AI] falling back to Lovable gateway", message.slice(0, 200));
    const result = await runAiCompletion({ ...req, provider: "lovable", model: FALLBACK_MODEL });
    return {
      ...result,
      fallbackReason: `Claude was niet beschikbaar (${message.slice(0, 160)}) — analyse uitgevoerd met het Lovable AI-fallbackmodel.`,
    };
  }
}

type RawResult = { text: string; inputTokens: number | null; outputTokens: number | null };

async function callAnthropic(req: AiCompletionRequest): Promise<RawResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiProviderError("ANTHROPIC_API_KEY ontbreekt op de server.", 412);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    // Hard timeout: een hangende verbinding mag een run nooit eindeloos op
    // "running" laten staan — na timeout grijpt de fallback-logica in.
    signal: AbortSignal.timeout(300_000),
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens ?? 8000,
      temperature: req.temperature ?? 0.2,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    }),
  }).catch((err) => {
    throw new AiProviderError(`Claude niet bereikbaar: ${(err as Error).message}`, 503);
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error("[AI] anthropic failed", { status: res.status, body: raw.slice(0, 500) });
    throw new AiProviderError(`Claude API [${res.status}]: ${extract(raw)}`, res.status);
  }
  const json = JSON.parse(raw) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (json.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n")
    .trim();
  return {
    text,
    inputTokens: json.usage?.input_tokens ?? null,
    outputTokens: json.usage?.output_tokens ?? null,
  };
}

async function callLovableGateway(req: AiCompletionRequest): Promise<RawResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiProviderError("LOVABLE_API_KEY ontbreekt op de server.", 412);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    signal: AbortSignal.timeout(300_000),
    body: JSON.stringify({
      model: req.model,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxTokens ?? 8000,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  }).catch((err) => {
    throw new AiProviderError(`AI Gateway niet bereikbaar: ${(err as Error).message}`, 503);
  });

  const raw = await res.text();
  if (res.status === 429) throw new AiProviderError("AI rate limit bereikt — probeer het straks opnieuw.", 429);
  if (res.status === 402) throw new AiProviderError("AI-credits op — vul credits aan in je workspace.", 402);
  if (!res.ok) {
    console.error("[AI] gateway failed", { status: res.status, body: raw.slice(0, 500) });
    throw new AiProviderError(`AI Gateway [${res.status}]: ${extract(raw)}`, res.status);
  }
  const json = JSON.parse(raw) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: json.choices?.[0]?.message?.content?.trim() ?? "",
    inputTokens: json.usage?.prompt_tokens ?? null,
    outputTokens: json.usage?.completion_tokens ?? null,
  };
}

function extract(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message ?? parsed?.title ?? body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

/** Extracts the first JSON object from a model answer (tolerates code fences). */
export function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Geen JSON-object in AI-antwoord gevonden.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

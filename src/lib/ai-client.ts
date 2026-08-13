import crypto from "crypto";
import { config } from "../config.js";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiModelTier = "fast" | "smart";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

const COMPLEX_REPLY_MARKERS = [
  /\b(tahlil|strategiya|taqqosla|solishtir|batafsil|individual|murakkab|reja tuz|qanday yaxshila)\b/u,
  /(анализ|стратег|сравн|подроб|индивидуаль|сложн|составь план)/u,
  /(تحليل|استراتيجية|قارن|بالتفصيل|خطة|معقد)/u,
];

/**
 * Oddiy FAQ va qisqa savollar arzon modelga, uzun yoki tahliliy savollar
 * kuchliroq modelga yuboriladi. Klassifikatsiya uchun alohida AI chaqirilmaydi.
 */
export function selectReplyModelTier(message: string, recentContextCount = 0): AiModelTier {
  const normalized = message.replace(/\s+/g, " ").trim().toLocaleLowerCase();
  const words = normalized ? normalized.split(" ").length : 0;
  const questionCount = (normalized.match(/[?؟]/g) ?? []).length;
  const isComplex = normalized.length >= 320 ||
    words >= 55 ||
    recentContextCount >= 4 ||
    questionCount >= 3 ||
    COMPLEX_REPLY_MARKERS.some((pattern) => pattern.test(normalized));
  return isComplex ? "smart" : "fast";
}

function modelForTier(tier: AiModelTier): string {
  return tier === "smart" ? config.ai.smartModel : config.ai.fastModel;
}

function responseText(response: OpenAiResponse): string | undefined {
  if (response.output_text?.trim()) return response.output_text.trim();
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) return content.text.trim();
    }
  }
  return undefined;
}

export function isAiAvailable(): boolean {
  return Boolean(config.openaiApiKey);
}

export async function aiGenerateJson<T = Record<string, unknown>>(options: {
  messages: AiChatMessage[];
  tier?: AiModelTier;
  maxTokens?: number;
}): Promise<{ data: T | null; provider: string; model?: string; tier: AiModelTier }> {
  const tier = options.tier ?? "fast";
  if (!config.openaiApiKey) return { data: null, provider: "none", tier };

  const model = modelForTier(tier);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json",
        "X-Client-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        model,
        input: options.messages,
        max_output_tokens: Math.min(options.maxTokens ?? 4_000, config.ai.maxOutputTokens),
        text: { format: { type: "json_object" } },
        ...(model.startsWith("gpt-5")
          ? { reasoning: { effort: tier === "smart" ? "low" : "none" } }
          : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  if (!response.ok) throw new Error(`OpenAI Responses API ${response.status}: ${raw.slice(0, 500)}`);
  const text = responseText(JSON.parse(raw) as OpenAiResponse);
  if (!text) return { data: null, provider: "openai", model, tier };
  return { data: JSON.parse(text) as T, provider: "openai", model, tier };
}

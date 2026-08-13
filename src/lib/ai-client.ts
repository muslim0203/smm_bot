import OpenAI from "openai";
import { config } from "../config.js";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!config.openaiApiKey) return null;
  client ??= new OpenAI({ apiKey: config.openaiApiKey, timeout: config.ai.timeoutMs });
  return client;
}

export function isAiAvailable(): boolean {
  return Boolean(config.openaiApiKey);
}

export async function aiGenerateJson<T = Record<string, unknown>>(options: {
  messages: AiChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<{ data: T | null; provider: string }> {
  const openai = getClient();
  if (!openai) return { data: null, provider: "none" };

  const completion = await openai.chat.completions.create({
    model: config.ai.openaiModel,
    messages: options.messages,
    max_tokens: Math.min(options.maxTokens ?? 4_000, config.ai.maxOutputTokens),
    temperature: options.temperature ?? 0.3,
    response_format: { type: "json_object" },
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return { data: null, provider: "openai" };
  return { data: JSON.parse(text) as T, provider: "openai" };
}

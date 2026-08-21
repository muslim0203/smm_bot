import { afterEach, describe, expect, it, vi } from "vitest";

type Captured = { method: string; body: Record<string, any> };

async function withStubbedTelegram(run: (calls: Captured[]) => Promise<void>): Promise<void> {
  const calls: Captured[] = [];
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  vi.resetModules();
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    calls.push({ method: String(url).split("/").pop()!, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 55 } }), { status: 200 });
  });
  await run(calls);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Telegram kanal posti", () => {
  it("qisqa captionni bitta rasm xabarida yuboradi", async () => {
    await withStubbedTelegram(async (calls) => {
      const { sendTelegramChannelPost } = await import("../src/social/telegram-api.js");
      const messageId = await sendTelegramChannelPost("-100123", "https://cdn.example/1.jpg", "Bugungi dars\n#arabtili");

      expect(messageId).toBe(55);
      expect(calls.map((call) => call.method)).toEqual(["sendPhoto"]);
      expect(calls[0].body.chat_id).toBe("-100123");
      expect(calls[0].body.caption).toContain("#arabtili");
    });
  });

  it("uzun captionni rasm izohi va davomiga bo'ladi, matn yo'qolmaydi", async () => {
    await withStubbedTelegram(async (calls) => {
      const { sendTelegramChannelPost } = await import("../src/social/telegram-api.js");
      const paragraphs = Array.from({ length: 40 }, (_, index) => `${index}-qator: arab tilida kundalik ibora namunasi.`);
      const caption = `${paragraphs.join("\n")}\n#arabtili #cefr`;

      const messageId = await sendTelegramChannelPost("-100123", "https://cdn.example/1.jpg", caption);

      expect(messageId).toBe(55);
      expect(calls.map((call) => call.method)).toEqual(["sendPhoto", "sendMessage"]);
      // Telegram rasm izohi 1024 belgidan oshmasligi kerak.
      expect(calls[0].body.caption.length).toBeLessThanOrEqual(1_024);
      expect(calls[1].body.reply_to_message_id).toBe(55);
      // Oxirgi hashtaglar ham ketishi shart.
      expect(calls[1].body.text).toContain("#cefr");
      const delivered = `${calls[0].body.caption}\n${calls[1].body.text}`.replace(/\s+/g, " ").trim();
      expect(delivered).toBe(caption.replace(/\s+/g, " ").trim());
    });
  });
});

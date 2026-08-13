import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export type TelegramInlineKeyboard = Array<Array<{ text: string; callback_data?: string; url?: string }>>;

async function telegramCall<T>(method: string, body: Record<string, unknown>): Promise<T> {
  if (!config.telegram.botToken) throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan");
  const response = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Telegram API ${response.status}: ${text.slice(0, 300)}`);
  const parsed = JSON.parse(text) as { ok: boolean; result: T; description?: string };
  if (!parsed.ok) throw new Error(parsed.description ?? "Telegram API xatosi");
  return parsed.result;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  keyboard?: TelegramInlineKeyboard,
): Promise<void> {
  await telegramCall("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4_000),
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption: string,
  keyboard?: TelegramInlineKeyboard,
): Promise<void> {
  await telegramCall("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption.slice(0, 1_000),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export async function answerTelegramCallback(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await telegramCall("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text: text.slice(0, 180) } : {}),
    });
  } catch (error) {
    logger.error("Telegram callback javobi yuborilmadi", error);
  }
}

export function isTelegramAdmin(userId: string): boolean {
  return config.telegram.adminUserIds.includes(userId);
}

export async function configureTelegramWebhook(): Promise<void> {
  if (!config.telegram.botToken || !config.telegram.webhookSecret || !config.backendUrl.startsWith("https://")) {
    logger.info("Telegram boshqaruv webhooki avtomatik sozlanmadi (token/secret/HTTPS URL kerak)");
    return;
  }
  await telegramCall("setWebhook", {
    url: `${config.backendUrl.replace(/\/+$/, "")}/api/social/telegram/webhook`,
    secret_token: config.telegram.webhookSecret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  await telegramCall("setMyCommands", {
    commands: [
      { command: "projects", description: "Loyihalar" },
      { command: "status", description: "Tanlangan loyiha holati" },
      { command: "accounts", description: "Instagram akkauntlar" },
      { command: "connect", description: "Instagram ulash" },
      { command: "content", description: "Bugungi kontentni yaratish" },
      { command: "queue", description: "Kontent navbati" },
      { command: "schedule", description: "Kunlik kontent vaqtini belgilash" },
      { command: "brand", description: "Tasdiqlangan loyiha faktlarini yangilash" },
      { command: "voice", description: "Brend ohangini yangilash" },
      { command: "help", description: "Yordam" },
    ],
  });
  logger.info("Telegram boshqaruv webhooki sozlandi");
}

import { Router } from "express";
import { config } from "../config.js";
import { handleTelegramUpdate, type TelegramUpdate } from "../social/telegram-controller.js";

export const socialControlRoutes = Router();

socialControlRoutes.post("/telegram/webhook", (req, res) => {
  if (
    !config.telegram.webhookSecret ||
    req.get("x-telegram-bot-api-secret-token") !== config.telegram.webhookSecret
  ) {
    res.status(401).json({ message: "Telegram webhook secret noto'g'ri" });
    return;
  }

  const update = req.body as TelegramUpdate;
  res.status(200).json({ ok: true });
  void handleTelegramUpdate(update);
});

import { Router, type Request, type Response } from "express";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { handleTelegramUpdate, type TelegramUpdate } from "../social/telegram-controller.js";

export const socialControlRoutes = Router();

// Instagram image_url orqali rasmni oladi. S3 ulanmagan kichik loyihalarda
// rasm mavjud PostgreSQL bazasidan public, taxmin qilish qiyin cuid orqali beriladi.
// Version segment har bir regeneratsiyada URL'ni yangilab, Telegram/Meta keshini chetlab o'tadi.
const sendDraftImage = async (req: Request, res: Response) => {
  const draft = await prisma.socialContentDraft.findUnique({
    where: { id: req.params.draftId },
    select: { imageData: true, imageContentType: true },
  });
  if (!draft?.imageData) {
    res.status(404).send("Image not found");
    return;
  }
  res.set({
    "Content-Type": draft.imageContentType ?? "image/jpeg",
    "Cache-Control": "public, max-age=86400",
    "Content-Length": String(draft.imageData.length),
  });
  res.send(draft.imageData);
};

socialControlRoutes.get("/media/:draftId/:version.jpg", sendDraftImage);
// Oldingi yaratilgan draft URL'lari ham ishlashda davom etadi.
socialControlRoutes.get("/media/:draftId.jpg", sendDraftImage);

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

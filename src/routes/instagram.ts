import type { Request } from "express";
import { Router } from "express";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { parseInstagramWebhook, verifyInstagramSignature } from "../instagram/webhook.js";
import { handleInstagramOAuthCallback } from "../social/instagram-oauth.js";

export const instagramRoutes = Router();

type RawBodyRequest = Request & { rawBody?: Buffer };

instagramRoutes.get("/oauth/callback", handleInstagramOAuthCallback);

// GET /api/instagram/webhook — Meta webhook callback tekshiruvi.
instagramRoutes.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    typeof token === "string" &&
    config.instagram.verifyToken &&
    token === config.instagram.verifyToken &&
    typeof challenge === "string"
  ) {
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ message: "Webhook tekshiruvi rad etildi" });
});

// POST /api/instagram/webhook — Meta xabar/komment hodisalari.
instagramRoutes.post("/webhook", async (req: RawBodyRequest, res) => {
  const signature = req.get("x-hub-signature-256");
  if (!req.rawBody || !verifyInstagramSignature(req.rawBody, signature, config.instagram.appSecret)) {
    res.status(401).json({ message: "Webhook imzosi noto'g'ri" });
    return;
  }

  const events = parseInstagramWebhook(req.body, config.instagram.userId);
  if (events.length > 0) {
    const accountUserIds = [...new Set(events.map((event) => event.accountInstagramUserId))];
    const accounts = await prisma.instagramAccount.findMany({
      where: { instagramUserId: { in: accountUserIds }, isActive: true },
      select: { id: true, instagramUserId: true },
    });
    const accountMap = new Map(accounts.map((account) => [account.instagramUserId, account.id]));
    const accepted: Array<{
      accountId: string | null;
      eventKey: string;
      eventType: "DM" | "COMMENT";
      senderId: string;
      senderUsername?: string;
      objectId: string;
      message: string;
    }> = [];
    for (const { accountInstagramUserId, ...event } of events) {
      const accountId = accountMap.get(accountInstagramUserId);
      if (accountId) {
        accepted.push({ ...event, accountId });
        continue;
      }
      // Eski bitta-akkaunt env konfiguratsiyasi migratsiya davrida ishlashda davom etadi.
      if (accountInstagramUserId === config.instagram.userId) accepted.push({ ...event, accountId: null });
    }

    if (accepted.length > 0) {
      await prisma.instagramInboxEvent.createMany({ data: accepted, skipDuplicates: true });
      await prisma.instagramAccount.updateMany({
        where: { id: { in: accepted.flatMap((event) => event.accountId ? [event.accountId] : []) } },
        data: { lastWebhookAt: new Date() },
      });
      logger.info("Instagram webhook navbatga qo'shildi", { received: accepted.length });
    }
  }

  // Meta callbackni tez 200 bilan tasdiqlaymiz; AI javobni worker alohida yuboradi.
  res.status(200).json({ received: true });
});

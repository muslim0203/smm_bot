import crypto from "crypto";
import type { Request } from "express";
import { Router } from "express";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { parseInstagramWebhook, verifyInstagramSignature } from "../instagram/webhook.js";
import { verifyMetaSignedRequest } from "../instagram/signed-request.js";
import { handleInstagramOAuthCallback } from "../social/instagram-oauth.js";

export const instagramRoutes = Router();

type RawBodyRequest = Request & { rawBody?: Buffer };

instagramRoutes.get("/oauth/callback", handleInstagramOAuthCallback);

function signedRequestFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>).signed_request;
  return typeof value === "string" && value.length <= 10_000 ? value : null;
}

async function deleteInstagramAccountData(instagramUserId: string): Promise<void> {
  const account = await prisma.instagramAccount.findUnique({
    where: { instagramUserId },
    select: { id: true },
  });
  if (!account) return;

  await prisma.$transaction([
    prisma.instagramInboxEvent.deleteMany({ where: { accountId: account.id } }),
    prisma.socialContentDraft.updateMany({
      where: { instagramAccountId: account.id },
      data: { instagramAccountId: null },
    }),
    prisma.instagramAccount.delete({ where: { id: account.id } }),
  ]);
}

// Meta foydalanuvchi ilovadan uzilganda shifrlangan token va inbox ma'lumotlarini o'chiradi.
instagramRoutes.post("/deauthorize", async (req, res) => {
  const signedRequest = signedRequestFromBody(req.body);
  if (!signedRequest) {
    res.status(400).json({ message: "signed_request kerak" });
    return;
  }
  try {
    const payload = verifyMetaSignedRequest(signedRequest, config.instagram.appSecret);
    if (payload.user_id !== undefined) await deleteInstagramAccountData(String(payload.user_id));
    res.status(200).json({ success: true });
  } catch (error) {
    logger.warn("Meta deauthorize so'rovi rad etildi", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({ message: "signed_request noto'g'ri" });
  }
});

// Meta data deletion callback: ma'lumotni o'chiradi va foydalanuvchiga holat URL'ini beradi.
instagramRoutes.post("/data-deletion", async (req, res) => {
  const signedRequest = signedRequestFromBody(req.body);
  if (!signedRequest) {
    res.status(400).json({ message: "signed_request kerak" });
    return;
  }
  try {
    const payload = verifyMetaSignedRequest(signedRequest, config.instagram.appSecret);
    const instagramUserId = payload.user_id === undefined ? "unknown" : String(payload.user_id);
    if (instagramUserId !== "unknown") await deleteInstagramAccountData(instagramUserId);
    const confirmationCode = crypto
      .createHmac("sha256", config.instagram.appSecret)
      .update(`deleted:${instagramUserId}`)
      .digest("hex")
      .slice(0, 24);
    res.status(200).json({
      url: `${config.backendUrl.replace(/\/+$/, "")}/api/instagram/data-deletion/status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    logger.warn("Meta data deletion so'rovi rad etildi", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({ message: "signed_request noto'g'ri" });
  }
});

instagramRoutes.get("/data-deletion/status", (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!/^[a-f0-9]{24}$/.test(code)) {
    res.status(400).json({ message: "Tasdiqlash kodi noto'g'ri" });
    return;
  }
  res.status(200).json({ status: "completed", confirmation_code: code });
});

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

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

  try {
    await ingestInstagramWebhook(req.body);
  } catch (error) {
    // Meta'ga 200 qaytarmasak, u xuddi shu hodisani qayta-qayta yuboradi va
    // mijoz bitta xabariga bir nechta javob ketishi mumkin. Xatoni faqat logga yozamiz.
    logger.error("Instagram webhook navbatga qo'shilmadi", error);
  }

  // Meta callbackni tez 200 bilan tasdiqlaymiz; AI javobni worker alohida yuboradi.
  res.status(200).json({ received: true });
});

type AcceptedEvent = {
  accountId: string | null;
  eventKey: string;
  eventType: "DM" | "COMMENT";
  senderId: string;
  senderUsername?: string;
  objectId: string;
  parentId?: string;
  message: string;
};

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

async function ingestInstagramWebhook(payload: unknown): Promise<void> {
  // Ulangan barcha akkauntlar "o'zimiz" hisoblanadi: bot yozgan javob ham
  // yangi comment webhook'i sifatida qaytadi va uni qayta ishlasak, bot o'zi
  // bilan yozishib bitta kommentga bir nechta javob yozib qo'yadi.
  const accounts = await prisma.instagramAccount.findMany({
    where: { isActive: true },
    select: { id: true, instagramUserId: true },
  });
  const selfIds = accounts.map((account) => account.instagramUserId);
  if (config.instagram.userId) selfIds.push(config.instagram.userId);

  const events = parseInstagramWebhook(payload, selfIds);
  if (events.length === 0) return;

  const accountMap = new Map(accounts.map((account) => [account.instagramUserId, account.id]));
  const accepted: AcceptedEvent[] = [];
  for (const { accountInstagramUserId, ...event } of events) {
    const accountId = accountMap.get(accountInstagramUserId);
    if (accountId) {
      accepted.push({ ...event, accountId });
      continue;
    }
    // Eski bitta-akkaunt env konfiguratsiyasi migratsiya davrida ishlashda davom etadi.
    if (accountInstagramUserId === config.instagram.userId) accepted.push({ ...event, accountId: null });
  }
  if (accepted.length === 0) return;

  const fresh = await withoutDuplicates(accepted);
  if (fresh.length === 0) {
    logger.info("Instagram webhook takrori tashlandi", { skipped: accepted.length });
    return;
  }

  await prisma.instagramInboxEvent.createMany({ data: fresh, skipDuplicates: true });
  await prisma.instagramAccount.updateMany({
    where: { id: { in: fresh.flatMap((event) => event.accountId ? [event.accountId] : []) } },
    data: { lastWebhookAt: new Date() },
  });
  logger.info("Instagram webhook navbatga qo'shildi", {
    received: fresh.length,
    skipped: accepted.length - fresh.length,
  });
}

/**
 * Meta bir hodisani bir necha marta (ba'zan boshqa mid/comment id bilan) yuborishi mumkin.
 * Shuning uchun event_key unikaligidan tashqari yana ikki tekshiruv bor:
 * 1) bu comment id aslida bizning javobimiz emasmi;
 * 2) shu foydalanuvchidan xuddi shu matn oxirgi 10 daqiqada kelmaganmi.
 */
async function withoutDuplicates(accepted: AcceptedEvent[]): Promise<AcceptedEvent[]> {
  const objectIds = accepted.map((event) => event.objectId);
  const parentIds = accepted.flatMap((event) => event.parentId ? [event.parentId] : []);
  const ownReplies = await prisma.instagramInboxEvent.findMany({
    where: { replyObjectId: { in: [...new Set([...objectIds, ...parentIds])] } },
    select: { replyObjectId: true },
  });
  const ownReplyIds = new Set(ownReplies.flatMap((item) => item.replyObjectId ? [item.replyObjectId] : []));

  const recent = await prisma.instagramInboxEvent.findMany({
    where: {
      senderId: { in: [...new Set(accepted.map((event) => event.senderId))] },
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    select: { accountId: true, senderId: true, eventType: true, message: true, objectId: true },
  });
  const seen = new Set(recent.map((item) => `${item.accountId ?? ""}|${item.senderId}|${item.eventType}|${item.message}`));

  const fresh: AcceptedEvent[] = [];
  for (const event of accepted) {
    if (ownReplyIds.has(event.objectId)) continue;
    const fingerprint = `${event.accountId ?? ""}|${event.senderId}|${event.eventType}|${event.message}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    fresh.push(event);
  }
  return fresh;
}

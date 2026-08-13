import type { Prisma } from "@prisma/client";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { decideInstagramReply, replyToInstagramComment, sendInstagramDm } from "./reply.js";
import { decryptSocialToken } from "../social/token-crypto.js";
import { sendTelegramMessage } from "../social/telegram-api.js";

const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
let running = false;

type ClaimedEvent = Prisma.InstagramInboxEventGetPayload<{
  include: { account: { include: { project: true } } };
}>;

function isConfigured(): boolean {
  const instagram = config.instagram;
  return instagram.enabled && !!(
    instagram.appSecret && instagram.verifyToken &&
    ((instagram.accessToken && instagram.userId) || instagram.tokenEncryptionKey.length >= 32)
  );
}

async function claimEvents(): Promise<ClaimedEvent[]> {
  const now = new Date();
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  await prisma.instagramInboxEvent.updateMany({
    where: { status: "PROCESSING", lockedAt: { lt: staleLock } },
    data: { status: "FAILED", lockedAt: null, nextAttemptAt: now, lastError: "Eski worker lock tiklandi" },
  });

  const candidates = await prisma.instagramInboxEvent.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: config.instagram.maxAttempts },
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: config.instagram.workerBatchSize,
    include: { account: { include: { project: true } } },
  });

  const claimed: ClaimedEvent[] = [];
  for (const event of candidates) {
    const result = await prisma.instagramInboxEvent.updateMany({
      where: { id: event.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PROCESSING", lockedAt: now, attempts: { increment: 1 } },
    });
    if (result.count === 1) claimed.push({ ...event, status: "PROCESSING", attempts: event.attempts + 1, lockedAt: now });
  }
  return claimed;
}

async function processEvent(event: ClaimedEvent): Promise<void> {
  const eventType = event.eventType === "COMMENT" ? "COMMENT" as const : "DM" as const;
  const account = event.account;
  const credential = account
    ? { instagramUserId: account.instagramUserId, accessToken: decryptSocialToken(account.accessTokenEncrypted) }
    : { instagramUserId: config.instagram.userId, accessToken: config.instagram.accessToken };

  if (
    (account ? !account.isActive : false) ||
    (eventType === "DM" && !(account?.dmRepliesEnabled ?? config.instagram.dmRepliesEnabled)) ||
    (eventType === "COMMENT" && !(account?.commentRepliesEnabled ?? config.instagram.commentRepliesEnabled))
  ) {
    await prisma.instagramInboxEvent.update({
      where: { id: event.id },
      data: { status: "IGNORED", lockedAt: null, processedAt: new Date(), lastError: "Kanal uchun autojavob o'chirilgan" },
    });
    return;
  }

  const recent = await prisma.instagramInboxEvent.findMany({
    where: {
      id: { not: event.id },
      accountId: event.accountId,
      senderId: event.senderId,
      status: { in: ["REPLIED", "HANDOFF"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { message: true, replyText: true },
  });
  const decision = await decideInstagramReply({
    eventType,
    message: event.message,
    project: account?.project,
    recentContext: recent.reverse().map((item) => ({ inbound: item.message, reply: item.replyText })),
  });
  if (decision.decision === "ignore") {
    await prisma.instagramInboxEvent.update({
      where: { id: event.id },
      data: { status: "IGNORED", lockedAt: null, processedAt: new Date(), lastError: decision.reason },
    });
    return;
  }

  if (decision.decision === "handoff") {
    // DM'da foydalanuvchini javobsiz qoldirmaymiz; ommaviy kommentga esa
    // nozik vaziyatlarda avtomatik matn yozmaymiz.
    if (eventType === "DM" && decision.reply) {
      await sendInstagramDm(event.senderId, decision.reply, credential);
    }
    await prisma.instagramInboxEvent.update({
      where: { id: event.id },
      data: {
        status: "HANDOFF",
        replyText: decision.reply,
        lockedAt: null,
        processedAt: new Date(),
        lastError: decision.reason,
      },
    });
    logger.warn("Instagram xabari operatorga yo'naltirildi", {
      eventId: event.id,
      eventType,
      senderUsername: event.senderUsername,
      reason: decision.reason,
    });
    await notifyHandoff(event, decision.reason);
    return;
  }

  const reply = decision.reply!;
  if (eventType === "DM") await sendInstagramDm(event.senderId, reply, credential);
  else await replyToInstagramComment(event.objectId, reply, credential);

  await prisma.instagramInboxEvent.update({
    where: { id: event.id },
    data: { status: "REPLIED", replyText: reply, lockedAt: null, processedAt: new Date(), lastError: null },
  });
}

async function notifyHandoff(event: ClaimedEvent, reason?: string): Promise<void> {
  const admins = config.telegram.adminUserIds.length
    ? config.telegram.adminUserIds
    : (config.telegram.chatId ? [config.telegram.chatId] : []);
  if (!config.telegram.botToken || !admins.length) return;

  const username = event.senderUsername ? `@${event.senderUsername}` : `ID: ${event.senderId}`;
  for (const admin of admins) {
    try {
      await sendTelegramMessage(admin, [
        "Instagram: operator javobi kerak",
        `Loyiha: ${event.account?.project.name ?? "Legacy"}`,
        `Kanal: ${event.eventType}`,
        `Foydalanuvchi: ${username}`,
        `Sabab: ${reason ?? "AI handoff"}`,
        `Xabar: ${event.message.slice(0, 500)}`,
      ].join("\n"), [[
        { text: "✍️ Javob yozish", callback_data: `inbox:reply:${event.id}` },
        { text: "Yopish", callback_data: `inbox:close:${event.id}` },
      ]]);
    } catch (error) {
      // Telegram ikkilamchi kanal: uning xatosi HANDOFF statusini FAILED'ga aylantirmasin.
      logger.error("Instagram handoff Telegram xabarnomasi xatosi", error, { eventId: event.id });
    }
  }
}

export async function cleanupInstagramEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - config.instagram.retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.instagramInboxEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      status: { in: ["REPLIED", "HANDOFF", "IGNORED", "FAILED"] },
    },
  });
  return result.count;
}

export async function runInstagramWorker(): Promise<void> {
  if (running || !isConfigured()) return;
  running = true;
  try {
    const events = await claimEvents();
    for (const event of events) {
      try {
        await processEvent(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const exhausted = event.attempts >= config.instagram.maxAttempts;
        const delayMs = Math.min(60_000, 2 ** Math.max(0, event.attempts - 1) * 5_000);
        await prisma.instagramInboxEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            lockedAt: null,
            nextAttemptAt: new Date(Date.now() + delayMs),
            lastError: `${exhausted ? "Urinishlar tugadi. " : ""}${message}`.slice(0, 1_000),
          },
        });
        logger.error("Instagram autojavob xatosi", error, { eventId: event.id, exhausted });
      }
    }
  } finally {
    running = false;
  }
}

export function startInstagramWorker(): void {
  if (!config.instagram.enabled) {
    logger.info("Instagram autojavob o'chirilgan");
    return;
  }
  if (!isConfigured()) {
    logger.warn("Instagram autojavob yoqilgan, lekin kerakli env kalitlari to'liq emas");
    return;
  }

  setTimeout(() => void runInstagramWorker(), 2_000);
  setInterval(() => void runInstagramWorker(), config.instagram.workerIntervalMs);
  logger.info("Instagram DM/komment autojavob workeri ishga tushdi");
}

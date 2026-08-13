import crypto from "crypto";
import { config } from "../config.js";
import { aiGenerateJson, isAiAvailable } from "../lib/ai-client.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { deleteFromSpaces, isSpacesConfigured, uploadBufferToSpaces } from "../lib/s3.js";
import { decryptSocialToken } from "./token-crypto.js";
import { sendTelegramMessage, sendTelegramPhoto } from "./telegram-api.js";

type ContentPlan = {
  topic: string;
  hook: string;
  script: string;
  caption: string;
  imagePrompt: string;
};

type ProjectClock = { date: string; hour: number; minute: number };

function projectClock(timezone: string, date = new Date()): ProjectClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function normalizePlan(value: ContentPlan): ContentPlan {
  const field = (input: unknown, max: number) => typeof input === "string" ? input.trim().slice(0, max) : "";
  const result = {
    topic: field(value?.topic, 200),
    hook: field(value?.hook, 300),
    script: field(value?.script, 3_500),
    caption: field(value?.caption, 2_000),
    imagePrompt: field(value?.imagePrompt, 3_000),
  };
  if (!result.topic || !result.hook || !result.caption || !result.imagePrompt) {
    throw new Error("AI kontent rejasi to'liq emas");
  }
  return result;
}

async function createPlan(projectId: string): Promise<ContentPlan> {
  if (!isAiAvailable()) throw new Error("Kontent ssenariysi uchun GEMINI_API_KEY yoki OPENAI_API_KEY kerak");
  const project = await prisma.socialProject.findUniqueOrThrow({ where: { id: projectId } });
  const recent = await prisma.socialContentDraft.findMany({
    where: { projectId, topic: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 7,
    select: { topic: true, hook: true },
  });

  const { data } = await aiGenerateJson<ContentPlan>({
    tier: "smart",
    messages: [
      {
        role: "system",
        content: `Siz ${project.name} uchun tajribali Instagram content strategist va copywritersiz.
Brend ovozi: ${project.brandVoice}
Tasdiqlangan brend faktlari:
${project.brandFacts}
Sayt: ${project.websiteUrl ?? "ko'rsatilmagan"}

Bugun uchun bitta original Instagram feed/reels g'oyasi yarating. Oldingi mavzularni takrorlamang.
Hech qanday yolg'on natija, kafolat, narx yoki fakt uydirmang.

Image prompt ingliz tilida yozilsin va vertikal 4:5 premium Instagram marketing posteri yaratsin.
Poster odamni bir qarashda qiziqtirsin va xizmatning foydasini tushuntirsin. Image prompt ichida quyidagi
uchta ko'rinadigan matnni aynan qo'shtirnoqda bering; matnlarning o'zi auditoriya tilida bo'lsin:
1) 3-6 so'zli kuchli sarlavha;
2) faqat tasdiqlangan brend faktlariga asoslangan, 6-12 so'zli xizmat yoki foyda izohi;
3) 2-4 so'zli aniq CTA.
Katta, kontrastli, telefonda oson o'qiladigan professional tipografiya, aniq vizual ierarxiya va matn uchun
yetarli bo'sh joy talab qiling. Ko'pi bilan uchta matn bloki bo'lsin; uzun paragraf, hashtag, uydirma narx,
uydirma chegirma, watermark yoki begona logotip bo'lmasin.

Caption foydalanuvchi auditoriyasi tilida, tabiiy CTA va 3-7 relevant hashtag bilan bo'lsin.
Faqat JSON: {"topic":"...","hook":"...","script":"...","caption":"...","imagePrompt":"..."}.`,
      },
      { role: "user", content: `Oxirgi mavzular: ${JSON.stringify(recent)}` },
    ],
    maxTokens: 1_500,
  });
  if (!data) throw new Error("AI kontent rejasini qaytarmadi");
  return normalizePlan(data);
}

async function createImage(
  prompt: string,
  projectKey: string,
  contentDate: string,
  draftId: string,
): Promise<{ imageUrl: string; objectKey?: string; imageData?: Buffer; contentType: string }> {
  if (!config.openaiApiKey) throw new Error("Rasm yaratish uchun OPENAI_API_KEY kerak");
  const quality = ["low", "medium", "high"].includes(config.ai.imageQuality)
    ? config.ai.imageQuality
    : "medium";
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ai.imageModel,
      prompt,
      size: "1024x1536",
      quality,
      output_format: "jpeg",
      n: 1,
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`OpenAI Image API ${response.status}: ${raw.slice(0, 500)}`);
  const parsed = JSON.parse(raw) as { data?: Array<{ b64_json?: string }> };
  const base64 = parsed.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI Image API rasm ma'lumotini qaytarmadi");

  const imageData = Buffer.from(base64, "base64");
  const contentType = "image/jpeg";
  if (!isSpacesConfigured()) {
    const imageVersion = crypto.randomBytes(8).toString("hex");
    return {
      imageUrl: `${config.backendUrl.replace(/\/+$/, "")}/api/social/media/${draftId}/${imageVersion}.jpg`,
      imageData,
      contentType,
    };
  }
  const objectKey = `social/${projectKey}/${contentDate}-${crypto.randomBytes(8).toString("hex")}.jpg`;
  const imageUrl = await uploadBufferToSpaces(imageData, objectKey, contentType);
  return { imageUrl, objectKey, contentType };
}

function draftKeyboard(draftId: string) {
  return [
    [
      { text: "✅ Tasdiqlash", callback_data: `draft:approve:${draftId}` },
      { text: "🔄 Qayta yaratish", callback_data: `draft:regen:${draftId}` },
    ],
    [{ text: "❌ Rad etish", callback_data: `draft:reject:${draftId}` }],
  ];
}

async function notifyDraft(draftId: string): Promise<void> {
  const draft = await prisma.socialContentDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: { project: true },
  });
  const admins = config.telegram.adminUserIds.length
    ? config.telegram.adminUserIds
    : (config.telegram.chatId ? [config.telegram.chatId] : []);
  const caption = [
    `📝 ${draft.project.name} — ${draft.contentDate}`,
    `Mavzu: ${draft.topic}`,
    `Hook: ${draft.hook}`,
    "",
    draft.caption,
  ].join("\n");

  for (const admin of admins) {
    try {
      if (draft.imageUrl) await sendTelegramPhoto(admin, draft.imageUrl, caption, draftKeyboard(draft.id));
      else await sendTelegramMessage(admin, `${caption}\n\nImage prompt:\n${draft.imagePrompt}`, draftKeyboard(draft.id));
    } catch (error) {
      logger.error("Kontent approval kartasi Telegram'ga yuborilmadi", error, { draftId, admin });
    }
  }
}

export async function generateDailyContent(
  projectId: string,
  force = false,
  regenerateDraftId?: string,
): Promise<string> {
  const project = await prisma.socialProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { instagramAccounts: { where: { isActive: true }, orderBy: { createdAt: "asc" } } },
  });
  const contentDate = projectClock(project.timezone).date;
  const existing = await prisma.socialContentDraft.findFirst({
    where: { projectId, contentDate },
    orderBy: { createdAt: "desc" },
  });
  if (existing && !force) return existing.id;

  const regenerationTarget = regenerateDraftId
    ? await prisma.socialContentDraft.findFirst({
        where: {
          id: regenerateDraftId,
          projectId,
          status: { in: ["GENERATING", "REVIEW", "REJECTED", "FAILED"] },
        },
      })
    : null;
  const draft = regenerationTarget
    ? await prisma.socialContentDraft.update({
        where: { id: regenerationTarget.id },
        data: {
          status: "GENERATING",
          lastError: null,
          attempts: 0,
          lockedAt: null,
          approvedAt: null,
          approvedByTelegramUserId: null,
          instagramContainerId: null,
          instagramMediaId: null,
          publishedAt: null,
        },
      })
    : await prisma.socialContentDraft.create({
        data: {
          projectId,
          instagramAccountId: project.instagramAccounts[0]?.id,
          contentDate,
          status: "GENERATING",
        },
      });

  try {
    const plan = await createPlan(projectId);
    const image = await createImage(plan.imagePrompt, project.key, contentDate, draft.id);
    const status = project.autoPublishEnabled && !project.contentApprovalRequired ? "APPROVED" : "REVIEW";
    await prisma.socialContentDraft.update({
      where: { id: draft.id },
      data: {
        ...plan,
        imageUrl: image.imageUrl,
        imageObjectKey: image.objectKey ?? null,
        imageData: image.imageData ?? null,
        imageContentType: image.contentType,
        status,
        lastError: null,
      },
    });
    if (regenerationTarget?.imageObjectKey && regenerationTarget.imageObjectKey !== image.objectKey) {
      await deleteFromSpaces(regenerationTarget.imageObjectKey);
    }
    await notifyDraft(draft.id);
    return draft.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.socialContentDraft.update({
      where: { id: draft.id },
      data: { status: "FAILED", lastError: message.slice(0, 1_000) },
    });
    throw error;
  }
}

async function instagramJson<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.instagram.graphBaseUrl}/${config.instagram.apiVersion}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Instagram publish ${response.status}: ${raw.slice(0, 500)}`);
  return JSON.parse(raw) as T;
}

export async function approveContentDraft(draftId: string, telegramUserId: string): Promise<boolean> {
  const result = await prisma.socialContentDraft.updateMany({
    where: { id: draftId, status: "REVIEW" },
    data: { status: "APPROVED", approvedAt: new Date(), approvedByTelegramUserId: telegramUserId, lastError: null },
  });
  return result.count === 1;
}

export async function rejectContentDraft(draftId: string): Promise<boolean> {
  const result = await prisma.socialContentDraft.updateMany({
    where: { id: draftId, status: "REVIEW" },
    data: { status: "REJECTED" },
  });
  return result.count === 1;
}

export async function advanceContentPublish(draftId: string): Promise<void> {
  const now = new Date();
  const claim = await prisma.socialContentDraft.updateMany({
    where: {
      id: draftId,
      status: { in: ["APPROVED", "PUBLISHING"] },
      OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(now.getTime() - 5 * 60 * 1000) } }],
    },
    data: { lockedAt: now },
  });
  if (claim.count === 0) return;

  try {
    const draft = await prisma.socialContentDraft.findUniqueOrThrow({
      where: { id: draftId },
      include: { instagramAccount: true, project: true },
    });
    if (draft.instagramMediaId) {
      await prisma.socialContentDraft.update({
        where: { id: draft.id },
        data: { status: "PUBLISHED", lockedAt: null, lastError: null },
      });
      return;
    }
    if (!draft.imageUrl || !draft.caption) throw new Error("Draft rasm yoki caption'siz");
    const account = draft.instagramAccount ?? await prisma.instagramAccount.findFirst({
      where: { projectId: draft.projectId, isActive: true, publishingEnabled: true },
      orderBy: { createdAt: "asc" },
    });
    if (!account || !account.publishingEnabled) throw new Error("Loyiha uchun Instagram publishing yoqilmagan");
    const token = decryptSocialToken(account.accessTokenEncrypted);

    if (!draft.instagramContainerId) {
      const container = await instagramJson<{ id: string }>(token, `${encodeURIComponent(account.instagramUserId)}/media`, {
        method: "POST",
        body: JSON.stringify({ image_url: draft.imageUrl, caption: draft.caption }),
      });
      await prisma.socialContentDraft.update({
        where: { id: draft.id },
        data: {
          status: "PUBLISHING",
          instagramAccountId: account.id,
          instagramContainerId: container.id,
          attempts: { increment: 1 },
          lockedAt: null,
        },
      });
      return;
    }

    const status = await instagramJson<{ status_code?: string; status?: string }>(
      token,
      `${encodeURIComponent(draft.instagramContainerId)}?fields=status_code,status`,
    );
    if (status.status_code && status.status_code !== "FINISHED") {
      if (["ERROR", "EXPIRED"].includes(status.status_code)) throw new Error(status.status ?? `Container ${status.status_code}`);
      await prisma.socialContentDraft.update({ where: { id: draft.id }, data: { lockedAt: null } });
      return;
    }

    const published = await instagramJson<{ id: string }>(token, `${encodeURIComponent(account.instagramUserId)}/media_publish`, {
      method: "POST",
      body: JSON.stringify({ creation_id: draft.instagramContainerId }),
    });
    await prisma.socialContentDraft.update({
      where: { id: draft.id },
      data: {
        status: "PUBLISHED",
        instagramMediaId: published.id,
        publishedAt: new Date(),
        lastError: null,
        lockedAt: null,
        imageData: null,
      },
    });
    const admins = config.telegram.adminUserIds.length ? config.telegram.adminUserIds : [config.telegram.chatId].filter(Boolean);
    await Promise.all(admins.map((admin) => sendTelegramMessage(
      admin,
      `✅ ${draft.project.name}: Instagram posti joylandi. Media ID: ${published.id}`,
    ).catch((error) => logger.error("Publish xabarnomasi Telegram'ga yuborilmadi", error, { draftId, admin }))));
  } catch (error) {
    await prisma.socialContentDraft.updateMany({ where: { id: draftId }, data: { lockedAt: null } });
    throw error;
  }
}

let contentWorkerRunning = false;

export async function runSocialContentWorker(): Promise<void> {
  if (contentWorkerRunning) return;
  contentWorkerRunning = true;
  try {
    const tokenWarningCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiringAccounts = await prisma.instagramAccount.findMany({
      where: {
        isActive: true,
        tokenExpiresAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        OR: [{ tokenWarningSentAt: null }, { tokenWarningSentAt: { lt: tokenWarningCutoff } }],
      },
      include: { project: true },
    });
    if (expiringAccounts.length > 0) {
      const admins = config.telegram.adminUserIds.length
        ? config.telegram.adminUserIds
        : [config.telegram.chatId].filter(Boolean);
      for (const account of expiringAccounts) {
        const expiry = account.tokenExpiresAt?.toISOString().slice(0, 10) ?? "noma'lum";
        await Promise.all(admins.map((admin) => sendTelegramMessage(
          admin,
          `⚠️ ${account.project.name} / ${account.label}: Instagram token ${expiry} da tugaydi. /select ${account.project.key}, keyin /connect orqali qayta ulang.`,
        ).catch((error) => logger.error("Token ogohlantirishi Telegram'ga yuborilmadi", error, { accountId: account.id, admin }))));
        await prisma.instagramAccount.update({
          where: { id: account.id },
          data: { tokenWarningSentAt: new Date() },
        });
      }
    }

    const projects = await prisma.socialProject.findMany({ where: { isActive: true, contentEnabled: true } });
    for (const project of projects) {
      const clock = projectClock(project.timezone);
      const due = clock.hour > project.dailyContentHour ||
        (clock.hour === project.dailyContentHour && clock.minute >= project.dailyContentMinute);
      if (!due) continue;
      try {
        await generateDailyContent(project.id);
      } catch (error) {
        logger.error("Kunlik kontent generatsiyasi xatosi", error, { projectId: project.id });
      }
    }

    const publishable = await prisma.socialContentDraft.findMany({
      where: {
        status: { in: ["APPROVED", "PUBLISHING"] },
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      take: 10,
      orderBy: { updatedAt: "asc" },
    });
    for (const draft of publishable) {
      try {
        await advanceContentPublish(draft.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.socialContentDraft.update({
          where: { id: draft.id },
          data: { status: "FAILED", lastError: message.slice(0, 1_000), attempts: { increment: 1 } },
        });
        logger.error("Instagram kontent publish xatosi", error, { draftId: draft.id });
      }
    }
  } finally {
    contentWorkerRunning = false;
  }
}

export function startSocialContentWorker(): void {
  if (!config.telegram.botToken) {
    logger.info("Social content worker: Telegram bot sozlanmagan");
    return;
  }
  setTimeout(() => void runSocialContentWorker(), 10_000);
  setInterval(() => void runSocialContentWorker(), config.instagram.contentWorkerIntervalMs);
  logger.info("Ko'p loyiha social content workeri ishga tushdi");
}

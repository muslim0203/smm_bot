import crypto from "crypto";
import { config } from "../config.js";
import { aiGenerateJson, isAiAvailable } from "../lib/ai-client.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { normalizeInstagramImage } from "../lib/image.js";
import { deleteFromSpaces, isSpacesConfigured, uploadBufferToSpaces } from "../lib/s3.js";
import { CONTENT_PILLARS, pillarLabel, selectPillar, type ContentPillar } from "./content-pillars.js";
import { decryptSocialToken } from "./token-crypto.js";
import { sendTelegramChannelPost, sendTelegramMessage, sendTelegramPhoto } from "./telegram-api.js";

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

/** Poster har doim 4:5 formatda kesiladi, shuning uchun kompozitsiya talabi qat'iy beriladi. */
function imagePromptFraming(pillar: ContentPillar): string {
  return [
    "Technical framing (must follow):",
    "vertical 4:5 Instagram post, 1080x1350 pixels;",
    `layout style: ${pillar.imageStyle}`,
    "keep every text block and key element inside the central safe area with at least 10% empty margin",
    "on all four sides, because the image is center-cropped to 4:5;",
    "no text near the edges or corners, no cropped letters, no watermark, no logo, no hashtags,",
    "no invented prices or discounts, correct spelling only, maximum three text blocks,",
    "large high-contrast typography that stays readable on a phone screen.",
  ].join(" ");
}

async function createPlan(projectId: string, pillar: ContentPillar): Promise<ContentPlan> {
  if (!isAiAvailable()) throw new Error("Kontent ssenariysi uchun GEMINI_API_KEY yoki OPENAI_API_KEY kerak");
  const project = await prisma.socialProject.findUniqueOrThrow({ where: { id: projectId } });
  const recent = await prisma.socialContentDraft.findMany({
    where: { projectId, topic: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { topic: true, hook: true, pillar: true },
  });

  const salesRules = pillar.promotional
    ? `Bu post — xizmat taklifi. Faqat tasdiqlangan brend faktlariga tayaning va bitta aniq CTA bering.`
    : `MUHIM: bu post REKLAMA EMAS. Narx, tarif, chegirma, "hoziroq ro'yxatdan o'ting" yoki shunga
o'xshash sotuv chaqirig'i bo'lmasin. Post o'zicha foydali bo'lsin — odam hech narsa sotib olmasa ham
biror narsani o'rgansin. Brend nomi ko'pi bilan bir marta, tabiiy tarzda eslatilsin.
Rasmda ham CTA tugmasi yoki reklama shiori bo'lmasin.`;

  const { data } = await aiGenerateJson<ContentPlan>({
    tier: "smart",
    messages: [
      {
        role: "system",
        content: `Siz ${project.name} uchun tajribali Instagram content strategist va copywritersiz.
Brend ovozi: ${project.brandVoice}
Tasdiqlangan brend faktlari:
${project.brandFacts}
${project.contentThemes ? `Doimiy kontent mavzulari (asosiy manba shu):
${project.contentThemes}` : ""}
Sayt: ${project.websiteUrl ?? "ko'rsatilmagan"}

BUGUNGI KONTENT TURI: ${pillar.label}
Maqsad: ${pillar.goal}
Ssenariy talabi: ${pillar.scriptGuide}
Caption talabi: ${pillar.captionGuide}

${salesRules}

Oldingi postlar mavzusini va tuzilishini takrorlamang — yangi g'oya bering.
Hech qanday yolg'on natija, kafolat, statistika, narx yoki fakt uydirmang.
Caption auditoriya tilida (asosan o'zbekcha), tabiiy va jonli bo'lsin, 3-7 ta relevant hashtag bilan tugasin.

Image prompt ingliz tilida yozilsin. Posterda ko'rinadigan matnlarni aynan qo'shtirnoqda bering;
matnlarning o'zi auditoriya tilida bo'lsin (kerak bo'lsa arabcha so'z ham bo'lishi mumkin).
Ko'pi bilan uchta matn bloki bo'lsin va ular kontent turiga mos kelsin.
Faqat JSON: {"topic":"...","hook":"...","script":"...","caption":"...","imagePrompt":"..."}.`,
      },
      {
        role: "user",
        content: `Oxirgi postlar (takrorlamang): ${JSON.stringify(recent)}`,
      },
    ],
    maxTokens: 1_500,
  });
  if (!data) throw new Error("AI kontent rejasini qaytarmadi");
  const plan = normalizePlan(data);
  return { ...plan, imagePrompt: `${plan.imagePrompt}

${imagePromptFraming(pillar)}`.slice(0, 4_000) };
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
      size: config.ai.imageSize,
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

  // Model 4:5 o'lchamni qaytara olmaydi; rasmni Instagram feed formatiga o'zimiz keltiramiz.
  const normalized = await normalizeInstagramImage(Buffer.from(base64, "base64"));
  const imageData = normalized.data;
  const contentType = normalized.contentType;
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
    [
      { text: "🎲 Boshqa tur", callback_data: `draft:reroll:${draftId}` },
      { text: "❌ Rad etish", callback_data: `draft:reject:${draftId}` },
    ],
  ];
}

async function notifyDraft(draftId: string): Promise<void> {
  const draft = await prisma.socialContentDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: { project: true },
  });
  const publishingAccounts = await prisma.instagramAccount.count({
    where: { projectId: draft.projectId, isActive: true, publishingEnabled: true },
  });
  const targets = [
    publishingAccounts > 0 ? "Instagram" : null,
    draft.project.telegramPublishEnabled && draft.project.telegramChannelId
      ? `Telegram: ${draft.project.telegramChannelTitle ?? draft.project.telegramChannelId}`
      : null,
  ].filter(Boolean).join(" + ");
  const admins = config.telegram.adminUserIds.length
    ? config.telegram.adminUserIds
    : (config.telegram.chatId ? [config.telegram.chatId] : []);
  const caption = [
    `📝 ${draft.project.name} — ${draft.contentDate}`,
    `Tur: ${pillarLabel(draft.pillar)}`,
    `Joylanadi: ${targets || "kanal ulanmagan"}`,
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

/** Telegram menyusi uchun mavjud kontent turlari ro'yxati. */
export function contentPillarOptions(): Array<{ key: string; label: string }> {
  return CONTENT_PILLARS.map((pillar) => ({ key: pillar.key, label: pillar.label }));
}

export async function generateDailyContent(
  projectId: string,
  force = false,
  regenerateDraftId?: string,
  pillarOverride?: string | null,
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
  // Kontent turi navbat bilan tanlanadi: lenta faqat reklamadan iborat bo'lib qolmasin.
  const recentPillars = await prisma.socialContentDraft.findMany({
    where: { projectId, pillar: { not: null }, ...(regenerationTarget ? { id: { not: regenerationTarget.id } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { pillar: true },
  });
  // "auto" — qayta yaratishda ataylab boshqa tur tanlash uchun; bunda eski tur
  // eng yaqinda ishlatilgan deb hisoblanadi va qaytadan tanlanmaydi.
  const rerollPillar = pillarOverride === "auto";
  const pillarHistory = rerollPillar && regenerationTarget?.pillar
    ? [regenerationTarget.pillar, ...recentPillars.map((item) => item.pillar)]
    : recentPillars.map((item) => item.pillar);
  const pillar = selectPillar(
    pillarHistory,
    rerollPillar ? undefined : (pillarOverride ?? regenerationTarget?.pillar),
  );

  const draft = regenerationTarget
    ? await prisma.socialContentDraft.update({
        where: { id: regenerationTarget.id },
        data: {
          status: "GENERATING",
          pillar: pillar.key,
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
          pillar: pillar.key,
          status: "GENERATING",
        },
      });

  try {
    const plan = await createPlan(projectId, pillar);
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

/**
 * Telegram kanalga post. Xabar ketgandan keyin uning id'si albatta bazaga yozilishi kerak,
 * aks holda keyingi urinishda kanalga ikkinchi marta post tushadi.
 */
async function publishDraftToTelegram(
  draft: { id: string; imageUrl: string; caption: string },
  channelId: string,
): Promise<string> {
  const messageId = await sendTelegramChannelPost(channelId, draft.imageUrl, draft.caption);
  const stored = messageId ? String(messageId) : `sent-${Date.now()}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.socialContentDraft.update({
        where: { id: draft.id },
        data: { telegramMessageId: stored, telegramPostedAt: new Date() },
      });
      return stored;
    } catch (error) {
      logger.error("Telegram kanal post holati yozilmadi", error, { draftId: draft.id, attempt });
      if (attempt === 3) {
        throw new Error("Telegram kanalga post ketdi, lekin holat bazaga yozilmadi. Takroriy post bo'lmasligi uchun jarayon to'xtatildi.");
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return stored;
}

/** Kontent Instagram va/yoki Telegram kanalga joylanadi; ikkalasi ham mustaqil yoqiladi. */
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
    if (!draft.imageUrl || !draft.caption) throw new Error("Draft rasm yoki caption'siz");
    const imageUrl = draft.imageUrl;
    const caption = draft.caption;
    const project = draft.project;

    const account = draft.instagramAccount ?? await prisma.instagramAccount.findFirst({
      where: { projectId: draft.projectId, isActive: true, publishingEnabled: true },
      orderBy: { createdAt: "asc" },
    });
    const instagramTarget = account?.publishingEnabled ? account : null;
    const telegramChannelId = project.telegramPublishEnabled ? project.telegramChannelId : null;
    if (!instagramTarget && !telegramChannelId) {
      throw new Error("Loyiha uchun na Instagram publishing, na Telegram kanal yoqilgan");
    }

    // 1) Telegram kanal — bitta chaqiruv, shuning uchun birinchi bajariladi.
    let telegramMessageId = draft.telegramMessageId;
    if (telegramChannelId && !telegramMessageId) {
      telegramMessageId = await publishDraftToTelegram({ id: draft.id, imageUrl, caption }, telegramChannelId);
    }

    // 2) Instagram — konteyner yaratish, tayyor bo'lishini kutish va publish (bir necha tick).
    let instagramMediaId = draft.instagramMediaId;
    if (instagramTarget && !instagramMediaId) {
      const token = decryptSocialToken(instagramTarget.accessTokenEncrypted);

      if (!draft.instagramContainerId) {
        const container = await instagramJson<{ id: string }>(token, `${encodeURIComponent(instagramTarget.instagramUserId)}/media`, {
          method: "POST",
          body: JSON.stringify({ image_url: imageUrl, caption }),
        });
        await prisma.socialContentDraft.update({
          where: { id: draft.id },
          data: {
            status: "PUBLISHING",
            instagramAccountId: instagramTarget.id,
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

      const published = await instagramJson<{ id: string }>(token, `${encodeURIComponent(instagramTarget.instagramUserId)}/media_publish`, {
        method: "POST",
        body: JSON.stringify({ creation_id: draft.instagramContainerId }),
      });
      instagramMediaId = published.id;
    }

    await prisma.socialContentDraft.update({
      where: { id: draft.id },
      data: {
        status: "PUBLISHED",
        instagramMediaId,
        telegramMessageId,
        publishedAt: draft.publishedAt ?? new Date(),
        lastError: null,
        lockedAt: null,
        // Rasm barcha kanallarga ketib bo'ldi; bazadagi nusxa endi kerak emas.
        imageData: null,
      },
    });

    const channels = [
      instagramMediaId ? `Instagram (ID: ${instagramMediaId})` : null,
      telegramMessageId ? `Telegram: ${project.telegramChannelTitle ?? project.telegramChannelId}` : null,
    ].filter(Boolean).join(" + ");
    const admins = config.telegram.adminUserIds.length ? config.telegram.adminUserIds : [config.telegram.chatId].filter(Boolean);
    await Promise.all(admins.map((admin) => sendTelegramMessage(
      admin,
      `✅ ${project.name}: post joylandi — ${channels}`,
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

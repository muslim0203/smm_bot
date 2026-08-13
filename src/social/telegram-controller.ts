import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";
import { replyToInstagramComment, sendInstagramDm } from "../instagram/reply.js";
import { createInstagramConnectUrl } from "./instagram-oauth.js";
import {
  advanceContentPublish,
  approveContentDraft,
  generateDailyContent,
  rejectContentDraft,
} from "./content-engine.js";
import {
  answerTelegramCallback,
  isTelegramAdmin,
  sendTelegramMessage,
} from "./telegram-api.js";
import { decryptSocialToken } from "./token-crypto.js";

type TelegramUser = { id: number; username?: string };
type TelegramChat = { id: number };
type TelegramMessage = { text?: string; from?: TelegramUser; chat: TelegramChat };
type TelegramCallback = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: { chat: TelegramChat };
};
export type TelegramUpdate = { message?: TelegramMessage; callback_query?: TelegramCallback };

const HELP = `Social Control Center buyruqlari:
/projects — loyihalar ro'yxati
/newproject key | Nomi | https://sayt.uz | Tasdiqlangan brend faktlari
/select key — loyihani tanlash
/accounts — tanlangan loyiha Instagram akkauntlari
/connect — Instagram Professional akkaunt ulash
/content — bugungi ssenariy + rasmni yaratish
/queue — kontent navbati
/schedule HH:MM — kunlik kontent vaqti
/brand tasdiqlangan faktlar — loyiha faktlarini yangilash
/voice brend ohangi — AI yozuv uslubini yangilash
/status — tanlangan loyiha holati
/help — yordam

Xavfsizlik: Instagram tokenini Telegram chatga yubormang. /connect bergan OAuth havolasidan foydalaning.`;

async function selectedProject(telegramUserId: string) {
  const session = await prisma.telegramSocialSession.findUnique({
    where: { telegramUserId },
    include: { selectedProject: true },
  });
  return session?.selectedProject ?? null;
}

async function selectProject(telegramUserId: string, projectId: string): Promise<void> {
  await prisma.telegramSocialSession.upsert({
    where: { telegramUserId },
    create: { telegramUserId, selectedProjectId: projectId },
    update: { selectedProjectId: projectId },
  });
}

async function showProjects(chatId: string): Promise<void> {
  const projects = await prisma.socialProject.findMany({
    where: { isActive: true },
    include: { _count: { select: { instagramAccounts: true, contentDrafts: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!projects.length) {
    await sendTelegramMessage(chatId, `Hali loyiha yo'q.\n\n${HELP}`);
    return;
  }
  await sendTelegramMessage(
    chatId,
    projects.map((project) => `• ${project.name} (${project.key}) — ${project._count.instagramAccounts} IG, ${project._count.contentDrafts} kontent`).join("\n"),
    projects.map((project) => [{ text: `📁 ${project.name}`, callback_data: `project:select:${project.id}` }]),
  );
}

async function showProject(chatId: string, projectId: string): Promise<void> {
  const project = await prisma.socialProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { instagramAccounts: { where: { isActive: true } } },
  });
  const accounts = project.instagramAccounts.length
    ? project.instagramAccounts.map((account) => `@${account.username ?? account.label}: DM ${account.dmRepliesEnabled ? "ON" : "OFF"}, comment ${account.commentRepliesEnabled ? "ON" : "OFF"}, post ${account.publishingEnabled ? "ON" : "OFF"}`).join("\n")
    : "Instagram ulanmagan";
  await sendTelegramMessage(chatId, [
    `📁 ${project.name} (${project.key})`,
    `Sayt: ${project.websiteUrl ?? "—"}`,
    `Kunlik kontent: ${project.contentEnabled ? `ON, ${String(project.dailyContentHour).padStart(2, "0")}:${String(project.dailyContentMinute).padStart(2, "0")}` : "OFF"}`,
    `Approval: ${project.contentApprovalRequired ? "kerak" : "kerak emas"}`,
    `Auto publish: ${project.autoPublishEnabled ? "ON" : "OFF"}`,
    "",
    accounts,
  ].join("\n"), [
    [{ text: "🔗 Instagram ulash", callback_data: `project:connect:${project.id}` }],
    [
      { text: "✨ Kontent yaratish", callback_data: `project:generate:${project.id}` },
      { text: project.contentEnabled ? "⏸ Kunlik kontent OFF" : "▶️ Kunlik kontent ON", callback_data: `project:content:${project.id}` },
    ],
    [{ text: project.autoPublishEnabled ? "🛑 Auto publish OFF" : "⚠️ Auto publish sozlash", callback_data: `project:auto:${project.id}` }],
    [{ text: "📱 Akkauntlar", callback_data: `project:accounts:${project.id}` }],
  ]);
}

async function showAccounts(chatId: string, projectId: string): Promise<void> {
  const accounts = await prisma.instagramAccount.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!accounts.length) {
    await sendTelegramMessage(chatId, "Instagram akkaunt ulanmagan. /connect buyrug'idan foydalaning.");
    return;
  }
  for (const account of accounts) {
    await sendTelegramMessage(chatId, `${account.label}\nToken: ${account.tokenExpiresAt ? account.tokenExpiresAt.toISOString().slice(0, 10) + " gacha" : "muddati noma'lum"}`, [
      [
        { text: `DM ${account.dmRepliesEnabled ? "ON" : "OFF"}`, callback_data: `account:dm:${account.id}` },
        { text: `Comment ${account.commentRepliesEnabled ? "ON" : "OFF"}`, callback_data: `account:comment:${account.id}` },
      ],
      [{ text: `Post ${account.publishingEnabled ? "ON" : "OFF"}`, callback_data: `account:publish:${account.id}` }],
    ]);
  }
}

async function showQueue(chatId: string, projectId: string): Promise<void> {
  const drafts = await prisma.socialContentDraft.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  await sendTelegramMessage(chatId, drafts.length
    ? drafts.map((draft) => `${draft.contentDate} — ${draft.status} — ${draft.topic ?? "mavzu yo'q"}`).join("\n")
    : "Kontent navbati bo'sh.");
}

async function handleCommand(message: TelegramMessage): Promise<void> {
  const telegramUserId = String(message.from!.id);
  const chatId = String(message.chat.id);
  const raw = message.text?.trim() ?? "";
  const session = await prisma.telegramSocialSession.findUnique({ where: { telegramUserId } });
  if (session?.pendingAction === "REPLY_INBOX" && session.pendingEntityId && !raw.startsWith("/")) {
    const event = await prisma.instagramInboxEvent.findUnique({
      where: { id: session.pendingEntityId },
      include: { account: true },
    });
    if (!event) {
      await prisma.telegramSocialSession.update({
        where: { telegramUserId },
        data: { pendingAction: null, pendingEntityId: null },
      });
      await sendTelegramMessage(chatId, "Murojaat topilmadi.");
      return;
    }
    const credential = event.account
      ? { instagramUserId: event.account.instagramUserId, accessToken: decryptSocialToken(event.account.accessTokenEncrypted) }
      : { instagramUserId: config.instagram.userId, accessToken: config.instagram.accessToken };
    if (event.eventType === "COMMENT") await replyToInstagramComment(event.objectId, raw, credential);
    else await sendInstagramDm(event.senderId, raw, credential);
    await prisma.$transaction([
      prisma.instagramInboxEvent.update({
        where: { id: event.id },
        data: { status: "REPLIED", replyText: raw.slice(0, 2_000), processedAt: new Date(), lastError: null },
      }),
      prisma.telegramSocialSession.update({
        where: { telegramUserId },
        data: { pendingAction: null, pendingEntityId: null },
      }),
    ]);
    await sendTelegramMessage(chatId, "✅ Javob Instagram'ga yuborildi.");
    return;
  }
  const [commandRaw, ...args] = raw.split(/\s+/);
  const command = commandRaw.toLowerCase().split("@")[0];

  if (command === "/cancel") {
    await prisma.telegramSocialSession.upsert({
      where: { telegramUserId },
      create: { telegramUserId },
      update: { pendingAction: null, pendingEntityId: null },
    });
    await sendTelegramMessage(chatId, "Bekor qilindi.");
    return;
  }

  if (command === "/start" || command === "/help") {
    await sendTelegramMessage(chatId, HELP, [[{ text: "📁 Loyihalar", callback_data: "menu:projects" }]]);
    return;
  }
  if (command === "/projects") return showProjects(chatId);

  if (command === "/newproject") {
    const input = raw.slice(commandRaw.length).trim().split("|").map((value) => value.trim());
    const [key, name, websiteUrl] = input;
    const brandFacts = input.slice(3).join(" | ").trim();
    if (!key || !name || !brandFacts || !/^[a-z0-9][a-z0-9_-]{1,30}$/.test(key)) {
      await sendTelegramMessage(chatId, "Format: /newproject key | Loyiha nomi | https://sayt.uz | Tasdiqlangan brend faktlari\nKey: kichik lotin harflari/raqam, 2-31 belgi.");
      return;
    }
    const project = await prisma.socialProject.create({
      data: { key, name, websiteUrl: websiteUrl || null, brandFacts },
    });
    await selectProject(telegramUserId, project.id);
    await sendTelegramMessage(chatId, `✅ ${project.name} yaratildi va tanlandi.`);
    return showProject(chatId, project.id);
  }

  if (command === "/select") {
    const key = args[0];
    const project = key ? await prisma.socialProject.findUnique({ where: { key } }) : null;
    if (!project) return sendTelegramMessage(chatId, "Loyiha topilmadi. /projects orqali ro'yxatni ko'ring.");
    await selectProject(telegramUserId, project.id);
    return showProject(chatId, project.id);
  }

  const project = await selectedProject(telegramUserId);
  if (!project) {
    await sendTelegramMessage(chatId, "Avval /projects orqali loyiha tanlang yoki /newproject bilan yarating.");
    return;
  }
  if (command === "/status") return showProject(chatId, project.id);
  if (command === "/accounts") return showAccounts(chatId, project.id);
  if (command === "/queue") return showQueue(chatId, project.id);
  if (command === "/schedule") {
    const match = args[0]?.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) return sendTelegramMessage(chatId, "Format: /schedule 09:30");
    await prisma.socialProject.update({
      where: { id: project.id },
      data: { dailyContentHour: Number(match[1]), dailyContentMinute: Number(match[2]), contentEnabled: true },
    });
    return sendTelegramMessage(chatId, `✅ Kunlik kontent vaqti ${match[1].padStart(2, "0")}:${match[2]} ga o'rnatildi (${project.timezone}).`);
  }
  if (command === "/brand") {
    const facts = raw.slice(commandRaw.length).trim();
    if (facts.length < 20) return sendTelegramMessage(chatId, "Kamida 20 belgili tasdiqlangan faktlarni kiriting. Masalan: /brand Mahsulot..., narx..., sayt...");
    await prisma.socialProject.update({ where: { id: project.id }, data: { brandFacts: facts.slice(0, 10_000) } });
    return sendTelegramMessage(chatId, "✅ Loyiha faktlari yangilandi.");
  }
  if (command === "/voice") {
    const voice = raw.slice(commandRaw.length).trim();
    if (voice.length < 5) return sendTelegramMessage(chatId, "Masalan: /voice Samimiy, ekspert, qisqa va o'zbekcha");
    await prisma.socialProject.update({ where: { id: project.id }, data: { brandVoice: voice.slice(0, 1_000) } });
    return sendTelegramMessage(chatId, "✅ Brend ohangi yangilandi.");
  }
  if (command === "/connect") {
    const url = await createInstagramConnectUrl(project.id, telegramUserId);
    return sendTelegramMessage(chatId, `${project.name} uchun Instagram Professional akkauntni xavfsiz OAuth orqali ulang. Havola 15 daqiqa amal qiladi.`, [[{ text: "Instagram ulash", url }]]);
  }
  if (command === "/content") {
    await sendTelegramMessage(chatId, "⏳ Ssenariy va rasm yaratilmoqda. Tayyor bo'lganda approval kartasi keladi.");
    void generateDailyContent(project.id, true).catch((error) => sendTelegramMessage(chatId, `❌ Kontent yaratilmadi: ${error instanceof Error ? error.message : String(error)}`));
    return;
  }
  await sendTelegramMessage(chatId, HELP);
}

async function handleCallback(callback: TelegramCallback): Promise<void> {
  const telegramUserId = String(callback.from.id);
  const chatId = String(callback.message?.chat.id ?? callback.from.id);
  const data = callback.data ?? "";
  await answerTelegramCallback(callback.id);

  if (data === "menu:projects") return showProjects(chatId);
  const [entity, action, id] = data.split(":");
  if (!entity || !action || !id) return;

  if (entity === "project") {
    const project = await prisma.socialProject.findUnique({ where: { id } });
    if (!project) return sendTelegramMessage(chatId, "Loyiha topilmadi.");
    await selectProject(telegramUserId, id);
    if (action === "select") return showProject(chatId, id);
    if (action === "connect") {
      const url = await createInstagramConnectUrl(id, telegramUserId);
      return sendTelegramMessage(chatId, `${project.name} uchun OAuth havola 15 daqiqa amal qiladi.`, [[{ text: "Instagram ulash", url }]]);
    }
    if (action === "generate") {
      await sendTelegramMessage(chatId, "⏳ Kontent yaratilmoqda...");
      void generateDailyContent(id, true).catch((error) => sendTelegramMessage(chatId, `❌ ${error instanceof Error ? error.message : String(error)}`));
      return;
    }
    if (action === "content") {
      await prisma.socialProject.update({ where: { id }, data: { contentEnabled: !project.contentEnabled } });
      return showProject(chatId, id);
    }
    if (action === "accounts") return showAccounts(chatId, id);
    if (action === "auto") {
      if (project.autoPublishEnabled) {
        await prisma.socialProject.update({ where: { id }, data: { autoPublishEnabled: false, contentApprovalRequired: true } });
        return showProject(chatId, id);
      }
      return sendTelegramMessage(chatId, "⚠️ Auto publish tasdiqsiz post joylaydi va OpenAI/Meta xarajatini keltiradi. Yoqilsinmi?", [[
        { text: "Ha, yoqish", callback_data: `project:autoconfirm:${id}` },
        { text: "Bekor qilish", callback_data: `project:select:${id}` },
      ]]);
    }
    if (action === "autoconfirm") {
      await prisma.socialProject.update({ where: { id }, data: { autoPublishEnabled: true, contentApprovalRequired: false, contentEnabled: true } });
      return showProject(chatId, id);
    }
  }

  if (entity === "account") {
    const account = await prisma.instagramAccount.findUnique({ where: { id } });
    if (!account) return sendTelegramMessage(chatId, "Akkaunt topilmadi.");
    if (action === "dm") await prisma.instagramAccount.update({ where: { id }, data: { dmRepliesEnabled: !account.dmRepliesEnabled } });
    if (action === "comment") await prisma.instagramAccount.update({ where: { id }, data: { commentRepliesEnabled: !account.commentRepliesEnabled } });
    if (action === "publish") {
      if (account.publishingEnabled) {
        await prisma.instagramAccount.update({ where: { id }, data: { publishingEnabled: false } });
      } else {
        return sendTelegramMessage(chatId, `⚠️ ${account.label} akkauntiga post joylash huquqi yoqilsinmi?`, [[
          { text: "Ha, yoqish", callback_data: `account:publishconfirm:${id}` },
          { text: "Bekor qilish", callback_data: `project:accounts:${account.projectId}` },
        ]]);
      }
    }
    if (action === "publishconfirm") await prisma.instagramAccount.update({ where: { id }, data: { publishingEnabled: true } });
    return showAccounts(chatId, account.projectId);
  }

  if (entity === "draft") {
    const draft = await prisma.socialContentDraft.findUnique({ where: { id }, include: { project: true } });
    if (!draft) return sendTelegramMessage(chatId, "Draft topilmadi.");
    if (action === "approve") {
      await approveContentDraft(id, telegramUserId);
      await sendTelegramMessage(chatId, `✅ ${draft.project.name} kontenti tasdiqlandi. Publish jarayoni boshlandi.`);
      void advanceContentPublish(id).catch((error) => sendTelegramMessage(chatId, `❌ Publish xatosi: ${error instanceof Error ? error.message : String(error)}`));
      return;
    }
    if (action === "reject") {
      await rejectContentDraft(id);
      return sendTelegramMessage(chatId, `❌ ${draft.project.name} kontenti rad etildi.`);
    }
    if (action === "regen") {
      await sendTelegramMessage(chatId, "🔄 Kontent qayta yaratilmoqda...");
      void generateDailyContent(draft.projectId, true).catch((error) => sendTelegramMessage(chatId, `❌ ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  if (entity === "inbox") {
    const event = await prisma.instagramInboxEvent.findUnique({ where: { id } });
    if (!event) return sendTelegramMessage(chatId, "Murojaat topilmadi.");
    if (action === "close") {
      await prisma.instagramInboxEvent.update({ where: { id }, data: { status: "IGNORED", processedAt: new Date() } });
      return sendTelegramMessage(chatId, "Murojaat yopildi.");
    }
    if (action === "reply") {
      await prisma.telegramSocialSession.upsert({
        where: { telegramUserId },
        create: { telegramUserId, pendingAction: "REPLY_INBOX", pendingEntityId: id },
        update: { pendingAction: "REPLY_INBOX", pendingEntityId: id },
      });
      return sendTelegramMessage(chatId, "Keyingi oddiy xabaringiz Instagram foydalanuvchisiga javob sifatida yuboriladi. Bekor qilish uchun /cancel yozing.");
    }
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const user = update.message?.from ?? update.callback_query?.from;
  const chatId = String(update.message?.chat.id ?? update.callback_query?.message?.chat.id ?? user?.id ?? "");
  if (!user || !isTelegramAdmin(String(user.id))) {
    if (chatId) await sendTelegramMessage(chatId, "Bu boshqaruv botiga kirish ruxsati yo'q.").catch(() => undefined);
    return;
  }

  try {
    if (update.message?.text) await handleCommand(update.message);
    else if (update.callback_query) await handleCallback(update.callback_query);
  } catch (error) {
    logger.error("Telegram social controller xatosi", error, { telegramUserId: user.id });
    await sendTelegramMessage(chatId, `❌ Xato: ${error instanceof Error ? error.message.slice(0, 700) : String(error)}`).catch(() => undefined);
  }
}

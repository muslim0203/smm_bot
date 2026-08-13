import crypto from "crypto";
import type { Request, Response } from "express";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { encryptSocialToken, hashOAuthState } from "./token-crypto.js";
import { sendTelegramMessage } from "./telegram-api.js";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
];

function assertOAuthConfigured(): void {
  if (!config.instagram.appId || !config.instagram.appSecret) {
    throw new Error("INSTAGRAM_APP_ID yoki INSTAGRAM_APP_SECRET sozlanmagan");
  }
  if (config.instagram.tokenEncryptionKey.length < 32) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY sozlanmagan");
  }
}

export async function createInstagramConnectUrl(projectId: string, telegramUserId: string): Promise<string> {
  assertOAuthConfigured();
  const state = crypto.randomBytes(32).toString("base64url");
  await prisma.instagramOAuthState.create({
    data: {
      projectId,
      telegramUserId,
      stateHash: hashOAuthState(state),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  url.searchParams.set("client_id", config.instagram.appId);
  url.searchParams.set("redirect_uri", config.instagram.oauthRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = { access_token: string; user_id?: string; expires_in?: number };
type ProfileResponse = { id?: string; user_id?: string; username?: string };

async function responseJson<T>(response: globalThis.Response, label: string): Promise<T> {
  const raw = await response.text();
  if (!response.ok) throw new Error(`${label} ${response.status}: ${raw.slice(0, 500)}`);
  return JSON.parse(raw) as T;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: config.instagram.appId,
    client_secret: config.instagram.appSecret,
    grant_type: "authorization_code",
    redirect_uri: config.instagram.oauthRedirectUri,
    code: code.replace(/#_$/, ""),
  });
  return responseJson<TokenResponse>(await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }), "Instagram OAuth");
}

async function exchangeLongLived(shortToken: string): Promise<TokenResponse> {
  const url = new URL(`${config.instagram.graphBaseUrl}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", config.instagram.appSecret);
  url.searchParams.set("access_token", shortToken);
  return responseJson<TokenResponse>(await fetch(url), "Instagram long-lived token");
}

async function profile(token: string): Promise<ProfileResponse> {
  const url = new URL(`${config.instagram.graphBaseUrl}/${config.instagram.apiVersion}/me`);
  url.searchParams.set("fields", "id,user_id,username");
  return responseJson<ProfileResponse>(await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }), "Instagram profile");
}

async function subscribeWebhooks(instagramUserId: string, token: string): Promise<void> {
  const url = `${config.instagram.graphBaseUrl}/${config.instagram.apiVersion}/${encodeURIComponent(instagramUserId)}/subscribed_apps`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subscribed_fields: ["messages", "comments"] }),
  });
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Webhook subscribe ${response.status}: ${raw.slice(0, 400)}`);
  }
}

export async function handleInstagramOAuthCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !state) {
    res.status(400).send("Instagram ulanish kodi yoki state topilmadi.");
    return;
  }

  const oauthState = await prisma.instagramOAuthState.findUnique({
    where: { stateHash: hashOAuthState(state) },
    include: { project: true },
  });
  if (!oauthState || oauthState.usedAt || oauthState.expiresAt <= new Date()) {
    res.status(400).send("Ulanish havolasi eskirgan yoki ishlatilgan. Telegram botdan yangisini oling.");
    return;
  }

  await prisma.instagramOAuthState.update({ where: { id: oauthState.id }, data: { usedAt: new Date() } });

  try {
    const short = await exchangeCode(code);
    let token = short.access_token;
    let expiresIn = short.expires_in;
    try {
      const long = await exchangeLongLived(short.access_token);
      token = long.access_token;
      expiresIn = long.expires_in;
    } catch (error) {
      logger.warn("Instagram long-lived token olinmadi; short token saqlandi", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const info = await profile(token);
    const instagramUserId = info.user_id ?? info.id ?? short.user_id;
    if (!instagramUserId) throw new Error("Instagram Professional account ID qaytmadi");
    const username = info.username;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    const account = await prisma.instagramAccount.upsert({
      where: { instagramUserId },
      create: {
        projectId: oauthState.projectId,
        label: username ? `@${username}` : instagramUserId,
        username,
        instagramUserId,
        accessTokenEncrypted: encryptSocialToken(token),
        tokenExpiresAt,
      },
      update: {
        projectId: oauthState.projectId,
        label: username ? `@${username}` : instagramUserId,
        username,
        accessTokenEncrypted: encryptSocialToken(token),
        tokenExpiresAt,
        tokenWarningSentAt: null,
        isActive: true,
      },
    });

    let webhookReady = true;
    try {
      await subscribeWebhooks(instagramUserId, token);
    } catch (error) {
      webhookReady = false;
      logger.error("Instagram akkaunt webhookga subscribe bo'lmadi", error, { accountId: account.id });
    }

    await sendTelegramMessage(oauthState.telegramUserId, [
      `✅ ${oauthState.project.name} loyihasiga ${username ? `@${username}` : instagramUserId} ulandi.`,
      webhookReady ? "DM va komment webhooklari ulandi." : "⚠️ Akkaunt saqlandi, ammo webhook subscriptionni Meta Dashboard'da tekshiring.",
      "Post chiqarish xavfsizlik uchun alohida yoqiladi.",
    ].join("\n"));

    res.status(200).send("Instagram akkaunt muvaffaqiyatli ulandi. Telegram botga qaytishingiz mumkin.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Instagram OAuth callback xatosi", error, { projectId: oauthState.projectId });
    await sendTelegramMessage(oauthState.telegramUserId, `❌ Instagram ulanmadi: ${message.slice(0, 500)}`).catch(() => undefined);
    res.status(500).send("Instagram akkauntni ulashda xato. Tafsilot Telegram botga yuborildi.");
  }
}

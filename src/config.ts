const env = process.env;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: positiveInt(env.PORT, 3000),
  nodeEnv: env.NODE_ENV ?? "development",
  databaseUrl: env.DATABASE_URL ?? "",
  backendUrl: env.BACKEND_URL ?? "http://localhost:3000",
  frontendUrl: env.DEFAULT_WEBSITE_URL ?? "",
  corsOrigins: (env.CORS_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  openaiApiKey: env.OPENAI_API_KEY ?? "",
  ai: {
    fastModel: env.AI_OPENAI_FAST_MODEL ?? env.AI_OPENAI_MODEL ?? "gpt-5.6-luna",
    smartModel: env.AI_OPENAI_SMART_MODEL ?? "gpt-5.6-terra",
    imageModel: env.AI_IMAGE_MODEL ?? "gpt-image-2",
    imageQuality: env.AI_IMAGE_QUALITY ?? "medium",
    timeoutMs: positiveInt(env.AI_TIMEOUT_MS, 45_000),
    maxOutputTokens: positiveInt(env.AI_MAX_OUTPUT_TOKENS, 8_192),
  },
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
    region: env.AWS_REGION ?? "us-east-1",
    s3Bucket: env.AWS_S3_BUCKET ?? "",
    endpoint: env.AWS_ENDPOINT ?? "",
  },
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: env.TELEGRAM_CHAT_ID ?? "",
    adminUserIds: (env.TELEGRAM_ADMIN_USER_IDS ?? env.TELEGRAM_CHAT_ID ?? "")
      .split(",").map((value) => value.trim()).filter(Boolean),
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET ?? "",
  },
  instagram: {
    enabled: env.INSTAGRAM_AUTOREPLY_ENABLED === "true",
    accessToken: env.INSTAGRAM_ACCESS_TOKEN ?? "",
    appId: env.INSTAGRAM_APP_ID ?? "",
    appSecret: env.INSTAGRAM_APP_SECRET ?? "",
    verifyToken: env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? "",
    userId: env.INSTAGRAM_USER_ID ?? "",
    graphBaseUrl: (env.INSTAGRAM_GRAPH_BASE_URL ?? "https://graph.instagram.com").replace(/\/+$/, ""),
    apiVersion: env.INSTAGRAM_API_VERSION ?? "v24.0",
    dmRepliesEnabled: env.INSTAGRAM_DM_AUTOREPLY_ENABLED !== "false",
    commentRepliesEnabled: env.INSTAGRAM_COMMENT_AUTOREPLY_ENABLED !== "false",
    workerIntervalMs: positiveInt(env.INSTAGRAM_WORKER_INTERVAL_MS, 5_000),
    workerBatchSize: positiveInt(env.INSTAGRAM_WORKER_BATCH_SIZE, 5),
    maxAttempts: positiveInt(env.INSTAGRAM_WORKER_MAX_ATTEMPTS, 3),
    retentionDays: positiveInt(env.INSTAGRAM_EVENT_RETENTION_DAYS, 90),
    oauthRedirectUri: env.INSTAGRAM_OAUTH_REDIRECT_URI ?? `${env.BACKEND_URL ?? "http://localhost:3000"}/api/instagram/oauth/callback`,
    tokenEncryptionKey: env.SOCIAL_TOKEN_ENCRYPTION_KEY ?? "",
    contentWorkerIntervalMs: positiveInt(env.SOCIAL_CONTENT_WORKER_INTERVAL_MS, 60_000),
  },
} as const;

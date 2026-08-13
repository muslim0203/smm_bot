import "dotenv/config";
import "express-async-errors";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config.js";
import { startInstagramWorker } from "./instagram/worker.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { instagramRoutes } from "./routes/instagram.js";
import { legalRoutes } from "./routes/legal.js";
import { socialControlRoutes } from "./routes/social-control.js";
import { startSocialContentWorker } from "./social/content-engine.js";
import { configureTelegramWebhook } from "./social/telegram-api.js";

function validateConfiguration(): void {
  if (!config.databaseUrl) throw new Error("DATABASE_URL sozlanmagan");
  if (config.instagram.enabled) {
    if (!config.instagram.appSecret || !config.instagram.verifyToken) {
      throw new Error("Instagram yoqilgan, lekin APP_SECRET yoki WEBHOOK_VERIFY_TOKEN yo'q");
    }
    if (config.instagram.tokenEncryptionKey.length < 32) {
      throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY kamida 32 belgili bo'lishi kerak");
    }
  }
}

validateConfiguration();

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins.length ? config.corsOrigins : false,
}));
app.use(express.json({
  limit: "1mb",
  verify: (request, _response, buffer) => {
    (request as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-8" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "smm-bot", timestamp: new Date().toISOString() });
});
app.use(legalRoutes);
app.use("/api/instagram", instagramRoutes);
app.use("/api/social", socialControlRoutes);

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  logger.error("API xatosi", error);
  response.status(500).json({ message: config.nodeEnv === "development" ? error.message : "Internal Server Error" });
});

const server = app.listen(config.port, () => {
  logger.info(`SMM Bot API http://localhost:${config.port} da ishga tushdi`);
  startInstagramWorker();
  startSocialContentWorker();
  void configureTelegramWebhook().catch((error) => logger.error("Telegram webhook sozlanmadi", error));
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal}: servis to'xtatilmoqda`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

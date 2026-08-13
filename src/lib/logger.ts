import { config } from "../config.js";

type Level = "info" | "warn" | "error";
const isProd = config.nodeEnv === "production";

function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  const time = new Date().toISOString();
  if (isProd) {
    const line = JSON.stringify({ time, level, message, ...meta });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }
  const suffix = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  const line = `[${time}] ${level.toUpperCase()} ${message}${suffix}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    const details: Record<string, unknown> = { ...meta };
    if (error instanceof Error) details.error = error.message;
    else if (error !== undefined) details.error = String(error);
    log("error", message, details);
  },
};

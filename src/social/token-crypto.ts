import crypto from "crypto";
import { config } from "../config.js";

const PREFIX = "v1";

function encryptionKey(): Buffer {
  const secret = config.instagram.tokenEncryptionKey;
  if (secret.length < 32) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY kamida 32 belgidan iborat bo'lishi kerak");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSocialToken(token: string): string {
  if (!token) throw new Error("Bo'sh tokenni shifrlab bo'lmaydi");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSocialToken(value: string): string {
  const [prefix, ivValue, tagValue, encryptedValue] = value.split(".");
  if (prefix !== PREFIX || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Shifrlangan Instagram token formati noto'g'ri");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashOAuthState(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

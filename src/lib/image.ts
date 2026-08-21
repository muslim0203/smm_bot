import sharp from "sharp";
import { config } from "../config.js";
import { logger } from "./logger.js";

export type NormalizedImage = {
  data: Buffer;
  contentType: string;
  width: number;
  height: number;
};

const DEFAULT_OUTPUT = { width: 1_080, height: 1_350 };

function parseSize(value: string, fallback: { width: number; height: number }) {
  const match = /^(\d{3,5})x(\d{3,5})$/.exec(value.trim().toLowerCase());
  if (!match) return fallback;
  return { width: Number(match[1]), height: Number(match[2]) };
}

/** Instagram feed uchun yakuniy o'lcham (default 1080x1350 = 4:5). */
export function instagramOutputSize(): { width: number; height: number } {
  return parseSize(config.ai.imageOutputSize, DEFAULT_OUTPUT);
}

/**
 * Rasm generatorlari 4:5 o'lchamni qo'llab-quvvatlamaydi (gpt-image faqat 1:1, 2:3 va 3:2 beradi),
 * shuning uchun natija Instagram feed talabiga (4:5, 1080x1350) markazdan qirqib moslashtiriladi.
 * Aks holda Instagram rasmni o'zi kesadi va posterdagi matnning bir qismi yo'qoladi.
 */
export async function normalizeInstagramImage(input: Buffer): Promise<NormalizedImage> {
  const { width, height } = instagramOutputSize();
  try {
    const data = await sharp(input)
      .rotate()
      .resize({ width, height, fit: "cover", position: "centre" })
      .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
      .toBuffer();
    return { data, contentType: "image/jpeg", width, height };
  } catch (error) {
    // Rasm generatsiyasi butunlay to'xtab qolmasin: xom rasm ham publish qilinadi.
    logger.error("Rasmni Instagram o'lchamiga moslashtirib bo'lmadi", error);
    return { data: input, contentType: "image/jpeg", width: 0, height: 0 };
  }
}

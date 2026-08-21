import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeInstagramImage } from "../src/lib/image.js";

describe("Instagram rasm o'lchami", () => {
  it("2:3 rasmni 4:5 (1080x1350) formatga keltiradi", async () => {
    const source = await sharp({
      create: { width: 1_024, height: 1_536, channels: 3, background: { r: 20, g: 60, b: 120 } },
    }).jpeg().toBuffer();

    const normalized = await normalizeInstagramImage(source);
    const meta = await sharp(normalized.data).metadata();

    expect(normalized.contentType).toBe("image/jpeg");
    expect(meta.width).toBe(1_080);
    expect(meta.height).toBe(1_350);
    // Instagram feed 0.8 (4:5) dan 1.91 gacha nisbatni qabul qiladi.
    expect((meta.width ?? 0) / (meta.height ?? 1)).toBeCloseTo(0.8, 3);
  });

  it("buzilgan rasmda xato bermay, xom ma'lumotni qaytaradi", async () => {
    const broken = Buffer.from("bu rasm emas");
    const normalized = await normalizeInstagramImage(broken);
    expect(normalized.data).toEqual(broken);
  });
});

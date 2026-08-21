import { describe, expect, it } from "vitest";
import { CONTENT_PILLARS, PROMO_EVERY, selectPillar } from "../src/social/content-pillars.js";

describe("Kontent ustunlari", () => {
  it("ketma-ket kunlarda bir xil turni takrorlamaydi", () => {
    const history: string[] = [];
    for (let day = 0; day < 12; day += 1) {
      const pillar = selectPillar([...history].reverse());
      history.push(pillar.key);
    }
    for (let index = 1; index < history.length; index += 1) {
      expect(history[index]).not.toBe(history[index - 1]);
    }
    expect(new Set(history).size).toBeGreaterThanOrEqual(6);
  });

  it("reklamani PROMO_EVERY oralig'ida ko'pi bilan bir marta beradi", () => {
    const history: string[] = [];
    for (let day = 0; day < 24; day += 1) {
      history.push(selectPillar([...history].reverse()).key);
    }
    const promoCount = history.filter((key) => key === "promo").length;
    expect(promoCount).toBeGreaterThan(0);
    expect(promoCount).toBeLessThanOrEqual(Math.ceil(history.length / PROMO_EVERY));

    for (let index = 0; index < history.length; index += 1) {
      if (history[index] !== "promo") continue;
      expect(history.slice(index + 1, index + PROMO_EVERY)).not.toContain("promo");
    }
  });

  it("so'ralgan turni majburiy tanlaydi", () => {
    expect(selectPillar([], "quiz").key).toBe("quiz");
    expect(selectPillar([], "mavjud-emas").key).not.toBe("mavjud-emas");
  });

  it("har bir ustun uchun to'liq ko'rsatma bor", () => {
    for (const pillar of CONTENT_PILLARS) {
      expect(pillar.goal.length).toBeGreaterThan(10);
      expect(pillar.scriptGuide.length).toBeGreaterThan(10);
      expect(pillar.captionGuide.length).toBeGreaterThan(10);
      expect(pillar.imageStyle.length).toBeGreaterThan(10);
    }
    expect(CONTENT_PILLARS.filter((pillar) => pillar.promotional)).toHaveLength(1);
  });
});

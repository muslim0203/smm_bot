import { describe, expect, it } from "vitest";
import { matchKeywordTrigger, normalizeKeyword } from "../src/instagram/keyword.js";

describe("Instagram kalit so'z triggeri", () => {
  const triggers = [{ keyword: "MAQOLA" }, { keyword: "KITOB" }];

  it("katta-kichik harf, tinish belgisi va kirillni bir xil ko'radi", () => {
    for (const comment of ["MAQOLA", "maqola", "Maqola!", "мақола", "МАҚОЛА 🙏", "maqola, iltimos"]) {
      expect(matchKeywordTrigger(comment, triggers)?.keyword).toBe("MAQOLA");
    }
    expect(matchKeywordTrigger("Kitob", triggers)?.keyword).toBe("KITOB");
  });

  it("so'z boshqa so'z ichida bo'lsa mos kelmaydi", () => {
    expect(matchKeywordTrigger("maqolalar qachon chiqadi?", triggers)).toBeUndefined();
    expect(matchKeywordTrigger("zo'r post", triggers)).toBeUndefined();
  });

  it("o' va g' belgilarini olib tashlaydi", () => {
    expect(normalizeKeyword("Qo‘llanma")).toBe("qollanma");
    expect(normalizeKeyword("қўлланма")).toBe("qollanma");
  });
});

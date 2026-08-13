import { describe, expect, it } from "vitest";
import { selectReplyModelTier } from "../src/lib/ai-client.js";

describe("AI model routing", () => {
  it("routes short FAQ messages to the fast model", () => {
    expect(selectReplyModelTier("Narxi qancha?")).toBe("fast");
    expect(selectReplyModelTier("Salom, ro'yxatdan qanday o'taman?")).toBe("fast");
  });

  it("routes analytical requests to the smart model", () => {
    expect(selectReplyModelTier("Mening natijalarimni batafsil tahlil qilib, individual reja tuzib bering"))
      .toBe("smart");
    expect(selectReplyModelTier("Сравните тарифы и составьте подробный план подготовки"))
      .toBe("smart");
    expect(selectReplyModelTier("حلل مستواي واكتب خطة بالتفصيل"))
      .toBe("smart");
  });

  it("routes long or context-heavy conversations to the smart model", () => {
    expect(selectReplyModelTier("Oddiy davomiy savol", 4)).toBe("smart");
    expect(selectReplyModelTier(`${"savol ".repeat(60)}?`)).toBe("smart");
  });
});

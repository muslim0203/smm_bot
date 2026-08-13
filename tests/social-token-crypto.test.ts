import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = "test-social-token-key-with-more-than-32-characters";
});

describe("social token encryption", () => {
  it("tokenni ochiq matnda saqlamaydi va qayta ochadi", async () => {
    const { decryptSocialToken, encryptSocialToken } = await import("../src/social/token-crypto.js");
    const token = "IGQVJ-test-secret-token";
    const encrypted = encryptSocialToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptSocialToken(encrypted)).toBe(token);
  });

  it("o'zgartirilgan ciphertextni rad etadi", async () => {
    const { decryptSocialToken, encryptSocialToken } = await import("../src/social/token-crypto.js");
    const encrypted = encryptSocialToken("secret");
    expect(() => decryptSocialToken(encrypted.slice(0, -1) + "A")).toThrow();
  });
});

import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignedRequest } from "../src/instagram/signed-request.js";

function signedRequest(payload: Record<string, unknown>, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${signature}.${encodedPayload}`;
}

describe("Meta signed_request", () => {
  it("to'g'ri HMAC-SHA256 so'rovini qabul qiladi", () => {
    const value = signedRequest({ algorithm: "HMAC-SHA256", user_id: "1784" }, "meta-secret");
    expect(verifyMetaSignedRequest(value, "meta-secret").user_id).toBe("1784");
  });

  it("o'zgartirilgan yoki noto'g'ri imzoni rad etadi", () => {
    const value = signedRequest({ user_id: "1784" }, "meta-secret");
    expect(() => verifyMetaSignedRequest(value, "wrong-secret")).toThrow("imzosi noto'g'ri");
    expect(() => verifyMetaSignedRequest(`${value}x`, "meta-secret")).toThrow();
  });
});

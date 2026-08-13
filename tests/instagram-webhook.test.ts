import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { parseInstagramWebhook, verifyInstagramSignature } from "../src/instagram/webhook.js";

describe("Instagram webhook", () => {
  it("to'g'ri HMAC imzoni qabul qiladi", () => {
    const secret = "meta_app_secret_test";
    const raw = Buffer.from('{"object":"instagram"}');
    const signature = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
    expect(verifyInstagramSignature(raw, signature, secret)).toBe(true);
    expect(verifyInstagramSignature(raw, "sha256=wrong", secret)).toBe(false);
  });

  it("DM va kommentni normalizatsiya qiladi, echo hodisasini tashlaydi", () => {
    const payload = {
      object: "instagram",
      entry: [{
        id: "business-1",
        messaging: [
          { sender: { id: "customer-1" }, message: { mid: "m-1", text: "Narxi qancha?" } },
          { sender: { id: "business-1" }, message: { mid: "m-2", text: "echo", is_echo: true } },
        ],
        changes: [{
          field: "comments",
          value: { id: "c-1", text: "Qanday boshlayman?", from: { id: "customer-2", username: "ali" } },
        }],
      }],
    };

    expect(parseInstagramWebhook(payload, "business-1")).toEqual([
      {
        accountInstagramUserId: "business-1",
        eventKey: "dm:m-1",
        eventType: "DM",
        senderId: "customer-1",
        objectId: "m-1",
        message: "Narxi qancha?",
      },
      {
        accountInstagramUserId: "business-1",
        eventKey: "comment:c-1",
        eventType: "COMMENT",
        senderId: "customer-2",
        senderUsername: "ali",
        objectId: "c-1",
        message: "Qanday boshlayman?",
      },
    ]);
  });

  it("noto'g'ri object va matnsiz hodisalarni e'tiborsiz qoldiradi", () => {
    expect(parseInstagramWebhook({ object: "page", entry: [] })).toEqual([]);
    expect(parseInstagramWebhook({
      object: "instagram",
      entry: [{ messaging: [{ sender: { id: "u" }, message: { mid: "m" } }] }],
    })).toEqual([]);
  });
});

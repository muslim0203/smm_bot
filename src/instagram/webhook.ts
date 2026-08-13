import crypto from "crypto";

export type InstagramInboundEvent = {
  accountInstagramUserId: string;
  eventKey: string;
  eventType: "DM" | "COMMENT";
  senderId: string;
  senderUsername?: string;
  objectId: string;
  message: string;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Meta yuborgan xom body'ni X-Hub-Signature-256 bilan tekshiradi. */
export function verifyInstagramSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;

  const received = signatureHeader.slice("sha256=".length);
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
}

/**
 * Instagram Login va Facebook Login webhooklarining bizga kerakli umumiy qismini
 * normalizatsiya qiladi. Echo/self, o'chirilgan va matnsiz hodisalar ataylab olinmaydi.
 */
export function parseInstagramWebhook(
  payload: unknown,
  ownInstagramUserId?: string,
): InstagramInboundEvent[] {
  const root = record(payload);
  if (!root || root.object !== "instagram" || !Array.isArray(root.entry)) return [];

  const result: InstagramInboundEvent[] = [];

  for (const rawEntry of root.entry) {
    const entry = record(rawEntry);
    if (!entry) continue;
    const accountInstagramUserId = text(entry.id);
    if (!accountInstagramUserId) continue;

    if (Array.isArray(entry.messaging)) {
      for (const rawMessaging of entry.messaging) {
        const messaging = record(rawMessaging);
        const sender = record(messaging?.sender);
        const message = record(messaging?.message);
        const senderId = text(sender?.id);
        const messageId = text(message?.mid);
        const messageText = text(message?.text);

        if (
          !senderId || !messageId || !messageText ||
          message?.is_echo === true || message?.is_self === true || message?.is_deleted === true ||
          (ownInstagramUserId && senderId === ownInstagramUserId)
        ) continue;

        result.push({
          accountInstagramUserId,
          eventKey: `dm:${messageId}`,
          eventType: "DM",
          senderId,
          objectId: messageId,
          message: messageText.slice(0, 4_000),
        });
      }
    }

    if (Array.isArray(entry.changes)) {
      for (const rawChange of entry.changes) {
        const change = record(rawChange);
        if (!change || (change.field !== "comments" && change.field !== "live_comments")) continue;

        const value = record(change.value);
        const from = record(value?.from);
        const senderId = text(from?.id);
        const commentId = text(value?.id) ?? text(value?.comment_id);
        const commentText = text(value?.text) ?? text(value?.message);

        if (
          !senderId || !commentId || !commentText ||
          (ownInstagramUserId && senderId === ownInstagramUserId)
        ) continue;

        result.push({
          accountInstagramUserId,
          eventKey: `comment:${commentId}`,
          eventType: "COMMENT",
          senderId,
          senderUsername: text(from?.username),
          objectId: commentId,
          message: commentText.slice(0, 4_000),
        });
      }
    }
  }

  return result;
}

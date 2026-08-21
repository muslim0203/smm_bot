import crypto from "crypto";

export type InstagramInboundEvent = {
  accountInstagramUserId: string;
  eventKey: string;
  eventType: "DM" | "COMMENT";
  senderId: string;
  senderUsername?: string;
  objectId: string;
  parentId?: string;
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

function selfIdSet(selfIds?: string | Iterable<string>): Set<string> {
  if (!selfIds) return new Set();
  if (typeof selfIds === "string") return new Set(selfIds ? [selfIds] : []);
  return new Set([...selfIds].filter(Boolean));
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
 *
 * MUHIM: `entry.id` — hodisa kelgan biznes akkauntning o'zi. Botning o'z javobi ham
 * yangi comment webhook'ini keltirib chiqaradi; uni filtrlamasak bot o'zi bilan
 * yozishib, bitta kommentga bir nechta javob yozib ketadi. Shu sababli har bir
 * entry uchun `entry.id` ham, chaqiruvchi bergan `selfIds` ham hisobga olinadi.
 */
export function parseInstagramWebhook(
  payload: unknown,
  selfIds?: string | Iterable<string>,
): InstagramInboundEvent[] {
  const root = record(payload);
  if (!root || root.object !== "instagram" || !Array.isArray(root.entry)) return [];

  const knownSelfIds = selfIdSet(selfIds);
  const result: InstagramInboundEvent[] = [];

  for (const rawEntry of root.entry) {
    const entry = record(rawEntry);
    if (!entry) continue;
    const accountInstagramUserId = text(entry.id);
    if (!accountInstagramUserId) continue;

    const isSelf = (senderId: string) =>
      senderId === accountInstagramUserId || knownSelfIds.has(senderId);

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
          isSelf(senderId)
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
        const parentId = text(record(value?.parent)?.id) ?? text(value?.parent_id);

        if (!senderId || !commentId || !commentText || isSelf(senderId)) continue;

        result.push({
          accountInstagramUserId,
          eventKey: `comment:${commentId}`,
          eventType: "COMMENT",
          senderId,
          senderUsername: text(from?.username),
          objectId: commentId,
          ...(parentId ? { parentId } : {}),
          message: commentText.slice(0, 4_000),
        });
      }
    }
  }

  return result;
}

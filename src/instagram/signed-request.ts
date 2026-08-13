import crypto from "crypto";

export type MetaSignedRequest = {
  user_id?: string | number;
  issued_at?: number;
  algorithm?: string;
  [key: string]: unknown;
};

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Meta signed_request qiymatini App Secret bilan tekshiradi va payloadni qaytaradi. */
export function verifyMetaSignedRequest(value: string, appSecret: string): MetaSignedRequest {
  if (!appSecret) throw new Error("INSTAGRAM_APP_SECRET sozlanmagan");

  const [encodedSignature, encodedPayload, extra] = value.split(".");
  if (!encodedSignature || !encodedPayload || extra !== undefined) {
    throw new Error("Meta signed_request formati noto'g'ri");
  }

  const signature = decodeBase64Url(encodedSignature);
  const expected = crypto.createHmac("sha256", appSecret).update(encodedPayload).digest();
  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
    throw new Error("Meta signed_request imzosi noto'g'ri");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as MetaSignedRequest;
  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    throw new Error("Meta signed_request algoritmi qo'llanmaydi");
  }
  return payload;
}

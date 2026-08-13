import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../config.js";

const s3Client = new S3Client({
  region: config.aws.region,
  ...(config.aws.endpoint ? { endpoint: config.aws.endpoint } : {}),
  ...(config.aws.accessKeyId && config.aws.secretAccessKey ? {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  } : {}),
});

export function isSpacesConfigured(): boolean {
  return Boolean(config.aws.s3Bucket && config.aws.endpoint);
}

export async function uploadBufferToSpaces(
  body: Buffer | Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  if (!isSpacesConfigured()) throw new Error("S3/Spaces sozlanmagan");
  await s3Client.send(new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    Body: body,
    ACL: "public-read",
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  const endpoint = new URL(config.aws.endpoint);
  return `${endpoint.protocol}//${config.aws.s3Bucket}.${endpoint.host}/${key}`;
}

export async function deleteFromSpaces(key: string): Promise<void> {
  if (!config.aws.s3Bucket) return;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }));
  } catch {
    // Cleanup best-effort; asosiy publish oqimini sindirmaydi.
  }
}

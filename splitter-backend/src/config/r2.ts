import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { avatarKeyFromStored } from "../utils/avatar.js";

const R2_ENDPOINT = process.env.R2_ENDPOINT || ""; // e.g. https://<accountid>.r2.cloudflarestorage.com
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "";
const CDN_BASE_URL = (process.env.CDN_BASE_URL || "").replace(/\/$/, "");

export function isR2Configured(): boolean {
  return !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && CDN_BASE_URL);
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
  }
  return client;
}

const PUBLIC_ROOT = path.join(process.cwd(), "public");

function localPathForKey(key: string): string | null {
  const out = path.join(PUBLIC_ROOT, key);
  // never leave the public directory
  return out.startsWith(PUBLIC_ROOT + path.sep) ? out : null;
}

/**
 * Stores an avatar and returns the value to persist in User.avatarUrl:
 *  - R2 configured -> absolute CDN URL
 *  - otherwise     -> relative "/static/<key>" (resolved per request, so phones can reach it)
 */
export async function uploadAvatarObject(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl = "public, max-age=31536000, immutable"
): Promise<{ key: string; stored: string }> {
  if (isR2Configured()) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      })
    );
    return { key, stored: `${CDN_BASE_URL}/${key}` };
  }

  const outPath = localPathForKey(key);
  if (!outPath) throw new Error("Invalid avatar key");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body);
  return { key, stored: `/static/${key}` };
}

/** Best-effort removal of a previously stored avatar (never throws). */
export async function deleteAvatarByStoredUrl(stored: string | null | undefined): Promise<void> {
  const key = avatarKeyFromStored(stored);
  if (!key) return; // external URL or empty: not ours
  try {
    if (isR2Configured()) {
      await getClient().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } else {
      const p = localPathForKey(key);
      if (p && fs.existsSync(p)) {
        fs.unlinkSync(p);
        // remove now-empty version folder
        try {
          fs.rmdirSync(path.dirname(p));
        } catch {
          /* not empty */
        }
      }
    }
  } catch (err) {
    console.warn("[avatar] cleanup failed:", (err as Error).message);
  }
}

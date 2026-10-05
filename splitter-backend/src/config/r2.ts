import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const R2_ENDPOINT = process.env.R2_ENDPOINT || ""; // e.g. https://<accountid>.r2.cloudflarestorage.com
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "";
const CDN_BASE_URL = (process.env.CDN_BASE_URL || "").replace(/\/$/, "");

export function assertR2Config() {
  if (
    !R2_ENDPOINT ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET ||
    !CDN_BASE_URL
  ) {
    throw new Error(
      "R2 config missing: require R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, CDN_BASE_URL"
    );
  }
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadAvatarObject(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl = "public, max-age=31536000, immutable"
): Promise<{ key: string; url: string }> {
  try {
    // Prefer R2 if configured
    assertR2Config();
    const put = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    });
    await r2Client.send(put);
    const url = `${CDN_BASE_URL}/${key}`;
    return { key, url };
  } catch (err) {
    // Fallback to local filesystem for development when R2/CDN isn't configured
    const publicBase = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const publicRoot = path.join(process.cwd(), "public");
    const outPath = path.join(publicRoot, key);
    const outDir = path.dirname(outPath);
    console.log("R2 not configured or upload failed, falling back to local file:", { outPath });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, body);
    const url = `${publicBase.replace(/\/$/, "")}/static/${key}`;
    console.log("Local avatar saved:", { outPath, url });
    return { key, url };
  }
}

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/auth.js";
import { deleteAvatarByStoredUrl, uploadAvatarObject } from "../config/r2.js";
import { prisma } from "../config/prisma.js";
import { sendError } from "../utils/errors.js";
import { detectImageType } from "../utils/imageType.js";
import { serializeUser } from "../utils/avatar.js";

const router = Router();

const MAX_BYTES = Number(process.env.AVATAR_MAX_BYTES || 2 * 1024 * 1024); // default 2MB

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: File uploads (avatars)
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

/** multer errors (too large, unexpected field...) must be 4xx, not a generic 500. */
function runUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    const code = (err as { code?: string })?.code;
    if (code === "LIMIT_FILE_SIZE") {
      return sendError(res, 413, "FILE_TOO_LARGE", "File too large", { maxBytes: MAX_BYTES });
    }
    if (code === "LIMIT_UNEXPECTED_FILE" || code === "LIMIT_FILE_COUNT") {
      return sendError(res, 400, "FILE_REQUIRED", "Send exactly one file in the 'file' field");
    }
    console.error("[uploads] multer error:", (err as Error)?.message);
    return sendError(res, 400, "UNSUPPORTED_TYPE", "Could not read the uploaded file");
  });
}

/**
 * @swagger
 * /uploads/avatar:
 *   post:
 *     summary: Upload user avatar (multipart/form-data, field `file`)
 *     description: |
 *       Accepts JPEG, PNG, WebP or GIF up to AVATAR_MAX_BYTES (default 2 MB). The type is verified
 *       from the file contents. The previous avatar file is deleted after a successful upload.
 *       Errors carry a machine readable `code`: FILE_REQUIRED, FILE_TOO_LARGE (413), UNSUPPORTED_TYPE.
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "{ success, avatarUrl (absolute, reachable by the client), key, user }"
 *       400:
 *         description: FILE_REQUIRED | UNSUPPORTED_TYPE
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: FILE_TOO_LARGE
 */
router.post("/avatar", authenticateToken, runUpload, async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");

    const file = (req as any).file as { buffer: Buffer; size: number } | undefined;
    if (!file) return sendError(res, 400, "FILE_REQUIRED", "file is required");
    if (file.size > MAX_BYTES) {
      return sendError(res, 413, "FILE_TOO_LARGE", "File too large", { maxBytes: MAX_BYTES });
    }

    const detected = detectImageType(file.buffer);
    if (!detected) {
      return sendError(res, 400, "UNSUPPORTED_TYPE", "Unsupported image type (use JPEG, PNG, WebP or GIF)");
    }

    const before = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });
    if (!before) return sendError(res, 404, "USER_NOT_FOUND", "User not found");

    // The version in the key makes every upload a brand-new URL (natural cache busting).
    const v = Date.now();
    const key = `avatars/${req.user.id}/v${v}/avatar${detected.ext}`;
    const put = await uploadAvatarObject(key, file.buffer, detected.mime);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: put.stored },
      select: { id: true, email: true, username: true, uniqueId: true, avatarUrl: true },
    });

    // Remove the previous file only after the new one is saved.
    if (before.avatarUrl && before.avatarUrl !== put.stored) {
      void deleteAvatarByStoredUrl(before.avatarUrl);
    }

    console.log(`[uploads] avatar saved user=${req.user.id} bytes=${file.size} type=${detected.mime} key=${put.key}`);
    const publicUser = serializeUser(user, req);
    return res.json({ success: true, avatarUrl: publicUser.avatarUrl, key: put.key, user: publicUser });
  } catch (err) {
    console.error("POST /uploads/avatar error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;

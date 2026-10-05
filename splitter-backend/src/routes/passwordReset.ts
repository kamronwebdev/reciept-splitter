import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { sendPasswordResetCode } from "../services/email.js";
import { sendError } from "../utils/errors.js";
import { EMAIL_REGEX, normalizeEmail, signAuthToken } from "../utils/authToken.js";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../utils/validation.js";
import {
  forgotPasswordLimiter,
  verifyCodeLimiter,
  resetPasswordLimiter,
} from "../middleware/rateLimit.js";

const router = Router();

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL = "10m";
const GENERIC_MESSAGE =
  "If an account exists for this email, a 6-digit code has been sent.";

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a 6-digit password reset code by email
 *     description: Always returns 200 with the same message, whether or not the email is registered.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *     responses:
 *       200: { description: Generic confirmation }
 *       429: { description: Rate limited }
 */
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !EMAIL_REGEX.test(email)) {
    return sendError(res, 400, "INVALID_EMAIL", "Invalid email format");
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const latest = await prisma.passwordResetCode.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      const inCooldown =
        latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS;

      if (!inCooldown) {
        const code = generateCode();
        const codeHash = await bcrypt.hash(code, 10);
        const now = new Date();

        // Invalidate older codes, then store the new one.
        await prisma.$transaction([
          prisma.passwordResetCode.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: now },
          }),
          prisma.passwordResetCode.create({
            data: {
              userId: user.id,
              codeHash,
              expiresAt: new Date(now.getTime() + CODE_TTL_MS),
            },
          }),
        ]);

        try {
          await sendPasswordResetCode(email, code);
        } catch (e) {
          // Do not reveal delivery problems to the client (would leak account existence).
          console.error("[forgot-password] email send failed:", (e as Error).message);
        }
      }
    }
  } catch (err) {
    console.error("/auth/forgot-password error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }

  return res.json({ message: GENERIC_MESSAGE });
});

/**
 * @swagger
 * /auth/verify-reset-code:
 *   post:
 *     summary: Verify the 6-digit code and get a short-lived reset token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: "{ resetToken }" }
 *       400: { description: "INVALID_CODE | CODE_EXPIRED | TOO_MANY_ATTEMPTS" }
 */
router.post("/verify-reset-code", verifyCodeLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!email || !EMAIL_REGEX.test(email)) {
    return sendError(res, 400, "INVALID_EMAIL", "Invalid email format");
  }
  if (!/^\d{6}$/.test(code)) {
    return sendError(res, 400, "INVALID_CODE", "The code is incorrect");
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 400, "INVALID_CODE", "The code is incorrect");
    }

    const record = await prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      return sendError(res, 400, "INVALID_CODE", "The code is incorrect");
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return sendError(res, 400, "CODE_EXPIRED", "The code has expired");
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return sendError(res, 400, "TOO_MANY_ATTEMPTS", "Too many wrong attempts, request a new code");
    }

    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) {
      const updated = await prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      if (updated.attempts >= MAX_ATTEMPTS) {
        return sendError(res, 400, "TOO_MANY_ATTEMPTS", "Too many wrong attempts, request a new code");
      }
      return sendError(res, 400, "INVALID_CODE", "The code is incorrect", {
        attemptsLeft: MAX_ATTEMPTS - updated.attempts,
      });
    }

    const resetToken = jwt.sign(
      { purpose: "pwd-reset", uid: user.id, cid: record.id },
      process.env.JWT_SECRET as string,
      { expiresIn: RESET_TOKEN_TTL }
    );
    return res.json({ resetToken });
  } catch (err) {
    console.error("/auth/verify-reset-code error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Set a new password using the reset token
 *     description: Returns a fresh login token so the user is signed in immediately. All older sessions are invalidated.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword]
 *             properties:
 *               resetToken: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: "{ token, user }" }
 *       400: { description: "WEAK_PASSWORD | INVALID_RESET_TOKEN" }
 */
router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const { resetToken, newPassword } = req.body ?? {};
  if (typeof resetToken !== "string" || typeof newPassword !== "string") {
    return sendError(res, 400, "VALIDATION_ERROR", "resetToken and newPassword are required");
  }

  let payload: { purpose?: string; uid?: number; cid?: number };
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET as string) as any;
  } catch {
    return sendError(res, 400, "INVALID_RESET_TOKEN", "The reset link has expired, please start again");
  }
  if (payload.purpose !== "pwd-reset" || !payload.uid || !payload.cid) {
    return sendError(res, 400, "INVALID_RESET_TOKEN", "The reset link is invalid, please start again");
  }
  if (!isStrongPassword(newPassword)) {
    return sendError(res, 400, "WEAK_PASSWORD", PASSWORD_POLICY_MESSAGE);
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);

    // Single use: only the first request that flips usedAt from null wins.
    const claimed = await prisma.passwordResetCode.updateMany({
      where: { id: payload.cid, userId: payload.uid, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      return sendError(res, 400, "INVALID_RESET_TOKEN", "The reset link was already used or expired, please start again");
    }

    const user = await prisma.user.update({
      where: { id: payload.uid },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });

    return res.json({
      token: signAuthToken(user),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        uniqueId: user.uniqueId,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (err) {
    console.error("/auth/reset-password error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;

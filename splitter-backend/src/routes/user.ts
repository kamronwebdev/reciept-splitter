import { Router } from "express";
import type { Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { deleteAvatarByStoredUrl } from "../config/r2.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { hasJsonContentType, isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../utils/validation.js";
import { EMAIL_REGEX, normalizeEmail, signAuthToken } from "../utils/authToken.js";
import { sendError } from "../utils/errors.js";
import { serializeUser } from "../utils/avatar.js";

const router = Router();

const USER_SELECT = { id: true, email: true, username: true, uniqueId: true, avatarUrl: true } as const;
const USERNAME_MIN = 2;
const USERNAME_MAX = 30;

/**
 * @swagger
 * tags:
 *   name: User
 *   description: Current user's account (profile, credentials, stats, deletion)
 */

function requireJson(req: AuthRequest, res: Response): boolean {
  if (!hasJsonContentType(req)) {
    sendError(res, 415, "VALIDATION_ERROR", "Content-Type must be application/json");
    return false;
  }
  return true;
}

/**
 * @swagger
 * /user/username:
 *   patch:
 *     summary: Update username (2-30 characters, trimmed)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string, example: NewName }
 *     responses:
 *       200: { description: Updated user }
 *       400: { description: INVALID_USERNAME }
 */
router.patch("/username", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireJson(req, res)) return;
    if (!req.user) return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");

    const clean = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    if (clean.length < USERNAME_MIN || clean.length > USERNAME_MAX) {
      return sendError(res, 400, "INVALID_USERNAME", `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`);
    }

    const user = await prisma.user
      .update({ where: { id: req.user.id }, data: { username: clean }, select: USER_SELECT })
      .catch((e) => {
        if ((e as any)?.code === "P2025") return null;
        throw e;
      });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    return res.json(serializeUser(user, req));
  } catch (err) {
    console.error("/user/username error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /user/email:
 *   patch:
 *     summary: Change e-mail (requires the current password)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, currentPassword]
 *             properties:
 *               email: { type: string }
 *               currentPassword: { type: string }
 *     responses:
 *       200: { description: Updated user }
 *       400: { description: INVALID_EMAIL | WRONG_CURRENT_PASSWORD }
 *       409: { description: EMAIL_IN_USE }
 */
router.patch("/email", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireJson(req, res)) return;
    if (!req.user) return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");

    const email = normalizeEmail(req.body?.email);
    const currentPassword = req.body?.currentPassword;
    if (!email || !EMAIL_REGEX.test(email)) {
      return sendError(res, 400, "INVALID_EMAIL", "Invalid email format");
    }
    if (typeof currentPassword !== "string" || !currentPassword) {
      return sendError(res, 400, "WRONG_CURRENT_PASSWORD", "Current password is required");
    }

    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    if (!(await bcrypt.compare(currentPassword, me.password))) {
      return sendError(res, 400, "WRONG_CURRENT_PASSWORD", "Current password is incorrect");
    }

    try {
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { email },
        select: USER_SELECT,
      });
      return res.json(serializeUser(user, req));
    } catch (e: any) {
      if (e?.code === "P2002") return sendError(res, 409, "EMAIL_IN_USE", "Email already in use");
      throw e;
    }
  } catch (err) {
    console.error("/user/email error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /user/password:
 *   patch:
 *     summary: Change password
 *     description: |
 *       Bumps tokenVersion, so every other session is signed out. The response contains a fresh
 *       `token` that keeps THIS device signed in.
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: "{ success, token }" }
 *       400: { description: WEAK_PASSWORD | WRONG_CURRENT_PASSWORD }
 */
router.patch("/password", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireJson(req, res)) return;
    if (!req.user) return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");

    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return sendError(res, 400, "VALIDATION_ERROR", "Both currentPassword and newPassword are required");
    }
    if (!isStrongPassword(newPassword)) {
      return sendError(res, 400, "WEAK_PASSWORD", PASSWORD_POLICY_MESSAGE);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return sendError(res, 400, "WRONG_CURRENT_PASSWORD", "Current password is incorrect");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });
    return res.json({ success: true, token: signAuthToken(updated) });
  } catch (err) {
    console.error("/user/password error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /user/stats:
 *   get:
 *     summary: Counters for the profile screen
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ sessions, friends, groups }" }
 */
router.get("/stats", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");
    const id = req.user.id;
    const [sessions, friends, groups] = await Promise.all([
      prisma.sessionHistoryEntry.count({
        where: { OR: [{ creatorId: id }, { session: { participants: { some: { userId: id } } } }] },
      }),
      prisma.friendship.count({
        where: { status: "ACCEPTED", OR: [{ requesterId: id }, { receiverId: id }] },
      }),
      prisma.group.count({ where: { OR: [{ ownerId: id }, { members: { some: { userId: id } } }] } }),
    ]);
    return res.json({ sessions, friends, groups });
  } catch (err) {
    console.error("/user/stats error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /user/delete:
 *   delete:
 *     summary: Permanently delete the account (requires the password)
 *     description: |
 *       Deletes the account together with everything it owns: receipts/sessions it created,
 *       groups it owns, its friendships, memberships, item assignments and avatar.
 *       Bills created by OTHER people stay, but this user's shares are removed.
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200: { description: "{ success: true }" }
 *       400: { description: INVALID_PASSWORD }
 */
router.delete("/delete", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireJson(req, res)) return;
    if (!req.user) return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");

    const password = req.body?.password;
    if (typeof password !== "string" || !password) {
      return sendError(res, 400, "INVALID_PASSWORD", "Password is required to delete the account");
    }
    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    if (!(await bcrypt.compare(password, me.password))) {
      return sendError(res, 400, "INVALID_PASSWORD", "Password is incorrect");
    }

    const uid = me.id;
    await prisma.$transaction(async (tx) => {
      const ownedSessions = { session: { creatorId: uid } };

      await tx.itemAssignment.deleteMany({ where: { OR: [{ userId: uid }, { item: ownedSessions }] } });
      await tx.receiptItem.deleteMany({ where: ownedSessions });
      await tx.sessionParticipant.deleteMany({ where: { OR: [{ userId: uid }, ownedSessions] } });
      await tx.sessionHistoryEntry.deleteMany({ where: { creatorId: uid } });
      await tx.session.deleteMany({ where: { creatorId: uid } });

      // Groups owned by the user: detach other people's sessions, then remove members and the group.
      const ownedGroupIds = (await tx.group.findMany({ where: { ownerId: uid }, select: { id: true } })).map((g) => g.id);
      if (ownedGroupIds.length) {
        await tx.session.updateMany({ where: { groupId: { in: ownedGroupIds } }, data: { groupId: null } });
        await tx.groupMember.deleteMany({ where: { groupId: { in: ownedGroupIds } } });
        await tx.group.deleteMany({ where: { id: { in: ownedGroupIds } } });
      }
      await tx.groupMember.deleteMany({ where: { userId: uid } });

      await tx.friendship.deleteMany({ where: { OR: [{ requesterId: uid }, { receiverId: uid }] } });
      await tx.user.delete({ where: { id: uid } }); // PasswordResetCode cascades
    });

    void deleteAvatarByStoredUrl(me.avatarUrl);
    console.log("/user/delete success:", { id: uid });
    return res.json({ success: true });
  } catch (err) {
    console.error("/user/delete error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;

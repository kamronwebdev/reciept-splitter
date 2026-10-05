import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../config/prisma.js";
import { deleteAvatarByStoredUrl } from "../config/r2.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { sendError } from "../utils/errors.js";
import { resolveAvatarUrl, serializeUser } from "../utils/avatar.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profiles and avatar management
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user profile by numeric id (authentication required)
 *     description: The e-mail address is only included for the authenticated user's own profile.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: User profile (avatarUrl is null when the user has no photo)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendError(res, 400, "VALIDATION_ERROR", "Invalid id");

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, uniqueId: true, avatarUrl: true },
    });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "User not found");

    if (req.user?.id === user.id) return res.json(serializeUser(user, req));

    return res.json({
      id: user.id,
      username: user.username,
      uniqueId: user.uniqueId,
      avatarUrl: resolveAvatarUrl(user.avatarUrl, req),
    });
  } catch (err) {
    console.error("GET /users/:id error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /users/me/avatar:
 *   delete:
 *     summary: Remove the current user's avatar (the app then shows initials)
 *     description: Also deletes the stored file.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ success, avatarUrl: null, user }"
 */
router.delete("/me/avatar", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");

    const before = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });
    if (!before) return sendError(res, 404, "USER_NOT_FOUND", "User not found");

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: null },
      select: { id: true, email: true, username: true, uniqueId: true, avatarUrl: true },
    });
    void deleteAvatarByStoredUrl(before.avatarUrl);

    return res.json({ success: true, avatarUrl: null, user: serializeUser(user, req) });
  } catch (err) {
    console.error("DELETE /users/me/avatar error:", (err as Error)?.message);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;

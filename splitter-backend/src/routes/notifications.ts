import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../config/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { logRouteError, sendError } from "../utils/errors.js";
import { resolveAvatarUrl } from "../utils/avatar.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notifications (the bell)
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: My notifications, newest first (cursor pagination)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: integer }
 *         description: id of the last item of the previous page
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30, maximum: 100 }
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const cursor = Number(req.query.cursor);
    const rows = await prisma.notification.findMany({
      where: { userId: req.user.id, ...(Number.isInteger(cursor) && cursor > 0 ? { id: { lt: cursor } } : {}) },
      orderBy: { id: "desc" },
      take: limit + 1,
    });
    const page = rows.slice(0, limit);

    // fresh avatars of the people who caused them
    const actorIds = Array.from(new Set(page.map((n) => (n.data as any)?.actor?.uniqueId).filter(Boolean))) as string[];
    const actors = actorIds.length
      ? await prisma.user.findMany({ where: { uniqueId: { in: actorIds } }, select: { uniqueId: true, username: true, avatarUrl: true } })
      : [];
    const byUid = new Map(actors.map((a) => [a.uniqueId, a]));

    const items = page.map((n) => {
      const data = (n.data ?? {}) as any;
      const actor = data.actor?.uniqueId ? byUid.get(data.actor.uniqueId) : undefined;
      return {
        id: n.id,
        type: n.type,
        data: {
          ...data,
          ...(data.actor
            ? { actor: { ...data.actor, username: actor?.username ?? data.actor.username, avatarUrl: resolveAvatarUrl(actor?.avatarUrl, req) } }
            : {}),
        },
        read: !!n.readAt,
        createdAt: n.createdAt.toISOString(),
      };
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
    return res.json({ items, nextCursor: rows.length > limit ? page[page.length - 1]!.id : null, unreadCount });
  } catch (err) {
    logRouteError("GET /notifications error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Number of unread notifications (the bell / Home tab badge)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get("/unread-count", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const count = await prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
    return res.json({ count });
  } catch (err) {
    logRouteError("GET /notifications/unread-count error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /notifications/read:
 *   post:
 *     summary: Mark notifications as read ({ ids: number[] } or { all: true })
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post("/read", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const all = req.body?.all === true;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n: number) => Number.isInteger(n)) : [];
    if (!all && ids.length === 0) return sendError(res, 400, "VALIDATION_ERROR", "Provide ids or all: true");
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null, ...(all ? {} : { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
    return res.json({ updated: count, unreadCount });
  } catch (err) {
    logRouteError("POST /notifications/read error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete one of my notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendError(res, 404, "NOT_FOUND", "Notification not found");
    const { count } = await prisma.notification.deleteMany({ where: { id, userId: req.user.id } });
    if (!count) return sendError(res, 404, "NOT_FOUND", "Notification not found");
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
    return res.json({ deleted: true, unreadCount });
  } catch (err) {
    logRouteError("DELETE /notifications/:id error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;

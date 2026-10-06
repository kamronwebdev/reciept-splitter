import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { friendCodeLimiter } from "../middleware/rateLimit.js";
import { logRouteError, sendError } from "../utils/errors.js";
import {
  befriend,
  ensureInviteCode,
  findUserByCode,
  friendshipState,
  inviteLinks,
  normalizeInviteCode,
  publicCard,
  resetInviteCode,
} from "../services/friendCode.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friends and friend request management
 */

/** Helper to select public fields */
const userPublicSelect = {
  id: true,
  email: true,
  username: true,
  uniqueId: true,
  avatarUrl: true,
} as const;

/** Helper: choose secret for friend invites */
function getFriendInviteSecret() {
  return process.env.FRIEND_INVITE_SECRET || process.env.JWT_SECRET || "";
}

/**
 * @swagger
 * /friends/invite:
 *   post:
 *     summary: Create a short-lived friend invite token (auth required)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresInSeconds:
 *                 type: integer
 *                 description: TTL in seconds (default 900 = 15 minutes)
 *     responses:
 *       200:
 *         description: Invite created
 */
router.post(
  "/invite",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const secret = getFriendInviteSecret();
      if (!secret)
        return res.status(500).json({ error: "Invite secret missing" });

      const nowSec = Math.floor(Date.now() / 1000);
      const ttl = Math.max(
        60,
        Math.min(3600, Number(req.body?.expiresInSeconds) || 900)
      );
      const exp = nowSec + ttl;
      const payload = {
        typ: "friend_invite" as const,
        inviterId: req.user.id,
        iat: nowSec,
        exp,
      };
      const token = jwt.sign(payload, secret);

      const baseUrl =
        process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const url = `${baseUrl}/friends/join?token=${encodeURIComponent(token)}`;
      return res.json({
        token,
        url,
        expiresAt: new Date(exp * 1000).toISOString(),
      });
    } catch (err) {
      console.error("POST /friends/invite error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /friends/join:
 *   post:
 *     summary: Accept an old (time-limited) friend invite token (auth required)
 *     description: Kept for QR codes printed/shared before personal codes existed. Returns the inviter's card.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/join",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const token =
        typeof req.body?.token === "string" ? req.body.token.trim() : "";
      if (!token) return sendError(res, 400, "INVALID_INVITE", "token is required");

      const secret = getFriendInviteSecret();
      if (!secret) return sendError(res, 500, "SERVER_ERROR", "Invite secret missing");

      let decoded: any;
      try {
        decoded = jwt.verify(token, secret);
      } catch {
        return sendError(res, 400, "INVALID_INVITE", "Invalid or expired invite");
      }
      const inviterId = Number(decoded?.inviterId);
      if (!decoded || decoded.typ !== "friend_invite" || !Number.isFinite(inviterId))
        return sendError(res, 400, "INVALID_INVITE", "Invalid invite");

      const inviter = await prisma.user.findUnique({
        where: { id: inviterId },
        select: { id: true, uniqueId: true, username: true, avatarUrl: true },
      });
      if (!inviter) return sendError(res, 400, "INVALID_INVITE", "Invalid invite");
      const friend = publicCard(inviter, req);
      if (inviterId === req.user.id) return res.json({ success: true, action: "self", friend, status: "self" });

      const action = await befriend(req.user.id, inviterId);
      return res.json({ success: true, action, friend, status: "friends" });
    } catch (err) {
      logRouteError("POST /friends/join error:", err);
      return sendError(res, 500, "SERVER_ERROR", "Server error");
    }
  }
);

/**
 * @swagger
 * /friends/my-code:
 *   get:
 *     summary: My permanent friend QR code ({ code, url, deepLink }); created on first use
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.get("/my-code", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const code = await ensureInviteCode(req.user.id);
    return res.json(inviteLinks(code, req));
  } catch (err) {
    logRouteError("GET /friends/my-code error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /friends/my-code/reset:
 *   post:
 *     summary: Replace my friend QR code (the old code and its QR stop working)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post("/my-code/reset", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const code = await resetInviteCode(req.user.id);
    return res.json(inviteLinks(code, req));
  } catch (err) {
    logRouteError("POST /friends/my-code/reset error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /friends/code/{code}:
 *   get:
 *     summary: Public card of a friend-QR owner + friendship status with me
 *     description: friendshipStatus is none | pending_outgoing | pending_incoming | friends | self. 404 INVALID_CODE.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.get("/code/:code", authenticateToken, friendCodeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const owner = await findUserByCode(normalizeInviteCode(req.params.code));
    if (!owner) return sendError(res, 404, "INVALID_CODE", "This QR code is not valid anymore");
    const friendshipStatus = await friendshipState(req.user.id, owner.id);
    return res.json({ ...publicCard(owner, req), friendshipStatus });
  } catch (err) {
    logRouteError("GET /friends/code/:code error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /friends/code/{code}/add:
 *   post:
 *     summary: Become friends with the QR owner (accepted immediately; a pending request either way is accepted)
 *     description: Errors INVALID_CODE (404), SELF (400), ALREADY_FRIENDS (409, includes friend).
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post("/code/:code/add", authenticateToken, friendCodeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const owner = await findUserByCode(normalizeInviteCode(req.params.code));
    if (!owner) return sendError(res, 404, "INVALID_CODE", "This QR code is not valid anymore");
    const friend = publicCard(owner, req);
    if (owner.id === req.user.id) return sendError(res, 400, "SELF", "This is your own QR code", { friend });
    const action = await befriend(req.user.id, owner.id);
    if (action === "existing") return sendError(res, 409, "ALREADY_FRIENDS", "You are already friends", { friend });
    return res.json({ success: true, action, friend, friendshipStatus: "friends" });
  } catch (err) {
    logRouteError("POST /friends/code/:code/add error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

/**
 * @swagger
 * /friends:
 *   get:
 *     summary: List current user's friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список друзей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserPublic'
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;

    const [asRequester, asReceiver] = await Promise.all([
      prisma.friendship.findMany({
        where: { requesterId: userId, status: "ACCEPTED" },
        include: { receiver: { select: userPublicSelect } },
      }),
      prisma.friendship.findMany({
        where: { receiverId: userId, status: "ACCEPTED" },
        include: { requester: { select: userPublicSelect } },
      }),
    ]);

    // most recent friendships first; `since` lets the app sort "recent friends first"
    const friends = [
      ...asRequester.map((f) => ({ ...f.receiver, since: f.updatedAt })),
      ...asReceiver.map((f) => ({ ...f.requester, since: f.updatedAt })),
    ]
      .sort((a, b) => b.since.getTime() - a.since.getTime())
      .map((u) => ({ ...u, avatarUrl: u.avatarUrl ?? null }));
    return res.json(friends);
  } catch (err) {
    console.error("/friends error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /friends/requests:
 *   get:
 *     summary: Show incoming and outgoing friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Запросы в друзья
 */
router.get(
  "/requests",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const userId = req.user.id;

      const [incoming, outgoing] = await Promise.all([
        prisma.friendship.findMany({
          where: { receiverId: userId, status: "PENDING" },
          include: { requester: { select: userPublicSelect } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.friendship.findMany({
          where: { requesterId: userId, status: "PENDING" },
          include: { receiver: { select: userPublicSelect } },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const payload = {
        incoming: incoming.map((r) => ({ id: r.id, from: r.requester })),
        outgoing: outgoing.map((r) => ({ id: r.id, to: r.receiver })),
      };
      return res.json(payload);
    } catch (err) {
      console.error("/friends/requests error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /friends/search:
 *   get:
 *     summary: Search user by uniqueId
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: uniqueId пользователя (например, #1234)
 *     responses:
 *       200:
 *         description: Результат поиска
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserPublic'
 */
router.get(
  "/search",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        return res.json([]);
      }
      const user = await prisma.user.findUnique({
        where: { uniqueId: q },
        select: userPublicSelect,
      });
      const result = user
        ? [{ ...user, avatarUrl: user.avatarUrl ?? null }]
        : [];
      return res.json(result);
    } catch (err) {
      console.error("/friends/search error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /friends/request:
 *   post:
 *     summary: Send a friend request by uniqueId
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [uniqueId]
 *             properties:
 *               uniqueId:
 *                 type: string
 *                 example: #1234
 *     responses:
 *       200:
 *         description: Запрос отправлен или подтвержден
 */
router.post(
  "/request",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const me = req.user.id;
      // Correctly parse unique ID as a string to avoid JSON errors.
      // Body is parsed by express.json() in server.ts, we strictly require a string here.
      const { uniqueId } = req.body ?? {};
      if (typeof uniqueId !== "string" || !uniqueId.trim()) {
        return res.status(400).json({ error: "uniqueId is required" });
      }

      const target = await prisma.user.findUnique({
        where: { uniqueId: uniqueId.trim() },
        select: { id: true, uniqueId: true, username: true },
      });
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.id === me)
        return res.status(400).json({ error: "You cannot add yourself" });

      // Если есть встречный pending запрос от target -> меняем его на ACCEPTED
      const reciprocal = await prisma.friendship.findUnique({
        where: {
          requesterId_receiverId: { requesterId: target.id, receiverId: me },
        },
      });
      if (reciprocal && reciprocal.status === "PENDING") {
        const accepted = await prisma.friendship.update({
          where: { id: reciprocal.id },
          data: { status: "ACCEPTED" },
        });
        return res.json({ success: true, action: "accepted", id: accepted.id });
      }

      // Проверяем, не друзья ли уже
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: me, receiverId: target.id },
            { requesterId: target.id, receiverId: me },
          ],
        },
      });
      if (existing) {
        if (existing.status === "ACCEPTED")
          return res.status(409).json({ error: "Already friends" });
        if (existing.requesterId === me && existing.status === "PENDING")
          return res.status(409).json({ error: "Request already sent" });
        if (existing.receiverId === me && existing.status === "PENDING")
          return res.status(409).json({ error: "Awaiting your response" });
      }

      const created = await prisma.friendship.create({
        data: { requesterId: me, receiverId: target.id },
      });
      return res.json({ success: true, action: "requested", id: created.id });
    } catch (err) {
      console.error("/friends/request error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /friends/accept:
 *   patch:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - required: [uniqueId]
 *               - required: [requesterId]
 *             properties:
 *               uniqueId:
 *                 type: string
 *               requesterId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Запрос принят
 */
router.patch(
  "/accept",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const me = req.user.id;
      // Correctly parse unique ID as a string to avoid JSON errors.
      // Body is parsed by express.json() in server.ts, we strictly require a string here.
      const { uniqueId, requesterId } = req.body ?? {};

      let otherId: number | null = null;
      if (typeof requesterId === "number") {
        otherId = requesterId;
      } else if (typeof uniqueId === "string") {
        const u = await prisma.user.findUnique({
          where: { uniqueId: uniqueId.trim() },
          select: { id: true },
        });
        otherId = u?.id ?? null;
      }
      if (!otherId)
        return res
          .status(400)
          .json({ error: "Provide uniqueId or requesterId" });

      const fr = await prisma.friendship.findUnique({
        where: {
          requesterId_receiverId: { requesterId: otherId, receiverId: me },
        },
      });
      if (!fr || fr.status !== "PENDING") {
        return res.status(404).json({ error: "Request not found" });
      }
      const updated = await prisma.friendship.update({
        where: { id: fr.id },
        data: { status: "ACCEPTED" },
      });
      return res.json({ success: true, id: updated.id });
    } catch (err) {
      console.error("/friends/accept error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /friends/reject:
 *   patch:
 *     summary: Reject a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - required: [uniqueId]
 *               - required: [requesterId]
 *             properties:
 *               uniqueId:
 *                 type: string
 *               requesterId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Запрос отклонен
 */
router.patch(
  "/reject",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const me = req.user.id;
      // Correctly parse unique ID as a string to avoid JSON errors.
      // Body is parsed by express.json() in server.ts, we strictly require a string here.
      const { uniqueId, requesterId } = req.body ?? {};

      let otherId: number | null = null;
      if (typeof requesterId === "number") {
        otherId = requesterId;
      } else if (typeof uniqueId === "string") {
        const u = await prisma.user.findUnique({
          where: { uniqueId: uniqueId.trim() },
          select: { id: true },
        });
        otherId = u?.id ?? null;
      }
      if (!otherId)
        return res
          .status(400)
          .json({ error: "Provide uniqueId or requesterId" });

      const fr = await prisma.friendship.findUnique({
        where: {
          requesterId_receiverId: { requesterId: otherId, receiverId: me },
        },
      });
      if (!fr || fr.status !== "PENDING") {
        return res.status(404).json({ error: "Request not found" });
      }
      const updated = await prisma.friendship.update({
        where: { id: fr.id },
        data: { status: "REJECTED" },
      });
      return res.json({ success: true, id: updated.id });
    } catch (err) {
      console.error("/friends/reject error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /friends/{uniqueId}:
 *   delete:
 *     summary: Remove friend (or cancel/clear requests)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Связь удалена (если была)
 */
router.delete(
  "/:uniqueId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const me = req.user.id;
      const uniqueId = String(req.params.uniqueId || "").trim();
      if (!uniqueId) return res.status(400).json({ error: "Invalid uniqueId" });


      const other = await prisma.user.findUnique({
        where: { uniqueId },
        select: { id: true },
      });
      if (!other) return res.json({ success: true, removed: false });

      const fr = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: me, receiverId: other.id },
            { requesterId: other.id, receiverId: me },
          ],
        },
      });

      if (!fr) return res.json({ success: true, removed: false });

      await prisma.friendship.delete({ where: { id: fr.id } });
      return res.json({ success: true, removed: true });
    } catch (err) {
      console.error("DELETE /friends/:uniqueId error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;

import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../config/prisma.js";
import type { Prisma } from "@prisma/client";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { parseReceipt, ReceiptParseError } from "../services/receiptParser.js";
import { computeSplit, currencyDecimals, fromMinor, toMinor, type FeeMode, type LineKind, type SplitLine } from "../utils/split.js";
import { sendError, logRouteError } from "../utils/errors.js";
import { resolveAvatarUrl } from "../utils/avatar.js";

const router = Router();

const DEFAULT_CURRENCY_CODE = "UZS";

function normalizeCurrencyCode(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_CURRENCY_CODE;
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_CURRENCY_CODE;
  const upper = trimmed.toUpperCase();
  return /^[A-Z]{3}$/.test(upper) ? upper : DEFAULT_CURRENCY_CODE;
}

/**
 * @swagger
 * /sessions/scan:
 *   post:
 *     summary: Parse receipt image (session creation + immediate normalized items)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionName, language, image]
 *             properties:
 *               sessionName:
 *                 type: string
 *                 example: "Кафе на Октябрь"
 *               language:
 *                 type: string
 *                 example: ru-RU
 *               image:
 *                 type: object
 *                 required: [mimeType, data]
 *                 properties:
 *                   mimeType:
 *                     type: string
 *                     example: image/jpeg
 *                   data:
 *                     type: string
 *                     description: Base64 image data
 *     responses:
 *       200:
 *         description: Parsed receipt items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId: { type: integer }
 *                 sessionName: { type: string }
 *                 language: { type: string }
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       unitPrice: { type: number }
 *                       quantity: { type: number }
 *                       totalPrice: { type: number }
 *                       kind: { type: string, nullable: true }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     grandTotal: { type: number }
 *                     currency: { type: string, nullable: true, example: "USD" }
 */
router.post(
  "/scan",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { sessionName, language, image } = req.body || {};
      if (!sessionName || typeof sessionName !== "string") {
        return res.status(400).json({ error: "sessionName required" });
      }
      if (!language || typeof language !== "string") {
        return res.status(400).json({ error: "language required" });
      }
      if (!image || typeof image !== "object" || typeof image.mimeType !== "string" || typeof image.data !== "string") {
        return res.status(400).json({ error: "image { mimeType, data } required", code: "IMAGE_UNREADABLE" });
      }
      if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(image.mimeType)) {
        return res.status(400).json({ error: "Unsupported image type", code: "IMAGE_UNREADABLE" });
      }
      // strip an accidental data: prefix and sanity-check the base64 payload
      const base64 = image.data.replace(/^data:[^;]+;base64,/, "");
      if (base64.length < 200 || !/^[A-Za-z0-9+/=\s]+$/.test(base64.slice(0, 4000))) {
        return res.status(400).json({ error: "The image data is not valid base64", code: "IMAGE_UNREADABLE" });
      }

      // Parse FIRST: a failed scan must not leave an orphan session behind.
      const parseResult = await parseReceipt({
        language,
        sessionName,
        mimeType: image.mimeType,
        imageBase64: base64,
      });

      const session = await prisma.session.create({
        data: { creatorId: req.user.id, status: "ACTIVE" },
        select: { id: true },
      });

      console.log(
        `[scan] user=${req.user.id} session=${session.id} source=${parseResult.source} items=${parseResult.items.length} mismatch=${parseResult.totalsMismatch}`
      );
      return res.json({
        sessionId: session.id,
        sessionName,
        language,
        items: parseResult.items,
        summary: parseResult.summary,
        totalsMismatch: parseResult.totalsMismatch,
        source: parseResult.source,
        isDemo: parseResult.source === "mock",
      });
    } catch (err) {
      if (err instanceof ReceiptParseError) {
        return res.status(err.httpStatus).json({ error: err.message, code: err.code, retryable: err.retryable });
      }
      console.error("POST /sessions/scan error", (err as Error)?.message);
      return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Receipt split sessions
 */

/**
 * @swagger
 * /sessions:
 *   post:
 *     summary: Create a session (optionally within a group)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: integer
 *                 nullable: true
 *               serviceFee:
 *                 type: number
 *                 nullable: true
 *               total:
 *                 type: number
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Session created
 */
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const groupId = req.body?.groupId;
    const serviceFee = Number(req.body?.serviceFee ?? 0);
    const total = Number(req.body?.total ?? 0);

    let groupCheck = null as null | { ownerId: number };
    if (groupId != null) {
      const gid = Number(groupId);
      if (!Number.isFinite(gid))
        return res.status(400).json({ error: "Invalid groupId" });
      groupCheck = await prisma.group.findUnique({
        where: { id: gid },
        select: { ownerId: true },
      });
      if (!groupCheck)
        return res.status(404).json({ error: "Group not found" });
    }

    const created = await prisma.session.create({
      data: {
        creatorId: req.user.id,
        groupId: groupId != null ? Number(groupId) : null,
        serviceFee: serviceFee || 0,
        total: total || 0,
      },
    });
    console.log("/sessions create:", {
      id: created.id,
      groupId: created.groupId,
    });
    return res.json(created);
  } catch (err) {
    console.error("POST /sessions error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: List sessions (by group or personal created)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: Sessions list
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const groupId =
      req.query.groupId != null ? Number(req.query.groupId) : undefined;
    const where =
      groupId && Number.isFinite(groupId)
        ? { groupId }
        : { creatorId: req.user.id };

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { id: "desc" },
      select: {
        id: true,
        creatorId: true,
        groupId: true,
        total: true,
        serviceFee: true,
        status: true,
        createdAt: true,
      },
    });
    return res.json(sessions);
  } catch (err) {
    console.error("GET /sessions error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /sessions/{sessionId}/close:
 *   patch:
 *     summary: Close a session (creator only)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Session closed
 */
router.patch(
  "/:sessionId/close",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const sessionId = Number(req.params.sessionId);
      if (!Number.isFinite(sessionId))
        return res.status(400).json({ error: "Invalid sessionId" });
      const s = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { creatorId: true, status: true },
      });
      if (!s) return res.status(404).json({ error: "Session not found" });
      if (s.creatorId !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });

      const updated = await prisma.session.update({
        where: { id: sessionId },
        data: { status: "CLOSED" },
      });
      console.log("/sessions close:", { id: sessionId });
      return res.json(updated);
    } catch (err) {
      console.error("PATCH /sessions/:sessionId/close error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /sessions/finalize:
 *   post:
 *     summary: Finalize a session by computing allocations for provided items & participants (purely computational for now)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, participants, items]
 *             properties:
 *               currency: { type: string, example: "JPY", nullable: true }
 *               sessionId: { type: integer }
 *               sessionName: { type: string }
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [uniqueId, username]
 *                   properties:
 *                     uniqueId: { type: string }
 *                     username: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, name, price, quantity, splitMode]
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     price: { type: number }
 *                     quantity: { type: number }
 *                     kind: { type: string, nullable: true }
 *                     splitMode: { type: string, enum: [equal, count] }
 *                     perPersonCount: { type: object, additionalProperties: { type: number } }
 *                     assignedTo: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Finalized allocations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId: { type: integer }
 *                 sessionName: { type: string, nullable: true }
 *                 status: { type: string }
 *                 finalizedAt: { type: string, format: date-time }
 *                 createdAt: { type: string, format: date-time }
 *                 currency: { type: string }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     currency: { type: string }
 *                     grandTotal: { type: number }
 *                     byParticipant:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           uniqueId: { type: string }
 *                           username: { type: string }
 *                           amountOwed: { type: number }
 *                           participantId: { type: string }
 *                           total: { type: number }
 *                     byItem:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           itemId: { type: string }
 *                           name: { type: string }
 *                           total: { type: number }
 *                           kind: { type: string, nullable: true }
 *                 allocations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       itemId: { type: string }
 *                       participantId: { type: string }
 *                       shareAmount: { type: number }
 *                       shareRatio: { type: number, nullable: true }
 *                       shareUnits: { type: number, nullable: true }
 */
router.post(
  "/finalize",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { sessionId, sessionName, participants, items } = req.body || {};
      const currency = normalizeCurrencyCode(req.body?.currency);
      const decimals = currencyDecimals(currency);
      const feeMode: FeeMode = req.body?.feeMode === "equal" ? "equal" : "proportional";
      if (!Number.isFinite(Number(sessionId))) {
        return sendError(res, 400, "VALIDATION_ERROR", "sessionId required");
      }
      if (!Array.isArray(participants) || participants.length === 0) {
        return sendError(res, 400, "VALIDATION_ERROR", "participants array required");
      }
      if (!Array.isArray(items) || items.length === 0) {
        return sendError(res, 400, "VALIDATION_ERROR", "items array required");
      }

      const session = await prisma.session.findUnique({
        where: { id: Number(sessionId) },
        select: { id: true, creatorId: true, createdAt: true },
      });
      if (!session) return sendError(res, 404, "SESSION_NOT_FOUND", "Session not found");
      if (session.creatorId !== req.user.id) {
        return sendError(res, 403, "SESSION_FORBIDDEN", "This receipt belongs to another account");
      }

      // canonical participant order (first occurrence wins): both the app and the server use it
      const pList: { uniqueId: string; username: string }[] = [];
      for (const p of participants) {
        const uniqueId = String(p?.uniqueId ?? "");
        if (uniqueId && !pList.some((x) => x.uniqueId === uniqueId)) {
          pList.push({ uniqueId, username: String(p?.username || uniqueId) });
        }
      }
      if (pList.length === 0) return sendError(res, 400, "VALIDATION_ERROR", "participants array required");
      const known = new Set(pList.map((p) => p.uniqueId));

      const lines: SplitLine[] = [];
      for (const raw of items as any[]) {
        const id = String(raw?.id ?? "");
        const name = String(raw?.name ?? "");
        const quantity = Number(raw?.quantity);
        const kind: LineKind = ["item", "fee", "tax", "tip", "discount"].includes(raw?.kind) ? raw.kind : "item";
        const unit = Number(raw?.unitPrice ?? raw?.price);
        const total = Number(raw?.totalPrice ?? unit * quantity);
        if (!id || !name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(total)) {
          return sendError(res, 400, "VALIDATION_ERROR", `Invalid item fields for id=${id}`);
        }
        if (kind !== "discount" && total < 0) {
          return sendError(res, 400, "VALIDATION_ERROR", `Negative price for item ${id}`);
        }
        const splitMode = raw?.splitMode === "count" ? "count" : "equal";
        const assignedTo: string[] = Array.isArray(raw?.assignedTo) ? raw.assignedTo.map(String) : [];
        const perPersonCount: Record<string, number> = {};
        for (const [pid, units] of Object.entries(raw?.perPersonCount ?? {})) {
          const u = Number(units);
          if (!Number.isFinite(u) || u < 0) return sendError(res, 400, "VALIDATION_ERROR", `Invalid count for ${pid}`);
          perPersonCount[pid] = u;
        }
        for (const pid of [...assignedTo, ...Object.keys(perPersonCount)]) {
          if (!known.has(pid)) return sendError(res, 400, "VALIDATION_ERROR", `Unknown participant ${pid} on item ${id}`);
        }
        lines.push({ id, name, kind, quantity, totalMinor: toMinor(total, decimals), splitMode, assignedTo, perPersonCount });
      }

      const result = computeSplit(lines, pList.map((p) => p.uniqueId), feeMode);
      if (!result.complete) {
        return sendError(res, 400, "ITEM_NOT_ASSIGNED", "Every item must be fully assigned before finalizing", {
          itemIds: result.incompleteItemIds,
        });
      }

      const money = (minor: number) => fromMinor(minor, decimals);
      const byParticipant = result.people.map((p) => {
        const info = pList.find((x) => x.uniqueId === p.uniqueId)!;
        return {
          uniqueId: p.uniqueId,
          username: info.username,
          amountOwed: money(p.totalMinor),
          participantId: p.uniqueId,
          total: money(p.totalMinor),
          itemsAmount: money(p.itemsMinor),
          feesAmount: money(p.feesMinor),
          lines: p.lines.map((l) => ({
            itemId: l.lineId,
            name: l.name,
            kind: l.kind,
            amount: money(l.amountMinor),
            ...(l.units !== undefined ? { units: l.units } : {}),
          })),
        };
      });
      const byItem = lines.map((l) => ({
        itemId: l.id,
        name: l.name,
        total: money(l.totalMinor),
        ...(l.kind !== "item" ? { kind: l.kind } : {}),
      }));
      const allocations = result.people.flatMap((p) =>
        p.lines.map((l) => ({
          itemId: l.lineId,
          participantId: p.uniqueId,
          shareAmount: money(l.amountMinor),
          ...(l.units !== undefined ? { shareUnits: l.units } : {}),
        }))
      );
      const grandTotal = money(result.grandTotalMinor);

      const createdAtIso = session.createdAt.toISOString();
      const finalizedAt = new Date();
      const finalizedAtIso = finalizedAt.toISOString();
      const responsePayload = {
        sessionId: Number(sessionId),
        sessionName: sessionName || null,
        status: "finalized",
        createdAt: createdAtIso,
        finalizedAt: finalizedAtIso,
        currency,
        feeMode,
        totals: { currency, grandTotal, byParticipant, byItem },
        allocations,
      } satisfies Record<string, unknown>;

      const participantUniqueIds = Array.from(new Set(byParticipant.map((p) => p.uniqueId))).sort();

      await prisma.sessionHistoryEntry.upsert({
        where: { sessionId: session.id },
        create: {
          sessionId: session.id,
          creatorId: session.creatorId,
          sessionName: sessionName ?? null,
          payload: responsePayload as Prisma.JsonObject,
          participantUniqueIds,
          grandTotal: grandTotal.toString(),
          currency,
          finalizedAt,
        },
        update: {
          sessionName: sessionName ?? null,
          payload: responsePayload as Prisma.JsonObject,
          participantUniqueIds,
          grandTotal: grandTotal.toString(),
          currency,
          finalizedAt,
        },
      });
      await prisma.session.update({ where: { id: session.id }, data: { status: "CLOSED", total: grandTotal.toString() } });

      return res.json(responsePayload);
    } catch (err) {
      logRouteError("POST /sessions/finalize error:", err);
      return sendError(res, 500, "SERVER_ERROR", "Server error");
    }
  }
);

/**
 * @swagger
 * /sessions/history:
 *   get:
 *     summary: Session finalize history for the current user
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *         description: Return full history when true (defaults to latest 5)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Override default result size when not requesting all
 *     responses:
 *       200:
 *         description: Session history entries
 */
router.get(
  "/history",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const requesterId = req.user.id;

      const userRecord = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { uniqueId: true },
      });
      if (!userRecord) {
        return res.status(404).json({ error: "User not found" });
      }

      const allParam = String(req.query.all ?? "").toLowerCase();
      const fetchAll = allParam === "1" || allParam === "true";

      let limit = 5;
      if (!fetchAll && req.query.limit != null) {
        const parsed = Number(req.query.limit);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return res
            .status(400)
            .json({ error: "limit must be a positive integer" });
        }
        limit = Math.min(Math.trunc(parsed), 50);
      }

      const filters: Prisma.SessionHistoryEntryWhereInput[] = [
        { creatorId: requesterId },
      ];
      if (userRecord.uniqueId) {
        filters.push({ participantUniqueIds: { has: userRecord.uniqueId } });
      }
      const whereFilter: Prisma.SessionHistoryEntryWhereInput =
        filters.length > 1 ? { OR: filters } : filters[0]!;

      const entries = await prisma.sessionHistoryEntry.findMany({
        where: whereFilter,
        orderBy: { finalizedAt: "desc" },
        ...(fetchAll ? {} : { take: limit }),
      });

      // Profile photos change: resolve them NOW from the users table instead of trusting the snapshot.
      const uniqueIds = Array.from(new Set(entries.flatMap((e) => e.participantUniqueIds)));
      const users = uniqueIds.length
        ? await prisma.user.findMany({ where: { uniqueId: { in: uniqueIds } }, select: { uniqueId: true, avatarUrl: true } })
        : [];
      const avatarByUid = new Map(users.map((u) => [u.uniqueId, resolveAvatarUrl(u.avatarUrl, req)]));
      const withAvatars = (payload: any) => {
        const bp = payload?.totals?.byParticipant;
        if (!Array.isArray(bp)) return payload;
        return {
          ...payload,
          totals: {
            ...payload.totals,
            byParticipant: bp.map((p: any) => ({ ...p, avatarUrl: avatarByUid.get(p.uniqueId) ?? null })),
          },
        };
      };

      const response = entries.map((entry) => ({
        sessionId: entry.sessionId,
        sessionName: entry.sessionName,
        finalizedAt: entry.finalizedAt.toISOString(),
        grandTotal: entry.grandTotal.toNumber(),
        currency: entry.currency,
        participantUniqueIds: entry.participantUniqueIds,
        isCreator: entry.creatorId === requesterId,
        payload: withAvatars(entry.payload),
      }));

      return res.json({
        scope: fetchAll ? "all" : "latest",
        count: response.length,
        limit: fetchAll ? null : limit,
        entries: response,
      });
    } catch (err) {
      console.error("GET /sessions/history error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * GET /sessions/:id — lightweight ownership/state check. The app uses it to detect a saved draft whose
 * session was deleted or belongs to another account (404 SESSION_NOT_FOUND / 403 SESSION_FORBIDDEN).
 */
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return sendError(res, 404, "SESSION_NOT_FOUND", "Session not found");
    const session = await prisma.session.findUnique({ where: { id }, select: { id: true, creatorId: true, status: true } });
    if (!session) return sendError(res, 404, "SESSION_NOT_FOUND", "Session not found");
    if (session.creatorId !== req.user.id) return sendError(res, 403, "SESSION_FORBIDDEN", "This receipt belongs to another account");
    return res.json({ id: session.id, status: session.status });
  } catch (err) {
    logRouteError("GET /sessions/:id error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;

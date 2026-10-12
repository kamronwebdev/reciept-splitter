import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../config/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { logRouteError, sendError } from "../utils/errors.js";
import { balancesFor } from "../services/settle.js";

const router = Router();

/**
 * @swagger
 * /balances:
 *   get:
 *     summary: What I am owed / what I owe (unpaid shares of finalized receipts), per currency and per person
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, uniqueId: true } });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    return res.json(await balancesFor(me, req));
  } catch (err) {
    logRouteError("GET /balances error:", err);
    return sendError(res, 500, "SERVER_ERROR", "Server error");
  }
});

export default router;

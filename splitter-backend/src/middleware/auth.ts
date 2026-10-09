import type { Request, Response, NextFunction } from "express";
import type { JwtPayload as LibJwtPayload } from "jsonwebtoken";
import jwtPkg from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { sendError } from "../utils/errors.js";
const jwt = jwtPkg as unknown as {
  verify: typeof jwtPkg.verify;
  decode: typeof jwtPkg.decode;
};
const { TokenExpiredError, JsonWebTokenError, NotBeforeError } = jwtPkg as any;

export interface JwtPayload {
  id: number;
  email: string;
  /** token version; must match User.tokenVersion */
  tv?: number;
  // optional fields from JWT standard
  iat?: number;
  exp?: number;
}

// Augment Express Request globally so req.user exists everywhere
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface AuthRequest extends Request {}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const DEBUG_AUTH =
      (process.env.DEBUG_AUTH || "").toLowerCase() === "true" ||
      process.env.DEBUG_AUTH === "1";
    const raw = req.headers["authorization"];
    if (typeof raw !== "string") {
      return sendError(res, 401, "UNAUTHORIZED", "Authorization required");
    }

    const [scheme, token] = raw.split(" ");
    if (!token || (scheme ?? "").toLowerCase() !== "bearer") {
      return sendError(res, 401, "TOKEN_INVALID", "Invalid token format");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set in .env");
    }

    const verified = jwt.verify(token, secret as string);
    const payload:
      | JwtPayload
      | (LibJwtPayload & { id?: unknown; email?: unknown }) =
      typeof verified === "string" ? ({} as any) : (verified as any);

    if (!payload || typeof payload.email !== "string") {
      return sendError(res, 401, "TOKEN_INVALID", "Invalid token");
    }

    // Некоторые клиенты могут сериализовать id как строку — пробуем привести
    const idValue =
      typeof payload.id === "number"
        ? payload.id
        : typeof payload.id === "string" && /^\d+$/.test(payload.id)
        ? Number(payload.id)
        : NaN;
    if (!Number.isFinite(idValue)) {
      return sendError(res, 401, "TOKEN_INVALID", "Invalid token (id)");
    }

    // Reject sessions revoked by a password reset/change (tokenVersion bump) or deleted users.
    const dbUser = await prisma.user.findUnique({
      where: { id: idValue },
      select: { tokenVersion: true },
    });
    if (!dbUser) {
      return sendError(res, 401, "SESSION_REVOKED", "Session is no longer valid");
    }
    const tokenTv = typeof payload.tv === "number" ? payload.tv : 0;
    if (tokenTv !== dbUser.tokenVersion) {
      return sendError(res, 401, "SESSION_REVOKED", "Session expired, please log in again");
    }

    const userPayload: JwtPayload = { id: idValue, email: payload.email };
    if (typeof payload.iat === "number") userPayload.iat = payload.iat;
    if (typeof payload.exp === "number") userPayload.exp = payload.exp;

    if (DEBUG_AUTH) {
      const now = Math.floor(Date.now() / 1000);
      const exp = typeof payload.exp === "number" ? payload.exp : undefined;
      const iat = typeof payload.iat === "number" ? payload.iat : undefined;
      // eslint-disable-next-line no-console
      console.log("[DEBUG_AUTH] token ok", {
        route: req.method + " " + req.originalUrl,
        now,
        iat,
        exp,
        secondsUntilExp: exp ? exp - now : undefined,
      });
    }
    req.user = userPayload;
    next();
  } catch (err) {
    const DEBUG_AUTH =
      (process.env.DEBUG_AUTH || "").toLowerCase() === "true" ||
      process.env.DEBUG_AUTH === "1";
    if (DEBUG_AUTH) {
      const raw = req.headers["authorization"];
      const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
      const decoded: any = token ? jwt.decode(token) : undefined;
      const now = Math.floor(Date.now() / 1000);
      // eslint-disable-next-line no-console
      console.error("[DEBUG_AUTH] JWT verify error", {
        route: req.method + " " + req.originalUrl,
        errName: (err as any)?.name,
        errMessage: (err as any)?.message,
        now,
        decodedExp: decoded?.exp,
        decodedIat: decoded?.iat,
        secondsUntilExp:
          typeof decoded?.exp === "number" ? decoded.exp - now : undefined,
      });
    } else {
      console.error("JWT verify error:", err);
    }

    if (err instanceof TokenExpiredError) {
      return sendError(res, 401, "TOKEN_EXPIRED", "Token expired");
    }
    if (err instanceof NotBeforeError) {
      return sendError(res, 401, "TOKEN_INVALID", "Token not active yet (nbf)");
    }
    if (err instanceof JsonWebTokenError) {
      return sendError(res, 401, "TOKEN_INVALID", "Invalid token");
    }
    return sendError(res, 401, "TOKEN_INVALID", "Invalid or expired token");
  }
}

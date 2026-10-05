import rateLimit from "express-rate-limit";
import { sendError } from "../utils/errors.js";

function limiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) =>
      sendError(res, 429, "RATE_LIMITED", "Too many requests, please try again later"),
  });
}

const MIN = 60 * 1000;

/** login / register: generous (shared NATs), mostly slows brute force */
export const authLimiter = limiter(15 * MIN, 50);
/** requesting reset codes (email sending) */
export const forgotPasswordLimiter = limiter(15 * MIN, 10);
/** guessing codes */
export const verifyCodeLimiter = limiter(15 * MIN, 30);
export const resetPasswordLimiter = limiter(15 * MIN, 15);

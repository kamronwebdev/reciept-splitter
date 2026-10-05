import type { Response } from "express";

export type AuthErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_EMAIL"
  | "INVALID_USERNAME"
  | "EMAIL_IN_USE"
  | "INVALID_CREDENTIALS"
  | "WEAK_PASSWORD"
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "INVALID_RESET_TOKEN"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "SESSION_REVOKED"
  | "USER_NOT_FOUND"
  | "WRONG_CURRENT_PASSWORD"
  | "INVALID_PASSWORD"
  | "FILE_REQUIRED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "SERVER_ERROR";

/** Responds with `{ error, code }` (human readable text + machine readable code). */
export function sendError(
  res: Response,
  status: number,
  code: AuthErrorCode,
  error: string,
  extra: Record<string, unknown> = {}
) {
  return res.status(status).json({ error, code, ...extra });
}

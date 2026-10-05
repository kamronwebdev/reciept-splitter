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
  | "SESSION_NOT_FOUND"
  | "SESSION_FORBIDDEN"
  | "ITEM_NOT_ASSIGNED"
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

/**
 * Logs an unexpected route error. In development the full error (name, message, Prisma code/meta, stack)
 * is printed so a 500 can never hide its cause; in production only name + message + code are logged.
 */
export function logRouteError(label: string, err: unknown) {
  const e = err as any;
  if (process.env.NODE_ENV === "production") {
    console.error(label, e?.name ?? "Error", e?.message ?? String(err), e?.code ?? "");
  } else {
    console.error(label, err instanceof Error ? err.stack ?? err.message : err, e?.code ? `\n  code: ${e.code}` : "", e?.meta ? `\n  meta: ${JSON.stringify(e.meta)}` : "");
  }
}

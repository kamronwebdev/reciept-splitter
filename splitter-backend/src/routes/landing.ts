import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { friendCodeLimiter } from "../middleware/rateLimit.js";
import { APP_SCHEME, ensureInviteCode, findUserByCode, normalizeInviteCode } from "../services/friendCode.js";
import { resolveAvatarUrl } from "../utils/avatar.js";

/**
 * Browser landing pages for invite QR codes. A QR scanned with the phone's normal camera (or a shared
 * link) opens one of these instead of "Cannot GET": who invited you + "Open in Receipt Splitter".
 */
const router = Router();

type Lang = "en" | "uz" | "ja";
const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    title: "Add me on Receipt Splitter",
    invites: "wants to be your friend on Receipt Splitter",
    open: "Open in Receipt Splitter",
    install: "Don't have the app yet? Install Receipt Splitter, then open Friends → Scan QR and scan this code again.",
    code: "Invite code",
    invalid: "This invite link is not valid anymore",
    invalidHint: "The code was reset or the link has expired. Ask your friend to show their QR code again.",
  },
  uz: {
    title: "Receipt Splitter'da do'st bo'laylik",
    invites: "sizni Receipt Splitter'da do'st qilmoqchi",
    open: "Receipt Splitter'da ochish",
    install: "Ilova hali yo'qmi? Receipt Splitter'ni o'rnating, so'ng Do'stlar → QR skanerlash orqali bu kodni qayta skanerlang.",
    code: "Taklif kodi",
    invalid: "Bu taklif havolasi endi yaroqsiz",
    invalidHint: "Kod yangilangan yoki havola muddati tugagan. Do'stingizdan QR kodini qayta ko'rsatishini so'rang.",
  },
  ja: {
    title: "Receipt Splitterで友達になろう",
    invites: "さんがReceipt Splitterで友達になりたがっています",
    open: "Receipt Splitterで開く",
    install: "アプリをお持ちでない場合は、Receipt Splitterをインストールし、「友達 → QRをスキャン」でこのコードをもう一度読み取ってください。",
    code: "招待コード",
    invalid: "この招待リンクは無効です",
    invalidHint: "コードがリセットされたか、リンクの有効期限が切れています。もう一度QRコードを見せてもらってください。",
  },
};

function pickLang(req: Request): Lang {
  const raw = String(req.query.lang || req.get("accept-language") || "").toLowerCase();
  if (raw.startsWith("uz")) return "uz";
  if (raw.startsWith("ja")) return "ja";
  return "en";
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Card = { username: string; uniqueId: string; avatarUrl: string | null };

function page(lang: Lang, body: string, title: string) {
  return `<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<style>
:root{--bg:#f4f6f8;--card:#fff;--text:#111827;--muted:#6b7280;--brand:#2ECC71;--onbrand:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0b0f14;--card:#151b23;--text:#f3f4f6;--muted:#9ca3af}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:var(--bg);color:var(--text);font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:16px}
.card{background:var(--card);border-radius:20px;padding:28px 22px;max-width:380px;width:100%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.08)}
.av{width:96px;height:96px;border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;justify-content:center;
background:var(--brand);color:var(--onbrand);font-size:38px;font-weight:700}
h1{font-size:22px;margin:14px 0 2px}.uid{color:var(--muted);margin:0 0 12px}.lead{margin:0 0 20px}
.btn{display:block;background:var(--brand);color:var(--onbrand);text-decoration:none;font-weight:700;border-radius:14px;padding:15px 18px;font-size:17px}
.note{color:var(--muted);font-size:14px;margin:18px 0 0}.code{font-family:ui-monospace,Menlo,monospace;letter-spacing:1px}
</style></head><body><main class="card">${body}</main></body></html>`;
}

function cardPage(req: Request, lang: Lang, user: Card, code: string) {
  const t = TEXT[lang];
  const avatar = resolveAvatarUrl(user.avatarUrl, req);
  const initials = esc((user.username || "?").trim().slice(0, 1).toUpperCase());
  const uid = `@${user.uniqueId.toLowerCase().replace("user#", "user")}`;
  const deepLink = `${APP_SCHEME}://f/${code}`;
  const body = `
${avatar ? `<img class="av" src="${esc(avatar)}" alt="">` : `<div class="av">${initials}</div>`}
<h1>${esc(user.username)}</h1>
<p class="uid">${esc(uid)}</p>
<p class="lead">${esc(user.username)} ${esc(t.invites!)}</p>
<a class="btn" href="${esc(deepLink)}">${esc(t.open!)}</a>
<p class="note">${esc(t.install!)}</p>
<p class="note">${esc(t.code!)}: <span class="code">${esc(code)}</span></p>`;
  return page(lang, body, `${user.username} · ${t.title}`);
}

function invalidPage(lang: Lang) {
  const t = TEXT[lang];
  return page(lang, `<h1>${esc(t.invalid!)}</h1><p class="note">${esc(t.invalidHint!)}</p>`, t.invalid!);
}

function send(res: Response, status: number, html: string) {
  res.status(status).set("Content-Type", "text/html; charset=utf-8").set("Cache-Control", "no-store").send(html);
}

/** GET /f/:code — permanent personal friend QR */
router.get("/f/:code", friendCodeLimiter, async (req: Request, res: Response) => {
  const lang = pickLang(req);
  try {
    const code = normalizeInviteCode(req.params.code);
    const user = await findUserByCode(code);
    if (!user || !code) return send(res, 404, invalidPage(lang));
    return send(res, 200, cardPage(req, lang, user, code));
  } catch (err) {
    console.error("GET /f/:code error:", err);
    return send(res, 500, invalidPage(lang));
  }
});

/** GET /friends/join?token=… — old (time-limited) friend QR codes opened in a browser */
router.get("/friends/join", friendCodeLimiter, async (req: Request, res: Response) => {
  const lang = pickLang(req);
  try {
    const token = String(req.query.token || "");
    const secret = process.env.FRIEND_INVITE_SECRET || process.env.JWT_SECRET || "";
    let inviterId: number | null = null;
    try {
      const decoded: any = jwt.verify(token, secret);
      if (decoded?.typ === "friend_invite") inviterId = Number(decoded.inviterId);
    } catch {
      inviterId = null;
    }
    if (!inviterId || !Number.isFinite(inviterId)) return send(res, 410, invalidPage(lang));
    const user = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { id: true, uniqueId: true, username: true, avatarUrl: true },
    });
    if (!user) return send(res, 410, invalidPage(lang));
    const code = await ensureInviteCode(user.id);
    return send(res, 200, cardPage(req, lang, user, code));
  } catch (err) {
    console.error("GET /friends/join error:", err);
    return send(res, 500, invalidPage(lang));
  }
});

export default router;

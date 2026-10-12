import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/**
 * SMTP (e.g. Gmail with an app password): sends to any address without owning a domain.
 * Configured by SMTP_USER + SMTP_PASS; host/port default to Gmail.
 */
let smtp: Transporter | null = null;
function getSmtp(): Transporter | null {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, ""); // Gmail shows app passwords in groups of 4
  if (!user || !pass) return null;
  if (!smtp) {
    const port = Number(process.env.SMTP_PORT || 465);
    smtp = nodemailer.createTransport({
      host: (process.env.SMTP_HOST || "smtp.gmail.com").trim(),
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return smtp;
}

function emailFrom(): string {
  const configured = (process.env.EMAIL_FROM || "").trim();
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const viaSmtp = !!smtpUser && !(process.env.RESEND_API_KEY || "").trim();
  // Gmail only sends as the signed-in account: the Resend test sender from .env.example would not fit
  if (viaSmtp && (!configured || configured.includes("@resend.dev"))) return `Receipt Splitter <${smtpUser}>`;
  return configured || "Receipt Splitter <onboarding@resend.dev>";
}

/** At startup: say where reset codes go, and check SMTP credentials early (a wrong app password shows here). */
export async function logEmailMode(): Promise<void> {
  const mode = emailMode();
  if (mode === "console") {
    console.log("[startup] Email: not configured, password reset codes are printed here ([DEV] Reset code ...)");
    return;
  }
  if (mode === "resend") {
    console.log("[startup] Email: Resend");
    return;
  }
  try {
    await getSmtp()!.verify();
    console.log(`[startup] Email: SMTP ${process.env.SMTP_HOST || "smtp.gmail.com"} as ${process.env.SMTP_USER} (OK)`);
  } catch (e) {
    console.error(`[startup] Email: SMTP login failed (${(e as Error).message}). Check SMTP_USER / SMTP_PASS (Gmail: use an app password).`);
  }
}

/** Which delivery the server will use. */
export function emailMode(): "resend" | "smtp" | "console" {
  if ((process.env.RESEND_API_KEY || "").trim()) return "resend";
  if (getSmtp()) return "smtp";
  return "console";
}

function resetEmailHtml(code: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td style="font-size:20px;font-weight:700;color:#1b1f23;">Reset your password</td></tr>
      <tr><td style="padding-top:12px;font-size:15px;color:#4a5560;line-height:22px;">
        Use the code below in the Receipt Splitter app to choose a new password.
      </td></tr>
      <tr><td align="center" style="padding:24px 0;">
        <div style="display:inline-block;font-size:36px;letter-spacing:10px;font-weight:800;color:#2ECC71;background:#f0fbf5;border-radius:10px;padding:14px 22px;">${code}</div>
      </td></tr>
      <tr><td style="font-size:13px;color:#7b8794;line-height:20px;">
        This code expires in 15 minutes. If you didn't request it, you can safely ignore this email.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/**
 * Sends the password reset code: Resend if RESEND_API_KEY is set, else SMTP if SMTP_USER/SMTP_PASS are set,
 * else it is printed to the console (development fallback, no email account needed).
 */
export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  const subject = `${code} is your Receipt Splitter reset code`;
  const html = resetEmailHtml(code);
  const text = `Your Receipt Splitter password reset code is ${code}. It expires in 15 minutes.`;

  const resend = getClient();
  if (resend) {
    const { error } = await resend.emails.send({ from: emailFrom(), to, subject, html, text });
    if (error) throw new Error(`Email provider error: ${error.message}`);
    return;
  }

  const transport = getSmtp();
  if (transport) {
    await transport.sendMail({ from: emailFrom(), to, subject, html, text });
    return;
  }

  console.log(`[DEV] Reset code for ${to}: ${code}`);
}

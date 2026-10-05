import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM || "Receipt Splitter <onboarding@resend.dev>";

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
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
 * Sends the password reset code. Without RESEND_API_KEY the code is printed to the console
 * (development fallback) so the flow can be tested without an email account.
 */
export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.log(`[DEV] Reset code for ${to}: ${code}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `${code} is your Receipt Splitter reset code`,
    html: resetEmailHtml(code),
    text: `Your Receipt Splitter password reset code is ${code}. It expires in 15 minutes.`,
  });
  if (error) {
    throw new Error(`Email provider error: ${error.message}`);
  }
}

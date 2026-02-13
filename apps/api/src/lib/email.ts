import nodemailer from "nodemailer";
import { config } from "../config.js";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return cachedTransporter;
}

type InviteEmailPayload = {
  to: string;
  inviter: string;
  workspace: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
};

function formatDate(date: Date) {
  return date.toLocaleString("it-IT", { timeZone: "Europe/Rome" });
}

function renderInviteTemplate(payload: InviteEmailPayload) {
  const expires = formatDate(payload.expiresAt);
  const preview = `Invito a ${payload.workspace} · scade ${expires}`;
  const html = `<!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invito APIScheduler</title>
  </head>
  <body style="margin:0;padding:0;background:#0f1115;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e6e7ea;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;width:100%;background:#151821;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35);">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(120deg,#11131a,#1b1f2b);">
                <div style="letter-spacing:0.26em;font-size:12px;text-transform:uppercase;color:#9aa4b2;">APIScheduler</div>
                <div style="font-size:24px;font-weight:700;margin-top:8px;">Invito al workspace</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#cfd6df;">
                  <strong style="color:#fff;">${payload.inviter}</strong> ti ha invitato a collaborare su
                  <strong style="color:#fff;">${payload.workspace}</strong> con ruolo <strong style="color:#fff;">${payload.role}</strong>.
                </p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#aab3c2;">
                  L'invito scade il <strong style="color:#fff;">${expires}</strong>.
                </p>
                <a href="${payload.inviteUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#0e0f14;color:#ffffff;text-decoration:none;border:1px solid rgba(255,255,255,0.08);font-weight:600;">
                  Accetta invito
                </a>
                <div style="margin-top:18px;font-size:12px;color:#7f8898;">
                  Se il pulsante non funziona, copia e incolla questo link nel browser:
                  <div style="margin-top:6px;color:#cfd6df;word-break:break-all;">${payload.inviteUrl}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#7f8898;">
                Questo invito è stato inviato da APIScheduler. Se non ti aspettavi questa email, puoi ignorarla.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
  const text = `Invito APIScheduler\n\n${payload.inviter} ti ha invitato a collaborare su ${payload.workspace} (ruolo ${payload.role}).\nScadenza: ${expires}\n\nAccetta invito:\n${payload.inviteUrl}\n\nSe non ti aspettavi questa email, ignora il messaggio.`;
  return { html, text, preview };
}

export async function sendInviteEmail(payload: InviteEmailPayload) {
  if (!config.smtp.host) return;
  const transporter = getTransporter();
  const { html, text } = renderInviteTemplate(payload);
  await transporter.sendMail({
    to: payload.to,
    from: config.smtp.from,
    subject: `Invito a ${payload.workspace}`,
    text,
    html,
  });
}

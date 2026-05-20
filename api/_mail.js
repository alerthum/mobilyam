const nodemailer = require("nodemailer");
const { resolveSmtpConfig } = require("./_smtpPresets");

function createTransport(smtpSettings) {
  const cfg = resolveSmtpConfig(smtpSettings);
  if (!cfg.enabled) throw new Error("SMTP gönderimi kapalı. Oda ayarlarından etkinleştirin.");
  if (!cfg.host || !cfg.user || !cfg.password) {
    throw new Error("SMTP host, kullanıcı ve şifre zorunludur.");
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password }
  });
}

async function sendMail(smtpSettings, { to, subject, html, text }) {
  const cfg = resolveSmtpConfig(smtpSettings);
  const transport = createTransport(cfg);
  const from = cfg.fromEmail
    ? cfg.fromName
      ? `"${cfg.fromName}" <${cfg.fromEmail}>`
      : cfg.fromEmail
    : cfg.user;
  await transport.sendMail({ from, to, subject, html, text: text || undefined });
}

module.exports = { sendMail };

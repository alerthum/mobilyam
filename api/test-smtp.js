const { getRemoteState } = require("./_db");
const { authenticateRequest, pickChamberBlock } = require("./_auth");
const { sendMail } = require("./_mail");
const { resolveSmtpConfig } = require("./_smtpPresets");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "Yalnızca POST" });
      return;
    }

    const payload = await getRemoteState();
    const user = authenticateRequest(req, payload.data);
    if (!user || user.role !== "chamber") {
      res.status(403).json({ error: "Yalnızca oda yönetimi test maili gönderebilir" });
      return;
    }

    const block = pickChamberBlock(payload.data, user.chamberId);
    const smtp =
      req.body?.smtpSettings && typeof req.body.smtpSettings === "object"
        ? req.body.smtpSettings
        : block?.smtpSettings;
    const cfg = resolveSmtpConfig(smtp);
    const to = String(req.body?.to || cfg.fromEmail || cfg.user || "").trim();
    if (!to) {
      res.status(400).json({ error: "Alıcı e-posta (to) zorunludur" });
      return;
    }

    await sendMail(smtp, {
      to,
      subject: "MOBAR — SMTP test maili",
      html: "<p>Bu bir test mesajıdır. Oda e-posta ayarlarınız çalışıyor.</p>",
      text: "Bu bir test mesajıdır. Oda e-posta ayarlarınız çalışıyor."
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "SMTP hatası" });
  }
};

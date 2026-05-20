const SMTP_PRESETS = {
  gmail: { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
  outlook: { label: "Outlook / Office 365", host: "smtp.office365.com", port: 587, secure: false },
  yahoo: { label: "Yahoo", host: "smtp.mail.yahoo.com", port: 587, secure: false },
  custom: { label: "Manuel", host: "", port: 587, secure: false }
};

function defaultSmtpSettings() {
  return {
    enabled: false,
    preset: "gmail",
    host: SMTP_PRESETS.gmail.host,
    port: SMTP_PRESETS.gmail.port,
    secure: false,
    user: "",
    password: "",
    fromEmail: "",
    fromName: ""
  };
}

function resolveSmtpConfig(raw) {
  const base = { ...defaultSmtpSettings(), ...(raw && typeof raw === "object" ? raw : {}) };
  const preset = SMTP_PRESETS[base.preset] || SMTP_PRESETS.custom;
  if (base.preset !== "custom") {
    base.host = preset.host;
    base.port = preset.port;
    base.secure = preset.secure;
  }
  base.port = Number(base.port) || 587;
  base.secure = Boolean(base.secure);
  return base;
}

module.exports = { SMTP_PRESETS, defaultSmtpSettings, resolveSmtpConfig };

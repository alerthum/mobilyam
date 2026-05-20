export const SMTP_PRESETS = {
  gmail: {
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    hint: "Google hesabında uygulama şifresi kullanın."
  },
  outlook: {
    label: "Outlook / Office 365",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    hint: "Kurumsal Microsoft 365 posta kutusu."
  },
  yahoo: {
    label: "Yahoo",
    host: "smtp.mail.yahoo.com",
    port: 587,
    secure: false,
    hint: "Yahoo uygulama şifresi gerekebilir."
  },
  custom: {
    label: "Manuel (kurumsal / özel)",
    host: "",
    port: 587,
    secure: false,
    hint: "Şirket sunucunuzun SMTP bilgilerini girin."
  }
};

export function defaultSmtpSettings() {
  const p = SMTP_PRESETS.gmail;
  return {
    enabled: false,
    preset: "gmail",
    host: p.host,
    port: p.port,
    secure: p.secure,
    user: "",
    password: "",
    fromEmail: "",
    fromName: ""
  };
}

export function applySmtpPreset(settings, presetId) {
  const preset = SMTP_PRESETS[presetId] || SMTP_PRESETS.custom;
  const next = { ...settings, preset: presetId };
  if (presetId !== "custom") {
    next.host = preset.host;
    next.port = preset.port;
    next.secure = preset.secure;
  }
  return next;
}

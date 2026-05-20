import React, { useState } from "react";
import { Mail, Send } from "lucide-react";
import Card, { CardHeader } from "../ui/Card.jsx";
import Field from "../inputs/Field.jsx";
import TextInput from "../inputs/TextInput.jsx";
import Button from "../ui/Button.jsx";
import { SMTP_PRESETS, applySmtpPreset } from "../../config/smtpPresets.js";
import { testSmtp } from "../../api/client.js";
import { useToast } from "../../context/ModalContext.jsx";

export default function SmtpSettingsSection({ settings, canEdit, onChange }) {
  const toast = useToast();
  const [testTo, setTestTo] = useState(settings?.fromEmail || settings?.user || "");
  const [testing, setTesting] = useState(false);
  const s = settings || {};

  function patch(partial) {
    onChange({ ...s, ...partial });
  }

  function setPreset(presetId) {
    onChange(applySmtpPreset(s, presetId));
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await testSmtp(testTo, s);
      if (res.ok) toast.success("Test maili gönderildi");
      else toast.error(res.error || "Gönderilemedi");
    } finally {
      setTesting(false);
    }
  }

  const presetHint = SMTP_PRESETS[s.preset]?.hint || "";

  return (
    <Card>
      <CardHeader
        icon={Mail}
        title="E-posta (SMTP)"
        subtitle="Sözleşme m² bildirimleri bu hesaptan gönderilir"
      />
      <div className="mt-4 space-y-4">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300"
            checked={s.enabled === true}
            disabled={!canEdit}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          <span className="text-sm font-semibold text-ink-900">SMTP gönderimini etkinleştir</span>
        </label>

        <Field label="Sağlayıcı">
          <select
            className="yk-input w-full"
            disabled={!canEdit}
            value={s.preset || "gmail"}
            onChange={(e) => setPreset(e.target.value)}
          >
            {Object.entries(SMTP_PRESETS).map(([id, p]) => (
              <option key={id} value={id}>
                {p.label}
              </option>
            ))}
          </select>
          {presetHint ? <p className="text-[11px] text-ink-500 mt-1">{presetHint}</p> : null}
        </Field>

        {s.preset === "custom" ? (
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="SMTP sunucu">
              <TextInput
                value={s.host}
                disabled={!canEdit}
                onChange={(v) => patch({ host: v })}
              />
            </Field>
            <Field label="Port">
              <TextInput
                value={String(s.port ?? 587)}
                disabled={!canEdit}
                onChange={(v) => patch({ port: Number(v) || 587 })}
              />
            </Field>
            <Field label="SSL/TLS (465)">
              <label className="inline-flex items-center gap-2 h-11 px-3 rounded-xl border border-ink-200">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={s.secure === true}
                  onChange={(e) => patch({ secure: e.target.checked })}
                />
                <span className="text-sm">secure</span>
              </label>
            </Field>
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="SMTP kullanıcı (e-posta)">
            <TextInput
              value={s.user}
              disabled={!canEdit}
              onChange={(v) => patch({ user: v })}
            />
          </Field>
          <Field label="SMTP şifre / uygulama şifresi">
            <TextInput
              type="password"
              value={s.password}
              disabled={!canEdit}
              onChange={(v) => patch({ password: v })}
            />
          </Field>
          <Field label="Gönderen e-posta">
            <TextInput
              value={s.fromEmail}
              disabled={!canEdit}
              onChange={(v) => patch({ fromEmail: v })}
            />
          </Field>
          <Field label="Gönderen adı">
            <TextInput
              value={s.fromName}
              disabled={!canEdit}
              onChange={(v) => patch({ fromName: v })}
            />
          </Field>
        </div>

        {canEdit ? (
          <div className="flex flex-col sm:flex-row gap-3 items-end pt-2 border-t border-ink-100">
            <Field label="Test alıcısı" className="flex-1 w-full">
              <TextInput value={testTo} onChange={setTestTo} placeholder="ornek@firma.com" />
            </Field>
            <Button
              icon={Send}
              variant="soft"
              disabled={testing || !testTo.trim()}
              onClick={handleTest}
            >
              {testing ? "Gönderiliyor…" : "Test maili gönder"}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

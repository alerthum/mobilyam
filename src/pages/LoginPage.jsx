import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../context/ModalContext.jsx";
import TextInput from "../components/inputs/TextInput.jsx";
import Field from "../components/inputs/Field.jsx";
import Button from "../components/ui/Button.jsx";
import Logo from "../components/ui/Logo.jsx";

const DEMO_PRODUCER = {
  username: "demo",
  password: "demo",
  label: "Mobilyacı"
};

export default function LoginPage() {
  const { login } = useApp();
  const { error: toastError } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(u, p) {
    if (busy) return;
    setBusy(true);
    const result = await login(u, p);
    setBusy(false);
    if (!result.ok) {
      toastError("Giriş başarısız", result.error || "Bilinmeyen hata");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit(username.trim(), password.trim());
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-surface-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 flex flex-col items-center">
          <Logo size={88} variant="tile" className="mb-4" />
          <p className="yk-eyebrow">Resmi Teklif Motoru</p>
          <h1 className="yk-display text-2xl text-ink-900 mt-2 leading-tight">
            Uşak Marangozlar
            <br />
            <span className="text-brand-500">Esnaf ve Sanatkarlar Odası</span>
          </h1>
          <p className="text-sm text-ink-500 mt-3">
            Sisteme giriş yapın ve resmi teklif yönetiminize devam edin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="yk-card p-6 sm:p-7 space-y-4">
          <Field label="Kullanıcı adı" required>
            <TextInput
              value={username}
              onChange={setUsername}
              placeholder="ör. demo"
              autoComplete="username"
            />
          </Field>
          <Field label="Şifre" required>
            <TextInput
              value={password}
              onChange={setPassword}
              placeholder="••••••"
              autoComplete="current-password"
              inputClassName="text-base"
              type="password"
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            icon={LogIn}
            disabled={busy}
          >
            {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
          </Button>
        </form>

        <div className="mt-6 yk-card p-5">
          <p className="yk-eyebrow mb-2">Hızlı demo girişi</p>
          <button
            type="button"
            onClick={() => submit(DEMO_PRODUCER.username, DEMO_PRODUCER.password)}
            className="yk-btn-soft w-full text-sm"
            disabled={busy}
          >
            {busy ? "Giriş yapılıyor…" : DEMO_PRODUCER.label}
          </button>
        </div>
      </div>
    </div>
  );
}

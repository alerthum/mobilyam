import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { formatDate } from "../utils/format.js";
import Logo from "../components/ui/Logo.jsx";

export default function VerifyPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Geçersiz bağlantı");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Kayıt bulunamadı");
          return;
        }
        if (!cancelled) setMember(data.member);
      } catch {
        if (!cancelled) setError("Sunucuya ulaşılamadı");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const statusTone =
    member?.status === "active"
      ? "text-success-600 bg-success-50 border-success-200"
      : member?.status === "expired"
        ? "text-warning-700 bg-warning-50 border-warning-200"
        : "text-ink-600 bg-ink-50 border-ink-200";

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col items-center justify-center p-6">
      <Logo size={56} variant="tile" className="mb-6" />
      <div className="w-full max-w-md rounded-2xl border border-ink-100 bg-white shadow-lg p-6">
        {loading ? (
          <p className="text-center text-ink-500 text-sm">Doğrulanıyor…</p>
        ) : error ? (
          <div className="text-center">
            <AlertCircle className="mx-auto text-danger-500 mb-2" size={32} />
            <p className="font-semibold text-ink-900">{error}</p>
          </div>
        ) : member ? (
          <>
            <div className="flex items-center gap-2 justify-center mb-4">
              <ShieldCheck className="text-brand-600" size={22} />
              <p className="yk-eyebrow">{member.chamberName}</p>
            </div>
            <h1 className="yk-display text-2xl text-center text-ink-900">{member.company || member.fullName}</h1>
            {member.company && member.fullName ? (
              <p className="text-center text-sm text-ink-600 mt-1">{member.fullName}</p>
            ) : null}
            <p className="text-center text-xs text-ink-500 mt-1">{member.role}</p>
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-center font-bold text-lg ${statusTone}`}
            >
              {member.statusLabel}
            </div>
            {member.licenseEndDate ? (
              <p className="mt-3 text-center text-sm text-ink-600">
                Lisans bitiş: <span className="font-semibold">{formatDate(member.licenseEndDate)}</span>
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

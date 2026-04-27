import React from "react";
import clsx from "clsx";
import { Loader2, AlertCircle } from "lucide-react";
import { useApp, useCurrentUser } from "../../context/AppContext.jsx";
import Logo from "../ui/Logo.jsx";

export default function TopBar({ title, subtitle, action }) {
  const { saveStatus } = useApp();
  const user = useCurrentUser();

  // Sadece kaydederken veya hata varsa minik bir göstergeyi göster.
  // "Canlı" / "Kaydedildi" gibi sürekli mesajları artık göstermiyoruz.
  const showStatus = saveStatus === "saving" || saveStatus === "error";

  return (
    <header className="sticky top-0 z-30 bg-surface-100/85 backdrop-blur-md border-b border-ink-100/60">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
        <Logo size={36} variant="tile" className="lg:hidden" />
        <div className="flex-1 min-w-0">
          {subtitle && <p className="yk-eyebrow truncate">{subtitle}</p>}
          {title && (
            <h2 className="yk-display text-lg sm:text-2xl text-ink-900 leading-tight truncate">
              {title}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[11px] font-semibold text-ink-700 truncate max-w-[160px]">
              {user?.fullName}
            </span>
            {showStatus && (
              <span
                className={clsx(
                  "yk-chip text-[10px] mt-0.5 inline-flex items-center gap-1",
                  saveStatus === "saving"
                    ? "bg-warning-50 text-warning-600"
                    : "bg-danger-50 text-danger-600"
                )}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 size={10} className="animate-spin" />
                    Kaydediliyor
                  </>
                ) : (
                  <>
                    <AlertCircle size={10} />
                    Kayıt hatası
                  </>
                )}
              </span>
            )}
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}

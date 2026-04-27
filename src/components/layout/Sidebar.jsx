import React from "react";
import clsx from "clsx";
import { LogOut, Loader2, AlertCircle } from "lucide-react";
import { navItemsForRole } from "../../config/nav.js";
import { useApp, useCurrentUser } from "../../context/AppContext.jsx";
import { useConfirm } from "../../context/ModalContext.jsx";
import Logo from "../ui/Logo.jsx";

export default function Sidebar({ activeView, onNavigate }) {
  const { logout, saveStatus } = useApp();
  const user = useCurrentUser();
  const items = navItemsForRole(user?.role);
  const confirm = useConfirm();

  async function handleLogout() {
    const ok = await confirm({
      variant: "warning",
      title: "Çıkış yapılsın mı?",
      description: "Aktif oturumunuz sonlandırılacak ve oturum kapatılacak.",
      confirmLabel: "Çıkış yap",
      cancelLabel: "Vazgeç"
    });
    if (ok) logout();
  }

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 h-screen sticky top-0 bg-white border-r border-ink-100 px-4 py-5 gap-4">
      <div className="px-1 py-2 flex items-center gap-3">
        <Logo size={48} variant="tile" />
        <div className="min-w-0">
          <p className="yk-eyebrow truncate">Resmi Teklif Motoru</p>
          <h1 className="mt-0.5 yk-display text-[15px] leading-tight text-ink-900 truncate">
            MOBAR <span className="text-brand-500">2026</span>
          </h1>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition",
                active
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-surface-100 hover:text-ink-900"
              )}
            >
              <Icon size={18} strokeWidth={2.2} className={clsx(active ? "text-brand-400" : "text-ink-400")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <div className="rounded-xl bg-surface-100 p-3">
          <p className="yk-eyebrow">Aktif Oturum</p>
          <p className="text-sm font-bold text-ink-900 mt-1 truncate">
            {user?.fullName || "—"}
          </p>
          <p className="text-xs text-ink-500 truncate">
            {user?.company || ""}
          </p>
          {(saveStatus === "saving" || saveStatus === "error") && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className={clsx(
                  "yk-chip text-[10px] inline-flex items-center gap-1",
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
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="yk-btn-ghost w-full"
        >
          <LogOut size={16} />
          Çıkış yap
        </button>
      </div>
    </aside>
  );
}

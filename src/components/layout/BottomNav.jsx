import React from "react";
import clsx from "clsx";
import { bottomTabsForRole } from "../../config/nav.js";
import { useCurrentUser } from "../../context/AppContext.jsx";

/**
 * Mobil alt gezinme — koyu çubuk, oda-seçici ile aynı gradient-ikon dili.
 * Yükseklik düşük tutulur (ikon ~32px + tek satır etiket).
 */
export default function BottomNav({ activeView, onNavigate }) {
  const user = useCurrentUser();
  const tabs = bottomTabsForRole(user?.role);
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-[100] yk-safe-bottom"
      aria-label="Mobil sekme çubuğu"
    >
      <div
        className="mx-auto max-w-lg border-t border-white/10 bg-gradient-to-b from-[#0c1222] via-[#0a0f1a] to-[#06080f] shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)"
        }}
      >
        <div className="flex items-end justify-between gap-0.5 px-2 pt-1.5 pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate?.(tab.id)}
                className={clsx(
                  "group flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1 transition active:scale-[0.97]",
                  active ? "text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                    active
                      ? "bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-md shadow-black/40 ring-1 ring-white/20"
                      : "bg-white/[0.07] text-slate-400 ring-1 ring-white/5 group-hover:bg-white/10 group-hover:text-slate-200"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 2} aria-hidden />
                </span>
                <span
                  className={clsx(
                    "max-w-full truncate px-0.5 text-[8px] font-semibold leading-tight tracking-wide",
                    active ? "text-slate-100" : "text-slate-500"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

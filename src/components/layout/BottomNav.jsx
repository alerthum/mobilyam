import React from "react";
import clsx from "clsx";
import { bottomTabsForRole } from "../../config/nav.js";
import { useCurrentUser } from "../../context/AppContext.jsx";

export default function BottomNav({ activeView, onNavigate }) {
  const user = useCurrentUser();
  const tabs = bottomTabsForRole(user?.role);
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ink-100 yk-safe-bottom"
      style={{ boxShadow: "0 -10px 28px -16px rgba(11,12,16,0.10)" }}
    >
      <div className="flex items-stretch justify-around px-1 pt-2 pb-2 max-w-xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          const handleClick = () => onNavigate?.(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={handleClick}
              className={clsx(
                "flex-1 flex flex-col items-center gap-1 py-1.5 transition relative",
                active ? "text-brand-500" : "text-ink-400 hover:text-ink-700"
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 2}
                className="transition"
              />
              <span
                className={clsx(
                  "text-[10px] font-semibold leading-none",
                  active ? "text-brand-600" : "text-ink-500"
                )}
              >
                {tab.label}
              </span>
              {active && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

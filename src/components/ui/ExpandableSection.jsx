import React, { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export default function ExpandableSection({
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  badge,
  children,
  className
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={clsx("yk-card overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left transition hover:bg-surface-100"
        aria-expanded={open}
      >
        {Icon && (
          <span className="shrink-0 w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon size={18} strokeWidth={2.2} />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-ink-900 truncate">
            {title}
          </span>
          {subtitle && (
            <span className="block text-xs text-ink-500 mt-0.5 truncate">
              {subtitle}
            </span>
          )}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
        <ChevronDown
          size={18}
          className={clsx(
            "shrink-0 text-ink-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 -mt-1 yk-animate-fade">
          {children}
        </div>
      )}
    </div>
  );
}

import React from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X
} from "lucide-react";

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle2,
    bar: "bg-success-500",
    iconColor: "text-success-600",
    iconBg: "bg-success-50"
  },
  error: {
    icon: AlertCircle,
    bar: "bg-danger-500",
    iconColor: "text-danger-600",
    iconBg: "bg-danger-50"
  },
  warning: {
    icon: AlertTriangle,
    bar: "bg-warning-500",
    iconColor: "text-warning-600",
    iconBg: "bg-warning-50"
  },
  info: {
    icon: Info,
    bar: "bg-brand-500",
    iconColor: "text-brand-600",
    iconBg: "bg-brand-50"
  }
};

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-[110] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => {
        const cfg = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className="pointer-events-auto bg-white yk-pop rounded-xl flex items-stretch gap-3 pr-3 pl-0 py-3 sm:w-96 w-full yk-animate-pop overflow-hidden border border-ink-100/60"
          >
            <span className={clsx("w-1.5 shrink-0", cfg.bar)} />
            <span
              className={clsx(
                "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
                cfg.iconBg
              )}
            >
              <Icon size={18} className={cfg.iconColor} />
            </span>
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="text-sm font-semibold text-ink-900 truncate">
                  {t.title}
                </p>
              )}
              {t.description && (
                <p className="text-sm text-ink-600 mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="self-start text-ink-400 hover:text-ink-700 p-1"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

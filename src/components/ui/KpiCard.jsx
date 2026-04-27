import React from "react";
import clsx from "clsx";

export default function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "brand",
  className
}) {
  const accents = {
    brand: { bg: "bg-brand-50", text: "text-brand-600" },
    accent: { bg: "bg-accent-100", text: "text-accent-600" },
    success: { bg: "bg-success-50", text: "text-success-600" },
    warning: { bg: "bg-warning-50", text: "text-warning-600" },
    danger: { bg: "bg-danger-50", text: "text-danger-600" },
    ink: { bg: "bg-ink-900", text: "text-white" }
  };
  const a = accents[accent] || accents.brand;

  return (
    <div className={clsx("yk-card p-4 sm:p-5 flex items-start gap-3", className)}>
      {Icon && (
        <div
          className={clsx(
            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
            a.bg,
            a.text
          )}
        >
          <Icon size={18} strokeWidth={2.2} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="yk-eyebrow truncate">{label}</p>
        <p className="text-2xl font-extrabold text-ink-900 mt-1 tabular-nums truncate tracking-tight">
          {value}
        </p>
        {hint && <p className="text-xs text-ink-500 mt-1 truncate">{hint}</p>}
      </div>
    </div>
  );
}

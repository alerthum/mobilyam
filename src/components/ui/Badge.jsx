import React from "react";
import clsx from "clsx";

const VARIANTS = {
  default: "bg-surface-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700",
  dark: "bg-ink-900 text-white",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600"
};

export default function Badge({ children, variant = "default", icon: Icon, className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        VARIANTS[variant],
        className
      )}
    >
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

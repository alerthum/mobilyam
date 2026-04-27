import React from "react";
import clsx from "clsx";

const VARIANTS = {
  default: "bg-surface-100 hover:bg-surface-200 text-ink-700",
  ghost: "bg-transparent hover:bg-surface-100 text-ink-500 hover:text-ink-800",
  brand: "bg-brand-50 hover:bg-brand-100 text-brand-600",
  dark: "bg-ink-900 hover:bg-ink-800 text-white",
  danger: "bg-danger-50 hover:bg-danger-100 text-danger-600",
  success: "bg-success-50 hover:bg-success-100 text-success-600",
  warning: "bg-warning-50 hover:bg-warning-100 text-warning-600"
};

export default function IconButton({
  icon: Icon,
  variant = "ghost",
  size = 36,
  ariaLabel,
  className,
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-50",
        VARIANTS[variant],
        className
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      {Icon && <Icon size={Math.round(size * 0.5)} />}
    </button>
  );
}

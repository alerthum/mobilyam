import React from "react";
import clsx from "clsx";

/**
 * Premium switch — ATR uyumlu, mobil dostu.
 */
export default function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={clsx(
        "w-full flex items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3 transition",
        checked
          ? "border-brand-500 ring-4 ring-brand-50"
          : "border-ink-200 hover:border-ink-300",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <span className="flex flex-col text-left">
        {label && (
          <span className="text-sm font-bold text-ink-900">{label}</span>
        )}
        {description && (
          <span className="text-xs text-ink-500 mt-0.5">{description}</span>
        )}
      </span>
      <span
        className={clsx(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-brand-500" : "bg-ink-200"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

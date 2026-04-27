import React from "react";
import clsx from "clsx";

/**
 * Form alanı sarmalayıcı: label + alt açıklama + hata mesajı.
 * SmartTextInput'larla birlikte kullanılır.
 */
export default function Field({
  label,
  hint,
  error,
  children,
  className,
  required = false
}) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[13px] font-bold text-ink-800 flex items-center gap-1">
          {label}
          {required && <span className="text-danger-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && (
        <span className="text-xs text-ink-500">{hint}</span>
      )}
      {error && <span className="text-xs text-danger-600">{error}</span>}
    </label>
  );
}

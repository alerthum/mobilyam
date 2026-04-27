import React, { useEffect } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

/**
 * Premium modal — beyaz arka plan, soft shadow, smooth animasyon.
 *  - Esc kapatır
 *  - Backdrop tıklaması kapatır (closeOnBackdrop=false ile devre dışı)
 *  - Mobilde alttan kayar, desktop'ta merkezde fade+pop
 */
export default function Modal({
  open,
  onClose,
  children,
  size = "md",
  closeOnBackdrop = true,
  showClose = true,
  className,
  title
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === "sm"
      ? "max-w-sm"
      : size === "lg"
        ? "max-w-3xl"
        : size === "xl"
          ? "max-w-5xl"
          : "max-w-md";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm yk-animate-fade"
        onClick={() => closeOnBackdrop && onClose?.()}
        aria-hidden="true"
      />
      <div
        className={clsx(
          "relative w-full sm:w-auto sm:min-w-[420px]",
          "bg-white rounded-t-2xl sm:rounded-2xl yk-pop",
          "yk-animate-slide sm:yk-animate-pop",
          "yk-safe-bottom max-h-[90vh] overflow-hidden flex flex-col",
          sizeClass,
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {showClose && (
          <button
            type="button"
            onClick={() => onClose?.()}
            className="absolute top-3 right-3 p-2 rounded-full text-ink-500 hover:bg-surface-100 transition z-10"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

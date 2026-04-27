import React from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Info,
  AlertCircle
} from "lucide-react";
import Modal from "./Modal.jsx";

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: "bg-danger-50",
    iconColor: "text-danger-600",
    btn: "yk-btn-danger",
    btnLabel: "Sil"
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-warning-50",
    iconColor: "text-warning-600",
    btn: "yk-btn bg-warning-500 text-white hover:bg-warning-600",
    btnLabel: "Devam et"
  },
  important: {
    icon: AlertCircle,
    iconBg: "bg-accent-100",
    iconColor: "text-accent-600",
    btn: "yk-btn bg-accent-500 text-white hover:bg-accent-600",
    btnLabel: "Onayla"
  },
  success: {
    icon: CheckCircle2,
    iconBg: "bg-success-50",
    iconColor: "text-success-600",
    btn: "yk-btn bg-success-500 text-white hover:bg-success-600",
    btnLabel: "Tamam"
  },
  info: {
    icon: Info,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
    btn: "yk-btn-primary",
    btnLabel: "Tamam"
  }
};

/**
 * Confirmation / status diyalogu.
 *
 * Props:
 *  - variant: "danger" | "warning" | "important" | "success" | "info"
 *  - title, description
 *  - confirmLabel, cancelLabel
 *  - onConfirm, onCancel
 *  - hideCancel: sadece bilgi göstermek için
 */
export default function StatusModal({
  open,
  variant = "info",
  title,
  description,
  confirmLabel,
  cancelLabel = "İptal",
  onConfirm,
  onCancel,
  hideCancel = false,
  loading = false
}) {
  const cfg = VARIANTS[variant] || VARIANTS.info;
  const Icon = cfg.icon;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      closeOnBackdrop={!loading}
      showClose={!loading}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
              cfg.iconBg
            )}
          >
            <Icon size={22} className={cfg.iconColor} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-bold text-ink-900 leading-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1.5 text-sm text-ink-600 leading-relaxed whitespace-pre-line">
                {description}
              </p>
            )}
          </div>
        </div>

        <div
          className={clsx(
            "mt-6 flex gap-2",
            hideCancel ? "justify-end" : "flex-col-reverse sm:flex-row sm:justify-end"
          )}
        >
          {!hideCancel && (
            <button
              type="button"
              className="yk-btn-ghost flex-1 sm:flex-none"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={clsx(cfg.btn, "flex-1 sm:flex-none")}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "İşleniyor…" : confirmLabel || cfg.btnLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

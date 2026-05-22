import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import Modal from "../modals/Modal.jsx";
import Badge from "../ui/Badge.jsx";
import { memberVerifyUrl } from "../../utils/verifyUrl.js";
import { formatDate } from "../../utils/format.js";

function licenseBadge(user) {
  if (user?.status === "passive") return { label: "Pasif üye", variant: "default" };
  if (user?.licenseEndDate && user.licenseEndDate < new Date().toISOString().slice(0, 10)) {
    return { label: "Süresi dolmuş", variant: "warning" };
  }
  return { label: "Aktif üye", variant: "success" };
}

export default function MemberQrButton({ user, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [thumbUrl, setThumbUrl] = useState("");
  const [modalUrl, setModalUrl] = useState("");

  const url = memberVerifyUrl(user?.verifyToken);
  const badge = licenseBadge(user);
  const isSmall = size === "sm";

  useEffect(() => {
    if (!isSmall || !url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 72, margin: 1 })
      .then((d) => {
        if (!cancelled) setThumbUrl(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSmall, url]);

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setModalUrl("");
    QRCode.toDataURL(url, { width: 280, margin: 2 })
      .then((d) => {
        if (!cancelled) setModalUrl(d);
      })
      .catch(() => {
        if (!cancelled) setModalUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  if (!user?.verifyToken) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          isSmall
            ? "inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white p-1.5 hover:bg-ink-50 transition shrink-0 touch-manipulation"
            : "inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50 touch-manipulation"
        }
        title="Üyelik QR"
        aria-label="Üyelik QR kodu"
      >
        {isSmall && thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-9 h-9 rounded" />
        ) : (
          <QrCode size={isSmall ? 20 : 18} />
        )}
        {!isSmall ? <span>QR</span> : null}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} size="md" className="max-w-sm">
        <div className="p-5 sm:p-6 text-center">
          <p className="yk-eyebrow">Üyelik doğrulama</p>
          <h3 className="yk-display text-lg sm:text-xl text-ink-900 mt-1">
            {user.company || user.fullName}
          </h3>
          <div className="mt-4 flex justify-center">
            {modalUrl ? (
              <img
                src={modalUrl}
                alt="QR kod"
                className="w-[min(280px,78vw)] h-[min(280px,78vw)] max-w-full rounded-xl border border-ink-100"
              />
            ) : (
              <div className="w-[min(280px,78vw)] aspect-square max-w-full rounded-xl bg-ink-50 animate-pulse" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {user.licenseEndDate ? (
              <span className="text-xs text-ink-500">Lisans bitiş: {formatDate(user.licenseEndDate)}</span>
            ) : null}
          </div>
          <p className="mt-3 text-[11px] text-ink-500 break-all px-1">{url}</p>
        </div>
      </Modal>
    </>
  );
}

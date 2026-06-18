import React, { useEffect, useState } from "react";
import { Loader2, FileDown } from "lucide-react";
import Modal from "../modals/Modal.jsx";
import Button from "../ui/Button.jsx";
import { fetchCutListBlob, downloadCutList } from "../../api/client.js";
import { useToast } from "../../context/ModalContext.jsx";

function isPdf(mimeType, fileName) {
  if (mimeType === "application/pdf") return true;
  return String(fileName || "").toLowerCase().endsWith(".pdf");
}

function isImage(mimeType, fileName) {
  if (String(mimeType || "").startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(String(fileName || ""));
}

export default function CutListPreviewModal({ open, onClose, quoteId, item }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState("");
  const [mimeType, setMimeType] = useState("");

  useEffect(() => {
    if (!open || !item?.id || !quoteId) {
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setMimeType("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const result = await fetchCutListBlob(quoteId, item.id);
        if (cancelled) return;
        const url = URL.createObjectURL(result.blob);
        setObjectUrl(url);
        setMimeType(result.mimeType || item.mimeType || "");
      } catch (err) {
        if (!cancelled) toast.error(err.message || "Önizleme yüklenemedi");
        onClose?.();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, item?.id, quoteId, item?.mimeType]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!item) return null;

  const pdf = isPdf(mimeType, item.fileName);
  const image = isImage(mimeType, item.fileName);

  return (
    <Modal open={open} onClose={onClose} size="xl" title={item.fileName || "Kesim listesi"}>
      <div className="px-4 pb-4 pt-10 flex flex-col gap-3 min-h-[50vh]">
        <p className="text-xs text-ink-500 truncate pr-6">{item.fileName}</p>

        <div className="flex-1 min-h-[55vh] sm:min-h-[60vh] rounded-xl border border-ink-100 bg-surface-50 overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-ink-500 py-16">
              <Loader2 size={28} className="animate-spin text-brand-500" />
              <span className="text-sm">Yükleniyor…</span>
            </div>
          ) : image && objectUrl ? (
            <img
              src={objectUrl}
              alt={item.fileName}
              className="max-w-full max-h-[min(70vh,720px)] w-auto h-auto object-contain"
            />
          ) : pdf && objectUrl ? (
            <iframe
              src={objectUrl}
              title={item.fileName}
              className="w-full h-[min(70vh,720px)] border-0 bg-white"
            />
          ) : objectUrl ? (
            <iframe
              src={objectUrl}
              title={item.fileName}
              className="w-full h-[min(70vh,720px)] border-0 bg-white"
            />
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            icon={FileDown}
            onClick={() => downloadCutList(quoteId, item.id, item.fileName)}
          >
            İndir
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}

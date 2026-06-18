import React, { useRef, useState } from "react";
import { FileUp, FileDown, Trash2, Scissors, Loader2, Clock } from "lucide-react";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { uploadCutList, deleteCutList, downloadCutList } from "../../api/client.js";
import { useApp } from "../../context/AppContext.jsx";
import { useConfirm, useToast } from "../../context/ModalContext.jsx";

const ACCEPT = ".pdf,image/jpeg,image/png,image/webp";

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatExpiry(iso, uploadedAt) {
  let target = iso;
  if (!target && uploadedAt) {
    const t = Date.parse(uploadedAt);
    if (Number.isFinite(t)) target = new Date(t + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (!target) return "";
  try {
    return new Date(target).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

export default function CutListPanel({ quoteId, items = [], compact = false }) {
  const { refreshRemote } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function handlePickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !quoteId) return;
    setBusy(true);
    const res = await uploadCutList(quoteId, file);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error || "Kesim listesi yüklenemedi");
      return;
    }
    await refreshRemote();
    toast.success("Kesim listesi eklendi (30 gün saklanır)");
  }

  async function handleDelete(item) {
    const ok = await confirm({
      variant: "danger",
      title: "Kesim listesi silinsin mi?",
      description: `${item.fileName} kalıcı olarak kaldırılacak.`,
      confirmLabel: "Sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    setBusyId(item.id);
    const res = await deleteCutList(quoteId, item.id);
    setBusyId("");
    if (!res.ok) {
      toast.error(res.error || "Silinemedi");
      return;
    }
    await refreshRemote();
    toast.success("Kesim listesi silindi");
  }

  async function handleDownload(item) {
    setBusyId(item.id);
    try {
      await downloadCutList(quoteId, item.id, item.fileName);
    } catch (err) {
      toast.error(err.message || "İndirilemedi");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500 leading-relaxed">
          Cut List Optimizer veya benzeri programdan PDF / resim yükleyin. Dosyalar{" "}
          <strong className="text-ink-700">30 gün</strong> saklanır, sonra otomatik silinir.
        </p>
        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handlePickFile}
          />
          <Button
            size="sm"
            variant="soft"
            icon={busy ? Loader2 : FileUp}
            disabled={busy || !quoteId}
            className={busy ? "[&_svg]:animate-spin" : ""}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Yükleniyor…" : "Dosya ekle"}
          </Button>
        </div>
      </div>

      {!items.length ? (
        <EmptyState
          icon={Scissors}
          title="Henüz kesim listesi yok"
          description="PDF veya görsel yükleyerek bu teklife bağlayın."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-surface-50 px-3 py-2.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-ink-100 text-brand-600">
                <Scissors size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900 truncate">{item.fileName}</p>
                <p className="text-[11px] text-ink-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{formatBytes(item.sizeBytes)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} />
                    Silinme: {formatExpiry(item.expiresAt, item.uploadedAt)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton
                  icon={busyId === item.id ? Loader2 : FileDown}
                  variant="ghost"
                  ariaLabel="İndir"
                  disabled={busyId === item.id}
                  className={busyId === item.id ? "[&_svg]:animate-spin" : ""}
                  onClick={() => handleDownload(item)}
                />
                <IconButton
                  icon={Trash2}
                  variant="ghost"
                  ariaLabel="Sil"
                  disabled={busyId === item.id}
                  onClick={() => handleDelete(item)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

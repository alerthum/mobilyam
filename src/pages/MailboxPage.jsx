import React, { useMemo, useState } from "react";
import { Mail, ChevronRight } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/modals/Modal.jsx";
import { useApp } from "../context/AppContext.jsx";
import { formatDateTime } from "../utils/format.js";

export default function MailboxPage() {
  const { remote } = useApp();
  const [selected, setSelected] = useState(null);

  const items = useMemo(() => {
    const list = remote?.partnerMailOutbox || [];
    return [...list].sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)));
  }, [remote?.partnerMailOutbox]);

  return (
    <>
      <TopBar title="Posta kutusu" subtitle="Anlaşmalı firmalara gönderilen m² bildirimleri" />
      <div className="px-4 sm:px-6 pb-8 max-w-3xl mx-auto">
        {items.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Gönderilmiş mail yok"
            description="Sözleşmeye çevrilmiş tekliflerden anlaşmalı firmaya iş birliği bildirimi gönderebilirsiniz."
          />
        ) : (
          <Card padded={false}>
            <div className="divide-y divide-ink-100">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-ink-50/80 transition"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-900 truncate">
                      {item.partnerName} — #{item.quoteNumber}
                    </p>
                    <p className="text-xs text-ink-500 truncate">
                      {item.projectName} · {formatDateTime(item.sentAt)}
                    </p>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      Toplam {item.summary?.totalM2 ?? "—"}
                    </p>
                  </div>
                  <Badge variant={item.status === "sent" ? "success" : "danger"}>
                    {item.status === "sent" ? "Gönderildi" : "Hata"}
                  </Badge>
                  <ChevronRight size={16} className="text-ink-400 shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {selected ? (
        <MailDetailModal item={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}

function MailDetailModal({ item, onClose }) {
  const snap = item.reportSnapshot || {};
  return (
    <Modal open onClose={onClose} size="lg">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        <p className="yk-eyebrow">Gönderim detayı</p>
        <h3 className="yk-display text-xl text-ink-900 mt-1">
          {item.partnerName} — #{item.quoteNumber}
        </h3>
        <p className="text-sm text-ink-600 mt-1">
          {item.projectName} · {formatDateTime(item.sentAt)} · {item.partnerEmail}
        </p>
        {item.status === "failed" && item.errorMessage ? (
          <p className="mt-2 text-sm text-danger-600">{item.errorMessage}</p>
        ) : null}
        <div className="mt-6 rounded-xl border border-ink-100 bg-surface-50 p-5 space-y-3 text-sm">
          <p>
            <span className="text-ink-500">Toplam m²:</span>{" "}
            <strong className="text-ink-900">{snap.totalM2 || item.summary?.totalM2 || "—"}</strong>
          </p>
          <p>
            <span className="text-ink-500">Mobilyacı:</span>{" "}
            <strong>
              {snap.producerCompany || snap.producerName || "—"}
            </strong>
            {snap.producerUsername ? (
              <span className="text-ink-600"> ({snap.producerUsername})</span>
            ) : null}
          </p>
          {snap.producerPhone ? (
            <p>
              <span className="text-ink-500">İletişim:</span>{" "}
              <strong>{snap.producerPhone}</strong>
            </p>
          ) : null}
          <p className="text-xs text-ink-500 pt-2 border-t border-ink-100">
            Firmaya kesim listesi ve detaylar için mobilyacı ile iletişime geçmesi istendi.
          </p>
        </div>
      </div>
    </Modal>
  );
}

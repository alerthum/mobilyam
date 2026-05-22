import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { Send, Building2, CheckCircle2, Mail } from "lucide-react";
import Modal from "../modals/Modal.jsx";
import Button from "../ui/Button.jsx";
import { buildPartnerInviteSnapshot } from "../../utils/m2Report.js";
import { sendPartnerMail } from "../../api/client.js";
import { useApp } from "../../context/AppContext.jsx";
import { useToast } from "../../context/ModalContext.jsx";

export default function SendPartnerMailModal({
  open,
  onClose,
  quote,
  user,
  chamberName
}) {
  const { remote, updateRemote } = useApp();
  const toast = useToast();
  const [partnerId, setPartnerId] = useState("");
  const [sending, setSending] = useState(false);

  const partners = useMemo(
    () => (remote?.agreedPartners || []).filter((p) => p.status !== "passive" && p.email),
    [remote?.agreedPartners]
  );

  const snapshot = useMemo(() => {
    if (!quote) return null;
    return buildPartnerInviteSnapshot(
      quote,
      remote?.qualities || [],
      remote?.countertopCatalog || [],
      { chamberName },
      user
    );
  }, [quote, remote?.qualities, remote?.countertopCatalog, chamberName, user]);

  const selectedPartner = partners.find((p) => p.id === partnerId);

  async function handleSend() {
    if (!partnerId || !snapshot) return;
    setSending(true);
    try {
      const res = await sendPartnerMail(quote.id, partnerId, snapshot);
      if (res.outboxItem) {
        updateRemote((d) => {
          d.partnerMailOutbox = [...(d.partnerMailOutbox || []), res.outboxItem];
        });
      }
      if (res.ok) {
        toast.success("Mail gönderildi — Posta kutusunda görüntüleyebilirsiniz");
        onClose();
      } else {
        toast.error(res.error || "Gönderilemedi");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md" className="max-w-lg">
      <div className="p-5 sm:p-6 max-h-[min(88vh,100dvh-2rem)] overflow-y-auto">
        <p className="yk-eyebrow">Anlaşmalı firmaya bildir</p>
        <h3 className="yk-display text-xl text-ink-900 mt-1">
          {quote?.projectName} — #{quote?.number}
        </h3>
        <p className="text-xs text-ink-500 mt-1 leading-relaxed">
          Firmaya yalnızca toplam m² ve iş birliği talebi gider; kesim listesi için sizin iletişim
          bilgileriniz paylaşılır.
        </p>

        {snapshot ? (
          <div className="mt-4 rounded-xl bg-gradient-to-br from-brand-50 to-surface-50 border border-brand-100 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
              Gönderilecek özet
            </p>
            <p className="text-2xl font-extrabold text-ink-900 mt-1 tabular-nums">
              {snapshot.totalM2}
            </p>
            <p className="text-sm text-ink-600 mt-0.5">
              Sözleşme #{snapshot.quoteNumber} · {snapshot.projectName}
            </p>
          </div>
        ) : null}

        <div className="mt-5">
          <p className="text-[13px] font-bold text-ink-800 mb-2">Anlaşmalı firma seçin</p>
          {partners.length === 0 ? (
            <p className="text-sm text-warning-700 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3">
              Aktif anlaşmalı firma yok. Oda yönetimi katalog ayarlarından ekleyin.
            </p>
          ) : (
            <ul className="space-y-2.5" role="listbox" aria-label="Anlaşmalı firmalar">
              {partners.map((p) => {
                const selected = partnerId === p.id;
                const title = p.company || p.fullName;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setPartnerId(p.id)}
                      className={clsx(
                        "w-full text-left rounded-2xl border-2 p-4 transition-all duration-150",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                        selected
                          ? "border-brand-500 bg-brand-50/90 shadow-sm shadow-brand-500/10"
                          : "border-ink-100 bg-white hover:border-ink-200 hover:bg-surface-50 active:scale-[0.99]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={clsx(
                            "shrink-0 flex h-11 w-11 items-center justify-center rounded-xl",
                            selected ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-500"
                          )}
                        >
                          <Building2 size={20} strokeWidth={2} />
                        </span>
                        <span className="flex-1 min-w-0 pt-0.5">
                          <span className="block font-bold text-[15px] text-ink-900 leading-tight truncate">
                            {title}
                          </span>
                          {p.company && p.fullName && p.fullName !== p.company ? (
                            <span className="block text-xs text-ink-500 mt-0.5 truncate">
                              {p.fullName}
                            </span>
                          ) : null}
                          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-400 truncate max-w-full">
                            <Mail size={12} className="shrink-0" />
                            <span className="truncate">{p.email}</span>
                          </span>
                        </span>
                        {selected ? (
                          <CheckCircle2
                            size={22}
                            className="shrink-0 text-brand-600 mt-1"
                            aria-hidden
                          />
                        ) : (
                          <span
                            className="shrink-0 mt-1.5 h-5 w-5 rounded-full border-2 border-ink-200"
                            aria-hidden
                          />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedPartner ? (
          <p className="mt-3 text-xs text-ink-500 text-center">
            <span className="font-semibold text-ink-700">
              {selectedPartner.company || selectedPartner.fullName}
            </span>
            {" "}
            adresine mail gönderilecek
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Vazgeç
          </Button>
          <Button
            icon={Send}
            variant="primary"
            disabled={!partnerId || sending || partners.length === 0}
            onClick={handleSend}
            className="w-full sm:w-auto"
          >
            {sending ? "Gönderiliyor…" : "Mail gönder"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

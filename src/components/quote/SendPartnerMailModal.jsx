import React, { useMemo, useState } from "react";
import { Send } from "lucide-react";
import Modal from "../modals/Modal.jsx";
import Field from "../inputs/Field.jsx";
import Button from "../ui/Button.jsx";
import { buildQuoteM2Report } from "../../utils/m2Report.js";
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

  const report = useMemo(() => {
    if (!quote) return null;
    return buildQuoteM2Report(quote, remote?.qualities || [], remote?.countertopCatalog || [], {
      chamberName,
      producerName: user?.fullName,
      producerCompany: user?.company
    });
  }, [quote, remote?.qualities, remote?.countertopCatalog, chamberName, user]);

  async function handleSend() {
    if (!partnerId || !report) return;
    setSending(true);
    try {
      const res = await sendPartnerMail(quote.id, partnerId, report);
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
    <Modal open={open} onClose={onClose} size="lg">
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        <p className="yk-eyebrow">Anlaşmalı firmaya gönder</p>
        <h3 className="yk-display text-xl text-ink-900 mt-1">
          {quote?.projectName} — #{quote?.number}
        </h3>
        <p className="text-xs text-ink-500 mt-1">Yalnızca m² detayları — fiyat gönderilmez</p>

        <div className="mt-4">
          <Field label="Firma seçin">
            <select
              className="yk-input w-full"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">— Seçin —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.company || p.fullName} ({p.email})
                </option>
              ))}
            </select>
          </Field>
          {partners.length === 0 ? (
            <p className="text-sm text-warning-700 mt-2">
              Aktif anlaşmalı firma yok. Oda yönetimi katalog ayarlarından ekleyin.
            </p>
          ) : null}
        </div>

        {report ? (
          <div className="mt-4 rounded-xl border border-ink-100 bg-surface-50 p-4 text-sm max-h-48 overflow-y-auto">
            <p className="font-semibold text-ink-800 mb-2">
              Önizleme — {report.roomCount} oda, {report.totalM2}
            </p>
            {(report.rooms || []).map((room, i) => (
              <p key={i} className="text-ink-600 text-xs mt-1">
                {room.roomLabel}: {room.totalM2} ({room.lines?.length || 0} satır)
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            icon={Send}
            variant="primary"
            disabled={!partnerId || sending || partners.length === 0}
            onClick={handleSend}
          >
            {sending ? "Gönderiliyor…" : "Mail gönder"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

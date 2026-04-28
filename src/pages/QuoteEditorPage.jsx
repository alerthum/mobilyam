import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Wallet,
  Layers3,
  Receipt,
  Trash2,
  Pencil,
  FileDown,
  FileSignature,
  Save,
  CheckCircle2
} from "lucide-react";
import Modal from "../components/modals/Modal.jsx";
import RoomTypePicker from "../components/quote/RoomTypePicker.jsx";
import RoomEditor from "../components/quote/RoomEditor.jsx";
import RoomCard from "../components/quote/RoomCard.jsx";
import KpiCard from "../components/ui/KpiCard.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import Field from "../components/inputs/Field.jsx";
import TextInput from "../components/inputs/TextInput.jsx";
import MoneyInput from "../components/inputs/MoneyInput.jsx";
import PercentInput from "../components/inputs/PercentInput.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import {
  WORKFLOW_LABELS,
  WORKFLOW_ORDER,
  quoteWorkflow,
  pdfDocumentHeading
} from "../constants/quoteWorkflow.js";
import ProposalPdfBody from "../components/document/ProposalPdfBody.jsx";
import { downloadElementAsPdf, formatPdfErrorForUser } from "../utils/pdf.js";
import { useConfirm, useToast } from "../context/ModalContext.jsx";
import { useProjectActions } from "../hooks/useProjectActions.js";
import { createRoom } from "../config/rooms.js";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatNumber } from "../utils/format.js";

export default function QuoteEditorPage({ projectId, quoteId, onBack }) {
  const { remote, saveNow, saveStatus, commit } = useApp();
  const currentUser = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();
  const actions = useProjectActions();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorRoom, setEditorRoom] = useState(null);

  // Dirty takibi: aktif kart değişikliğinden sonra kullanıcı "Güncelle"
  // butonuna basana kadar bayrak true tutulur. Save sonrası temizlenir.
  const [projectDirty, setProjectDirty] = useState(false);
  const [discountDirty, setDiscountDirty] = useState(false);
  const pdfHolderRef = useRef(null);
  const saving = saveStatus === "saving";

  const project = remote?.projects?.find((p) => p.id === projectId);
  const quote = project?.quotes?.find((q) => q.id === quoteId);
  const qualities = remote?.qualities || [];

  const calc = useMemo(() => {
    if (!quote) return null;
    return calculateQuoteTotals(quote, qualities);
  }, [quote, qualities]);

  useEffect(() => {
    if (currentUser?.role === "system_admin") {
      toast.warning("Teklif düzenleme yalnızca mobilyacı hesapları içindir.");
      onBack?.();
    }
  }, [currentUser?.role, onBack, toast]);

  // Farklı projeye geçince dirty bayrakları sıfırlansın.
  useEffect(() => {
    setProjectDirty(false);
    setDiscountDirty(false);
  }, [projectId, quoteId]);

  async function saveProjectInfo() {
    if (!projectDirty || saving) return;
    const result = await saveNow();
    if (result?.ok) {
      setProjectDirty(false);
      toast.success("Proje bilgileri kaydedildi");
    } else {
      toast.error("Kayıt başarısız oldu");
    }
  }

  async function saveDiscount() {
    if (!discountDirty || saving) return;
    const result = await saveNow();
    if (result?.ok) {
      setDiscountDirty(false);
      toast.success("İndirim güncellendi");
    } else {
      toast.error("Kayıt başarısız oldu");
    }
  }

  if (!project || !quote) {
    return (
      <div className="p-6">
        <EmptyState
          title="Teklif bulunamadı"
          description="Proje veya teklif silinmiş olabilir."
          action={
            <Button onClick={onBack} icon={ArrowLeft}>
              Geri
            </Button>
          }
        />
      </div>
    );
  }

  function startNewRoom() {
    setPickerOpen(true);
  }

  function pickType(type) {
    const defaultQuality = qualities[0]?.id || null;
    const room = createRoom(type, { defaultQualityId: defaultQuality });
    setEditorRoom(room);
    setPickerOpen(false);
    setEditorOpen(true);
  }

  function editExistingRoom(room) {
    setEditorRoom(room);
    setEditorOpen(true);
  }

  function saveRoom(room) {
    const exists = quote.rooms?.some((r) => r.id === room.id);
    if (exists) {
      actions.replaceRoom(projectId, quoteId, room.id, room);
      toast.success("Oda güncellendi");
    } else {
      actions.addRoom(projectId, quoteId, room);
      toast.success("Oda eklendi");
    }
    setEditorOpen(false);
    setEditorRoom(null);
  }

  async function downloadPdf() {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 120));
    const wrap = pdfHolderRef.current;
    const el = wrap?.querySelector?.("[data-yk-print-root]") || wrap;
    if (!el || !(el instanceof HTMLElement)) {
      toast.error("PDF hazırlanamadı");
      return;
    }
    let tries = 0;
    while (tries++ < 40 && el.offsetHeight < 4) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    if (el.offsetHeight < 4) {
      toast.error("PDF için yerleşim tamamlanamadı");
      return;
    }
    const wf = quoteWorkflow(quote);
    const base = (project.projectName || pdfDocumentHeading(quote)).replace(
      /[^\w\-.ğüşıöçĞÜŞİÖÇ ]+/gu,
      ""
    );
    try {
      await downloadElementAsPdf(el, `${base}-${quote.number}-${wf}`);
    } catch (err) {
      console.error("[yk-pdf]", err);
      toast.error(formatPdfErrorForUser(err, "PDF kaydedilemedi"));
    }
  }

  async function convertToContract() {
    const ok = await confirm({
      variant: "info",
      title: "Sözleşmeye dökülsün mü?",
      description:
        "Durum güncellenir ve bu teklif sözleşme aşamasına alınır. PDF başlığı buna göre değişir.",
      confirmLabel: "Sözleşmeye çevir",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    const result = await commit((d) => {
      const p = d.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = p.quotes?.find((x) => x.id === quoteId);
      if (!q) return;
      q.workflowStatus = "contracted";
      q.contractedAt = new Date().toISOString();
    });
    if (result?.ok) toast.success("Sözleşme adımına geçildi");
    else toast.error("Kaydedilemedi");
  }

  async function setWorkflowStatus(next) {
    const result = await commit((d) => {
      const p = d.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = p.quotes?.find((x) => x.id === quoteId);
      if (!q) return;
      q.workflowStatus = next;
    });
    if (result?.ok) toast.success("Durum güncellendi");
    else toast.error("Kaydedilemedi");
  }

  async function deleteRoom(room) {
    const ok = await confirm({
      variant: "danger",
      title: "Oda silinsin mi?",
      description: `"${room.name}" odası bu tekliften kaldırılacak. Bu işlem geri alınamaz.`,
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    actions.deleteRoom(projectId, quoteId, room.id);
    toast.success("Oda silindi");
  }

  return (
    <>
      <TopBar
        title={project.projectName || "Yeni Proje"}
        subtitle={`Teklif #${quote.number} · ${WORKFLOW_LABELS[quoteWorkflow(quote)] || ""}`}
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>
              Geri
            </Button>
            <Button variant="outline" size="sm" icon={FileDown} onClick={downloadPdf}>
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        }
      />

      <div
        ref={pdfHolderRef}
        className="fixed left-0 top-0 z-[60] w-[210mm] max-w-[100vw] max-h-[100vh] overflow-auto opacity-[0.02] pointer-events-none bg-white"
        aria-hidden
      >
        <ProposalPdfBody
          project={project}
          quote={quote}
          qualities={qualities}
          issuer={currentUser}
          chamberBannerName={remote?.chamber?.chamberName}
        />
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-5">
        <Card>
          <CardHeader
            title="Teklif süreci"
            subtitle="Kaba tasarım ile teklif verilir; süreç ilerleyince tek tıkta sözleşme durumuna alınır"
          />
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <Field label="Durum">
              <select
                className="yk-input-shell-flat w-full"
                value={quoteWorkflow(quote)}
                onChange={(e) => setWorkflowStatus(e.target.value)}
              >
                {WORKFLOW_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {WORKFLOW_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
              <Button
                variant="dark"
                size="sm"
                icon={FileSignature}
                onClick={convertToContract}
                disabled={quoteWorkflow(quote) === "contracted" || quoteWorkflow(quote) === "completed"}
              >
                Sözleşmeye çevir
              </Button>
              <p className="text-[11px] text-ink-500 self-center max-w-md">
                PDF başlığı: {pdfDocumentHeading(quote)} — sözleşme adımlarında &quot;Sözleşme&quot; basılır.
              </p>
            </div>
          </div>
        </Card>

        {/* KPI'lar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Toplam"
            value={formatCurrency(calc.totals.dealerGrandTotal)}
            icon={Wallet}
            accent="brand"
          />
          <KpiCard
            label="Resmi fiyat"
            value={formatCurrency(calc.totals.officialGrandTotal)}
            icon={Receipt}
            accent="ink"
          />
          <KpiCard
            label="Toplam alan"
            value={formatNumber(
              calc.rooms.reduce((s, r) => s + r.price.panelEquivalentM2, 0),
              " m²"
            )}
            icon={Layers3}
            accent="success"
          />
          <KpiCard
            label="İndirim"
            value={formatCurrency(calc.totals.totalDiscount)}
            accent="warning"
            icon={Plus}
          />
        </div>

        {/* Müşteri & proje bilgileri */}
        <Card>
          <CardHeader title="Proje Bilgileri" subtitle="Müşteri ve sözleşme detayları" />
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Field label="Proje adı">
              <TextInput
                value={project.projectName}
                onChange={(v) => {
                  actions.updateProject(projectId, (p) => {
                    p.projectName = v;
                  });
                  setProjectDirty(true);
                }}
              />
            </Field>
            <Field label="Müşteri">
              <TextInput
                value={project.customerName}
                onChange={(v) => {
                  actions.updateProject(projectId, (p) => {
                    p.customerName = v;
                  });
                  setProjectDirty(true);
                }}
              />
            </Field>
            <Field label="Telefon">
              <TextInput
                value={project.customerPhone}
                onChange={(v) => {
                  actions.updateProject(projectId, (p) => {
                    p.customerPhone = v;
                  });
                  setProjectDirty(true);
                }}
                inputMode="tel"
              />
            </Field>
            <Field label="Adres">
              <TextInput
                value={project.projectAddress}
                onChange={(v) => {
                  actions.updateProject(projectId, (p) => {
                    p.projectAddress = v;
                  });
                  setProjectDirty(true);
                }}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            {projectDirty ? (
              <span className="text-[11px] font-semibold text-warning-600 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                Kaydedilmemiş değişiklik
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-success-600 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Bilgiler güncel
              </span>
            )}
            <Button
              size="sm"
              icon={Save}
              variant={projectDirty ? "primary" : "ghost"}
              disabled={!projectDirty || saving}
              onClick={saveProjectInfo}
            >
              {saving && projectDirty ? "Kaydediliyor…" : "Bilgileri Güncelle"}
            </Button>
          </div>
        </Card>

        {/* Odalar */}
        <Card padded={false}>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="yk-eyebrow">Odalar</p>
              <h3 className="yk-display text-xl text-ink-900 mt-1">
                Modüller
              </h3>
            </div>
            <Button icon={Plus} onClick={startNewRoom} variant="dark">
              Oda ekle
            </Button>
          </div>
          {quote.rooms && quote.rooms.length > 0 ? (
            <div className="px-5 pb-5 space-y-3">
              {quote.rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  qualities={qualities}
                  onEdit={() => editExistingRoom(room)}
                  onDelete={() => deleteRoom(room)}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 pb-5">
              <EmptyState
                title="Henüz oda eklenmedi"
                description="Yeni bir oda ekleyerek hesaplamayı başlatın."
                action={
                  <Button icon={Plus} onClick={startNewRoom}>
                    İlk odayı ekle
                  </Button>
                }
              />
            </div>
          )}
        </Card>

        {/* İndirim */}
        <Card>
          <CardHeader title="İndirim" subtitle="Brüt (indirimsiz) satırından düşülür" />
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Field label="Üretici indirim oranı" hint="Brüt toplam (m²×kalite + cam + hırdavat + hizmet) üzerinden %">
              <PercentInput
                value={quote.producerDiscountRate}
                onValueChange={(v) => {
                  actions.updateQuote(projectId, quoteId, (q) => {
                    q.producerDiscountRate = v;
                  });
                  setDiscountDirty(true);
                }}
              />
            </Field>
            <Field label="Manuel indirim tutarı" hint="Üretici indirimi uygulandıktan sonra kalan net üzerinden düşülür (üst sınır: o net tutar)">
              <MoneyInput
                value={quote.generalDiscountAmount}
                onValueChange={(v) => {
                  actions.updateQuote(projectId, quoteId, (q) => {
                    q.generalDiscountAmount = v;
                  });
                  setDiscountDirty(true);
                }}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-3 text-sm grid-cols-1 sm:grid-cols-2 xl:grid-cols-7">
            <SummaryLine
              label="Resmi oda (m²×kalite)"
              hint="Yalnızca ölçü × seçilen kalite birim fiyatı (cam ve ek hırdavat dahil değildir)."
              value={formatCurrency(calc.totals.officialRoomTotal)}
            />
            <SummaryLine
              label="Cam toplamı"
              hint="Gardırop vb. için girilen cam kalemlerinin TL toplamı."
              value={formatCurrency(calc.totals.glassExtrasTotal)}
            />
            <SummaryLine
              label="Ek hırdavat"
              hint="Odalar için girilen tek sefer tutarların toplamı; indiriminizden sonra nete yansır."
              value={formatCurrency(calc.totals.hardwareExtrasTotal)}
            />
            <SummaryLine
              label="Ek hizmetler"
              value={formatCurrency(calc.totals.servicesTotal)}
            />
            <SummaryLine
              label={`Brüt (indirimsiz)`}
              hint="m²×kalite + cam + ek hırdavat + ek hizmetler"
              value={formatCurrency(calc.totals.officialGrandTotal)}
              tone="ink"
            />
            <SummaryLine
              label="Toplam indirim"
              value={`-${formatCurrency(calc.totals.totalDiscount)}`}
              tone="danger"
            />
            <SummaryLine
              label="Net teklif tutarı"
              value={formatCurrency(calc.totals.dealerGrandTotal)}
              tone="brand"
              big
            />
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            {discountDirty ? (
              <span className="text-[11px] font-semibold text-warning-600 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                Kaydedilmemiş değişiklik
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-success-600 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                İndirim güncel
              </span>
            )}
            <Button
              size="sm"
              icon={Save}
              variant={discountDirty ? "primary" : "ghost"}
              disabled={!discountDirty || saving}
              onClick={saveDiscount}
            >
              {saving && discountDirty ? "Kaydediliyor…" : "İndirimi Güncelle"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Modallar */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} size="lg">
        <div className="p-5 sm:p-7">
          <p className="yk-eyebrow">Oda türü seç</p>
          <h3 className="yk-display text-2xl text-ink-900 mt-1 mb-4">
            Hangi tip mobilya<br />
            <span className="text-brand-500">ekleyeceksiniz?</span>
          </h3>
          <RoomTypePicker onSelect={pickType} />
        </div>
      </Modal>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="xl"
        showClose={false}
      >
        <div className="p-4 sm:p-6 overflow-y-auto yk-scroll">
          {editorRoom && (
            <RoomEditor
              initialRoom={editorRoom}
              qualities={qualities}
              onSave={saveRoom}
              onCancel={() => setEditorOpen(false)}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

function SummaryLine({ label, value, tone = "default", big = false, hint }) {
  const tones = {
    default: "text-ink-900",
    brand: "text-brand-600",
    danger: "text-danger-600",
    success: "text-success-600",
    ink: "text-ink-800"
  };
  return (
    <div className="rounded-xl border border-ink-100 bg-surface-50 p-3.5">
      <p className="yk-eyebrow">{label}</p>
      <p
        className={`mt-1 tabular-nums ${big ? "yk-display text-2xl" : "text-base font-bold"} ${tones[tone] || tones.default}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[10px] text-ink-500 leading-snug">{hint}</p>}
    </div>
  );
}

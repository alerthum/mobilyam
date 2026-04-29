import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Minus,
  Wallet,
  Layers3,
  Receipt,
  Trash2,
  Pencil,
  FileDown,
  FileSignature,
  Save,
  CheckCircle2,
  Power,
  PowerOff,
  ChevronDown,
  ChevronUp
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
import { isProjectActive, projectStatusLabel } from "../utils/projectLifecycle.js";

export default function QuoteEditorPage({ projectId, quoteId, onBack }) {
  const { remote, saveNow, saveStatus, commit } = useApp();
  const currentUser = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();
  const actions = useProjectActions();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [editorRoom, setEditorRoom] = useState(null);

  // Dirty takibi: aktif kart değişikliğinden sonra kullanıcı "Güncelle"
  // butonuna basana kadar bayrak true tutulur. Save sonrası temizlenir.
  const [projectDirty, setProjectDirty] = useState(false);
  const [discountDirty, setDiscountDirty] = useState(false);
  const [serviceDirty, setServiceDirty] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState({
    info: true,
    rooms: true,
    services: false,
    discount: false,
    flow: false
  });
  const pdfHolderRef = useRef(null);
  const saving = saveStatus === "saving";

  const quote = remote?.quotes?.find((q) => q.id === quoteId);
  const project = quote;
  const qualities = remote?.qualities || [];
  const servicesCatalog = remote?.servicesCatalog || [];

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
    setServiceDirty(false);
  }, [projectId, quoteId]);

  useEffect(() => {
    const hasSavedContent = Boolean(
      (quote?.rooms?.length || 0) > 0 ||
      (quote?.services?.length || 0) > 0 ||
      quote?.customerName ||
      quote?.customerPhone ||
      quote?.projectAddress
    );
    setSectionsOpen({
      info: !hasSavedContent,
      rooms: true,
      services: false,
      discount: false,
      flow: false
    });
  }, [quoteId]);

  function toggleSection(key) {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
      setServiceDirty(false);
      toast.success("İndirim güncellendi");
    } else {
      toast.error("Kayıt başarısız oldu");
    }
  }

  async function saveServices() {
    if (!serviceDirty || saving) return;
    const result = await saveNow();
    if (result?.ok) {
      setServiceDirty(false);
      setDiscountDirty(false);
      toast.success("Ek hizmetler güncellendi");
    } else {
      toast.error("Kayıt başarısız oldu");
    }
  }

  function syncDiscountFromRate(nextRate) {
    const gross = calc?.totals?.officialGrandTotal || 0;
    const syncedAmount = (gross * Math.max(0, Math.min(100, nextRate))) / 100;
    actions.updateQuote(projectId, quoteId, (q) => {
      q.producerDiscountRate = nextRate;
      q.generalDiscountAmount = Number(syncedAmount.toFixed(2));
    });
    setDiscountDirty(true);
  }

  function syncDiscountFromAmount(nextAmount) {
    const gross = calc?.totals?.officialGrandTotal || 0;
    const clamped = Math.max(0, Math.min(gross, nextAmount));
    const syncedRate = gross > 0 ? (clamped / gross) * 100 : 0;
    actions.updateQuote(projectId, quoteId, (q) => {
      q.generalDiscountAmount = Number(clamped.toFixed(2));
      q.producerDiscountRate = Number(syncedRate.toFixed(2));
    });
    setDiscountDirty(true);
  }

  function addServiceLine(service) {
    actions.updateQuote(projectId, quoteId, (q) => {
      q.services = Array.isArray(q.services) ? q.services : [];
      const existing = q.services.find((s) => s.id === service.id);
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + 1;
      } else {
        q.services.push({
          id: service.id,
          name: service.name,
          unit: service.unit || "adet",
          price: Number(service.price) || 0,
          quantity: Number(service.defaultQuantity) > 0 ? Number(service.defaultQuantity) : 1
        });
      }
    });
    setServiceDirty(true);
  }

  function updateServiceQty(serviceId, nextQty) {
    const qty = Math.max(0, Number(nextQty) || 0);
    actions.updateQuote(projectId, quoteId, (q) => {
      q.services = (q.services || [])
        .map((s) => (s.id === serviceId ? { ...s, quantity: qty } : s))
        .filter((s) => (Number(s.quantity) || 0) > 0);
    });
    setServiceDirty(true);
  }

  if (!project || !quote) {
    return (
      <div className="p-6">
        <EmptyState
          title="Teklif bulunamadı"
          description="Teklif silinmiş olabilir."
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
      const base = (quote.projectName || pdfDocumentHeading(quote)).replace(
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
      const q = d.quotes?.find((x) => x.id === quoteId);
      if (!q) return;
      q.workflowStatus = "contracted";
      q.contractedAt = new Date().toISOString();
    });
    if (result?.ok) toast.success("Sözleşme adımına geçildi");
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
        title={quote.projectName || "Yeni Teklif"}
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
        {/* KPI'lar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Toplam Alan"
            value={formatNumber(
              calc.rooms.reduce((s, r) => s + r.price.panelEquivalentM2, 0),
              " m²"
            )}
            icon={Layers3}
            accent="success"
          />
          <KpiCard
            label="Genel Toplam"
            value={formatCurrency(calc.totals.officialGrandTotal)}
            icon={Receipt}
            accent="ink"
          />
          <KpiCard
            label="İndirim Tutarı"
            value={formatCurrency(calc.totals.totalDiscount)}
            accent="warning"
            icon={Plus}
          />
          <KpiCard
            label="Net Tutar"
            value={formatCurrency(calc.totals.dealerGrandTotal)}
            icon={Wallet}
            accent="brand"
          />
        </div>

        {/* Müşteri & teklif bilgileri */}
        <Card>
          <CardHeader
            title="Teklif Bilgileri"
            subtitle="Müşteri ve sözleşme detayları"
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const was = isProjectActive(quote);
                    actions.toggleProjectLifecycle(projectId);
                    toast.success(
                      was ? "Teklif pasife alındı" : "Teklif aktifleştirildi"
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-800 shadow-sm hover:bg-ink-50 active:scale-[0.99] transition"
                  title={isProjectActive(quote) ? "Pasife al" : "Aktifleştir"}
                >
                  {isProjectActive(quote) ? (
                    <Power size={14} className="text-emerald-600 shrink-0" aria-hidden />
                  ) : (
                    <PowerOff size={14} className="text-ink-400 shrink-0" aria-hidden />
                  )}
                  {projectStatusLabel(quote)}
                </button>
                <IconButton
                  icon={sectionsOpen.info ? ChevronUp : ChevronDown}
                  variant="ghost"
                  ariaLabel="Teklif bilgileri aç/kapat"
                  onClick={() => toggleSection("info")}
                />
              </div>
            }
          />
          {sectionsOpen.info && (
            <>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Field label="Teklif adı">
              <TextInput
                value={quote.projectName}
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
                value={quote.customerName}
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
                value={quote.customerPhone}
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
                value={quote.projectAddress}
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
            </>
          )}
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
            <div className="flex items-center gap-2">
              <Button icon={Plus} onClick={startNewRoom} variant="dark">
                Oda ekle
              </Button>
              <IconButton
                icon={sectionsOpen.rooms ? ChevronUp : ChevronDown}
                variant="ghost"
                ariaLabel="Odalar aç/kapat"
                onClick={() => toggleSection("rooms")}
              />
            </div>
          </div>
          {sectionsOpen.rooms && (
            <>
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
            </>
          )}
        </Card>

        {/* Ek hizmet ekle */}
        <Card>
          <CardHeader
            title="Ek hizmet ekle"
            subtitle="Seç diyerek modal üzerinden hizmet ekleyin"
            action={
              <IconButton
                icon={sectionsOpen.services ? ChevronUp : ChevronDown}
                variant="ghost"
                ariaLabel="Ek hizmet aç/kapat"
                onClick={() => toggleSection("services")}
              />
            }
          />
          {sectionsOpen.services && (
            <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-ink-500">
              Seçilen hizmet adedi: <span className="font-semibold text-ink-800">{(quote.services || []).length}</span>
            </p>
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              onClick={() => setServicePickerOpen(true)}
              disabled={!servicesCatalog.length}
            >
              Seç
            </Button>
          </div>

          {(quote.services || []).length > 0 ? (
            <div className="mt-3 space-y-2">
              {(quote.services || []).map((selected) => (
                <div
                  key={selected.id}
                  className="rounded-xl border border-ink-100 bg-surface-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">{selected.name}</p>
                      <p className="text-xs text-ink-500">
                        {formatCurrency(selected.price)} / {selected.unit || "adet"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon={Minus}
                        variant="ghost"
                        ariaLabel="Azalt"
                        onClick={() => updateServiceQty(selected.id, (selected.quantity || 0) - 1)}
                      />
                      <span className="w-8 text-center text-sm font-semibold text-ink-800">
                        {selected.quantity || 0}
                      </span>
                      <IconButton
                        icon={Plus}
                        variant="ghost"
                        ariaLabel="Arttır"
                        onClick={() => updateServiceQty(selected.id, (selected.quantity || 0) + 1)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-500">Henüz ek hizmet seçilmedi.</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            {serviceDirty ? (
              <span className="text-[11px] font-semibold text-warning-600 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                Kaydedilmemiş değişiklik
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-success-600 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Ek hizmetler güncel
              </span>
            )}
            <Button
              size="sm"
              icon={Save}
              variant={serviceDirty ? "primary" : "ghost"}
              disabled={!serviceDirty || saving}
              onClick={saveServices}
            >
              {saving && serviceDirty ? "Kaydediliyor…" : "Hizmetleri Güncelle"}
            </Button>
          </div>
            </>
          )}
        </Card>

        {/* İndirim */}
        <Card>
          <CardHeader
            title="İndirim"
            subtitle="Brüt (indirimsiz) satırından düşülür"
            action={
              <IconButton
                icon={sectionsOpen.discount ? ChevronUp : ChevronDown}
                variant="ghost"
                ariaLabel="İndirim aç/kapat"
                onClick={() => toggleSection("discount")}
              />
            }
          />
          {sectionsOpen.discount && (
            <>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Field label="Üretici indirim oranı" hint="Toplam tutar üzerinden yüzde indirim">
              <PercentInput
                value={quote.producerDiscountRate}
                onValueChange={(v) => syncDiscountFromRate(v)}
              />
            </Field>
            <Field label="Manuel indirim tutarı" hint="Oran alanı ile senkron çalışır">
              <MoneyInput
                value={quote.generalDiscountAmount}
                onValueChange={(v) => syncDiscountFromAmount(v)}
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
              label="Ek kalemler toplamı"
              hint={`Cam: ${formatCurrency(calc.totals.glassExtrasTotal)} · Hırdavat: ${formatCurrency(calc.totals.hardwareExtrasTotal)} · Hizmet: ${formatCurrency(calc.totals.servicesTotal)}`}
              value={formatCurrency(
                calc.totals.glassExtrasTotal +
                  calc.totals.hardwareExtrasTotal +
                  calc.totals.servicesTotal
              )}
              tone="warning"
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
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Teklif süreci"
            subtitle="Aktif, pasif ve sözleşme adımları"
            action={
              <IconButton
                icon={sectionsOpen.flow ? ChevronUp : ChevronDown}
                variant="ghost"
                ariaLabel="Teklif süreci aç/kapat"
                onClick={() => toggleSection("flow")}
              />
            }
          />
          {sectionsOpen.flow && (
          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold text-ink-600">
              Durum: <span className="text-ink-900">{WORKFLOW_LABELS[quoteWorkflow(quote)] || "Hazırlanıyor"}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 min-w-0 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <Button
                variant="dark"
                size="sm"
                className="h-9 text-xs shrink-0"
                icon={FileSignature}
                onClick={convertToContract}
                disabled={
                  quoteWorkflow(quote) === "contracted" ||
                  quoteWorkflow(quote) === "completed"
                }
              >
                Sözleşmeye çevir
              </Button>
              <p className="text-[10px] leading-snug text-ink-500 sm:min-w-0 line-clamp-2">
                PDF: <span className="font-medium text-ink-600">{pdfDocumentHeading(quote)}</span>
                {" — "}
                Sözleşme aşamasında başlık &quot;Sözleşme&quot; olur.
              </p>
            </div>
          </div>
          )}
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

      <Modal
        open={servicePickerOpen}
        onClose={() => setServicePickerOpen(false)}
        size="lg"
      >
        <div className="p-5 sm:p-6">
          <p className="yk-eyebrow">Ek hizmet seç</p>
          <h3 className="yk-display text-xl text-ink-900 mt-1 mb-4">
            Hizmet listesinden
            <span className="text-brand-500"> ekleme yapın</span>
          </h3>
          {servicesCatalog.length === 0 ? (
            <p className="text-sm text-ink-500">Tanımlı ek hizmet bulunamadı.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto yk-scroll pr-1">
              {servicesCatalog.map((service) => {
                const selected = (quote.services || []).find((s) => s.id === service.id);
                return (
                  <div
                    key={service.id}
                    className="rounded-xl border border-ink-100 bg-surface-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900 truncate">{service.name}</p>
                        <p className="text-xs text-ink-500">
                          {formatCurrency(service.price)} / {service.unit || "adet"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={selected ? "dark" : "outline"}
                        icon={Plus}
                        onClick={() => addServiceLine(service)}
                      >
                        {selected ? "Bir daha ekle" : "Ekle"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => setServicePickerOpen(false)}>
              Kapat
            </Button>
          </div>
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
    warning: "text-warning-700",
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

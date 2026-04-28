import React, { useRef, useState } from "react";
import { Tag, Plus, Trash2, Save, CheckCircle2, FileDown } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import Field from "../components/inputs/Field.jsx";
import TextInput from "../components/inputs/TextInput.jsx";
import MoneyInput from "../components/inputs/MoneyInput.jsx";
import Button from "../components/ui/Button.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { useConfirm, useToast } from "../context/ModalContext.jsx";
import { formatCurrency } from "../utils/format.js";
import CatalogPdfBody from "../components/document/CatalogPdfBody.jsx";
import { downloadElementAsPdf, formatPdfErrorForUser } from "../utils/pdf.js";

export default function PricesPage() {
  const { remote, updateRemote, commit, saveNow, saveStatus } = useApp();
  const user = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();

  const qualities = remote?.qualities || [];
  const services = remote?.servicesCatalog || [];

  /** Yalnızca oda yönetimi katalog düzenleyebilir; sistem yöneticisi salt okunur görür. */
  const canEdit = user?.role === "chamber";
  const catalogPdfRef = useRef(null);

  async function exportCatalogPdf(fileBase = "Malzeme-m2-Ek-Hizmetler") {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    const el =
      catalogPdfRef.current?.querySelector?.("[data-yk-print-root]") ||
      catalogPdfRef.current;
    if (!el) return;
    try {
      await downloadElementAsPdf(el, fileBase);
    } catch (err) {
      console.error("[yk-pdf] katalog", err);
      toast.error(formatPdfErrorForUser(err, "PDF oluşturulamadı"));
    }
  }

  // Inline edit dirty bayrakları — kullanıcı "Değişiklikleri Kaydet"
  // butonuna bastığında commit edilecek.
  const [qualitiesDirty, setQualitiesDirty] = useState(false);
  const [servicesDirty, setServicesDirty] = useState(false);
  const saving = saveStatus === "saving";

  function addQuality() {
    commit((d) => {
      d.qualities = d.qualities || [];
      d.qualities.push({
        id: `quality-${Date.now()}`,
        name: "Yeni Kalite",
        officialSqmPrice: 0,
        note: ""
      });
    });
  }

  function updateQuality(id, mutator) {
    updateRemote((d) => {
      const q = d.qualities?.find((x) => x.id === id);
      if (q) mutator(q);
    });
    setQualitiesDirty(true);
  }

  async function deleteQuality(q) {
    const ok = await confirm({
      variant: "danger",
      title: "Kalite silinsin mi?",
      description: `"${q.name}" kalitesi tüm tekliflerden çıkarılacak. Devam etmek istiyor musunuz?`,
      confirmLabel: "Sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    commit((d) => {
      d.qualities = (d.qualities || []).filter((x) => x.id !== q.id);
    });
    toast.success("Kalite silindi");
  }

  function addService() {
    commit((d) => {
      d.servicesCatalog = d.servicesCatalog || [];
      d.servicesCatalog.push({
        id: `svc-${Date.now()}`,
        name: "Yeni Hizmet",
        unit: "adet",
        price: 0,
        defaultQuantity: 0
      });
    });
  }

  function updateService(id, mutator) {
    updateRemote((d) => {
      const s = d.servicesCatalog?.find((x) => x.id === id);
      if (s) mutator(s);
    });
    setServicesDirty(true);
  }

  async function deleteService(s) {
    const ok = await confirm({
      variant: "danger",
      title: "Hizmet silinsin mi?",
      description: `"${s.name}" hizmeti kataloğdan kaldırılacak.`,
      confirmLabel: "Sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    commit((d) => {
      d.servicesCatalog = (d.servicesCatalog || []).filter((x) => x.id !== s.id);
    });
    toast.success("Hizmet silindi");
  }

  async function saveQualities() {
    if (!qualitiesDirty || saving) return;
    const result = await saveNow();
    if (result?.ok) {
      setQualitiesDirty(false);
      toast.success("Kalite katalogu güncellendi");
    } else {
      toast.error("Kayıt başarısız oldu");
    }
  }

  async function saveServices() {
    if (!servicesDirty || saving) return;
    const result = await saveNow();
    if (result?.ok) {
      setServicesDirty(false);
      toast.success("Hizmet katalogu güncellendi");
    } else {
      toast.error("Kayıt başarısız oldu");
    }
  }

  return (
    <>
      <TopBar title="Fiyatlar" subtitle="Resmi katalog" />
      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-5">
        <div
          ref={catalogPdfRef}
          className="fixed left-0 top-0 z-[60] w-[210mm] max-w-[100vw] max-h-[100vh] overflow-auto opacity-[0.02] pointer-events-none bg-white"
          aria-hidden
        >
          <CatalogPdfBody qualities={qualities} services={services} />
        </div>
        <Card padded={false}>
          <div className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="yk-eyebrow">Kalite Katalogu</p>
              <h2 className="yk-display text-xl text-ink-900 mt-1">
                Malzeme m² Fiyatları
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={FileDown}
                onClick={() => exportCatalogPdf()}
              >
                PDF
              </Button>
              {canEdit && (
                <Button icon={Plus} onClick={addQuality} size="sm">
                  Ekle
                </Button>
              )}
            </div>
          </div>
          {qualities.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Tag}
                title="Henüz kalite tanımı yok"
                description="Hesaplamalar için bir veya daha fazla kalite tanımlayın."
              />
            </div>
          ) : !canEdit ? (
            <div className="px-3 pb-5 grid sm:grid-cols-2 gap-3">
              {qualities.map((q) => (
                <div
                  key={q.id}
                  className="relative overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-br from-white via-surface-50 to-brand-50/40 p-4 sm:p-5 yk-soft"
                >
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-400/15 blur-2xl" />
                  <p className="relative text-sm font-extrabold text-ink-900 leading-tight">
                    {q.name}
                  </p>
                  <p className="relative mt-3 yk-display text-2xl text-brand-700 tabular-nums">
                    {formatCurrency(q.officialSqmPrice)}
                    <span className="text-sm font-semibold text-ink-400"> / m²</span>
                  </p>
                  {q.note && (
                    <p className="relative mt-2 text-xs text-ink-500 leading-relaxed">{q.note}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 pb-3 space-y-2">
              {qualities.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-ink-100 bg-surface-50 p-3 sm:p-4 grid sm:grid-cols-[1fr_180px_180px_auto] gap-3 items-start"
                >
                  <Field label="Ad">
                    <TextInput
                      value={q.name}
                      onChange={(v) => updateQuality(q.id, (x) => (x.name = v))}
                      disabled={!canEdit}
                    />
                  </Field>
                  <Field label="m² fiyatı">
                    <MoneyInput
                      value={q.officialSqmPrice}
                      onValueChange={(v) =>
                        updateQuality(q.id, (x) => (x.officialSqmPrice = v))
                      }
                      disabled={!canEdit}
                    />
                  </Field>
                  <Field label="Not">
                    <TextInput
                      value={q.note}
                      onChange={(v) => updateQuality(q.id, (x) => (x.note = v))}
                      disabled={!canEdit}
                    />
                  </Field>
                  {canEdit && (
                    <div className="sm:pt-7">
                      <IconButton
                        icon={Trash2}
                        variant="danger"
                        ariaLabel="Sil"
                        onClick={() => deleteQuality(q)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {canEdit && qualities.length > 0 && (
            <div className="px-5 pb-5 flex items-center justify-end gap-2">
              {qualitiesDirty ? (
                <span className="text-[11px] font-semibold text-warning-600 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                  Kaydedilmemiş değişiklik
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-success-600 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  Katalog güncel
                </span>
              )}
              <Button
                size="sm"
                icon={Save}
                variant={qualitiesDirty ? "primary" : "ghost"}
                disabled={!qualitiesDirty || saving}
                onClick={saveQualities}
              >
                {saving && qualitiesDirty ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="yk-eyebrow">Hizmet Katalogu</p>
              <h2 className="yk-display text-xl text-ink-900 mt-1">
                Ek Hizmetler
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={FileDown}
                onClick={() => exportCatalogPdf("Malzeme-m2-Ek-Hizmetler")}
              >
                PDF
              </Button>
              {canEdit && (
                <Button icon={Plus} onClick={addService} size="sm">
                  Ekle
                </Button>
              )}
            </div>
          </div>
          {services.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Tag}
                title="Hizmet kataloğu boş"
                description="Ölçü, asansör, söküm gibi ek hizmetleri burada tanımlayın."
              />
            </div>
          ) : !canEdit ? (
            <div className="px-3 pb-5 grid sm:grid-cols-2 gap-3">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="relative overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-br from-white via-surface-50 to-accent-50/40 p-4 sm:p-5 yk-soft"
                >
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-400/15 blur-2xl" />
                  <p className="relative text-sm font-extrabold text-ink-900 leading-tight">
                    {s.name}
                  </p>
                  <p className="relative mt-1 text-xs font-semibold text-ink-500 uppercase tracking-wide">
                    {s.unit || "birim"}
                  </p>
                  <p className="relative mt-3 yk-display text-2xl text-accent-700 tabular-nums">
                    {formatCurrency(s.price)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 pb-3 space-y-2">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-ink-100 bg-surface-50 p-3 sm:p-4 grid sm:grid-cols-[1fr_120px_180px_auto] gap-3 items-start"
                >
                  <Field label="Ad">
                    <TextInput
                      value={s.name}
                      onChange={(v) => updateService(s.id, (x) => (x.name = v))}
                    />
                  </Field>
                  <Field label="Birim">
                    <TextInput
                      value={s.unit}
                      onChange={(v) => updateService(s.id, (x) => (x.unit = v))}
                    />
                  </Field>
                  <Field label="Fiyat">
                    <MoneyInput
                      value={s.price}
                      onValueChange={(v) => updateService(s.id, (x) => (x.price = v))}
                    />
                  </Field>
                  <div className="sm:pt-7">
                    <IconButton
                      icon={Trash2}
                      variant="danger"
                      ariaLabel="Sil"
                      onClick={() => deleteService(s)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {canEdit && services.length > 0 && (
            <div className="px-5 pb-5 flex items-center justify-end gap-2">
              {servicesDirty ? (
                <span className="text-[11px] font-semibold text-warning-600 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                  Kaydedilmemiş değişiklik
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-success-600 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  Katalog güncel
                </span>
              )}
              <Button
                size="sm"
                icon={Save}
                variant={servicesDirty ? "primary" : "ghost"}
                disabled={!servicesDirty || saving}
                onClick={saveServices}
              >
                {saving && servicesDirty ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

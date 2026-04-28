/**
 * Teklif yaşam döngüsü — sözleşme yalnızca onayla "contracted" olunca anlam kazanır.
 */
export const WORKFLOW_LABELS = {
  preparing: "Teklif hazırlanıyor",
  quoted: "Teklif verildi",
  contracted: "Sözleşmeye çevrildi",
  completed: "Tamamlandı"
};

/** Eski kayıtlar: alan yoksa "Teklif verildi" kabul (mevcut teklifler bozulmasın). */
export function quoteWorkflow(q) {
  return q.workflowStatus ?? "quoted";
}

export function isContractPdfTitle(status) {
  return status === "contracted" || status === "completed";
}

/** PDF başlığı: sözleşme aşamasında mı teklif mi? */
export function pdfDocumentHeading(statusOrQuote) {
  const s =
    typeof statusOrQuote === "string"
      ? statusOrQuote
      : quoteWorkflow(statusOrQuote);
  return isContractPdfTitle(s) ? "Sözleşme" : "Teklif";
}

/** Varsayılan liste filtresi: işlem gerektirenler */
export function isAwaitingWorkflow(q) {
  const s = quoteWorkflow(q);
  return s === "preparing" || s === "quoted";
}

/** Arayüzde gösterim sırası */
export const WORKFLOW_ORDER = ["preparing", "quoted", "contracted", "completed"];

export const FILTER_PRESETS = [
  { id: "pending", label: "Bekleyenler" },
  { id: "all", label: "Tümü" },
  { id: "preparing", label: WORKFLOW_LABELS.preparing },
  { id: "quoted", label: WORKFLOW_LABELS.quoted },
  { id: "contracted", label: WORKFLOW_LABELS.contracted },
  { id: "completed", label: WORKFLOW_LABELS.completed }
];

import { downloadElementAsPdf, formatPdfErrorForUser } from "./pdf.js";
import { todayIso } from "./format.js";

/** @returns {string} Uzantısız dosya adı: kesim-hesaplama-YYYY-MM-DD */
export function cutlistPdfFilename() {
  return `kesim-hesaplama-${todayIso()}`;
}

/**
 * Gizli yazdırma kutusundan Kesim Hesaplama PDF indirir.
 * @param {HTMLElement | null | undefined} holderRef data-yk-print-root sarmalayıcısı
 */
export async function downloadCutlistPdf(holderRef) {
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 120));

  const holder = holderRef instanceof HTMLElement ? holderRef : null;
  const el = holder?.querySelector?.("[data-yk-print-root]") || holderRef;
  if (!el || !(el instanceof HTMLElement)) {
    throw new Error("PDF hazırlanamadı");
  }

  let tries = 0;
  while (tries++ < 40 && el.offsetHeight < 4) {
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (el.offsetHeight < 4) {
    throw new Error("PDF için yerleşim tamamlanamadı");
  }

  /** html2canvas max-height/opacity yüzünden sayfa kesmesin */
  const prev = holder
    ? {
        maxHeight: holder.style.maxHeight,
        overflow: holder.style.overflow,
        opacity: holder.style.opacity,
        position: holder.style.position,
        left: holder.style.left,
        top: holder.style.top,
        zIndex: holder.style.zIndex,
        width: holder.style.width,
        pointerEvents: holder.style.pointerEvents
      }
    : null;

  if (holder) {
    holder.style.maxHeight = "none";
    holder.style.overflow = "visible";
    holder.style.opacity = "1";
    holder.style.position = "fixed";
    holder.style.left = "-10000px";
    holder.style.top = "0";
    holder.style.zIndex = "1";
    holder.style.width = "297mm";
    holder.style.pointerEvents = "none";
  }

  /* ResizeObserver diyagram ölçülerini alsın */
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 80));

  try {
    await downloadElementAsPdf(el, cutlistPdfFilename(), {
      orientation: "landscape",
      margin: [0, 0, 0, 0],
      scale: 2,
      /* CSS page-break ile birlikte after kullanma → boş çift sayfa oluşur */
      pagebreak: { mode: ["css", "legacy"] }
    });
  } finally {
    if (holder && prev) {
      holder.style.maxHeight = prev.maxHeight;
      holder.style.overflow = prev.overflow;
      holder.style.opacity = prev.opacity;
      holder.style.position = prev.position;
      holder.style.left = prev.left;
      holder.style.top = prev.top;
      holder.style.zIndex = prev.zIndex;
      holder.style.width = prev.width;
      holder.style.pointerEvents = prev.pointerEvents;
    }
  }
}

export { formatPdfErrorForUser };

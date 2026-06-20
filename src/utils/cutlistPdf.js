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

  const el = holderRef?.querySelector?.("[data-yk-print-root]") || holderRef;
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

  await downloadElementAsPdf(el, cutlistPdfFilename());
}

export { formatPdfErrorForUser };

/**
 * Tek sayfa PDF — html2pdf.js + html2canvas
 *
 * Tailwind v4 sık sık oklch() kullanır; html2canvas bunları ayrıştıramaz.
 * onclone içinde iframe klonundan harici stylesheet'ler çıkarılıp yerleşim,
 * yazı tipi ve renkler gerçek DOM'dan çözümlenmiş computed stil olarak yazılır.
 */
import html2pdf from "html2pdf.js";

function getHtml2PdfFactory() {
  const raw = html2pdf;
  if (typeof raw === "function") return raw;
  if (raw && typeof raw.default === "function") return raw.default;
  return null;
}

/** html2canvas'ın işleyeceği computed özellikler (tarayıcı genelde rgb/px döner). */
const COMPUTE_PROPS = [
  "display",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "float",
  "clear",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
  "boxSizing",
  "flex",
  "flexDirection",
  "flexWrap",
  "justifyContent",
  "alignItems",
  "alignContent",
  "alignSelf",
  "justifySelf",
  "gap",
  "rowGap",
  "columnGap",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
  "fontFamily",
  "fontSize",
  "fontStretch",
  "fontStyle",
  "fontWeight",
  "fontVariant",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textDecoration",
  "textDecorationLine",
  "textTransform",
  "verticalAlign",
  "wordBreak",
  "overflowWrap",
  "whiteSpace",
  "tabSize",
  "color",
  "backgroundColor",
  "opacity",
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundOrigin",
  "backgroundClip",
  "backgroundAttachment",
  "visibility",
  "overflow",
  "overflowX",
  "overflowY",
  "boxShadow",
  "textShadow",
  "zIndex",
  "transform",
  "transformOrigin"
];

function stripExternalStyles(doc) {
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove());
  /* Tailwind/vite stilleri gider; ProposalPdfBody içindeki data-yk-pdf="1" blok kalır (sadece hex/rgb). */
  doc.querySelectorAll("style:not([data-yk-pdf])").forEach((n) => n.remove());
}

/** yk-pdf-* sınıfları PDF şablonunun kendi tasarımıdır — silinmez. */
function stripNonPdfClasses(root) {
  const keep = (cls) => /^yk-pdf-/.test(cls);
  function clean(el) {
    const c = el.getAttribute("class");
    if (!c) return;
    const tok = c.split(/\s+/).filter(Boolean).filter(keep);
    if (tok.length) el.setAttribute("class", tok.join(" "));
    else el.removeAttribute("class");
  }
  clean(root);
  root.querySelectorAll("*").forEach(clean);
}

function stripClassesSubtree(root) {
  root.removeAttribute("class");
  root.querySelectorAll("*").forEach((el) => el.removeAttribute("class"));
}

function preorderPairs(origRoot, cloneRoot) {
  const pairs = [];
  function walk(o, c) {
    pairs.push([o, c]);
    const och = [...o.children];
    const cch = [...c.children];
    const n = Math.min(och.length, cch.length);
    if (och.length !== cch.length) {
      console.warn("[yk-pdf] alt düğüm sayısı farklı (kısmen uygulanır)", och.length, cch.length);
    }
    for (let i = 0; i < n; i++) walk(och[i], cch[i]);
  }
  walk(origRoot, cloneRoot);
  return pairs;
}

function hasModernColorSyntax(str) {
  return /oklch\s*\(|lab\s*\(|lch\s*\(|color\s*\(\s*display-p3/i.test(str);
}

function applyComputedPairs(originNode, cloneNode) {
  const cs = getComputedStyle(originNode);

  for (const key of COMPUTE_PROPS) {
    try {
      let val = cs[key];
      if (val == null || val === "") continue;
      if (typeof val === "string" && hasModernColorSyntax(val)) {
        if (key === "color") val = "#1e293b";
        else if (/Color$/i.test(key)) val = "#cbd5e1";
        else if (key === "backgroundImage" || key === "background") val = "none";
        else continue;
      }
      cloneNode.style[key] = val;
    } catch {
      /* ignore */
    }
  }

  const bgImage = cloneNode.style.backgroundImage || "";
  if (hasModernColorSyntax(bgImage)) {
    cloneNode.style.backgroundImage = "none";
  }
  const bgc = cloneNode.style.backgroundColor || "";
  if (!bgc || hasModernColorSyntax(bgc)) {
    const solid = cs.backgroundColor;
    cloneNode.style.backgroundColor =
      solid && !hasModernColorSyntax(solid) ? solid : "#ffffff";
  }
}

/**
 * @param {HTMLElement} originalRoot .from() ile verilen canlı kök (data-yk-print-root)
 */
function createOnCloneForPdf(originalRoot) {
  return (documentClone) => {
    stripExternalStyles(documentClone);

    const cloneRoot =
      documentClone.querySelector("[data-yk-print-root]") ||
      documentClone.body?.firstElementChild;

    if (!cloneRoot || !originalRoot) return;

    cloneRoot.style.setProperty("color-scheme", "light");

    if (cloneRoot.hasAttribute("data-yk-print-skin")) {
      stripNonPdfClasses(cloneRoot);
      return;
    }

    stripClassesSubtree(cloneRoot);
    const pairs = preorderPairs(originalRoot, cloneRoot);
    for (const [o, c] of pairs) {
      applyComputedPairs(o, c);
    }
  };
}

function buildHtml2CanvasOptions(originalRoot, extra = {}) {
  return {
    scale: Math.min(
      2,
      typeof window !== "undefined" ? (window.devicePixelRatio || 1) * 1.25 : 2
    ),
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    allowTaint: false,
    ...extra,
    onclone: createOnCloneForPdf(originalRoot)
  };
}

function buildPdfOptions(filename, html2canvasOpts, pagebreakModes) {
  return {
    margin: [10, 10, 12, 10],
    filename,
    image: { type: "jpeg", quality: 0.92 },
    html2canvas: html2canvasOpts,
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: pagebreakModes
      ? { mode: pagebreakModes }
      : { mode: ["legacy"] }
  };
}

/** Kullanıcıya gösterilecek kısa açıklama + geliştirici için konsola tam hata */
export function formatPdfErrorForUser(err, fallbackPrefix = "PDF") {
  const raw = err?.message || String(err ?? "");
  if (!raw || raw === "undefined") {
    return `${fallbackPrefix}: İşlem tamamlanamadı (ayrıntı yok — geliştirici araçları açıksa konsola bakın).`;
  }
  const lower = raw.toLowerCase();
  if (
    lower.includes("taint") ||
    lower.includes("securityerror") ||
    (lower.includes("canvas") && lower.includes("insecure"))
  ) {
    return `${fallbackPrefix}: Çizim güvenlik sınırına takıldı. Sayfayı yenileyip tekrar deneyin.`;
  }
  if (
    lower.includes("memory") ||
    lower.includes("allocation") ||
    lower.includes("too large")
  ) {
    return `${fallbackPrefix}: Bellek veya görüntü boyutu sınırına takıldı. Sayfayı yenileyin veya daha az satırlı teklifle deneyin.`;
  }
  if (lower.includes("oklch") || lower.includes("unsupported color")) {
    return `${fallbackPrefix}: Renk biçimi uyumsuzluğu algılandı; sayfayı yenileyip tekrar deneyin. Sorun devam ederse bize bildirin.`;
  }
  const trimmed = raw.length > 100 ? `${raw.slice(0, 97)}…` : raw;
  return `${fallbackPrefix}: ${trimmed}`;
}

/**
 * @param {HTMLElement} element
 * @param {string} filenameBase Uzantısız dosya adı önerisi (.pdf eklenir)
 */
export async function downloadElementAsPdf(element, filenameBase) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error("Geçerli yazdırma kutusu bulunamadı.");
  }
  const factory = getHtml2PdfFactory();
  if (!factory) {
    throw new Error("PDF bileşeni yüklenemedi.");
  }

  const safe = (filenameBase || "cikti").replace(/[^\w\-.ğüşıöçĞÜŞİÖÇ ]+/gu, "").trim();
  const name = `${safe || "belge"}.pdf`;

  const runSave = async (opts) => {
    await factory().set(opts).from(element).save();
  };

  const attempts = [
    {
      label: "normal",
      opts: buildPdfOptions(name, buildHtml2CanvasOptions(element), ["css", "legacy"])
    },
    {
      label: "fallback-light",
      opts: buildPdfOptions(
        name,
        buildHtml2CanvasOptions(element, {
          scale: 1,
          allowTaint: true,
          useCORS: true
        }),
        ["legacy"]
      )
    }
  ];

  let lastErr = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      await runSave(attempts[i].opts);
      return;
    } catch (e) {
      lastErr = e;
      console.error(`[yk-pdf] ${attempts[i].label}`, e);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

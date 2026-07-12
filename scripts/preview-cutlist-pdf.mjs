/**
 * Cutlist PDF layout önizlemesi — tarayıcıda görsel kontrol için.
 * node scripts/preview-cutlist-pdf.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { optimizeCutlist } from "../src/lib/cutlist/optimizer.js";
import {
  REF_PARTS_RAW,
  REF_SHEET,
  buildIbryksTestParts
} from "../src/lib/cutlist/referenceOllie.js";
import { defaultCutlistOptions } from "../src/lib/cutlist/types.js";
import {
  formatStatNumber,
  formatPercent,
  partsSummaryByLabel
} from "../src/lib/cutlist/sheetStats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../docs/kesim/_yeni-extract");
fs.mkdirSync(outDir, { recursive: true });

const options = { ...defaultCutlistOptions(), edgeBanding: true, kerf: 1.2, showPartLabels: true };
const parts = buildIbryksTestParts(true);
const sheets = [
  {
    id: "mat-ollie",
    width: 210,
    height: 280,
    quantity: REF_SHEET.quantity,
    label: REF_SHEET.label,
    canRotate: false
  }
];
const result = optimizeCutlist(parts, sheets, options);

function fmtDim(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}

function partsInline() {
  return REF_PARTS_RAW.map((p) => `${fmtDim(p.length ?? p.h ?? p[0])}x${fmtDim(p.width ?? p.w ?? p[1])} x${p.quantity ?? p.qty ?? p[2]}`).join(" \\ ");
}

// REF_PARTS_RAW shape from file
function partsInlineFromForm() {
  return parts
    .filter((p) => p.quantity > 0)
    .map((p) => `${fmtDim(p.height ?? p.length)}x${fmtDim(p.width)} x${p.quantity}`)
    .join(" \\ ");
}

const PART_FILLS = ["#dbeafe", "#fce7f3", "#dcfce7", "#fef3c7", "#e0e7ff", "#ffedd5"];
function colorFor(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PART_FILLS[hash % PART_FILLS.length];
}

function isVertical(w, h) {
  if (w > h * 1.15) return false;
  if (h > w * 1.15) return true;
  return h >= w;
}

function renderDiagram(sheet) {
  const padL = 24,
    padR = 18,
    padT = 28,
    padB = 18;
  const boardW = 400;
  const scale = boardW / sheet.width;
  const boardH = sheet.height * scale;
  const totalW = padL + boardW + padR;
  const totalH = padT + boardH + padB;

  const freeHtml = (sheet.freeRects || [])
    .filter((r) => r.width > 0.3 && r.height > 0.3)
    .map((r, idx) => {
      const kerf = r.height <= 6 || (r.height <= 10 && r.width > sheet.width * 0.4);
      const bw = r.width * scale;
      const bh = r.height * scale;
      const text = `${fmtDim(r.height)}×${fmtDim(r.width)}`;
      const vertical = isVertical(bw, bh);
      const along = vertical ? bh : bw;
      const cross = vertical ? bw : bh;
      const fs = Math.max(4.5, Math.min(8.5, Math.min(along / (text.length * 0.52), cross * 0.72)));
      const label =
        along >= 22 && cross >= 5
          ? `<span style="font-size:${fs}px;color:#94a3b8;font-weight:600;white-space:nowrap;transform:${vertical ? "rotate(-90deg)" : "none"};line-height:1">${text}</span>`
          : "";
      return `<div style="position:absolute;left:${r.x * scale}px;top:${r.y * scale}px;width:${bw}px;height:${bh}px;background:${kerf ? "#f1f5f9" : "#f8fafc"};border:1px dashed #cbd5e1;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;opacity:${kerf ? 0.8 : 1}">${label}</div>`;
    })
    .join("");

  const partsHtml = sheet.placedParts
    .map((part) => {
      const bw = part.width * scale;
      const bh = part.height * scale;
      const fill = colorFor(part.sourcePartId || part.label || part.id || "");
      const dimText = `${fmtDim(part.height)}×${fmtDim(part.width)}`;
      const text =
        part.label && !/^P\d+$/i.test(part.label) ? part.label : dimText;
      const vertical = isVertical(bw, bh);
      const edge = part.edgeBanding || {};
      const fs = Math.max(5.5, Math.min(10, (vertical ? bh : bw) / (text.length * 0.55)));
      const bands = [
        edge.top
          ? `<div style="position:absolute;left:1px;right:1px;top:1.5px;border-top:1.5px dashed #2563eb;opacity:.75"></div>`
          : "",
        edge.bottom
          ? `<div style="position:absolute;left:1px;right:1px;bottom:1.5px;border-top:1.5px dashed #2563eb;opacity:.75"></div>`
          : "",
        edge.left
          ? `<div style="position:absolute;top:1px;bottom:1px;left:1.5px;border-left:1.5px dashed #2563eb;opacity:.75"></div>`
          : "",
        edge.right
          ? `<div style="position:absolute;top:1px;bottom:1px;right:1.5px;border-left:1.5px dashed #2563eb;opacity:.75"></div>`
          : ""
      ].join("");
      return `<div style="position:absolute;left:${part.x * scale}px;top:${part.y * scale}px;width:${bw}px;height:${bh}px;background:${fill};border:1px solid #64748b;box-sizing:border-box;overflow:hidden">
        ${bands}
        <div style="position:absolute;inset:2px;display:flex;align-items:center;justify-content:center;overflow:hidden">
          <span style="font-size:${fs}px;font-weight:700;color:#1e293b;white-space:nowrap;transform:${vertical ? "rotate(-90deg)" : "none"};line-height:1">${text}</span>
        </div>
      </div>`;
    })
    .join("");

  return `<div style="position:relative;width:${totalW}px;height:${totalH}px;margin:0;background:#fff;overflow:hidden">
    <div style="position:absolute;left:${padL}px;top:0;width:${boardW}px;text-align:center;font-size:9px;color:#94a3b8;font-weight:600">${fmtDim(sheet.width)}</div>
    <div style="position:absolute;left:${padL}px;top:${padT}px;width:${boardW}px;height:${boardH}px;background:#fafafa;border:1.5px solid #94a3b8;box-sizing:border-box;overflow:hidden">${freeHtml}${partsHtml}</div>
    <div style="position:absolute;left:0;top:${padT}px;width:${padL - 2}px;height:${boardH}px;display:flex;align-items:center;justify-content:center">
      <span style="transform:rotate(-90deg);font-size:10px;color:#64748b;font-weight:600;white-space:nowrap">${fmtDim(sheet.height)}</span>
    </div>
    <div style="position:absolute;left:${padL}px;top:${padT + boardH + 2}px;width:${boardW}px;text-align:center;font-size:10px;color:#dc2626;font-weight:700">${fmtDim(sheet.width)}</div>
    <div style="position:absolute;left:${padL + boardW + 2}px;top:${padT}px;width:${padR - 2}px;height:${boardH}px;display:flex;align-items:center;justify-content:center">
      <span style="font-size:10px;color:#dc2626;font-weight:700">${fmtDim(sheet.height)}</span>
    </div>
  </div>`;
}

function sidebar(sheet) {
  const usedPct = Math.round(sheet.efficiencyPercent);
  const wastePct = Math.round(sheet.wastePercent ?? 100 - sheet.efficiencyPercent);
  const partRows = partsSummaryByLabel(sheet.placedParts);
  const cuts = (sheet.cutSteps || [])
    .map(
      (s) =>
        `<tr><td class="c-i">${s.index}</td><td class="c-p">${s.pieceSize}</td><td class="c-c">${s.cut}</td><td>${s.result}</td></tr>`
    )
    .join("");
  const partTable = partRows
    .map((r) => `<tr><td>${r.label}</td><td>—</td><td class="num">${r.quantity}</td></tr>`)
    .join("");
  return `
    <p class="sheet-h">Malzeme levhaları ${REF_SHEET.length}x${REF_SHEET.width}</p>
    <ul class="stats">
      <li><span>Kullanılan alan</span><span>${formatStatNumber(sheet.usedArea)} ${formatPercent(usedPct)}</span></li>
      <li><span>Boş alan</span><span>${formatStatNumber(sheet.wasteArea)} ${formatPercent(wastePct)}</span></li>
      <li><span>Kesimler</span><span>${sheet.cutCount ?? sheet.cutSteps?.length ?? 0}</span></li>
      <li><span>Kesim uzunluğu</span><span>${formatStatNumber(sheet.cutLength ?? 0)}</span></li>
      <li><span>Parçalar</span><span>${sheet.placedParts.length}</span></li>
      <li><span>Boş parça</span><span>${sheet.surplusCount ?? 0}</span></li>
      <li><span>Kenar bantı 1</span><span>${formatStatNumber(sheet.edgeBandingLength ?? 0)}</span></li>
    </ul>
    <table class="tbl"><thead><tr><th>Parça</th><th>Etiket</th><th class="num">Adet</th></tr></thead><tbody>${partTable}</tbody></table>
    <table class="cuts"><thead><tr><th class="c-i">#</th><th class="c-p">Parça</th><th class="c-c">Kesim</th><th>Result</th></tr></thead><tbody>${cuts}</tbody></table>
  `;
}

const usedPct = Math.round(result.efficiencyPercent);
const wastePct = Math.round(100 - result.efficiencyPercent);
const pages = result.sheets
  .map((sheet, i) => {
    const summary =
      i === 0
        ? `<div class="summary">
        <div class="sum-left">
          <div class="row"><span class="lab">Kullanılan malzeme levhası</span><span class="val">${result.sheets.length}</span></div>
          <div class="row"><span class="lab">Toplam kullanılan alan</span><span class="val">${formatStatNumber(result.totalUsedArea)} <span class="pct">${formatPercent(usedPct)}</span></span></div>
          <div class="row"><span class="lab">Toplam boş alan</span><span class="val">${formatStatNumber(result.totalWasteArea)} <span class="pct">${formatPercent(wastePct)}</span></span></div>
          <div class="row"><span class="lab">Toplam kesim</span><span class="val">${result.totalCuts ?? 0}</span></div>
          <div class="row"><span class="lab">Toplam kesim uzunluğu</span><span class="val">${formatStatNumber(result.totalCutLength ?? 0)}</span></div>
          <div class="row"><span class="lab">Kesme / Bıçak Ağzı / Çentik Kalınlığı</span><span class="val">${options.kerf}</span></div>
          <div class="row"><span class="lab">Kenar bantı 1</span><span class="val">${formatStatNumber(result.totalEdgeBandingLength ?? 0)}</span></div>
        </div>
        <div class="sum-right">
          <div class="row"><span class="lab">Parçalar</span><span class="val soft">${partsInlineFromForm()}</span></div>
          <div class="row"><span class="lab">Malzeme levhaları</span><span class="val soft">${REF_SHEET.length}x${REF_SHEET.width} ${REF_SHEET.label} x${result.sheets.length}</span></div>
        </div>
      </div>`
        : "";

    return `<section class="page">
      <header class="head">
        <h1>Mobar 2026</h1>
        ${i > 0 ? `<span class="mat">${sheet.label || "Ollie"}</span>` : ""}
      </header>
      ${summary}
      <div class="body">
        <aside class="sidebar">${sidebar(sheet)}</aside>
        <div class="diagram">${renderDiagram(sheet)}</div>
      </div>
      <footer class="foot"><span>12.07.2026</span><span>sayfa ${i + 1} / ${result.sheets.length}</span></footer>
    </section>`;
  })
  .join("");

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Cutlist PDF Preview</title>
<style>
  body { margin: 0; background: #e5e7eb; font-family: Arial, Helvetica, sans-serif; }
  .page {
    width: 297mm; height: 210mm; margin: 12px auto; background: #fff;
    padding: 8mm 9mm 7mm; box-sizing: border-box; overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 4px 24px rgba(0,0,0,.12);
  }
  .head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; padding-bottom:3px; border-bottom:1px solid #cbd5e1; }
  .head h1 { margin:0; font-size:14px; font-weight:700; }
  .mat { font-size:12px; font-weight:700; }
  .summary { display:grid; grid-template-columns:1fr 1.15fr; gap:2px 14px; margin-bottom:6px; font-size:8px; line-height:1.35; }
  .sum-left, .sum-right { display:flex; flex-direction:column; gap:1.5px; }
  .row { display:grid; grid-template-columns:128px 1fr; gap:6px; }
  .lab { color:#475569; }
  .val { color:#0f172a; font-weight:600; }
  .val.soft { font-weight:500; word-break:break-word; }
  .pct { margin-left:4px; color:#64748b; font-weight:500; }
  .body { display:grid; grid-template-columns:95mm 1fr; gap:5mm; flex:1; min-height:0; overflow:hidden; }
  .sidebar { font-size:7.5px; line-height:1.25; overflow:hidden; display:flex; flex-direction:column; gap:4px; }
  .sheet-h { margin:0; font-size:8.5px; font-weight:700; }
  .stats { margin:0; padding:0; list-style:none; }
  .stats li { display:flex; justify-content:space-between; gap:8px; padding:1px 0; border-bottom:1px solid #f1f5f9; }
  .stats li span:first-child { color:#64748b; }
  .stats li span:last-child { font-weight:700; }
  .tbl { width:100%; border-collapse:collapse; font-size:7px; }
  .tbl th, .tbl td { border:1px solid #e2e8f0; padding:1.5px 3px; }
  .tbl th { background:#f8fafc; font-size:6.5px; }
  .tbl td.num { text-align:right; }
  .cuts { width:100%; border-collapse:collapse; font-size:6.2px; table-layout:fixed; }
  .cuts th, .cuts td { border:1px solid #e2e8f0; padding:0.8px 2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cuts th { background:#f1f5f9; font-size:6px; }
  .c-i { width:12px; text-align:center; color:#64748b; }
  .c-p { width:36px; font-weight:600; }
  .c-c { width:28px; font-family:Consolas,monospace; }
  .diagram { display:flex; align-items:flex-start; justify-content:flex-start; overflow:hidden; padding-left:2mm; }
  .foot { display:flex; justify-content:space-between; margin-top:4px; padding-top:3px; border-top:1px solid #e2e8f0; font-size:8px; color:#64748b; }
</style>
</head>
<body>
${pages}
</body>
</html>`;

const out = path.join(outDir, "pdf-preview.html");
fs.writeFileSync(out, html, "utf8");
console.log("Wrote", out);
console.log("sheets", result.sheets.length, "used", result.totalUsedArea, "cuts", result.totalCuts);

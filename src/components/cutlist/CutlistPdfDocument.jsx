import React, { useMemo } from "react";
import { formatDate } from "../../utils/format.js";
import { defaultCutlistOptions } from "../../lib/cutlist/types.js";
import {
  formatStatNumber,
  formatPercent,
  partsSummaryByLabel
} from "../../lib/cutlist/sheetStats.js";
import SheetVisualizerPdf from "./SheetVisualizerPdf.jsx";

/** @typedef {import('../../lib/cutlist/types.js').CutlistResult} CutlistResult */
/** @typedef {import('../../lib/cutlist/types.js').CutlistOptions} CutlistOptions */
/** @typedef {import('../../lib/cutlist/types.js').CutSheet} CutSheet */

const PDF_CSS = `
[data-yk-print-root].yk-pdf-cl {
  box-sizing: border-box;
  width: 297mm;
  margin: 0 auto;
  background: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  color: #1a1a1a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.yk-pdf-cl *, .yk-pdf-cl *::before, .yk-pdf-cl *::after { box-sizing: border-box; }

.yk-pdf-cl-page {
  width: 297mm;
  height: 209mm;
  max-height: 209mm;
  padding: 8mm 9mm 7mm;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  page-break-inside: avoid;
  break-inside: avoid;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.yk-pdf-cl-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.yk-pdf-cl-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
  padding-bottom: 3px;
  border-bottom: 1px solid #cbd5e1;
  flex-shrink: 0;
}
.yk-pdf-cl-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}
.yk-pdf-cl-mat-name {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.yk-pdf-cl-summary {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 2px 14px;
  margin-bottom: 6px;
  font-size: 8px;
  line-height: 1.35;
  flex-shrink: 0;
}
.yk-pdf-cl-sum-left,
.yk-pdf-cl-sum-right {
  display: flex;
  flex-direction: column;
  gap: 1.5px;
}
.yk-pdf-cl-sum-row {
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: 6px;
  align-items: start;
}
.yk-pdf-cl-sum-label { color: #475569; }
.yk-pdf-cl-sum-value { color: #0f172a; font-weight: 600; }
.yk-pdf-cl-sum-value--soft { font-weight: 500; word-break: break-word; }
.yk-pdf-cl-pct { margin-left: 4px; color: #64748b; font-weight: 500; }

.yk-pdf-cl-body {
  display: grid;
  grid-template-columns: 95mm 1fr;
  gap: 5mm;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  align-items: stretch;
}

.yk-pdf-cl-sidebar {
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 7.5px;
  line-height: 1.25;
}
.yk-pdf-cl-sheet-h {
  margin: 0;
  font-size: 8.5px;
  font-weight: 700;
  color: #0f172a;
}
.yk-pdf-cl-stats {
  margin: 0;
  padding: 0;
  list-style: none;
}
.yk-pdf-cl-stats li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 1px 0;
  border-bottom: 1px solid #f1f5f9;
}
.yk-pdf-cl-stats li span:first-child { color: #64748b; }
.yk-pdf-cl-stats li span:last-child { font-weight: 700; color: #0f172a; text-align: right; white-space: nowrap; }

.yk-pdf-cl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7px;
}
.yk-pdf-cl-table th {
  text-align: left;
  padding: 2px 3px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-weight: 700;
  color: #475569;
  font-size: 6.5px;
}
.yk-pdf-cl-table td {
  padding: 1.5px 3px;
  border: 1px solid #e2e8f0;
  color: #1e293b;
  vertical-align: top;
}
.yk-pdf-cl-table td.num { text-align: right; font-variant-numeric: tabular-nums; }

.yk-pdf-cl-cuts {
  width: 100%;
  border-collapse: collapse;
  font-size: 6.2px;
  table-layout: fixed;
  flex: 1;
}
.yk-pdf-cl-cuts th {
  text-align: left;
  padding: 1.5px 2px;
  border: 1px solid #cbd5e1;
  background: #f1f5f9;
  font-weight: 700;
  color: #475569;
  font-size: 6px;
}
.yk-pdf-cl-cuts td {
  padding: 0.8px 2px;
  border: 1px solid #e2e8f0;
  color: #1e293b;
  vertical-align: top;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.yk-pdf-cl-cuts .c-i { width: 12px; text-align: center; color: #64748b; }
.yk-pdf-cl-cuts .c-p { width: 36px; font-weight: 600; }
.yk-pdf-cl-cuts .c-c { width: 28px; font-family: Consolas, "Courier New", monospace; }

.yk-pdf-cl-diagram {
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  /* Listeye yakın; ortalamak / sağa itmek ortada boşluk bırakır */
  justify-content: flex-start;
  padding-top: 2px;
  padding-left: 2mm;
}
.yk-pdf-cl-diagram > .yk-pdf-cl-sheet {
  flex: 0 0 auto;
}

.yk-pdf-cl-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding-top: 3px;
  border-top: 1px solid #e2e8f0;
  font-size: 8px;
  color: #64748b;
  flex-shrink: 0;
}
.yk-pdf-cl-warn {
  margin: 0 0 4px;
  padding: 3px 6px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  font-size: 7.5px;
  color: #92400e;
  flex-shrink: 0;
}
`;

/**
 * @param {number} n
 */
function fmtDimPlain(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}

/**
 * @param {Array<{ length: number, width: number, quantity: number }>} parts
 */
function formatInputPartsInline(parts) {
  return (parts || [])
    .filter((p) => Number(p.quantity) > 0 && p.length > 0 && p.width > 0)
    .map((p) => `${fmtDimPlain(p.length)}x${fmtDimPlain(p.width)} x${p.quantity}`)
    .join(" \\ ");
}

/**
 * @param {{ label: string, value: React.ReactNode, soft?: boolean }} props
 */
function SumRow({ label, value, soft = false }) {
  return (
    <div className="yk-pdf-cl-sum-row">
      <span className="yk-pdf-cl-sum-label">{label}</span>
      <span className={soft ? "yk-pdf-cl-sum-value yk-pdf-cl-sum-value--soft" : "yk-pdf-cl-sum-value"}>
        {value}
      </span>
    </div>
  );
}

/**
 * @param {{ sheet: CutSheet, options: CutlistOptions, sheetMaterialSize: string }} props
 */
function SheetSidebar({ sheet, options, sheetMaterialSize }) {
  const partRows = useMemo(() => partsSummaryByLabel(sheet.placedParts), [sheet.placedParts]);
  const wastePct = Math.round(sheet.wastePercent ?? 100 - sheet.efficiencyPercent);
  const usedPct = Math.round(sheet.efficiencyPercent);
  const cutCount = sheet.cutCount ?? sheet.cutSteps?.length ?? 0;
  const compactCuts = cutCount > 22;

  return (
    <aside className="yk-pdf-cl-sidebar">
      <p className="yk-pdf-cl-sheet-h">Malzeme levhaları {sheetMaterialSize}</p>
      <ul className="yk-pdf-cl-stats">
        <li>
          <span>Kullanılan alan</span>
          <span>
            {formatStatNumber(sheet.usedArea)} {formatPercent(usedPct)}
          </span>
        </li>
        <li>
          <span>Boş alan</span>
          <span>
            {formatStatNumber(sheet.wasteArea)} {formatPercent(wastePct)}
          </span>
        </li>
        <li>
          <span>Kesimler</span>
          <span>{cutCount}</span>
        </li>
        <li>
          <span>Kesim uzunluğu</span>
          <span>{formatStatNumber(sheet.cutLength ?? 0)}</span>
        </li>
        <li>
          <span>Parçalar</span>
          <span>{sheet.placedParts.length}</span>
        </li>
        <li>
          <span>Boş parça</span>
          <span>{sheet.surplusCount ?? 0}</span>
        </li>
        {(sheet.edgeBandingLength ?? 0) > 0 || options.edgeBanding ? (
          <li>
            <span>Kenar bantı 1</span>
            <span>{formatStatNumber(sheet.edgeBandingLength ?? 0)}</span>
          </li>
        ) : null}
      </ul>

      {partRows.length ? (
        <table className="yk-pdf-cl-table">
          <thead>
            <tr>
              <th>Parça</th>
              <th>Etiket</th>
              <th className="num">Adet</th>
            </tr>
          </thead>
          <tbody>
            {partRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>—</td>
                <td className="num">{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {sheet.cutSteps?.length ? (
        <table
          className="yk-pdf-cl-cuts"
          style={compactCuts ? { fontSize: "5.6px" } : undefined}
        >
          <thead>
            <tr>
              <th className="c-i">#</th>
              <th className="c-p">Parça</th>
              <th className="c-c">Kesim</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {sheet.cutSteps.map((step) => (
              <tr key={step.index}>
                <td className="c-i">{step.index}</td>
                <td className="c-p">{step.pieceSize}</td>
                <td className="c-c">{step.cut}</td>
                <td title={step.result}>{step.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </aside>
  );
}

/**
 * @param {{
 *   result: CutlistResult,
 *   parts: Array<{ length: number, width: number, quantity: number, label: string, canRotate: boolean }>,
 *   sheets: Array<{ length: number, width: number, quantity: number, label: string, canRotate: boolean }>,
 *   options: CutlistOptions,
 *   chamberName?: string
 * }} props
 */
export default function CutlistPdfDocument({ result, parts, sheets, options }) {
  const o = { ...defaultCutlistOptions(), ...options };
  const reportDate = formatDate(new Date());
  const validParts = (parts || []).filter((p) => Number(p.quantity) > 0 && p.length > 0 && p.width > 0);
  const validSheets = (sheets || []).filter((s) => Number(s.quantity) > 0 && s.length > 0 && s.width > 0);
  const mat = validSheets[0];
  const materialLabel = mat
    ? `${mat.length}x${mat.width}${mat.label ? ` ${mat.label}` : ""}`
    : "";
  const materialQty = ` x${result.sheets.length}`;
  const sheetMaterialSize = mat ? `${mat.length}x${mat.width}` : "";
  const pageCount = result.sheets.length;
  const usedPct = Math.round(result.efficiencyPercent);
  const wastePct = Math.round(100 - result.efficiencyPercent);
  const partsInline = formatInputPartsInline(validParts);

  if (!result?.sheets?.length) return null;

  return (
    <div className="yk-pdf-cl" data-yk-print-root data-yk-print-skin>
      <style data-yk-pdf="1" dangerouslySetInnerHTML={{ __html: PDF_CSS }} />

      {result.sheets.map((sheet, sheetIndex) => (
        <section key={sheet.id || sheetIndex} className="yk-pdf-cl-page">
          <header className="yk-pdf-cl-head">
            <h1 className="yk-pdf-cl-title">Mobar 2026</h1>
            {sheetIndex > 0 ? (
              <span className="yk-pdf-cl-mat-name">{sheet.label || mat?.label || ""}</span>
            ) : null}
          </header>

          {sheetIndex === 0 ? (
            <div className="yk-pdf-cl-summary">
              <div className="yk-pdf-cl-sum-left">
                <SumRow label="Kullanılan malzeme levhası" value={String(result.sheets.length)} />
                <SumRow
                  label="Toplam kullanılan alan"
                  value={
                    <>
                      {formatStatNumber(result.totalUsedArea)}
                      <span className="yk-pdf-cl-pct">{formatPercent(usedPct)}</span>
                    </>
                  }
                />
                <SumRow
                  label="Toplam boş alan"
                  value={
                    <>
                      {formatStatNumber(result.totalWasteArea)}
                      <span className="yk-pdf-cl-pct">{formatPercent(wastePct)}</span>
                    </>
                  }
                />
                <SumRow label="Toplam kesim" value={String(result.totalCuts ?? 0)} />
                <SumRow
                  label="Toplam kesim uzunluğu"
                  value={formatStatNumber(result.totalCutLength ?? 0)}
                />
                <SumRow label="Kesme / Bıçak Ağzı / Çentik Kalınlığı" value={String(o.kerf)} />
                {(result.totalEdgeBandingLength ?? 0) > 0 || o.edgeBanding ? (
                  <SumRow
                    label="Kenar bantı 1"
                    value={formatStatNumber(result.totalEdgeBandingLength ?? 0)}
                  />
                ) : null}
              </div>
              <div className="yk-pdf-cl-sum-right">
                <SumRow label="Parçalar" value={partsInline || "—"} soft />
                <SumRow
                  label="Malzeme levhaları"
                  value={`${materialLabel}${materialQty}`}
                  soft
                />
              </div>
            </div>
          ) : null}

          {sheetIndex === 0 && result.unplacedParts.length > 0 ? (
            <div className="yk-pdf-cl-warn">
              Yerleştirilemeyen:{" "}
              {result.unplacedParts
                .map((p) => `${p.label || p.id} (${p.quantity} adet)`)
                .join(", ")}
            </div>
          ) : null}

          <div className="yk-pdf-cl-body">
            <SheetSidebar sheet={sheet} options={o} sheetMaterialSize={sheetMaterialSize} />
            <div className="yk-pdf-cl-diagram">
              <SheetVisualizerPdf sheet={sheet} showLabels={o.showPartLabels !== false} />
            </div>
          </div>

          <footer className="yk-pdf-cl-foot">
            <span>{reportDate}</span>
            <span>
              sayfa {sheetIndex + 1} / {pageCount}
            </span>
          </footer>
        </section>
      ))}
    </div>
  );
}

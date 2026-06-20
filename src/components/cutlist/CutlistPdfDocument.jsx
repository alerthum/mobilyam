import React, { useMemo } from "react";
import primaryBrandLogoUrl from "../../assets/ushak-mobar-logo.png";
import chamberSealLogoUrl from "../../assets/ushak-marango-esnaf-odasi-logo.png";
import { formatDate } from "../../utils/format.js";
import { defaultCutlistOptions } from "../../lib/cutlist/types.js";

/** @typedef {import('../../lib/cutlist/types.js').CutlistResult} CutlistResult */
/** @typedef {import('../../lib/cutlist/types.js').CutlistOptions} CutlistOptions */
/** @typedef {import('../../lib/cutlist/types.js').CutSheet} CutSheet */

const PDF_CSS = `
[data-yk-print-root].yk-pdf-cl {
  box-sizing: border-box;
  max-width: 210mm;
  margin: 0 auto;
  background: #ffffff;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 10px;
  line-height: 1.4;
  color: #0f172a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.yk-pdf-cl * { box-sizing: border-box; }
.yk-pdf-cl-bar {
  height: 5px;
  background: linear-gradient(90deg, #0284c7 0%, #0369a1 45%, #0f172a 100%);
}
.yk-pdf-cl-inner { padding: 22px 24px 28px; }
.yk-pdf-cl-header {
  display: grid;
  grid-template-columns: 2.4cm 1fr 2.4cm;
  align-items: center;
  gap: 10px 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}
.yk-pdf-cl-logo {
  width: 2.4cm;
  height: 2.4cm;
  object-fit: contain;
  display: block;
}
.yk-pdf-cl-logo--r { justify-self: end; }
.yk-pdf-cl-header-center { text-align: center; min-width: 0; }
.yk-pdf-cl-chamber {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: #0c4a6e;
}
.yk-pdf-cl-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
}
.yk-pdf-cl-date {
  margin: 5px 0 0;
  font-size: 10px;
  color: #64748b;
}
.yk-pdf-cl-section {
  margin-top: 16px;
  page-break-inside: avoid;
}
.yk-pdf-cl-section-h {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}
.yk-pdf-cl-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 9px;
}
.yk-pdf-cl-stat-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.yk-pdf-cl-stat-label { color: #64748b; }
.yk-pdf-cl-stat-value { font-weight: 600; color: #0f172a; text-align: right; }
.yk-pdf-cl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
}
.yk-pdf-cl-table th {
  text-align: left;
  padding: 5px 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-weight: 700;
  color: #475569;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.yk-pdf-cl-table td {
  padding: 4px 6px;
  border: 1px solid #e2e8f0;
  vertical-align: top;
  color: #1e293b;
}
.yk-pdf-cl-table td.num { text-align: right; white-space: nowrap; }
.yk-pdf-cl-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  font-size: 9px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.yk-pdf-cl-opt-row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.yk-pdf-cl-opt-label { color: #64748b; }
.yk-pdf-cl-opt-value { font-weight: 600; color: #0f172a; }
.yk-pdf-cl-warn {
  margin-top: 10px;
  padding: 8px 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 9px;
  color: #92400e;
}
.yk-pdf-cl-sheets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
}
.yk-pdf-cl-sheet-cell {
  page-break-inside: avoid;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px;
  background: #ffffff;
  min-width: 0;
}
.yk-pdf-cl-sheet-cell--solo {
  grid-column: 1 / -1;
  max-width: 52%;
  justify-self: center;
}
.yk-pdf-cl-sheet-svg {
  width: 100%;
  height: auto;
  display: block;
}
.yk-pdf-cl-sheet-meta {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
  font-size: 8px;
  color: #475569;
}
.yk-pdf-cl-sheet-meta p { margin: 2px 0; }
.yk-pdf-cl-sheet-meta strong { color: #0f172a; }
.yk-pdf-cl-cuts {
  page-break-before: always;
}
.yk-pdf-cl-cuts-intro {
  margin: 0 0 10px;
  font-size: 9px;
  color: #64748b;
}
.yk-pdf-cl-cuts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5px;
  table-layout: fixed;
}
.yk-pdf-cl-cuts-table thead {
  display: table-header-group;
}
.yk-pdf-cl-cuts-table th {
  text-align: left;
  padding: 5px 5px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  font-weight: 700;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #334155;
}
.yk-pdf-cl-cuts-table td {
  padding: 4px 5px;
  border: 1px solid #e2e8f0;
  vertical-align: top;
  word-break: break-word;
  color: #1e293b;
  page-break-inside: avoid;
}
.yk-pdf-cl-cuts-table tr {
  page-break-inside: avoid;
}
.yk-pdf-cl-cuts-table .col-idx { width: 22px; text-align: center; color: #64748b; }
.yk-pdf-cl-cuts-table .col-piece { width: 72px; font-weight: 600; }
.yk-pdf-cl-cuts-table .col-cut { width: 58px; font-family: Consolas, "Courier New", monospace; font-size: 8px; }
.yk-pdf-cl-cuts-group-h td {
  background: #f1f5f9;
  font-weight: 700;
  font-size: 9px;
  color: #334155;
  padding: 6px 5px;
  border: 1px solid #cbd5e1;
}
.yk-pdf-cl-foot {
  margin-top: 14px;
  font-size: 8px;
  color: #94a3b8;
  text-align: center;
}
`;

const PART_FILLS = ["#dbeafe", "#fce7f3", "#dcfce7", "#fef3c7", "#e0e7ff", "#ffedd5"];
const PART_STROKES = ["#64748b", "#64748b", "#64748b", "#64748b", "#64748b", "#64748b"];

function stableColorIndex(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % PART_FILLS.length;
}

function partColorKey(part) {
  return part.sourcePartId || part.label || part.id || "";
}

function partColors(part) {
  const index = stableColorIndex(partColorKey(part));
  return { fill: PART_FILLS[index], stroke: PART_STROKES[index] };
}

function boolLabel(v) {
  return v ? "Evet" : "Hayır";
}

/**
 * @param {{ sheet: CutSheet, showLabels?: boolean, compact?: boolean }} props
 */
function SheetVisualizerPdf({ sheet, showLabels = true, compact = false }) {
  const padding = compact ? 22 : 26;
  const viewW = compact ? 280 : 300;
  const scale = (viewW - padding * 2) / sheet.width;
  const viewH = sheet.height * scale + padding * 2;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className="yk-pdf-cl-sheet-svg"
      role="img"
      aria-label={`Levha ${sheet.label}`}
    >
      <rect
        x={padding}
        y={padding}
        width={sheet.width * scale}
        height={sheet.height * scale}
        fill="#fafafa"
        stroke="#cbd5e1"
        strokeWidth={1.2}
      />
      <text
        x={padding + (sheet.width * scale) / 2}
        y={padding - 6}
        textAnchor="middle"
        fill="#64748b"
        fontSize={9}
        fontWeight={500}
      >
        {sheet.width}
      </text>
      <text
        x={padding - 6}
        y={padding + (sheet.height * scale) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90, ${padding - 6}, ${padding + (sheet.height * scale) / 2})`}
        fill="#64748b"
        fontSize={9}
        fontWeight={500}
      >
        {sheet.height}
      </text>
      <text
        x={padding + sheet.width * scale - 3}
        y={padding + 11}
        textAnchor="end"
        fill="#94a3b8"
        fontSize={8}
        fontWeight={600}
      >
        {sheet.label}
      </text>

      {sheet.placedParts.map((part) => {
        const px = padding + part.x * scale;
        const py = padding + part.y * scale;
        const pw = part.width * scale;
        const ph = part.height * scale;
        const { fill, stroke } = partColors(part);

        return (
          <g key={part.id}>
            <rect x={px} y={py} width={pw} height={ph} fill={fill} stroke={stroke} strokeWidth={0.7} />
            {Array.from({ length: Math.min(6, Math.floor(ph / 7)) }).map((_, i) => (
              <line
                key={i}
                x1={px + 2}
                x2={px + pw - 2}
                y1={py + 3 + i * 7}
                y2={py + 3 + i * 7}
                stroke="#94a3b8"
                strokeWidth={0.35}
                opacity={0.45}
              />
            ))}
            {showLabels && pw > 20 && ph > 14 ? (
              <>
                <text
                  x={px + pw / 2}
                  y={py + ph / 2 - 3}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#1e293b"
                  fontSize={7}
                  fontWeight={700}
                >
                  {part.label}
                </text>
                <text
                  x={px + pw / 2}
                  y={py + ph / 2 + 7}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize={6.5}
                >
                  {part.height}×{part.width}
                </text>
              </>
            ) : null}
          </g>
        );
      })}

      {sheet.freeRects
        .filter((r) => r.width * r.height > 500)
        .slice(0, 2)
        .map((r, idx) => (
          <text
            key={`free-${idx}`}
            x={padding + (r.x + r.width / 2) * scale}
            y={padding + (r.y + r.height / 2) * scale}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize={7}
          >
            {r.width.toFixed(0)}×{r.height.toFixed(0)}
          </text>
        ))}
    </svg>
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
export default function CutlistPdfDocument({ result, parts, sheets, options, chamberName }) {
  const o = { ...defaultCutlistOptions(), ...options };
  const reportDate = formatDate(new Date());

  const generalStats = useMemo(
    () => [
      ["Kullanılan levha", `${result.sheets.length} adet`],
      ["Toplam kullanılan alan", `${result.totalUsedArea.toLocaleString("tr-TR")} mm²`],
      ["Toplam levha alanı", `${result.totalSheetArea.toLocaleString("tr-TR")} mm²`],
      ["Toplam boş alan", `${result.totalWasteArea.toLocaleString("tr-TR")} mm²`],
      ["Verim", `%${result.efficiencyPercent.toFixed(2)}`],
      ["Yerleştirilemeyen parça", `${result.unplacedParts.length} tip`]
    ],
    [result]
  );

  const cutGroups = useMemo(
    () =>
      result.sheets.map((sheet, sheetIndex) => ({
        sheetIndex,
        label: sheet.label || `Levha ${sheetIndex + 1}`,
        size: `${sheet.height}×${sheet.width}`,
        steps: sheet.cutSteps || []
      })),
    [result.sheets]
  );

  const totalCutSteps = cutGroups.reduce((n, g) => n + g.steps.length, 0);

  const validParts = (parts || []).filter((p) => Number(p.quantity) > 0 && p.length > 0 && p.width > 0);
  const validSheets = (sheets || []).filter((s) => Number(s.quantity) > 0 && s.length > 0 && s.width > 0);

  if (!result?.sheets?.length) return null;

  const sheetRows = [];
  for (let i = 0; i < result.sheets.length; i += 2) {
    sheetRows.push(result.sheets.slice(i, i + 2));
  }

  return (
    <div className="yk-pdf-cl" data-yk-print-root data-yk-print-skin>
      <style data-yk-pdf="1" dangerouslySetInnerHTML={{ __html: PDF_CSS }} />
      <div className="yk-pdf-cl-bar" aria-hidden />
      <div className="yk-pdf-cl-inner">
        <header className="yk-pdf-cl-header">
          <img className="yk-pdf-cl-logo" src={primaryBrandLogoUrl} alt="" />
          <div className="yk-pdf-cl-header-center">
            {chamberName ? <p className="yk-pdf-cl-chamber">{chamberName}</p> : null}
            <h1 className="yk-pdf-cl-title">Kesim Hesaplama Raporu</h1>
            <p className="yk-pdf-cl-date">Tarih: {reportDate}</p>
          </div>
          <img className="yk-pdf-cl-logo yk-pdf-cl-logo--r" src={chamberSealLogoUrl} alt="" />
        </header>

        <section className="yk-pdf-cl-section">
          <h2 className="yk-pdf-cl-section-h">Genel istatistikler</h2>
          <div className="yk-pdf-cl-stats">
            {generalStats.map(([label, value]) => (
              <div key={label} className="yk-pdf-cl-stat-row">
                <span className="yk-pdf-cl-stat-label">{label}</span>
                <span className="yk-pdf-cl-stat-value">{value}</span>
              </div>
            ))}
          </div>
          {result.unplacedParts.length > 0 ? (
            <div className="yk-pdf-cl-warn">
              Yerleştirilemeyen:{" "}
              {result.unplacedParts
                .map((p) => `${p.label || p.id} (${p.quantity} adet)`)
                .join(", ")}
            </div>
          ) : null}
        </section>

        <section className="yk-pdf-cl-section">
          <h2 className="yk-pdf-cl-section-h">Parçalar</h2>
          <table className="yk-pdf-cl-table">
            <thead>
              <tr>
                <th>Uzunluk</th>
                <th>Genişlik</th>
                <th>Adet</th>
                <th>Etiket</th>
                <th>Döndür</th>
              </tr>
            </thead>
            <tbody>
              {validParts.length ? (
                validParts.map((p, i) => (
                  <tr key={p.id || i}>
                    <td className="num">{p.length}</td>
                    <td className="num">{p.width}</td>
                    <td className="num">{p.quantity}</td>
                    <td>{p.label || "—"}</td>
                    <td>{boolLabel(p.canRotate !== false)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="yk-pdf-cl-section">
          <h2 className="yk-pdf-cl-section-h">Malzeme levhaları</h2>
          <table className="yk-pdf-cl-table">
            <thead>
              <tr>
                <th>Uzunluk</th>
                <th>Genişlik</th>
                <th>Adet</th>
                <th>Etiket</th>
                <th>Döndür</th>
              </tr>
            </thead>
            <tbody>
              {validSheets.length ? (
                validSheets.map((s, i) => (
                  <tr key={s.id || i}>
                    <td className="num">{s.length}</td>
                    <td className="num">{s.width}</td>
                    <td className="num">{s.quantity}</td>
                    <td>{s.label || "—"}</td>
                    <td>{boolLabel(s.canRotate !== false)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="yk-pdf-cl-section">
          <h2 className="yk-pdf-cl-section-h">Seçenekler</h2>
          <div className="yk-pdf-cl-options">
            <div className="yk-pdf-cl-opt-row">
              <span className="yk-pdf-cl-opt-label">Kerf (mm)</span>
              <span className="yk-pdf-cl-opt-value">{o.kerf}</span>
            </div>
            <div className="yk-pdf-cl-opt-row">
              <span className="yk-pdf-cl-opt-label">Parça etiketleri</span>
              <span className="yk-pdf-cl-opt-value">{boolLabel(o.showPartLabels)}</span>
            </div>
            <div className="yk-pdf-cl-opt-row">
              <span className="yk-pdf-cl-opt-label">Tek levha</span>
              <span className="yk-pdf-cl-opt-value">{boolLabel(o.useSingleSheetOnly)}</span>
            </div>
            <div className="yk-pdf-cl-opt-row">
              <span className="yk-pdf-cl-opt-label">Damar yönü</span>
              <span className="yk-pdf-cl-opt-value">{boolLabel(o.considerGrain)}</span>
            </div>
            <div className="yk-pdf-cl-opt-row">
              <span className="yk-pdf-cl-opt-label">Kenar bantlama</span>
              <span className="yk-pdf-cl-opt-value">{boolLabel(o.edgeBanding)}</span>
            </div>
            <div className="yk-pdf-cl-opt-row">
              <span className="yk-pdf-cl-opt-label">Döndürme</span>
              <span className="yk-pdf-cl-opt-value">{boolLabel(o.allowRotation)}</span>
            </div>
          </div>
        </section>

        <section className="yk-pdf-cl-section">
          <h2 className="yk-pdf-cl-section-h">Levha yerleşimleri</h2>
          <div className="yk-pdf-cl-sheets-grid">
            {sheetRows.map((pair, rowIdx) =>
              pair.map((sheet, colIdx) => {
                const solo = pair.length === 1;
                return (
                  <div
                    key={sheet.id || `${rowIdx}-${colIdx}`}
                    className={solo ? "yk-pdf-cl-sheet-cell yk-pdf-cl-sheet-cell--solo" : "yk-pdf-cl-sheet-cell"}
                  >
                    <SheetVisualizerPdf sheet={sheet} showLabels={o.showPartLabels} compact={!solo} />
                    <div className="yk-pdf-cl-sheet-meta">
                      <p>
                        <strong>{sheet.label}</strong> · {sheet.height}×{sheet.width}
                      </p>
                      <p>
                        Kullanılan: {sheet.usedArea.toLocaleString("tr-TR")} mm² (
                        %{sheet.efficiencyPercent.toFixed(1)})
                      </p>
                      <p>Boş: {sheet.wasteArea.toLocaleString("tr-TR")} mm²</p>
                      <p>Parça: {sheet.placedParts.length} adet</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {totalCutSteps > 0 ? (
          <section className="yk-pdf-cl-section yk-pdf-cl-cuts">
            <h2 className="yk-pdf-cl-section-h">Kesim listesi</h2>
            <p className="yk-pdf-cl-cuts-intro">
              {totalCutSteps} kesim adımı · {cutGroups.length} levha
            </p>
            <table className="yk-pdf-cl-cuts-table">
              <thead>
                <tr>
                  <th className="col-idx">#</th>
                  <th className="col-piece">Parça</th>
                  <th className="col-cut">Kesim</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {cutGroups.map((group) => (
                  <React.Fragment key={`cuts-${group.sheetIndex}`}>
                    <tr className="yk-pdf-cl-cuts-group-h">
                      <td colSpan={4}>
                        {group.label} · {group.size}
                      </td>
                    </tr>
                    {group.steps.length ? (
                      group.steps.map((step) => (
                        <tr key={`${group.sheetIndex}-${step.index}`}>
                          <td className="col-idx">{step.index}</td>
                          <td className="col-piece">{step.pieceSize}</td>
                          <td className="col-cut">{step.cut}</td>
                          <td>{step.result}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ fontStyle: "italic", color: "#94a3b8" }}>
                          Bu levha için kesim adımı üretilemedi.
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <p className="yk-pdf-cl-foot">MOBAR Kesim Hesaplama · {reportDate}</p>
      </div>
    </div>
  );
}

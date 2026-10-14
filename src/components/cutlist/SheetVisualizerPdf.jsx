import React, { useMemo } from "react";

/** @typedef {import('../../lib/cutlist/types.js').CutSheet} CutSheet */
/** @typedef {import('../../lib/cutlist/types.js').EdgeBanding} EdgeBanding */

const PART_FILLS = [
  "#dbeafe",
  "#fce7f3",
  "#dcfce7",
  "#fef3c7",
  "#e0e7ff",
  "#ffedd5"
];

/**
 * @param {number} n
 */
function fmtDim(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}

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

/**
 * @param {{ top?: boolean, right?: boolean, bottom?: boolean, left?: boolean } | undefined} edge
 */
function hasEdge(edge) {
  return Boolean(edge?.top || edge?.right || edge?.bottom || edge?.left);
}

/**
 * @param {CutSheet} sheet
 */
function sheetColumns(sheet) {
  const H = sheet.height;
  const W = sheet.width;
  const TALL = H * 0.85;
  /** @type {Map<number, { x: number, w: number }>} */
  const cols = new Map();

  const claim = (x, w) => {
    if (w < 4) return;
    const key = Math.round(x * 10);
    const prev = cols.get(key);
    if (!prev) cols.set(key, { x, w });
    else prev.w = Math.max(prev.w, w);
  };

  for (const p of sheet.placedParts) {
    if (p.height >= TALL) claim(p.x, p.width);
  }

  if (cols.size < 2) {
    for (const r of sheet.freeRects || []) {
      const thinTopKerf = r.height < 10 && r.width > W * 0.45;
      if (r.y < 8 && r.width >= 10 && !thinTopKerf) claim(r.x, r.width);
    }
    for (const p of sheet.placedParts) {
      if (p.y < 10 && p.width >= 10 && p.height >= 10) claim(p.x, p.width);
    }
  }

  /** @type {Map<number, { x: number, w: number, tall: boolean }>} */
  const clusters = new Map();
  for (const p of sheet.placedParts) {
    const key = Math.round(p.x * 10);
    const cur = clusters.get(key) || { x: p.x, w: 0, tall: false };
    cur.w = Math.max(cur.w, p.width);
    if (p.height >= 28) cur.tall = true;
    clusters.set(key, cur);
  }

  for (const v of clusters.values()) {
    if (!v.tall || v.w < 8) continue;
    const key = Math.round(v.x * 10);
    if (!cols.has(key)) claim(v.x, v.w);
  }

  return [...cols.values()].sort((a, b) => a.x - b.x);
}

/**
 * HTML önizleme ile aynı dikey kararı.
 * @param {number} w
 * @param {number} h
 */
function isVerticalLabel(w, h) {
  if (w > h * 1.15) return false;
  if (h > w * 1.15) return true;
  return h >= w;
}

/**
 * html2canvas DOM yazıyı eziyor — etiketi canvas’ta çizip <img> olarak koy.
 * CSS transform / flex / table yok.
 * @param {string} text
 * @param {number} fontSize
 * @param {string} color
 * @param {number|string} fontWeight
 * @param {boolean} vertical
 * @returns {{ url: string, w: number, h: number } | null}
 */
function renderLabelImage(text, fontSize, color, fontWeight, vertical) {
  if (typeof document === "undefined" || !text) return null;
  const canvas = document.createElement("canvas");
  const probe = canvas.getContext("2d");
  if (!probe) return null;

  const dpr = 2;
  const font = `${fontWeight} ${fontSize}px Arial, Helvetica, sans-serif`;
  probe.font = font;
  const textW = Math.ceil(probe.measureText(text).width) + 4;
  const textH = Math.ceil(fontSize * 1.35);

  if (vertical) {
    const cssW = Math.max(1, textH);
    const cssH = Math.max(1, textW);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.translate(cssW / 2, cssH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 0);
    return { url: canvas.toDataURL("image/png"), w: cssW, h: cssH };
  }

  const cssW = Math.max(1, textW);
  const cssH = Math.max(1, textH);
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cssW / 2, cssH / 2);
  return { url: canvas.toDataURL("image/png"), w: cssW, h: cssH };
}

/**
 * @param {{
 *   text: string,
 *   boxW: number,
 *   boxH: number,
 *   fontSize: number,
 *   color: string,
 *   fontWeight?: number|string,
 *   vertical?: boolean
 * }} props
 */
function PdfDimLabel({
  text,
  boxW,
  boxH,
  fontSize,
  color,
  fontWeight = 700,
  vertical = false
}) {
  const img = useMemo(
    () => renderLabelImage(text, fontSize, color, fontWeight, vertical),
    [text, fontSize, color, fontWeight, vertical]
  );

  if (!img || boxW < 4 || boxH < 4) return null;

  const maxW = boxW * 0.92;
  const maxH = boxH * 0.92;
  const fit = Math.min(1, maxW / img.w, maxH / img.h);
  const dw = Math.max(1, img.w * fit);
  const dh = Math.max(1, img.h * fit);

  return (
    <img
      src={img.url}
      alt=""
      width={dw}
      height={dh}
      draggable={false}
      style={{
        position: "absolute",
        left: (boxW - dw) / 2,
        top: (boxH - dh) / 2,
        width: dw,
        height: dh,
        display: "block",
        border: "none",
        pointerEvents: "none",
        imageRendering: "auto"
      }}
    />
  );
}

/**
 * Yan yana gelen dar sütunların ölçülerinin birbirinin içine geçmesini önlemek için
 * seviyeli (kademeli / basamaklı) dikey ofset hesaplar.
 * @param {Array<{ x: number, w: number }>} columns
 * @param {number} scale
 * @param {number} [minSpacing]
 * @returns {number[]}
 */
function computeStaggeredLevels(columns, scale, minSpacing = 26) {
  const levels = new Array(columns.length).fill(0);
  for (let i = 1; i < columns.length; i += 1) {
    const prevCx = (columns[i - 1].x + columns[i - 1].w / 2) * scale;
    const curCx = (columns[i].x + columns[i].w / 2) * scale;
    if (curCx - prevCx < minSpacing) {
      if (levels[i - 1] === 0) {
        levels[i] = 1;
      } else if (levels[i - 1] === 1) {
        const prevPrevCx = i >= 2 ? (columns[i - 2].x + columns[i - 2].w / 2) * scale : -999;
        levels[i] = curCx - prevPrevCx < minSpacing && levels[i - 2] === 0 ? 2 : 0;
      } else {
        levels[i] = 0;
      }
    } else {
      levels[i] = 0;
    }
  }
  return levels;
}

/**
 * @param {{ sheet: CutSheet, showLabels?: boolean, isFirstPage?: boolean }} props
 */
export default function SheetVisualizerPdf({ sheet, showLabels = true, isFirstPage = false }) {
  /* Sayfa boşluğuna göre taşmayı engelleyen ama sayfayı dolduran maksimum ölçüler */
  const padL = 24;
  const padR = 18;
  const padT = 38;
  const padB = 18;
  const maxBoardW = 480;
  /* İlk sayfada özet tablosu olduğundan 540, sonraki sayfalarda 640 */
  const maxBoardH = isFirstPage ? 540 : 640;
  const scale = Math.min(maxBoardW / sheet.width, maxBoardH / sheet.height);
  const boardW = sheet.width * scale;
  const boardH = sheet.height * scale;
  const totalW = padL + boardW + padR;
  const totalH = padT + boardH + padB;

  const freeRects = (sheet.freeRects || []).filter((r) => r.width > 0.3 && r.height > 0.3);
  const columns = useMemo(() => sheetColumns(sheet), [sheet]);
  const colLevels = useMemo(() => computeStaggeredLevels(columns, scale, 26), [columns, scale]);

  return (
    <div
      className="yk-pdf-cl-sheet"
      style={{
        position: "relative",
        width: totalW,
        height: totalH,
        margin: 0,
        background: "#fff",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: padL,
          top: 0,
          width: boardW,
          height: 12
        }}
      >
        <PdfDimLabel
          text={fmtDim(sheet.width)}
          boxW={boardW}
          boxH={12}
          fontSize={8.5}
          color="#94a3b8"
          fontWeight={600}
        />
      </div>

      {columns.map((col, idx) => {
        const colX = padL + col.x * scale;
        const colW = col.w * scale;
        const cx = colX + colW / 2;
        const level = colLevels[idx] || 0;
        const fs = Math.max(7.5, Math.min(10.5, colW < 14 ? 7.5 : colW * 0.3));
        const label = fmtDim(col.w);
        const boxW = Math.max(26, colW);
        const boxLeft = cx - boxW / 2;
        const boxH = 16;
        const rulerLineY = padT - 2;
        const boxTop = level === 1 ? padT - 34 : level === 2 ? padT - 36 : padT - 20;

        return (
          <React.Fragment key={`ruler-${idx}`}>
            <div
              style={{
                position: "absolute",
                left: colX,
                top: rulerLineY,
                width: colW,
                height: 1,
                borderBottom: "1px solid #94a3b8"
              }}
            />
            {level > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: cx,
                  top: boxTop + 14,
                  width: 0,
                  height: rulerLineY - (boxTop + 14),
                  borderLeft: "1px dashed #64748b",
                  opacity: 0.75
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                left: boxLeft,
                top: boxTop,
                width: boxW,
                height: boxH,
                boxSizing: "border-box"
              }}
            >
              <PdfDimLabel
                text={label}
                boxW={boxW}
                boxH={boxH}
                fontSize={fs}
                color="#1e293b"
                fontWeight={700}
              />
            </div>
          </React.Fragment>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: padL,
          top: padT,
          width: boardW,
          height: boardH,
          background: "#fafafa",
          border: "1.5px solid #94a3b8",
          boxSizing: "border-box",
          overflow: "hidden"
        }}
      >
        {freeRects.map((r, idx) => {
          const kerf = r.height <= 6 || (r.height <= 10 && r.width > sheet.width * 0.4);
          const bw = r.width * scale;
          const bh = r.height * scale;
          const text = `${fmtDim(r.height)}×${fmtDim(r.width)}`;
          const vertical = isVerticalLabel(bw, bh);
          const along = vertical ? bh : bw;
          const cross = vertical ? bw : bh;
          const fs = Math.max(
            4.5,
            Math.min(8.5, Math.min(along / (text.length * 0.52), cross * 0.72))
          );
          const canLabel = showLabels && along >= 22 && cross >= 5;
          return (
            <div
              key={`free-${idx}`}
              style={{
                position: "absolute",
                left: r.x * scale,
                top: r.y * scale,
                width: bw,
                height: bh,
                background: kerf ? "#f1f5f9" : "#f8fafc",
                border: "1px dashed #cbd5e1",
                boxSizing: "border-box",
                overflow: "hidden",
                opacity: kerf ? 0.8 : 1
              }}
            >
              {canLabel ? (
                <PdfDimLabel
                  text={text}
                  boxW={bw}
                  boxH={bh}
                  fontSize={fs}
                  color="#94a3b8"
                  fontWeight={600}
                  vertical={vertical}
                />
              ) : null}
            </div>
          );
        })}

        {sheet.placedParts.map((part) => {
          const bw = part.width * scale;
          const bh = part.height * scale;
          const fill = PART_FILLS[stableColorIndex(partColorKey(part))];
          /** @type {EdgeBanding | undefined} */
          const edge = part.edgeBanding;
          const band = hasEdge(edge);
          const dimText = `${fmtDim(part.height)}×${fmtDim(part.width)}`;
          const text =
            part.label && !/^P\d+$/i.test(part.label) ? part.label : dimText;
          const vertical = isVerticalLabel(bw, bh);
          const along = vertical ? bh : bw;
          const cross = vertical ? bw : bh;
          const fs = Math.max(
            5.5,
            Math.min(10, Math.min(along / (text.length * 0.55), cross * 0.5))
          );
          const bandPad = band ? 3 : 2;
          const labelW = Math.max(0, bw - bandPad * 2);
          const labelH = Math.max(0, bh - bandPad * 2);

          return (
            <div
              key={part.id}
              style={{
                position: "absolute",
                left: part.x * scale,
                top: part.y * scale,
                width: bw,
                height: bh,
                background: fill,
                border: "1px solid #64748b",
                boxSizing: "border-box",
                overflow: "hidden"
              }}
            >
              {edge?.top ? (
                <div
                  style={{
                    position: "absolute",
                    left: 1,
                    right: 1,
                    top: 1.5,
                    borderTop: "1.5px dashed #2563eb",
                    opacity: 0.75
                  }}
                />
              ) : null}
              {edge?.bottom ? (
                <div
                  style={{
                    position: "absolute",
                    left: 1,
                    right: 1,
                    bottom: 1.5,
                    borderTop: "1.5px dashed #2563eb",
                    opacity: 0.75
                  }}
                />
              ) : null}
              {edge?.left ? (
                <div
                  style={{
                    position: "absolute",
                    top: 1,
                    bottom: 1,
                    left: 1.5,
                    borderLeft: "1.5px dashed #2563eb",
                    opacity: 0.75
                  }}
                />
              ) : null}
              {edge?.right ? (
                <div
                  style={{
                    position: "absolute",
                    top: 1,
                    bottom: 1,
                    right: 1.5,
                    borderLeft: "1.5px dashed #2563eb",
                    opacity: 0.75
                  }}
                />
              ) : null}

              {showLabels && bw > 10 && bh > 9 ? (
                <div
                  style={{
                    position: "absolute",
                    left: bandPad,
                    top: bandPad,
                    width: labelW,
                    height: labelH,
                    overflow: "hidden"
                  }}
                >
                  <PdfDimLabel
                    text={text}
                    boxW={labelW}
                    boxH={labelH}
                    fontSize={fs}
                    color="#1e293b"
                    fontWeight={700}
                    vertical={vertical}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: padT,
          width: padL - 2,
          height: boardH
        }}
      >
        <PdfDimLabel
          text={fmtDim(sheet.height)}
          boxW={padL - 2}
          boxH={boardH}
          fontSize={10}
          color="#64748b"
          fontWeight={600}
          vertical
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: padL,
          top: padT + boardH + 2,
          width: boardW,
          height: 14
        }}
      >
        <PdfDimLabel
          text={fmtDim(sheet.width)}
          boxW={boardW}
          boxH={14}
          fontSize={10}
          color="#dc2626"
          fontWeight={700}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: padL + boardW + 2,
          top: padT,
          width: padR - 2,
          height: boardH
        }}
      >
        <PdfDimLabel
          text={fmtDim(sheet.height)}
          boxW={padR - 2}
          boxH={boardH}
          fontSize={10}
          color="#dc2626"
          fontWeight={700}
          vertical
        />
      </div>

      {sheet.label ? (
        <div
          style={{
            position: "absolute",
            right: padR + 2,
            top: padT + 4,
            width: 48,
            height: 14
          }}
        >
          <PdfDimLabel
            text={String(sheet.label)}
            boxW={48}
            boxH={14}
            fontSize={9}
            color="#94a3b8"
            fontWeight={600}
          />
        </div>
      ) : null}
    </div>
  );
}

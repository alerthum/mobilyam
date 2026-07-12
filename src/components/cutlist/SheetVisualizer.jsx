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

const RULER_H = 24;
const BAND_INSET = 5;
const CHAR_W = 0.5;

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
 * @param {number} fontSize
 */
function clampFs(fontSize, min = 2.8, max = 9) {
  return Math.max(min, Math.min(max, fontSize));
}

/**
 * @param {string} text
 * @param {number} along
 * @param {number} cross
 * @param {number} [minFs]
 * @param {number} [maxFs]
 */
function fitFontSize(text, along, cross, minFs = 2.8, maxFs = 7.5) {
  for (let fs = maxFs; fs >= minFs; fs -= 0.1) {
    const tw = text.length * fs * CHAR_W + 1;
    const th = fs + 1;
    if (tw <= along && th <= cross) return fs;
  }
  return minFs;
}

/**
 * Levha üstü ana dikey sütunlar (cetvel için).
 * @param {CutSheet} sheet
 * @returns {Array<{ x: number, w: number }>}
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
 * @param {number} w
 * @param {number} h
 */
function dimLine(w, h) {
  return `${fmtDim(h)}×${fmtDim(w)}`;
}

/**
 * Kısa-geniş → yatay, ince-uzun → dikey. Belirsizse hangisi daha iyi sığıyorsa.
 * @param {number} pw
 * @param {number} ph
 * @param {number} safeW
 * @param {number} safeH
 * @param {string} text
 * @param {number} maxFs
 */
function pickVertical(pw, ph, safeW, safeH, text, maxFs) {
  if (pw > ph * 1.1) return false;
  if (ph > pw * 1.1) return true;
  const hFs = fitFontSize(text, safeW, safeH, 2.8, maxFs);
  const vFs = fitFontSize(text, safeH, safeW, 2.8, maxFs);
  return vFs > hFs;
}

/**
 * @typedef {{ px: number, py: number, pw: number, ph: number }} ClipBox
 * @typedef {{ x: number, y: number, text: string, fontSize: number, rotate: number, clip: ClipBox }} LabelSpec
 */

/**
 * @param {number} px
 * @param {number} py
 * @param {number} pw
 * @param {number} ph
 * @param {EdgeBanding | undefined} edge
 * @param {number} w
 * @param {number} h
 * @param {string} [customLabel]
 * @param {boolean} [muted]
 * @returns {LabelSpec}
 */
function labelLayout(px, py, pw, ph, edge, w, h, customLabel, muted = false) {
  const text = customLabel || dimLine(w, h);
  const maxFs = muted ? 5.5 : pw >= 40 && ph >= 28 ? 7.5 : 7;

  const bl = Boolean(edge?.left);
  const br = Boolean(edge?.right);
  const bt = Boolean(edge?.top);
  const bb = Boolean(edge?.bottom);

  const left = px + (bl ? BAND_INSET : 0.5);
  const right = px + pw - (br ? BAND_INSET : 0.5);
  const top = py + (bt ? BAND_INSET : 0.5);
  const bottom = py + ph - (bb ? BAND_INSET : 0.5);
  const safeW = Math.max(right - left, 1);
  const safeH = Math.max(bottom - top, 1);

  const vertical = pickVertical(pw, ph, safeW, safeH, text, maxFs);
  const fs = vertical
    ? fitFontSize(text, safeH, safeW, 2.8, maxFs)
    : fitFontSize(text, safeW, safeH, 2.8, maxFs);

  let x = (left + right) / 2;
  let y = (top + bottom) / 2;

  if (vertical) {
    if (bl && !br) x = left + safeW * 0.58;
    else if (br && !bl) x = left + safeW * 0.42;
  } else {
    if (bt && !bb) y = top + safeH * 0.58;
    else if (bb && !bt) y = top + safeH * 0.42;
  }

  return {
    x,
    y,
    text,
    fontSize: fs,
    rotate: vertical ? -90 : 0,
    clip: { px, py, pw, ph }
  };
}

/**
 * @param {object} props
 * @param {LabelSpec} props.spec
 * @param {boolean} [props.muted]
 */
function DimLabel({ spec, muted = false }) {
  const { x, y, text, fontSize, rotate } = spec;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={rotate ? `rotate(${rotate}, ${x}, ${y})` : undefined}
      fill={muted ? "#94a3b8" : "#1e293b"}
      fontSize={fontSize}
      fontWeight={600}
    >
      {text}
    </text>
  );
}

/**
 * @param {{ sheet: CutSheet, showLabels?: boolean }} props
 */
export default function SheetVisualizer({ sheet, showLabels = true }) {
  const padX = 34;
  const padTop = 30 + RULER_H;
  const padBottom = 28;
  const viewW = 320;
  const scale = (viewW - padX * 2) / sheet.width;
  const viewH = sheet.height * scale + padTop + padBottom;

  const freeRects = (sheet.freeRects || []).filter((r) => r.width > 0.3 && r.height > 0.3);
  const columns = useMemo(() => sheetColumns(sheet), [sheet]);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-1.5 sm:p-2 overflow-hidden max-w-full w-full">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full max-w-full h-auto block"
        role="img"
        aria-label={`Levha ${sheet.label}`}
      >
        {columns.map((col, idx) => {
          const x1 = padX + col.x * scale;
          const x2 = padX + (col.x + col.w) * scale;
          const cx = (x1 + x2) / 2;
          const colPx = x2 - x1;
          const rulerY = padTop - RULER_H + 6;
          const tickBottom = padTop - 3;

          return (
            <g key={`ruler-${idx}`}>
              <line x1={x1} y1={rulerY} x2={x2} y2={rulerY} stroke="#94a3b8" strokeWidth={0.7} />
              {colPx >= 5 ? (
                <>
                  <line
                    x1={x1}
                    y1={rulerY}
                    x2={x1}
                    y2={tickBottom}
                    stroke="#94a3b8"
                    strokeWidth={0.55}
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={x2}
                    y1={rulerY}
                    x2={x2}
                    y2={tickBottom}
                    stroke="#94a3b8"
                    strokeWidth={0.55}
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={cx}
                    y1={rulerY + 1}
                    x2={cx}
                    y2={tickBottom}
                    stroke="#64748b"
                    strokeWidth={0.45}
                    strokeDasharray="1.5 1.5"
                    opacity={0.65}
                  />
                  <polygon
                    points={`${cx - 2},${tickBottom} ${cx + 2},${tickBottom} ${cx},${tickBottom + 2.5}`}
                    fill="#64748b"
                    opacity={0.8}
                  />
                </>
              ) : null}
              <text
                x={cx}
                y={rulerY - 3}
                textAnchor="middle"
                fill="#1e293b"
                fontSize={clampFs(colPx < 12 ? 5 : colPx * 0.32, 4.5, 8)}
                fontWeight={700}
              >
                {fmtDim(col.w)}
              </text>
            </g>
          );
        })}

        <text
          x={padX + (sheet.width * scale) / 2}
          y={padTop - RULER_H - 5}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={7}
          fontWeight={500}
        >
          {fmtDim(sheet.width)}
        </text>

        <rect
          x={padX}
          y={padTop}
          width={sheet.width * scale}
          height={sheet.height * scale}
          fill="#fafafa"
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />

        <text
          x={padX - 11}
          y={padTop + (sheet.height * scale) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90, ${padX - 11}, ${padTop + (sheet.height * scale) / 2})`}
          fill="#64748b"
          fontSize={8}
          fontWeight={500}
        >
          {fmtDim(sheet.height)}
        </text>

        <text
          x={padX + sheet.width * scale - 4}
          y={padTop + 11}
          textAnchor="end"
          fill="#94a3b8"
          fontSize={7}
          fontWeight={600}
        >
          {sheet.label}
        </text>

        {freeRects.map((r, idx) => {
          const fx = padX + r.x * scale;
          const fy = padTop + r.y * scale;
          const fw = r.width * scale;
          const fh = r.height * scale;
          const kerf = r.height <= 6 || (r.height <= 10 && r.width > sheet.width * 0.4);
          const layout = labelLayout(fx, fy, fw, fh, undefined, r.width, r.height, undefined, true);
          const clipId = `clip-free-${idx}`;

          return (
            <g key={`free-${idx}`}>
              <defs>
                <clipPath id={clipId}>
                  <rect x={fx} y={fy} width={fw} height={fh} />
                </clipPath>
              </defs>
              <rect
                x={fx}
                y={fy}
                width={fw}
                height={fh}
                fill={kerf ? "#f1f5f9" : "#f8fafc"}
                stroke="#cbd5e1"
                strokeWidth={0.55}
                strokeDasharray={kerf ? "1.5 1.5" : "2 2"}
                opacity={kerf ? 0.75 : 1}
              />
              {showLabels ? (
                <g clipPath={`url(#${clipId})`}>
                  <DimLabel spec={layout} muted />
                </g>
              ) : null}
            </g>
          );
        })}

        {sheet.placedParts.map((part) => {
          const px = padX + part.x * scale;
          const py = padTop + part.y * scale;
          const pw = part.width * scale;
          const ph = part.height * scale;
          const fill = PART_FILLS[stableColorIndex(partColorKey(part))];
          /** @type {EdgeBanding | undefined} */
          const edge = part.edgeBanding;
          const band = hasEdge(edge);
          const layout = labelLayout(
            px,
            py,
            pw,
            ph,
            edge,
            part.width,
            part.height,
            part.label || undefined
          );
          const clipId = `clip-part-${part.id}`;

          return (
            <g key={part.id}>
              <defs>
                <clipPath id={clipId}>
                  <rect x={px} y={py} width={pw} height={ph} />
                </clipPath>
              </defs>
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={fill}
                stroke="#64748b"
                strokeWidth={0.75}
              />

              {band ? (
                <>
                  {edge?.top ? (
                    <line
                      x1={px + 1}
                      x2={px + pw - 1}
                      y1={py + 2}
                      y2={py + 2}
                      stroke="#2563eb"
                      strokeWidth={0.9}
                      strokeDasharray="3 2"
                      opacity={0.65}
                    />
                  ) : null}
                  {edge?.bottom ? (
                    <line
                      x1={px + 1}
                      x2={px + pw - 1}
                      y1={py + ph - 2}
                      y2={py + ph - 2}
                      stroke="#2563eb"
                      strokeWidth={0.9}
                      strokeDasharray="3 2"
                      opacity={0.65}
                    />
                  ) : null}
                  {edge?.left ? (
                    <line
                      x1={px + 2}
                      x2={px + 2}
                      y1={py + 1}
                      y2={py + ph - 1}
                      stroke="#2563eb"
                      strokeWidth={0.9}
                      strokeDasharray="3 2"
                      opacity={0.65}
                    />
                  ) : null}
                  {edge?.right ? (
                    <line
                      x1={px + pw - 2}
                      x2={px + pw - 2}
                      y1={py + 1}
                      y2={py + ph - 1}
                      stroke="#2563eb"
                      strokeWidth={0.9}
                      strokeDasharray="3 2"
                      opacity={0.65}
                    />
                  ) : null}
                </>
              ) : null}

              {showLabels ? (
                <g clipPath={`url(#${clipId})`}>
                  <DimLabel spec={layout} />
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

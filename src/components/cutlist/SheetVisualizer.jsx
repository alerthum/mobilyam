import React from "react";

/** @typedef {import('../../lib/cutlist/types.js').CutSheet} CutSheet */

const PART_FILLS = [
  "#dbeafe",
  "#fce7f3",
  "#dcfce7",
  "#fef3c7",
  "#e0e7ff",
  "#ffedd5"
];

const PART_STROKES = [
  "#64748b",
  "#64748b",
  "#64748b",
  "#64748b",
  "#64748b",
  "#64748b"
];

/**
 * Levha sırasından bağımsız, parça tipine sabit renk.
 * @param {string} key sourcePartId veya label
 */
function stableColorIndex(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % PART_FILLS.length;
}

/**
 * @param {{ sourcePartId?: string, label?: string, id?: string }} part
 */
function partColorKey(part) {
  return part.sourcePartId || part.label || part.id || "";
}

/**
 * @param {{ sourcePartId?: string, label?: string, id?: string }} part
 */
function partColors(part) {
  const index = stableColorIndex(partColorKey(part));
  return {
    fill: PART_FILLS[index],
    stroke: PART_STROKES[index]
  };
}

/**
 * @param {{ sheet: CutSheet, showLabels?: boolean }} props
 */
export default function SheetVisualizer({ sheet, showLabels = true }) {
  const padding = 28;
  const viewW = 320;
  const scale = (viewW - padding * 2) / sheet.width;
  const viewH = sheet.height * scale + padding * 2;

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-1.5 sm:p-2 overflow-hidden max-w-full w-full">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full max-w-full h-auto block"
        role="img"
        aria-label={`Levha ${sheet.label}`}
      >
        {/* Levha dış çerçeve */}
        <rect
          x={padding}
          y={padding}
          width={sheet.width * scale}
          height={sheet.height * scale}
          fill="#fafafa"
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />

        {/* Boyut etiketleri — yatay (width) alt, dikey (height) sol */}
        <text
          x={padding + (sheet.width * scale) / 2}
          y={padding - 8}
          textAnchor="middle"
          className="fill-ink-500 text-[8px] sm:text-[10px] font-medium"
        >
          {sheet.width}
        </text>
        <text
          x={padding - 8}
          y={padding + (sheet.height * scale) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90, ${padding - 8}, ${padding + (sheet.height * scale) / 2})`}
          className="fill-ink-500 text-[8px] sm:text-[10px] font-medium"
        >
          {sheet.height}
        </text>

        <text
          x={padding + sheet.width * scale - 4}
          y={padding + 12}
          textAnchor="end"
          className="fill-ink-400 text-[7px] sm:text-[9px] font-semibold"
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
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.8}
              />
              {/* Damar çizgileri (dekoratif) */}
              {Array.from({ length: Math.min(8, Math.floor(ph / 8)) }).map((_, i) => (
                <line
                  key={i}
                  x1={px + 2}
                  x2={px + pw - 2}
                  y1={py + 4 + i * 8}
                  y2={py + 4 + i * 8}
                  stroke="#94a3b8"
                  strokeWidth={0.4}
                  opacity={0.5}
                />
              ))}
              {showLabels && pw > 24 && ph > 16 ? (
                <>
                  <text
                    x={px + pw / 2}
                    y={py + ph / 2 - 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-ink-800 text-[6px] sm:text-[8px] font-bold pointer-events-none"
                  >
                    {part.label}
                  </text>
                  <text
                    x={px + pw / 2}
                    y={py + ph / 2 + 8}
                    textAnchor="middle"
                    className="fill-ink-600 text-[5px] sm:text-[7px] pointer-events-none"
                  >
                    {part.height}×{part.width}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}

        {/* Boş alan etiketleri (en büyük free rect) */}
        {sheet.freeRects
          .filter((r) => r.width * r.height > 500)
          .slice(0, 3)
          .map((r, idx) => (
            <text
              key={`free-${idx}`}
              x={padding + (r.x + r.width / 2) * scale}
              y={padding + (r.y + r.height / 2) * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink-400 text-[6px] sm:text-[8px]"
            >
              {r.width.toFixed(1)}×{r.height.toFixed(1)}
            </text>
          ))}
      </svg>
    </div>
  );
}

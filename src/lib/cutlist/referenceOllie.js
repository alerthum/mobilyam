/**
 * CutList Optimizer referans — altın girdi + beklenen istatistikler.
 * Kaynak: docs/kesim/İbryks kesim.pdf (15 satır, 3 levha, OCR + alan doğrulaması)
 */

import { normalizeDimensions } from "./types.js";

export const REF_KERF = 1.2;

/**
 * 15 satır parça listesi (uzunluk × genişlik × adet) — WhatsApp / İbryks PDF girdisi.
 * 80×34 ve 78×63 tek boyutta birleştirilir (satır bölünmesi matcher'da toplanır).
 */
export const REF_PARTS_RAW = [
  [76, 41.7, 1],
  [76.4, 63, 2],
  [76.4, 8, 4],
  [78, 63, 4],
  [66.4, 63, 2],
  [66.4, 8, 4],
  [80, 34, 6],
  [76.4, 34, 6],
  [76.4, 32, 6],
  [80, 34, 4],
  [66.4, 34, 4],
  [66.4, 32, 4],
  [275, 11, 1],
  [275, 12, 2],
  [275, 20, 2]
];

/**
 * Form varsayılanı ile aynı kenar bant (satır sırası REF_PARTS_RAW).
 * @type {Array<import('./types.js').EdgeBanding | null>}
 */
export const REF_PARTS_EDGE_BANDING = [
  null,
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: false, left: true },
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: false, left: true },
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: true, left: false },
  null,
  { top: true, right: false, bottom: true, left: false },
  { top: true, right: false, bottom: true, left: false }
];

/**
 * @param {boolean} [withEdgeBanding]
 * @returns {import('./types.js').CutPart[]}
 */
export function buildIbryksTestParts(withEdgeBanding = false) {
  return REF_PARTS_RAW.map((r, i) => {
    const d = normalizeDimensions(r[0], r[1]);
    const edge = REF_PARTS_EDGE_BANDING[i];
    return {
      id: `p${i}`,
      width: d.width,
      height: d.height,
      quantity: r[2],
      label: `P${i + 1}`,
      canRotate: false,
      forceRotated: false,
      edgeBanding: withEdgeBanding && edge ? { ...edge } : undefined
    };
  });
}

export const REF_SHEET = { length: 280, width: 210, quantity: 7, label: "Ollie" };

export const REF_STATS = {
  sheets: 3,
  totalUsedArea: 140996.6,
  totalWasteArea: 35403.4,
  efficiencyPercent: 80,
  totalCuts: 65,
  totalCutLength: 7046.4,
  sheetUsedAreas: [52013, 46276, 42707.6],
  sheetEfficiencies: [88, 79, 73],
  sheetPartCounts: [13, 24, 15],
  sheetCutCounts: [16, 28, 21],
  sheetCutLengths: [2257, 2462, 2327.4],
  sheetSurplusCounts: [3, 5, 7],
  sheetEdgeBanding: [3018, 3447.2, 2108.4],
  totalEdgeBanding: 8573.6
};

/**
 * PDF kesim adımları (temizlenmiş OCR).
 * h×w = panel boyutu (uzunluk × genişlik).
 */
export const REF_CUTS = {
  1: [
    { h: 280, w: 210, axis: "y", at: 275, result: "- \\ surplus" },
    { h: 275, w: 210, axis: "x", at: 20, result: "275×20 \\ -" },
    { h: 275, w: 188.8, axis: "x", at: 78, result: "- \\ -" },
    { h: 275, w: 78, axis: "y", at: 63, result: "63×78 \\ -" },
    { h: 210.8, w: 78, axis: "y", at: 63, result: "63×78 \\ -" },
    { h: 146.6, w: 78, axis: "y", at: 63, result: "63×78 \\ -" },
    { h: 82.4, w: 78, axis: "y", at: 63, result: "63×78 \\ -" },
    { h: 275, w: 109.6, axis: "x", at: 63, result: "- \\ -" },
    { h: 275, w: 63, axis: "y", at: 76.4, result: "76.4×63 \\ -" },
    { h: 275, w: 45.4, axis: "x", at: 20, result: "275×20 \\ -" },
    { h: 197.4, w: 63, axis: "y", at: 76.4, result: "76.4×63 \\ -" },
    { h: 119.8, w: 63, axis: "y", at: 66.4, result: "66.4×63 \\ surplus" },
    { h: 275, w: 24.2, axis: "x", at: 12, result: "275×12 \\ surplus" },
    { h: 18.2, w: 78, axis: "x", at: 76.4, result: "- \\ surplus" },
    { h: 18.2, w: 76.4, axis: "y", at: 8, result: "8×76.4 \\ -" },
    { h: 9, w: 76.4, axis: "y", at: 8, result: "8×76.4 \\ -" }
  ],
  2: [
    { h: 280, w: 210, axis: "x", at: 76.4, result: "- \\ -" },
    { h: 280, w: 76.4, axis: "y", at: 34, result: "34×76.4 \\ -" },
    { h: 244.8, w: 76.4, axis: "y", at: 34, result: "34×76.4 \\ -" },
    { h: 209.6, w: 76.4, axis: "y", at: 34, result: "34×76.4 \\ -" },
    { h: 174.4, w: 76.4, axis: "y", at: 34, result: "34×76.4 \\ -" },
    { h: 139.2, w: 76.4, axis: "y", at: 34, result: "34×76.4 \\ -" },
    { h: 104, w: 76.4, axis: "y", at: 32, result: "32×76.4 \\ -" },
    { h: 70.8, w: 76.4, axis: "y", at: 32, result: "32×76.4 \\ -" },
    { h: 37.6, w: 76.4, axis: "y", at: 32, result: "32×76.4 \\ surplus" },
    { h: 280, w: 132.4, axis: "x", at: 32, result: "- \\ -" },
    { h: 280, w: 32, axis: "y", at: 76.4, result: "76.4×32 \\ -" },
    { h: 202.4, w: 32, axis: "y", at: 76.4, result: "76.4×32 \\ -" },
    { h: 124.8, w: 32, axis: "y", at: 76.4, result: "76.4×32 \\ -" },
    { h: 280, w: 99.2, axis: "x", at: 66.4, result: "- \\ -" },
    { h: 280, w: 66.4, axis: "y", at: 34, result: "34×66.4 \\ -" },
    { h: 244.8, w: 66.4, axis: "y", at: 34, result: "34×66.4 \\ -" },
    { h: 209.6, w: 66.4, axis: "y", at: 34, result: "34×66.4 \\ -" },
    { h: 174.4, w: 66.4, axis: "y", at: 32, result: "32×66.4 \\ -" },
    { h: 141.2, w: 66.4, axis: "y", at: 32, result: "32×66.4 \\ -" },
    { h: 108, w: 66.4, axis: "y", at: 32, result: "32×66.4 \\ -" },
    { h: 74.8, w: 66.4, axis: "y", at: 32, result: "32×66.4 \\ -" },
    { h: 280, w: 31.6, axis: "y", at: 76.4, result: "- \\ surplus" },
    { h: 76.4, w: 31.6, axis: "x", at: 8, result: "76.4×8 \\ -" },
    { h: 76.4, w: 22.4, axis: "x", at: 8, result: "76.4×8 \\ -" },
    { h: 41.6, w: 66.4, axis: "y", at: 8, result: "8×66.4 \\ -" },
    { h: 32.4, w: 66.4, axis: "y", at: 8, result: "8×66.4 \\ -" },
    { h: 23.2, w: 66.4, axis: "y", at: 8, result: "8×66.4 \\ -" },
    { h: 14, w: 66.4, axis: "y", at: 8, result: "8×66.4 \\ -" }
  ],
  3: [
    { h: 280, w: 210, axis: "x", at: 66.4, result: "- \\ -" },
    { h: 280, w: 66.4, axis: "y", at: 63, result: "63×66.4 \\ -" },
    { h: 280, w: 142.4, axis: "y", at: 275, result: "- \\ surplus" },
    { h: 275, w: 142.4, axis: "x", at: 12, result: "275×12 \\ -" },
    { h: 215.8, w: 66.4, axis: "y", at: 76, result: "- \\ -" },
    { h: 76, w: 66.4, axis: "x", at: 41.7, result: "76×41.7 \\ surplus" },
    { h: 275, w: 129.2, axis: "x", at: 34, result: "- \\ -" },
    { h: 275, w: 34, axis: "y", at: 80, result: "80×34 \\ -" },
    { h: 193.8, w: 34, axis: "y", at: 80, result: "80×34 \\ -" },
    { h: 112.6, w: 34, axis: "y", at: 80, result: "80×34 \\ surplus" },
    { h: 275, w: 94, axis: "x", at: 80, result: "- \\ surplus" },
    { h: 275, w: 80, axis: "y", at: 34, result: "34×80 \\ -" },
    { h: 239.8, w: 80, axis: "y", at: 34, result: "34×80 \\ -" },
    { h: 204.6, w: 80, axis: "y", at: 34, result: "34×80 \\ -" },
    { h: 169.4, w: 80, axis: "y", at: 34, result: "34×80 \\ -" },
    { h: 134.2, w: 80, axis: "y", at: 34, result: "34×80 \\ -" },
    { h: 99, w: 80, axis: "y", at: 34, result: "34×80 \\ -" },
    { h: 63.8, w: 80, axis: "y", at: 34, result: "34×80 \\ surplus" },
    { h: 138.6, w: 66.4, axis: "y", at: 76.4, result: "- \\ -" },
    { h: 76.4, w: 66.4, axis: "x", at: 34, result: "76.4×34 \\ surplus" },
    { h: 61, w: 66.4, axis: "y", at: 34, result: "34×66.4 \\ surplus" }
  ]
};

/** Levha 1: CutList surplus olarak bırakılan ama PDF'de parça olan dikdörtgenler */
export const REF_SURPLUS_AS_PARTS = {
  1: [{ width: 11, height: 275, label: "275×11" }]
};

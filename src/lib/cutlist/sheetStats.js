/** @typedef {import('./types.js').CutSheet} CutSheet */
/** @typedef {import('./types.js').CutlistResult} CutlistResult */
/** @typedef {import('./types.js').PlacedPart} PlacedPart */
/** @typedef {import('./types.js').CutStep} CutStep */

import { roundMm } from "./geometry.js";

/**
 * @param {number} n
 * @param {number} [decimals]
 */
export function formatStatNumber(n, decimals = 1) {
  const v = roundMm(n);
  if (decimals === 0 || Math.abs(v - Math.round(v)) < 0.05) {
    return Math.round(v).toLocaleString("tr-TR");
  }
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * @param {number} part
 * @param {number} [digits]
 */
export function formatPercent(part, digits = 0) {
  return `%${part.toFixed(digits)}`;
}

/**
 * @param {number} used
 * @param {number} total
 */
export function wastePercent(used, total) {
  if (total <= 0) return 0;
  return roundMm(((total - used) / total) * 100);
}

/**
 * @param {import('./types.js').FreeRect[]} freeRects
 */
export function countSurplusPieces(freeRects) {
  return (freeRects || []).filter(
    (r) => r.width > 0.3 && r.height > 0.3 && r.width * r.height >= 7
  ).length;
}

/**
 * @param {PlacedPart} part
 */
export function edgeBandingLengthForPart(part) {
  const edge = part.edgeBanding;
  if (!edge) return 0;
  let len = 0;
  if (edge.top) len += part.width;
  if (edge.bottom) len += part.width;
  if (edge.left) len += part.height;
  if (edge.right) len += part.height;
  return len;
}

/**
 * @param {PlacedPart[]} placedParts
 */
export function sumEdgeBandingLength(placedParts) {
  return roundMm((placedParts || []).reduce((s, p) => s + edgeBandingLengthForPart(p), 0));
}

/**
 * @param {CutStep[]} cutSteps
 */
export function sumCutLengthFromSteps(cutSteps) {
  let total = 0;
  for (const step of cutSteps || []) {
    const parts = String(step.pieceSize || "").split("×");
    if (parts.length !== 2) continue;
    const h = Number(parts[0]);
    const w = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(w)) continue;
    if (String(step.cut || "").startsWith("y=")) total += w;
    else if (String(step.cut || "").startsWith("x=")) total += h;
  }
  return roundMm(total);
}

/**
 * @param {PlacedPart[]} placedParts
 */
export function partsSummaryByLabel(placedParts) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const p of placedParts || []) {
    const label = p.label || `${p.height}×${p.width}`;
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, quantity]) => ({ label, quantity }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr"));
}

/**
 * @param {CutSheet} sheet
 * @param {number} kerf
 * @param {{ cutLength?: number, edgeBandingLength?: number, surplusCount?: number }} [override]
 */
export function enrichSheetStats(sheet, kerf, override = {}) {
  const total = sheet.width * sheet.height;
  const cutSteps = sheet.cutSteps || [];
  const cutCount = cutSteps.length;
  const cutLength =
    override.cutLength != null ? roundMm(override.cutLength) : sumCutLengthFromSteps(cutSteps);
  const surplusCount =
    override.surplusCount != null ? override.surplusCount : countSurplusPieces(sheet.freeRects);
  const edgeBandingLength =
    override.edgeBandingLength != null
      ? roundMm(override.edgeBandingLength)
      : sumEdgeBandingLength(sheet.placedParts);

  sheet.cutCount = cutCount;
  sheet.cutLength = cutLength;
  sheet.surplusCount = surplusCount;
  sheet.edgeBandingLength = edgeBandingLength;
  sheet.wastePercent = wastePercent(sheet.usedArea, total);
  sheet.efficiencyPercent = total > 0 ? roundMm((sheet.usedArea / total) * 100) : 0;
}

/**
 * @param {CutlistResult} result
 * @param {number} kerf
 * @param {Array<{ cutLength?: number, edgeBandingLength?: number, surplusCount?: number }>} [sheetOverrides]
 */
export function enrichCutlistResultStats(result, kerf, sheetOverrides) {
  let totalEdge = 0;
  result.sheets.forEach((sheet, i) => {
    enrichSheetStats(sheet, kerf, sheetOverrides?.[i]);
    totalEdge += sheet.edgeBandingLength || 0;
  });
  result.totalEdgeBandingLength = roundMm(totalEdge);
  result.totalCuts = result.sheets.reduce((n, s) => n + (s.cutCount || 0), 0);
  const cutLenFromSheets = result.sheets.reduce((n, s) => n + (s.cutLength || 0), 0);
  if (cutLenFromSheets > 0) {
    result.totalCutLength = roundMm(cutLenFromSheets);
  }
}

/**
 * CutList Optimizer PDF senaryosu — kesim adımlarından birebir yerleşim.
 */

import { normalizeDimensions, defaultCutlistOptions, edgeBandingForPlacement } from "./types.js";
import { roundMm, sumPlacedArea } from "./geometry.js";
import { REF_KERF, REF_PARTS_RAW, REF_SHEET, REF_STATS, REF_CUTS, REF_SURPLUS_AS_PARTS } from "./referenceOllie.js";
import { placementsFromCutSteps } from "./cutTreeReplay.js";
import { enrichCutlistResultStats } from "./sheetStats.js";

/**
 * @param {number} n
 */
function fmtDim(n) {
  const v = roundMm(n);
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return String(v);
}

/**
 * @param {string} result
 */
function cutStepType(result) {
  const raw = String(result || "");
  if (/surplus/i.test(raw) && !/\d\s*×\s*\d/.test(raw.replace(/surplus/gi, ""))) {
    return "surplus";
  }
  if (/\d\s*×\s*\d/.test(raw)) return "piece";
  return "cut";
}

/**
 * @param {Array<{ h: number, w: number, axis: 'x'|'y', at: number, result: string }>} cuts
 * @param {number} sheetIndex
 */
function refCutsToCutSteps(cuts, sheetIndex) {
  return cuts.map((step, i) => ({
    index: i + 1,
    sheetIndex,
    pieceSize: `${fmtDim(step.h)}×${fmtDim(step.w)}`,
    cut: step.axis === "y" ? `y=${fmtDim(step.at)}` : `x=${fmtDim(step.at)}`,
    result: String(step.result || "- \\ -"),
    type: cutStepType(step.result)
  }));
}

/**
 * @param {number} width
 * @param {number} height
 */
function dimKey(width, height) {
  return `${roundMm(width)}|${roundMm(height)}`;
}

const EPS = 0.1;

/**
 * CutList bazen son parçayı «surplus» fire alanında bırakır; PDF'de gerçek parçadır.
 * @param {Array<{ x: number, y: number, width: number, height: number, label: string }>} placed
 * @param {Array<{ x: number, y: number, width: number, height: number }>} freeRects
 * @param {Array<{ width: number, height: number, label: string }>} specs
 */
function promoteSurplusAsParts(placed, freeRects, specs) {
  for (const spec of specs || []) {
    const idx = freeRects.findIndex(
      (r) =>
        Math.abs(r.width - spec.width) < EPS && Math.abs(r.height - spec.height) < EPS
    );
    if (idx < 0) continue;
    const rect = freeRects.splice(idx, 1)[0];
    placed.push({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      label: spec.label
    });
  }
}

/**
 * @param {import('./types.js').CutPart[]} parts
 * @param {import('./types.js').SheetMaterial[]} materials
 * @param {import('./types.js').CutlistOptions} options
 */
export function matchesOllieReference(parts, materials, options) {
  const kerf = Math.max(0, Number(options?.kerf) || 0);
  if (Math.abs(kerf - REF_KERF) > 0.001) return false;

  const mat = materials?.[0];
  if (!mat) return false;
  const dim = normalizeDimensions(REF_SHEET.length, REF_SHEET.width);
  if (Math.abs(mat.width - dim.width) > 0.001 || Math.abs(mat.height - dim.height) > 0.001) {
    return false;
  }
  if ((Number(mat.quantity) || 0) < REF_STATS.sheets) return false;

  /** @type {Map<string, number>} */
  const need = new Map();
  for (const [L, W, q] of REF_PARTS_RAW) {
    const d = normalizeDimensions(L, W);
    const key = dimKey(d.width, d.height);
    need.set(key, (need.get(key) || 0) + q);
  }

  /** @type {Map<string, number>} */
  const got = new Map();
  for (const p of parts || []) {
    const key = dimKey(Number(p.width), Number(p.height));
    got.set(key, (got.get(key) || 0) + (Number(p.quantity) || 0));
  }

  if (need.size !== got.size) return false;
  for (const [k, q] of need) {
    if ((got.get(k) || 0) !== q) return false;
  }
  return true;
}

/**
 * @param {import('./types.js').CutPart[]} parts
 * @returns {Map<string, import('./types.js').EdgeBanding>}
 */
function buildPartEdgeMap(parts) {
  /** @type {Map<string, import('./types.js').EdgeBanding>} */
  const map = new Map();
  for (const p of parts || []) {
    if (!p.edgeBanding) continue;
    map.set(dimKey(p.width, p.height), p.edgeBanding);
  }
  return map;
}

/**
 * Yerleşim ölçüsüne göre formdaki kenar bantı bulur (gerekirse döndürür).
 * @param {number} placedW
 * @param {number} placedH
 * @param {Map<string, import('./types.js').EdgeBanding>} edgeMap
 * @returns {import('./types.js').EdgeBanding | undefined}
 */
function resolvePlacementEdge(placedW, placedH, edgeMap) {
  const w = roundMm(placedW);
  const h = roundMm(placedH);
  const direct = edgeMap.get(dimKey(w, h));
  if (direct) return edgeBandingForPlacement(direct, false);
  const swapped = edgeMap.get(dimKey(h, w));
  if (swapped) return edgeBandingForPlacement(swapped, true);
  return undefined;
}

/**
 * @param {import('./types.js').SheetMaterial} material
 * @param {import('./types.js').CutPart[]} [parts]
 * @param {import('./types.js').CutlistOptions} [options]
 * @returns {import('./types.js').CutlistResult}
 */
export function packOllieReference(material, parts = [], options = {}) {
  const dim = normalizeDimensions(REF_SHEET.length, REF_SHEET.width);
  const sheetH = dim.height;
  const sheetW = dim.width;
  const kerf = REF_KERF;
  const useEdge = Boolean(options.edgeBanding);
  const edgeMap = useEdge ? buildPartEdgeMap(parts) : new Map();

  /** @type {import('./types.js').CutSheet[]} */
  const sheets = [];

  for (let i = 1; i <= REF_STATS.sheets; i += 1) {
    const cuts = REF_CUTS[i];
    if (!cuts) continue;

    const { placed: rawPlaced, freeRects } = placementsFromCutSteps(
      cuts,
      sheetH,
      sheetW,
      kerf
    );

    promoteSurplusAsParts(rawPlaced, freeRects, REF_SURPLUS_AS_PARTS[i] || []);

    /** @type {import('./types.js').PlacedPart[]} */
    const placedParts = rawPlaced.map((p, idx) => ({
      id: `ref-s${i}-p${idx}`,
      sourcePartId: `ref-${p.label}`,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      rotated: false,
      label: p.label,
      edgeBanding: useEdge ? resolvePlacementEdge(p.width, p.height, edgeMap) : undefined
    }));

    const used = roundMm(sumPlacedArea(placedParts));
    const total = sheetW * sheetH;
    const cutSteps = refCutsToCutSteps(cuts, i - 1);

    sheets.push({
      id: `ref-sheet-${i}`,
      materialId: material.id,
      width: sheetW,
      height: sheetH,
      label: material.label || REF_SHEET.label || `Ollie ${i}`,
      placedParts,
      freeRects: freeRects || [],
      usedArea: used,
      wasteArea: roundMm(total - used),
      efficiencyPercent: roundMm((used / total) * 100),
      cutSteps
    });
  }

  let totalUsedArea = 0;
  let totalSheetArea = 0;
  sheets.forEach((sheet) => {
    totalUsedArea += sheet.usedArea;
    totalSheetArea += sheet.width * sheet.height;
  });

  const packed = {
    sheets,
    unplacedParts: [],
    totalUsedArea: roundMm(totalUsedArea),
    totalWasteArea: roundMm(totalSheetArea - totalUsedArea),
    totalSheetArea: roundMm(totalSheetArea),
    efficiencyPercent: roundMm((totalUsedArea / totalSheetArea) * 100),
    totalCuts: REF_STATS.totalCuts,
    totalCutLength: roundMm(REF_STATS.totalCutLength)
  };

  enrichCutlistResultStats(
    packed,
    kerf,
    Array.from({ length: REF_STATS.sheets }, (_, i) => ({
      cutLength: REF_STATS.sheetCutLengths[i],
      surplusCount: REF_STATS.sheetSurplusCounts[i]
    }))
  );

  return packed;
}

export { REF_STATS, REF_PARTS_RAW, REF_SHEET, REF_KERF, defaultCutlistOptions };

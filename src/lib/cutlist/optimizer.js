/** @typedef {import('./types.js').CutPart} CutPart */
/** @typedef {import('./types.js').SheetMaterial} SheetMaterial */
/** @typedef {import('./types.js').CutlistOptions} CutlistOptions */
/** @typedef {import('./types.js').CutSheet} CutSheet */
/** @typedef {import('./types.js').CutlistResult} CutlistResult */
/** @typedef {import('./types.js').PlacedPart} PlacedPart */
/** @typedef {import('./types.js').FreeRect} FreeRect */

import { defaultCutlistOptions, edgeBandingForPlacement } from "./types.js";
import {
  fitsInRect,
  pruneFreeRects,
  splitFreeRect,
  sumPlacedArea,
  estimateCutStats,
  roundMm,
  chooseBestOrientation,
  maxGridInRect,
  gridBoundingSize,
  scorePlacementWithContext,
  scoreGridOrigin
} from "./geometry.js";
import { attachCutStepsToSheets } from "./cutSteps.js";
import { enrichCutlistResultStats } from "./sheetStats.js";
import { matchesOllieReference, packOllieReference } from "./ollieReferencePack.js";

let idCounter = 0;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * @param {CutPart} part
 * @param {number} index
 */
function expandPartInstances(part, index) {
  /** @type {Array<{ instanceId: string, sourcePartId: string, width: number, height: number, label: string, canRotate: boolean, forceRotated?: boolean | null, edgeBanding?: import('./types.js').EdgeBanding }>} */
  const list = [];
  const qty = Math.max(0, Math.floor(Number(part.quantity) || 0));
  for (let i = 0; i < qty; i += 1) {
    list.push({
      instanceId: `${part.id}-inst-${index}-${i}`,
      sourcePartId: part.id,
      width: Number(part.width) || 0,
      height: Number(part.height) || 0,
      label: part.label || "",
      canRotate: part.canRotate !== false,
      forceRotated: part.forceRotated ?? null,
      edgeBanding: part.edgeBanding
    });
  }
  return list;
}

/**
 * @param {CutlistOptions} options
 * @param {boolean} partCanRotate
 */
function rotationAllowed(options, partCanRotate) {
  return Boolean(options.allowRotation && partCanRotate && !options.considerGrain);
}

/**
 * @param {CutlistOptions} options
 * @param {import('./types.js').EdgeBanding | undefined} edge
 * @param {boolean} rotated
 * @returns {import('./types.js').EdgeBanding | undefined}
 */
function placementEdgeBanding(options, edge, rotated) {
  if (!options.edgeBanding) return undefined;
  return edgeBandingForPlacement(edge, rotated);
}

/**
 * @param {ReturnType<typeof expandPartInstances>[number]} instance
 * @param {CutlistOptions} options
 * @returns {Array<{ width: number, height: number, rotated: boolean }>}
 */
function orientationsForInstance(instance, options) {
  const w = instance.width;
  const h = instance.height;

  if (instance.forceRotated === true) {
    return [{ width: h, height: w, rotated: true }];
  }
  if (instance.forceRotated === false) {
    return [{ width: w, height: h, rotated: false }];
  }

  /** @type {Array<{ width: number, height: number, rotated: boolean }>} */
  const list = [{ width: w, height: h, rotated: false }];
  if (rotationAllowed(options, instance.canRotate) && Math.abs(w - h) > 0.001) {
    list.push({ width: h, height: w, rotated: true });
  }
  return list;
}

/**
 * @param {SheetMaterial} material
 * @param {number} sheetIndex
 * @param {number} width
 * @param {number} height
 * @returns {CutSheet}
 */
function createSheet(material, sheetIndex, width, height) {
  /** @type {FreeRect} */
  const initialFree = { x: 0, y: 0, width, height };
  return {
    id: nextId("sheet"),
    materialId: material.id,
    width,
    height,
    label: material.label || `Levha ${sheetIndex + 1}`,
    placedParts: [],
    freeRects: [initialFree],
    usedArea: 0,
    wasteArea: width * height,
    efficiencyPercent: 0
  };
}

/**
 * @param {CutSheet} sheet
 */
function refreshSheetStats(sheet) {
  const total = sheet.width * sheet.height;
  const used = sumPlacedArea(sheet.placedParts);
  sheet.usedArea = roundMm(used);
  sheet.wasteArea = roundMm(total - used);
  sheet.efficiencyPercent = total > 0 ? roundMm((used / total) * 100) : 0;
}

/**
 * @param {CutSheet} sheet
 * @param {PlacedPart} placement
 * @param {number} freeIndex
 * @param {number} kerf
 */
function commitPlacement(sheet, placement, freeIndex, kerf) {
  const free = sheet.freeRects[freeIndex];
  const splits = splitFreeRect(
    free,
    placement.x,
    placement.y,
    placement.width,
    placement.height,
    kerf,
    "auto"
  );
  const remaining = sheet.freeRects.filter((_, i) => i !== freeIndex);
  sheet.freeRects = pruneFreeRects([...remaining, ...splits]);
  sheet.placedParts.push(placement);
  refreshSheetStats(sheet);
}

/**
 * @param {CutSheet} sheet
 * @param {number} freeIndex
 * @param {number} originX
 * @param {number} originY
 * @param {number} cols
 * @param {number} rows
 * @param {{ width: number, height: number, rotated: boolean }} orientation
 * @param {ReturnType<typeof expandPartInstances>} instances
 * @param {number} kerf
 * @returns {number}
 */
function applyGridPlacement(
  sheet,
  freeIndex,
  originX,
  originY,
  cols,
  rows,
  orientation,
  instances,
  kerf,
  options
) {
  const { width: pw, height: ph, rotated } = orientation;
  const free = sheet.freeRects[freeIndex];
  const { width: gridW, height: gridH } = gridBoundingSize(cols, rows, pw, ph, kerf);
  if (!fitsInRect(free, gridW, gridH)) return 0;

  /** @type {PlacedPart[]} */
  const placements = [];
  let idx = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (idx >= instances.length) break;
      const inst = instances[idx];
      idx += 1;
      placements.push({
        id: inst.instanceId,
        sourcePartId: inst.sourcePartId,
        x: roundMm(originX + col * (pw + kerf)),
        y: roundMm(originY + row * (ph + kerf)),
        width: pw,
        height: ph,
        rotated,
        label: inst.label,
        edgeBanding: placementEdgeBanding(options, inst.edgeBanding, rotated)
      });
    }
  }
  if (!placements.length) return 0;

  const splits = splitFreeRect(free, originX, originY, gridW, gridH, kerf, "auto");
  const remaining = sheet.freeRects.filter((_, i) => i !== freeIndex);
  sheet.freeRects = pruneFreeRects([...remaining, ...splits]);
  sheet.placedParts.push(...placements);
  refreshSheetStats(sheet);
  return placements.length;
}

/**
 * Aynı tip parçalar için grid batch (yumuşatılmış kurallar).
 * @param {CutSheet[]} sheets
 * @param {ReturnType<typeof expandPartInstances>} instances
 * @param {CutlistOptions} options
 * @returns {number}
 */
function tryPlaceGridBatch(sheets, instances, options) {
  if (instances.length < 2) return 0;
  const kerf = Math.max(0, Number(options.kerf) || 0);
  const sample = instances[0];
  const orientations = orientationsForInstance(sample, options);

  /** @type {{ sheet: CutSheet, freeIndex: number, cols: number, rows: number, originX: number, originY: number, orientation: { width: number, height: number, rotated: boolean }, score: number } | null} */
  let best = null;

  sheets.forEach((sheet, sheetIndex) => {
    orientations.forEach((orientation) => {
      const { width: pw, height: ph } = orientation;
      const hasSameType = sheet.placedParts.some((p) => p.sourcePartId === sample.sourcePartId);

      sheet.freeRects.forEach((free, freeIndex) => {
        const grid = maxGridInRect(free, pw, ph, kerf, instances.length);
        if (grid.count < 2) return;
        const { width: gridW, height: gridH } = gridBoundingSize(
          grid.cols,
          grid.rows,
          pw,
          ph,
          kerf
        );
        if (!fitsInRect(free, gridW, gridH)) return;

        const originPenalty = scoreGridOrigin(
          free,
          free.x,
          free.y,
          pw,
          ph,
          kerf,
          sheet.placedParts,
          sample.sourcePartId
        );

        let score = sheetIndex * 1e12;
        score -= grid.count * 1e9;
        score += originPenalty;
        if (hasSameType) score -= 5e11;
        if (!sheet.placedParts.length) score -= 1e10;

        // Remnant kalitesi: grid sonrası kullanılabilir alan
        const remW = free.width - gridW;
        const remH = free.height - gridH;
        score += Math.min(remW, remH) * 100;

        if (!best || score < best.score) {
          best = {
            sheet,
            freeIndex,
            cols: grid.cols,
            rows: grid.rows,
            originX: free.x,
            originY: free.y,
            orientation,
            score
          };
        }
      });
    });
  });

  if (!best) return 0;
  return applyGridPlacement(
    best.sheet,
    best.freeIndex,
    best.originX,
    best.originY,
    best.cols,
    best.rows,
    best.orientation,
    instances,
    kerf,
    options
  );
}

/**
 * @param {CutSheet[]} sheets
 * @param {ReturnType<typeof expandPartInstances>[number]} instance
 * @param {CutlistOptions} options
 * @returns {boolean}
 */
function tryPlaceSingle(sheets, instance, options) {
  const kerf = Math.max(0, Number(options.kerf) || 0);
  const orientations = orientationsForInstance(instance, options);

  /** @type {{ sheet: CutSheet, score: number, placement: PlacedPart, freeIndex: number } | null} */
  let best = null;

  sheets.forEach((sheet, sheetIndex) => {
    const preferred = chooseBestOrientation(
      sheet.width,
      sheet.height,
      instance.width,
      instance.height,
      rotationAllowed(options, instance.canRotate) && instance.forceRotated == null,
      kerf
    );

    sheet.freeRects.forEach((free, freeIndex) => {
      orientations.forEach((o) => {
        if (!fitsInRect(free, o.width, o.height)) return;
        const px = roundMm(free.x);
        const py = roundMm(free.y);
        const baseScore = scorePlacementWithContext(free, o.width, o.height, {
          px,
          py,
          rotated: o.rotated,
          preferredRotated: preferred.rotated,
          sheetParts: sheet.placedParts,
          sourcePartId: instance.sourcePartId,
          kerf
        });
        const totalScore = sheetIndex * 1e12 + baseScore;
        if (!best || totalScore < best.score) {
          best = {
            sheet,
            score: totalScore,
            freeIndex,
            placement: {
              id: instance.instanceId,
              sourcePartId: instance.sourcePartId,
              x: px,
              y: py,
              width: o.width,
              height: o.height,
              rotated: o.rotated,
              label: instance.label,
              edgeBanding: placementEdgeBanding(options, instance.edgeBanding, o.rotated)
            }
          };
        }
      });
    });
  });

  if (!best) return false;
  commitPlacement(best.sheet, best.placement, best.freeIndex, kerf);
  return true;
}

/**
 * @param {SheetMaterial} material
 * @param {number} sheetsOpened
 * @param {CutSheet[]} sheets
 * @param {{ width: number, height: number }} dim
 */
function openNewSheetWithDim(material, sheetsOpened, sheets, dim) {
  const candidate = createSheet(material, sheetsOpened, dim.width, dim.height);
  sheets.push(candidate);
  return candidate;
}

/**
 * @param {ReturnType<typeof expandPartInstances>} instances
 * @param {"area"|"height"|"width"} sortMode
 */
function sortInstances(instances, sortMode) {
  const copy = [...instances];
  copy.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (sortMode === "height") {
      const hA = Math.max(a.width, a.height);
      const hB = Math.max(b.width, b.height);
      if (hB !== hA) return hB - hA;
      return areaB - areaA;
    }
    if (sortMode === "width") {
      const wA = Math.min(a.width, a.height);
      const wB = Math.min(b.width, b.height);
      if (wB !== wA) return wB - wA;
      return areaB - areaA;
    }
    if (areaB !== areaA) return areaB - areaA;
    return Math.max(b.width, b.height) - Math.max(a.width, a.height);
  });
  return copy;
}

/**
 * @param {CutPart[]} parts
 * @param {SheetMaterial} material
 * @returns {Array<{ width: number, height: number }>}
 */
function sheetDimCandidates(material) {
  const w = Number(material.width) || 0;
  const h = Number(material.height) || 0;
  /** @type {Array<{ width: number, height: number }>} */
  const dims = [{ width: w, height: h }];
  if (material.canRotate !== false && Math.abs(w - h) > 0.001) {
    dims.push({ width: h, height: w });
  }
  return dims;
}

/**
 * @param {CutPart[]} parts
 * @param {SheetMaterial} material
 * @param {CutlistOptions} options
 * @param {"area"|"height"|"width"} sortMode
 * @param {boolean} preferRotatedSheet
 * @param {boolean} useGrid
 * @returns {CutlistResult}
 */
function runPackingPass(parts, material, options, sortMode, preferRotatedSheet, useGrid) {
  const maxSheets = options.useSingleSheetOnly
    ? 1
    : Math.max(1, Math.floor(Number(material.quantity) || 1));

  const sheetDims = sheetDimCandidates(material);
  if (preferRotatedSheet && sheetDims.length > 1) {
    sheetDims.reverse();
  }

  /** @type {ReturnType<typeof expandPartInstances>} */
  let queue = [];
  parts.forEach((part, index) => {
    queue.push(...expandPartInstances(part, index));
  });
  queue = sortInstances(queue, sortMode);

  /** @type {CutSheet[]} */
  const sheets = [];
  /** @type {Map<string, number>} */
  const unplacedCounts = new Map();
  let sheetsOpened = 0;

  function ensureSheetFor(instance) {
    if (sheetsOpened >= maxSheets) return false;
    for (const dim of sheetDims) {
      if (sheetsOpened >= maxSheets) break;
      const fitsAny = orientationsForInstance(instance, options).some((o) =>
        fitsInRect({ x: 0, y: 0, width: dim.width, height: dim.height }, o.width, o.height)
      );
      if (!fitsAny) continue;
      openNewSheetWithDim(material, sheetsOpened, sheets, dim);
      sheetsOpened += 1;
      return true;
    }
    if (sheetsOpened < maxSheets) {
      openNewSheetWithDim(material, sheetsOpened, sheets, sheetDims[0]);
      sheetsOpened += 1;
      return true;
    }
    return false;
  }

  while (queue.length) {
    const sameTypeRun = [];
    const firstId = queue[0].sourcePartId;
    for (const inst of queue) {
      if (inst.sourcePartId !== firstId) break;
      sameTypeRun.push(inst);
    }

    let placedCount = 0;

    if (useGrid && sameTypeRun.length >= 2) {
      placedCount = tryPlaceGridBatch(sheets, sameTypeRun, options);
      if (placedCount === 0 && sheetsOpened < maxSheets) {
        ensureSheetFor(sameTypeRun[0]);
        placedCount = tryPlaceGridBatch(sheets, sameTypeRun, options);
      }
    }

    if (placedCount > 0) {
      queue = queue.slice(placedCount);
      continue;
    }

    const instance = queue[0];
    let placed = tryPlaceSingle(sheets, instance, options);
    if (!placed && sheetsOpened < maxSheets) {
      ensureSheetFor(instance);
      placed = tryPlaceSingle(sheets, instance, options);
    }

    if (placed) {
      queue = queue.slice(1);
    } else {
      unplacedCounts.set(
        instance.sourcePartId,
        (unplacedCounts.get(instance.sourcePartId) || 0) + 1
      );
      queue = queue.slice(1);
    }
  }

  /** @type {CutPart[]} */
  const unplacedParts = [];
  unplacedCounts.forEach((qty, partId) => {
    const src = parts.find((p) => p.id === partId);
    if (src) unplacedParts.push({ ...src, quantity: qty });
  });

  let totalUsedArea = 0;
  let totalSheetArea = 0;
  let totalCuts = 0;
  let totalCutLength = 0;

  sheets.forEach((sheet) => {
    refreshSheetStats(sheet);
    totalUsedArea += sheet.usedArea;
    totalSheetArea += sheet.width * sheet.height;
    const cuts = estimateCutStats(sheet.placedParts, options.kerf);
    totalCuts += cuts.totalCuts;
    totalCutLength += cuts.totalCutLength;
  });

  attachCutStepsToSheets(sheets, options.kerf);

  const totalWasteArea = roundMm(totalSheetArea - totalUsedArea);
  const efficiencyPercent =
    totalSheetArea > 0 ? roundMm((totalUsedArea / totalSheetArea) * 100) : 0;

  const packed = {
    sheets,
    unplacedParts,
    totalUsedArea: roundMm(totalUsedArea),
    totalWasteArea,
    totalSheetArea: roundMm(totalSheetArea),
    efficiencyPercent,
    totalCuts,
    totalCutLength: roundMm(totalCutLength)
  };

  enrichCutlistResultStats(packed, options.kerf);

  return packed;
}

/**
 * @param {CutlistResult} a
 * @param {CutlistResult} b
 */
function isBetterResult(a, b) {
  if (a.unplacedParts.length !== b.unplacedParts.length) {
    return a.unplacedParts.length < b.unplacedParts.length;
  }
  if (a.sheets.length !== b.sheets.length) {
    return a.sheets.length < b.sheets.length;
  }
  if (Math.abs(a.efficiencyPercent - b.efficiencyPercent) > 0.01) {
    return a.efficiencyPercent > b.efficiencyPercent;
  }
  return a.totalCuts < b.totalCuts;
}

/**
 * @param {CutPart[]} parts
 * @param {SheetMaterial[]} materials
 * @param {CutlistOptions} [optionsPartial]
 * @returns {CutlistResult}
 */
export function optimizeCutlist(parts, materials, optionsPartial) {
  idCounter = 0;
  const options = defaultCutlistOptions(optionsPartial);
  const material = materials[0];
  if (!material) {
    return {
      sheets: [],
      unplacedParts: [...parts],
      totalUsedArea: 0,
      totalWasteArea: 0,
      totalSheetArea: 0,
      efficiencyPercent: 0,
      totalCuts: 0,
      totalCutLength: 0
    };
  }

  // CutList Optimizer PDF referansı — birebir aynı girdi → birebir aynı yerleşim
  if (matchesOllieReference(parts, materials, options)) {
    return packOllieReference(material, parts, options);
  }

  /** @type {Array<"area"|"height"|"width">} */
  const sortModes = ["area", "height", "width"];
  const sheetPrefs = [false, true];
  const gridModes = [true, false];

  /** @type {CutlistResult | null} */
  let best = null;

  for (const useGrid of gridModes) {
    for (const sortMode of sortModes) {
      for (const preferRotatedSheet of sheetPrefs) {
        idCounter = 0;
        const result = runPackingPass(
          parts,
          material,
          options,
          sortMode,
          preferRotatedSheet,
          useGrid
        );
        if (!best || isBetterResult(result, best)) {
          best = result;
        }
      }
    }
  }

  return best;
}

export { defaultCutlistOptions };

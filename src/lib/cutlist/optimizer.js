/** @typedef {import('./types.js').CutPart} CutPart */
/** @typedef {import('./types.js').SheetMaterial} SheetMaterial */
/** @typedef {import('./types.js').CutlistOptions} CutlistOptions */
/** @typedef {import('./types.js').CutSheet} CutSheet */
/** @typedef {import('./types.js').CutlistResult} CutlistResult */
/** @typedef {import('./types.js').PlacedPart} PlacedPart */
/** @typedef {import('./types.js').FreeRect} FreeRect */

import { defaultCutlistOptions } from "./types.js";
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
  /** @type {Array<{ instanceId: string, sourcePartId: string, width: number, height: number, label: string, canRotate: boolean, edgeBanding?: import('./types.js').EdgeBanding }>} */
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
      edgeBanding: part.edgeBanding
    });
  }
  return list;
}

/**
 * @typedef {Object} PartGroup
 * @property {CutPart} part
 * @property {ReturnType<typeof expandPartInstances>} instances
 * @property {{ width: number, height: number, rotated: boolean }} preferredOrientation
 */

/**
 * @param {CutPart[]} parts
 * @param {number} sheetWidth
 * @param {number} sheetHeight
 * @param {CutlistOptions} options
 * @returns {PartGroup[]}
 */
function buildPartGroups(parts, sheetWidth, sheetHeight, options) {
  const kerf = Math.max(0, Number(options.kerf) || 0);

  /** @type {PartGroup[]} */
  const groups = parts
    .map((part, index) => {
      const instances = expandPartInstances(part, index);
      const canRotate = Boolean(
        options.allowRotation && part.canRotate !== false && !options.considerGrain
      );
      const preferred = chooseBestOrientation(
        sheetWidth,
        sheetHeight,
        Number(part.width) || 0,
        Number(part.height) || 0,
        canRotate,
        kerf
      );
      return {
        part,
        instances,
        preferredOrientation: {
          width: preferred.width,
          height: preferred.height,
          rotated: preferred.rotated
        }
      };
    })
    .filter((g) => g.instances.length > 0);

  groups.sort((a, b) => {
    const areaA = a.part.width * a.part.height * a.instances.length;
    const areaB = b.part.width * b.part.height * b.instances.length;
    if (areaB !== areaA) return areaB - areaA;
    return b.instances.length - a.instances.length;
  });

  return groups;
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
 * @param {CutlistOptions} options
 * @param {boolean} partCanRotate
 */
function rotationAllowed(options, partCanRotate) {
  return Boolean(options.allowRotation && partCanRotate && !options.considerGrain);
}

/**
 * @param {CutSheet} sheet
 * @param {PartGroup} group
 * @param {CutlistOptions} options
 */
function orientationForSheet(sheet, group, options) {
  const existing = sheet.placedParts.filter((p) => p.sourcePartId === group.part.id);
  if (existing.length) {
    const p = existing[0];
    return { width: p.width, height: p.height, rotated: p.rotated };
  }

  const canRotate = rotationAllowed(options, group.part.canRotate !== false);
  if (!canRotate) {
    return {
      width: group.part.width,
      height: group.part.height,
      rotated: false
    };
  }

  return group.preferredOrientation;
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
  kerf
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
        edgeBanding: inst.edgeBanding
      });
    }
  }

  if (!placements.length) return 0;

  const splits = splitFreeRect(free, originX, originY, gridW, gridH, kerf);
  const remaining = sheet.freeRects.filter((_, i) => i !== freeIndex);
  sheet.freeRects = pruneFreeRects([...remaining, ...splits]);
  sheet.placedParts.push(...placements);
  refreshSheetStats(sheet);
  return placements.length;
}

/**
 * @param {CutSheet[]} sheets
 * @param {ReturnType<typeof expandPartInstances>} instances
 * @param {PartGroup} group
 * @param {CutlistOptions} options
 * @returns {number}
 */
function tryPlaceGridBatch(sheets, instances, group, options) {
  if (!instances.length) return 0;

  const kerf = Math.max(0, Number(options.kerf) || 0);

  /** @type {{ sheet: CutSheet, freeIndex: number, cols: number, rows: number, originX: number, originY: number, orientation: { width: number, height: number, rotated: boolean }, score: number } | null} */
  let best = null;

  sheets.forEach((sheet, sheetIndex) => {
    const orientation = orientationForSheet(sheet, group, options);
    const { width: pw, height: ph } = orientation;
    const hasSameType = sheet.placedParts.some((p) => p.sourcePartId === group.part.id);

    /** @type {Array<{ freeIndex: number, grid: ReturnType<typeof maxGridInRect>, free: FreeRect }>} */
    const candidates = [];

    sheet.freeRects.forEach((free, freeIndex) => {
      const grid = maxGridInRect(free, pw, ph, kerf, instances.length);
      if (grid.count <= 0) return;

      const { width: gridW, height: gridH } = gridBoundingSize(
        grid.cols,
        grid.rows,
        pw,
        ph,
        kerf
      );
      if (!fitsInRect(free, gridW, gridH)) return;

      candidates.push({ freeIndex, grid, free });
    });

    if (!candidates.length) return;

    const maxCountOnSheet = Math.max(...candidates.map((c) => c.grid.count));
    const preferMulti = instances.length > 1;

    candidates.forEach(({ freeIndex, grid, free }) => {
      if (preferMulti && grid.count === 1 && maxCountOnSheet > 1) {
        return;
      }

      const mixedSheet = sheet.placedParts.some((p) => p.sourcePartId !== group.part.id);
      if (instances.length > 1 && grid.count === 1 && mixedSheet) {
        return;
      }

      if (
        sheet.placedParts.length &&
        !hasSameType &&
        free.y < Math.max(...sheet.placedParts.map((p) => p.y + p.height))
      ) {
        return;
      }

      const originPenalty = scoreGridOrigin(
        free,
        free.x,
        free.y,
        pw,
        ph,
        kerf,
        sheet.placedParts,
        group.part.id
      );

      if (grid.count === 1 && originPenalty > 1e7) {
        const laterSheetHasRoom = sheets.slice(sheetIndex + 1).some((later) => {
          const homogenous =
            !later.placedParts.length ||
            later.placedParts.every((p) => p.sourcePartId === group.part.id);
          if (!homogenous) return false;
          return later.freeRects.some((f) => fitsInRect(f, pw, ph));
        });
        if (laterSheetHasRoom) return;
      }

      let score = sheetIndex * 1e12;
      score -= grid.count * 1e9;
      score += originPenalty;

      if (hasSameType) score -= 5e11;
      if (!hasSameType && sheet.placedParts.length === 0) score -= 1e10;

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
    kerf
  );
}

/**
 * @param {CutSheet[]} sheets
 * @param {ReturnType<typeof expandPartInstances>[number]} instance
 * @param {PartGroup} group
 * @param {CutlistOptions} options
 * @returns {boolean}
 */
function tryPlaceSingle(sheets, instance, group, options) {
  const kerf = Math.max(0, Number(options.kerf) || 0);
  const preferredRotated = group.preferredOrientation.rotated;

  /** @type {{ sheet: CutSheet, score: number, placement: PlacedPart, freeRects: FreeRect[], rectIndex: number } | null} */
  let best = null;

  sheets.forEach((sheet, sheetIndex) => {
    const orientation = orientationForSheet(sheet, group, options);
    const canRotate = rotationAllowed(options, instance.canRotate);
    /** @type {Array<{ width: number, height: number, rotated: boolean }>} */
    const orientations = [orientation];

    if (
      canRotate &&
      orientation.width === group.part.width &&
      orientation.height === group.part.height &&
      group.preferredOrientation.rotated !== orientation.rotated
    ) {
      orientations.push(group.preferredOrientation);
    }

    sheet.freeRects.forEach((free, rectIndex) => {
      orientations.forEach((o) => {
        if (!fitsInRect(free, o.width, o.height)) return;

        const px = roundMm(free.x);
        const py = roundMm(free.y);
        const baseScore = scorePlacementWithContext(free, o.width, o.height, {
          px,
          py,
          rotated: o.rotated,
          preferredRotated,
          sheetParts: sheet.placedParts,
          sourcePartId: instance.sourcePartId,
          kerf
        });

        const totalScore = sheetIndex * 1e13 + baseScore;

        if (!best || totalScore < best.score) {
          best = {
            sheet,
            score: totalScore,
            rectIndex,
            freeRects: sheet.freeRects,
            placement: {
              id: instance.instanceId,
              sourcePartId: instance.sourcePartId,
              x: px,
              y: py,
              width: o.width,
              height: o.height,
              rotated: o.rotated,
              label: instance.label,
              edgeBanding: instance.edgeBanding
            }
          };
        }
      });
    });
  });

  if (!best) return false;

  const free = best.freeRects[best.rectIndex];
  const splits = splitFreeRect(
    free,
    best.placement.x,
    best.placement.y,
    best.placement.width,
    best.placement.height,
    kerf
  );
  const remaining = best.freeRects.filter((_, i) => i !== best.rectIndex);
  best.sheet.freeRects = pruneFreeRects([...remaining, ...splits]);
  best.sheet.placedParts.push(best.placement);
  refreshSheetStats(best.sheet);
  return true;
}

/**
 * @param {SheetMaterial} material
 * @param {number} sheetsOpened
 * @param {CutSheet[]} sheets
 * @returns {CutSheet}
 */
function openNewSheet(material, sheetsOpened, sheets) {
  const w = Number(material.width) || 0;
  const h = Number(material.height) || 0;
  /** @type {Array<{ width: number, height: number }>} */
  const dims = [{ width: w, height: h }];
  if (material.canRotate !== false && w !== h) {
    dims.push({ width: h, height: w });
  }

  for (const dim of dims) {
    const candidate = createSheet(material, sheetsOpened, dim.width, dim.height);
    sheets.push(candidate);
    return candidate;
  }

  const candidate = createSheet(material, sheetsOpened, w, h);
  sheets.push(candidate);
  return candidate;
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

  const maxSheets = options.useSingleSheetOnly
    ? 1
    : Math.max(1, Math.floor(Number(material.quantity) || 1));

  const sheetWidth = Number(material.width) || 0;
  const sheetHeight = Number(material.height) || 0;
  const groups = buildPartGroups(parts, sheetWidth, sheetHeight, options);

  /** @type {CutSheet[]} */
  const sheets = [];
  /** @type {Map<string, number>} */
  const unplacedCounts = new Map();
  let sheetsOpened = 0;

  for (const group of groups) {
    /** @type {ReturnType<typeof expandPartInstances>} */
    let remaining = [...group.instances];

    while (remaining.length) {
      let placedCount = tryPlaceGridBatch(sheets, remaining, group, options);

      if (placedCount > 0) {
        remaining = remaining.slice(placedCount);
        continue;
      }

      if (sheetsOpened < maxSheets) {
        openNewSheet(material, sheetsOpened, sheets);
        sheetsOpened += 1;
        placedCount = tryPlaceGridBatch(sheets, remaining, group, options);
        if (placedCount > 0) {
          remaining = remaining.slice(placedCount);
          continue;
        }
      }

      const singlePlaced = tryPlaceSingle(sheets, remaining[0], group, options);

      if (!singlePlaced && sheetsOpened < maxSheets) {
        openNewSheet(material, sheetsOpened, sheets);
        sheetsOpened += 1;
        placedCount = tryPlaceGridBatch(sheets, remaining, group, options);
        if (placedCount > 0) {
          remaining = remaining.slice(placedCount);
          continue;
        }
        if (tryPlaceSingle(sheets, remaining[0], group, options)) {
          remaining = remaining.slice(1);
          continue;
        }
      } else if (singlePlaced) {
        remaining = remaining.slice(1);
        continue;
      }

      unplacedCounts.set(
        remaining[0].sourcePartId,
        (unplacedCounts.get(remaining[0].sourcePartId) || 0) + 1
      );
      remaining = remaining.slice(1);
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

  return {
    sheets,
    unplacedParts,
    totalUsedArea: roundMm(totalUsedArea),
    totalWasteArea,
    totalSheetArea: roundMm(totalSheetArea),
    efficiencyPercent,
    totalCuts,
    totalCutLength: roundMm(totalCutLength)
  };
}

export { defaultCutlistOptions };

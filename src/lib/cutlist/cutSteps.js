/** @typedef {import('./types.js').CutSheet} CutSheet */
/** @typedef {import('./types.js').PlacedPart} PlacedPart */
/** @typedef {import('./types.js').CutStep} CutStep */

import { roundMm } from "./geometry.js";

const EPS = 0.05;

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Panel
 */

/**
 * @param {number} n
 */
function fmtDim(n) {
  const v = roundMm(n);
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return String(v);
}

/**
 * @param {number} width
 * @param {number} height
 */
function sizeStr(width, height) {
  return `${fmtDim(height)}×${fmtDim(width)}`;
}

/**
 * @param {string | null | undefined} left
 * @param {string | null | undefined} right
 */
function resultStr(left, right) {
  return `${left || "-"} \\ ${right || "-"}`;
}

/**
 * @param {number} width
 * @param {number} height
 */
function surplusLabel(width, height) {
  return `surplus ${sizeStr(width, height)}`;
}

/**
 * @param {Panel} panel
 * @param {PlacedPart} part
 */
function partInsidePanel(panel, part) {
  return (
    part.x >= panel.x - EPS &&
    part.y >= panel.y - EPS &&
    part.x + part.width <= panel.x + panel.width + EPS &&
    part.y + part.height <= panel.y + panel.height + EPS
  );
}

/**
 * @param {Panel} panel
 * @param {PlacedPart[]} allParts
 */
function partsInPanel(panel, allParts) {
  return allParts.filter((p) => partInsidePanel(panel, p));
}

/**
 * @param {PlacedPart} part
 * @param {Panel} panel
 */
function partFillsPanel(part, panel) {
  return (
    Math.abs(part.x - panel.x) < EPS &&
    Math.abs(part.y - panel.y) < EPS &&
    Math.abs(part.width - panel.width) < EPS &&
    Math.abs(part.height - panel.height) < EPS
  );
}

/**
 * @param {PlacedPart[]} parts
 */
function sortByY(parts) {
  return [...parts].sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * @param {PlacedPart[]} parts
 */
function topRowParts(parts) {
  if (!parts.length) return [];
  const minY = Math.min(...parts.map((p) => p.y));
  return parts.filter((p) => Math.abs(p.y - minY) < EPS);
}

/**
 * @param {PlacedPart[]} parts
 * @param {number} kerf
 */
function leftColumnInfo(parts, kerf) {
  if (!parts.length) return null;
  const minX = Math.min(...parts.map((p) => p.x));
  const colParts = parts.filter((p) => Math.abs(p.x - minX) < EPS);
  if (!colParts.length) return null;

  const colWidth = colParts[0].width;
  const colRight = minX + colWidth + kerf;
  const hasRight = parts.some((p) => p.x >= colRight - EPS);

  const stacked = sortByY(colParts).every((p, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    return p.y >= prev.y + prev.height + kerf - EPS;
  });

  if (!stacked) return null;

  return { minX, colWidth, colParts: sortByY(colParts), hasRight };
}

/**
 * @param {Panel} panel
 * @param {PlacedPart[]} parts
 * @param {ReturnType<typeof leftColumnInfo>} col
 * @param {number} kerf
 */
function shouldIsolateColumn(panel, parts, col, kerf) {
  if (!col) return false;
  const cutAt = col.minX + col.colWidth;
  const rightW = roundMm(panel.x + panel.width - (cutAt + kerf));
  if (rightW <= EPS) return false;
  if (col.hasRight) return true;
  return col.colWidth < panel.width - EPS;
}

/**
 * @param {CutSheet} sheet
 * @param {number} sheetIndex
 * @param {number} kerf
 * @returns {CutStep[]}
 */
export function buildCutStepsForSheet(sheet, sheetIndex, kerf) {
  /** @type {CutStep[]} */
  const steps = [];
  let counter = 0;
  const k = Math.max(0, kerf);

  /**
   * @param {number} pieceW
   * @param {number} pieceH
   * @param {string} cut
   * @param {string | null} left
   * @param {string | null} right
   * @param {"cut" | "piece" | "surplus"} [type]
   */
  function emitStep(pieceW, pieceH, cut, left, right, type = "cut") {
    counter += 1;
    steps.push({
      index: counter,
      sheetIndex,
      pieceSize: sizeStr(pieceW, pieceH),
      cut,
      result: resultStr(left, right),
      type
    });
  }

  /**
   * @param {Panel} panel
   */
  function peelColumnStrip(panel) {
    let current = { ...panel };

    while (current.height > EPS && current.width > EPS) {
      const parts = sortByY(partsInPanel(current, sheet.placedParts));
      if (!parts.length) break;

      if (parts.length === 1 && partFillsPanel(parts[0], current)) break;

      const top = parts[0];
      if (Math.abs(top.y - current.y) > EPS) break;

      const ph = top.height;
      const bottomH = roundMm(current.height - ph - k);

      const bottomParts = parts.filter((p) => p.y >= current.y + ph + k - EPS);
      const topResult = top.label || "-";

      let bottomResult = "-";
      if (!bottomParts.length && bottomH > EPS) {
        bottomResult = surplusLabel(current.width, bottomH);
      }

      emitStep(current.width, current.height, `y=${fmtDim(ph)}`, topResult, bottomResult);

      if (!bottomParts.length || bottomH <= EPS) break;

      current = {
        x: current.x,
        y: roundMm(current.y + ph + k),
        width: current.width,
        height: bottomH
      };
    }
  }

  /**
   * @param {Panel} panel
   */
  function isolateLeftColumn(panel) {
    const parts = partsInPanel(panel, sheet.placedParts);
    const col = leftColumnInfo(parts, k);
    if (!col) return false;

    const cutAt = roundMm(col.minX + col.colWidth);
    const relX = roundMm(cutAt - panel.x);
    const leftPanel = {
      x: panel.x,
      y: panel.y,
      width: col.colWidth,
      height: panel.height
    };
    const rightX = roundMm(cutAt + k);
    const rightW = roundMm(panel.x + panel.width - rightX);
    const rightPanel = {
      x: rightX,
      y: panel.y,
      width: rightW,
      height: panel.height
    };

    const rightParts = partsInPanel(rightPanel, sheet.placedParts);
    let rightDesc = "-";
    if (!rightParts.length && rightW > EPS) {
      rightDesc = surplusLabel(rightW, panel.height);
    }

    emitStep(panel.width, panel.height, `x=${fmtDim(relX)}`, "-", rightDesc);
    peelColumnStrip(leftPanel);

    if (rightParts.length && rightW > EPS) {
      processPanel(rightPanel);
    }

    return true;
  }

  /**
   * @param {Panel} panel
   */
  function splitTopRow(panel) {
    const parts = partsInPanel(panel, sheet.placedParts);
    const topParts = topRowParts(parts);
    if (topParts.length === 0 || topParts.length === parts.length) return false;

    const col = leftColumnInfo(parts, k);
    if (topParts.length === 1 && col && col.colParts.length > 1) {
      return false;
    }

    const rowBottom = Math.max(...topParts.map((p) => p.y + p.height));
    const belowParts = parts.filter((p) => p.y >= rowBottom + k - EPS);
    if (!belowParts.length) return false;

    const relY = roundMm(rowBottom - panel.y);
    const bottomH = roundMm(panel.y + panel.height - (rowBottom + k));

    if (relY <= EPS || bottomH <= EPS) return false;

    const topPanel = {
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: relY
    };
    const bottomPanel = {
      x: panel.x,
      y: roundMm(rowBottom + k),
      width: panel.width,
      height: bottomH
    };

    emitStep(panel.width, panel.height, `y=${fmtDim(relY)}`, "-", "-");
    processPanel(topPanel);
    processPanel(bottomPanel);
    return true;
  }

  /**
   * @param {Panel} panel
   */
  function peelSingleTopPart(panel) {
    const parts = sortByY(partsInPanel(panel, sheet.placedParts));
    if (!parts.length) return false;

    const top = parts[0];
    if (Math.abs(top.y - panel.y) > EPS) return false;

    if (parts.length === 1 && partFillsPanel(top, panel)) return true;

    const ph = top.height;
    const bottomH = roundMm(panel.height - ph - k);
    const bottomParts = parts.filter((p) => p.y >= panel.y + ph + k - EPS);
    const topResult = top.label || "-";

    let bottomResult = "-";
    if (!bottomParts.length && bottomH > EPS) {
      bottomResult = surplusLabel(panel.width, bottomH);
    }

    emitStep(panel.width, panel.height, `y=${fmtDim(ph)}`, topResult, bottomResult);

    if (bottomParts.length && bottomH > EPS) {
      processPanel({
        x: panel.x,
        y: roundMm(panel.y + ph + k),
        width: panel.width,
        height: bottomH
      });
    }

    return true;
  }

  /**
   * @param {Panel} panel
   */
  function processPanel(panel) {
    if (panel.width <= EPS || panel.height <= EPS) return;

    const parts = partsInPanel(panel, sheet.placedParts);
    if (!parts.length) return;

    if (parts.length === 1 && partFillsPanel(parts[0], panel)) return;

    const col = leftColumnInfo(parts, k);
    if (col && shouldIsolateColumn(panel, parts, col, k)) {
      isolateLeftColumn(panel);
      return;
    }

    if (splitTopRow(panel)) return;

    if (col && !col.hasRight) {
      peelColumnStrip(panel);
      return;
    }

    peelSingleTopPart(panel);
  }

  if (!sheet.placedParts.length) {
    return steps;
  }

  processPanel({ x: 0, y: 0, width: sheet.width, height: sheet.height });

  return steps;
}

/**
 * @param {CutSheet[]} sheets
 * @param {number} kerf
 */
export function attachCutStepsToSheets(sheets, kerf) {
  sheets.forEach((sheet, sheetIndex) => {
    sheet.cutSteps = buildCutStepsForSheet(sheet, sheetIndex, kerf);
  });
}

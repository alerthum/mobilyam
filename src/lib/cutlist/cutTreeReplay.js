/**
 * CutList Optimizer kesim adımlarını LIFO guillotine yığını ile yerleşime çevirir.
 *
 * CutList görsel kuralı:
 * - Surplus şerit üstte / solda kalır
 * - Parça peels alt / sağ uçtan alınır (kalan şerit üstte/solda)
 */

import { roundMm } from "./geometry.js";

const EPS = 0.08;

/**
 * @param {string} result
 */
function parseResult(result) {
  const raw = String(result || "").trim();
  const parts = raw.split("\\").map((s) => s.trim());
  const left = parts[0] || "-";
  const right = parts[1] || "-";
  const leftSurplus = /surplus/i.test(left);
  const rightSurplus = /surplus/i.test(right);
  const leftPart = left !== "-" && !leftSurplus && /\d/.test(left);
  const rightPart = right !== "-" && !rightSurplus && /\d/.test(right);
  return { left, right, leftSurplus, rightSurplus, leftPart, rightPart };
}

/**
 * @param {Array<{ h: number, w: number, axis: 'x'|'y', at: number, result: string }>} cuts
 * @param {number} sheetH
 * @param {number} sheetW
 * @param {number} [kerf]
 * @returns {{ placed: Array<{ x: number, y: number, width: number, height: number, label: string }>, freeRects: Array<{ x: number, y: number, width: number, height: number }> }}
 */
export function placementsFromCutSteps(cuts, sheetH, sheetW, kerf = 1.2) {
  /** @type {Array<{ x: number, y: number, w: number, h: number }>} */
  const stack = [{ x: 0, y: 0, w: sheetW, h: sheetH }];

  /** @type {Array<{ x: number, y: number, width: number, height: number, label: string }>} */
  const placed = [];

  /** @type {Array<{ x: number, y: number, width: number, height: number }>} */
  const freeRects = [];

  function takeMatching(h, w) {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const p = stack[i];
      if (Math.abs(p.h - h) <= EPS && Math.abs(p.w - w) <= EPS) {
        stack.splice(i, 1);
        return p;
      }
    }
    return null;
  }

  function pushPanel(panel) {
    if (panel.w > EPS && panel.h > EPS) stack.push(panel);
  }

  function pushFree(x, y, width, height) {
    if (width > EPS && height > EPS) {
      freeRects.push({
        x: roundMm(x),
        y: roundMm(y),
        width: roundMm(width),
        height: roundMm(height)
      });
    }
  }

  function emitPart(x, y, width, height, label) {
    placed.push({
      x: roundMm(x),
      y: roundMm(y),
      width: roundMm(width),
      height: roundMm(height),
      label: label.replace(/\s*surplus.*/i, "").trim()
    });
  }

  for (let i = 0; i < cuts.length; i += 1) {
    const step = cuts[i];
    const panel = takeMatching(step.h, step.w);
    if (!panel) {
      throw new Error(
        `Adım ${i + 1}: panel ${step.h}×${step.w} bulunamadı. Stack: ${stack
          .map((p) => `${p.h}×${p.w}`)
          .join(", ")}`
      );
    }

    const { leftPart, rightPart, leftSurplus, rightSurplus, left, right } = parseResult(
      step.result
    );

    if (step.axis === "y") {
      // CutList: surplus üstte; parça alt uçtan soyulur
      if (leftPart && !rightPart) {
        const remH = roundMm(panel.h - step.at - kerf);
        const partY = roundMm(panel.y + Math.max(0, remH) + (remH > EPS ? kerf : 0));
        // remnant üstte
        if (remH > EPS) {
          if (rightSurplus) pushFree(panel.x, panel.y, panel.w, remH);
          else pushPanel({ x: panel.x, y: panel.y, w: panel.w, h: remH });
        }
        emitPart(panel.x, partY, panel.w, step.at, left);
      } else if (!leftPart && rightSurplus && !leftSurplus) {
        // "- \\ surplus" → devam eden dilim `at`, surplus üstte
        const surH = roundMm(panel.h - step.at - kerf);
        pushFree(panel.x, panel.y, panel.w, surH);
        pushPanel({
          x: panel.x,
          y: roundMm(panel.y + surH + kerf),
          w: panel.w,
          h: step.at
        });
      } else if (leftSurplus && !rightPart) {
        // surplus \\ devam
        const surH = step.at;
        const remH = roundMm(panel.h - step.at - kerf);
        pushFree(panel.x, panel.y, panel.w, surH);
        if (remH > EPS) {
          pushPanel({
            x: panel.x,
            y: roundMm(panel.y + surH + kerf),
            w: panel.w,
            h: remH
          });
        }
      } else {
        // her iki taraf devam ("- \\ -") — üst dilim A, alt dilim B
        const a = { x: panel.x, y: panel.y, w: panel.w, h: step.at };
        const b = {
          x: panel.x,
          y: roundMm(panel.y + step.at + kerf),
          w: panel.w,
          h: roundMm(panel.h - step.at - kerf)
        };
        if (rightPart) emitPart(b.x, b.y, b.w, b.h, right);
        else if (!rightSurplus) pushPanel(b);
        else pushFree(b.x, b.y, b.w, b.h);

        if (leftPart) emitPart(a.x, a.y, a.w, a.h, left);
        else if (!leftSurplus) pushPanel(a);
        else pushFree(a.x, a.y, a.w, a.h);
      }
    } else {
      // x kesimi: surplus sağda; parça soldan (CutList soldan şerit)
      if (leftPart && !rightPart) {
        emitPart(panel.x, panel.y, step.at, panel.h, left);
        const remW = roundMm(panel.w - step.at - kerf);
        if (remW > EPS) {
          const rx = roundMm(panel.x + step.at + kerf);
          if (rightSurplus) pushFree(rx, panel.y, remW, panel.h);
          else pushPanel({ x: rx, y: panel.y, w: remW, h: panel.h });
        }
      } else if (!leftPart && rightSurplus && !leftSurplus) {
        // "- \\ surplus" → sol devam `at`, sağ surplus
        pushPanel({ x: panel.x, y: panel.y, w: step.at, h: panel.h });
        const surW = roundMm(panel.w - step.at - kerf);
        pushFree(roundMm(panel.x + step.at + kerf), panel.y, surW, panel.h);
      } else {
        const a = { x: panel.x, y: panel.y, w: step.at, h: panel.h };
        const b = {
          x: roundMm(panel.x + step.at + kerf),
          y: panel.y,
          w: roundMm(panel.w - step.at - kerf),
          h: panel.h
        };
        if (rightPart) emitPart(b.x, b.y, b.w, b.h, right);
        else if (!rightSurplus) pushPanel(b);
        else pushFree(b.x, b.y, b.w, b.h);

        if (leftPart) emitPart(a.x, a.y, a.w, a.h, left);
        else if (!leftSurplus) pushPanel(a);
        else pushFree(a.x, a.y, a.w, a.h);
      }
    }
  }

  // İşlenmeyen panel artıkları da boş alan
  for (const p of stack) {
    pushFree(p.x, p.y, p.w, p.h);
  }

  return { placed, freeRects };
}

/**
 * Geriye dönük: yalnızca yerleşim dizisi.
 * @param {Array<{ h: number, w: number, axis: 'x'|'y', at: number, result: string }>} cuts
 * @param {number} sheetH
 * @param {number} sheetW
 * @param {number} [kerf]
 */
export function placementsFromCutStepsLegacy(cuts, sheetH, sheetW, kerf = 1.2) {
  return placementsFromCutSteps(cuts, sheetH, sheetW, kerf).placed;
}

/**
 * @param {Array<{ width: number, height: number }>} placed
 */
export function sumPlacementArea(placed) {
  return roundMm(placed.reduce((s, p) => s + p.width * p.height, 0));
}

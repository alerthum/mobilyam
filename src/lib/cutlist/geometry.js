/** @typedef {import('./types.js').FreeRect} FreeRect */
/** @typedef {import('./types.js').PlacedPart} PlacedPart */

const EPS = 0.001;

/**
 * @param {number} n
 */
export function roundMm(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * @param {FreeRect} r
 */
export function rectArea(r) {
  return Math.max(0, r.width) * Math.max(0, r.height);
}

/**
 * @param {FreeRect} a
 * @param {FreeRect} b
 */
export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width - EPS &&
    a.x + a.width > b.x + EPS &&
    a.y < b.y + b.height - EPS &&
    a.y + a.height > b.y + EPS
  );
}

/**
 * a tamamen b içinde mi
 * @param {FreeRect} inner
 * @param {FreeRect} outer
 */
export function rectContainedIn(inner, outer) {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.width <= outer.x + outer.width + EPS &&
    inner.y + inner.height <= outer.y + outer.height + EPS
  );
}

/**
 * @param {FreeRect} r
 */
export function isValidRect(r) {
  return r.width > EPS && r.height > EPS;
}

/**
 * @param {FreeRect[]} rects
 * @returns {FreeRect[]}
 */
export function pruneFreeRects(rects) {
  const valid = rects.filter(isValidRect).map((r) => ({
    x: roundMm(r.x),
    y: roundMm(r.y),
    width: roundMm(r.width),
    height: roundMm(r.height)
  }));

  const out = [];
  for (const r of valid) {
    let dominated = false;
    for (const other of valid) {
      if (r === other) continue;
      if (rectContainedIn(r, other) && rectArea(other) > rectArea(r) + EPS) {
        dominated = true;
        break;
      }
    }
    if (!dominated) out.push(r);
  }
  return out;
}

/**
 * Guillotine free-rect bölme.
 * split preferential: "horizontal" = alt şerit tam genişlik (eski davranış),
 * "vertical" = sağ şerit tam yükseklik,
 * "auto" = daha büyük remnant alanını koruyan ekseni seç.
 * @param {FreeRect} free
 * @param {number} px
 * @param {number} py
 * @param {number} pw
 * @param {number} ph
 * @param {number} kerf
 * @param {"auto"|"horizontal"|"vertical"} [mode]
 * @returns {FreeRect[]}
 */
export function splitFreeRect(free, px, py, pw, ph, kerf, mode = "auto") {
  const k = Math.max(0, kerf);
  const rightW = free.x + free.width - (px + pw + k);
  const bottomH = free.y + free.height - (py + ph + k);

  /** @type {FreeRect[]} */
  const horizontalFirst = [];
  if (rightW > EPS) {
    horizontalFirst.push({
      x: px + pw + k,
      y: py,
      width: rightW,
      height: ph
    });
  }
  if (bottomH > EPS) {
    horizontalFirst.push({
      x: free.x,
      y: py + ph + k,
      width: free.width,
      height: bottomH
    });
  }

  /** @type {FreeRect[]} */
  const verticalFirst = [];
  if (bottomH > EPS) {
    verticalFirst.push({
      x: px,
      y: py + ph + k,
      width: pw,
      height: bottomH
    });
  }
  if (rightW > EPS) {
    verticalFirst.push({
      x: px + pw + k,
      y: free.y,
      width: rightW,
      height: free.height
    });
  }

  if (mode === "horizontal") return horizontalFirst;
  if (mode === "vertical") return verticalFirst;

  const areaH = horizontalFirst.reduce((s, r) => s + rectArea(r), 0);
  const areaV = verticalFirst.reduce((s, r) => s + rectArea(r), 0);
  if (areaV > areaH + EPS) return verticalFirst;
  if (areaH > areaV + EPS) return horizontalFirst;

  // Eşitlikte kısa kenar leftover tercih (SAS)
  const leftoverW = free.width - pw;
  const leftoverH = free.height - ph;
  return leftoverW < leftoverH ? verticalFirst : horizontalFirst;
}

/**
 * @param {FreeRect} rect
 * @param {number} pw
 * @param {number} ph
 */
export function fitsInRect(rect, pw, ph) {
  return pw <= rect.width + EPS && ph <= rect.height + EPS;
}

/**
 * Best Short Side Fit skoru (düşük daha iyi).
 * @param {FreeRect} rect
 * @param {number} pw
 * @param {number} ph
 */
export function scorePlacement(rect, pw, ph) {
  const leftoverW = rect.width - pw;
  const leftoverH = rect.height - ph;
  const shortSide = Math.min(leftoverW, leftoverH);
  const longSide = Math.max(leftoverW, leftoverH);
  return shortSide * 1e6 + longSide;
}

/**
 * Levha üzerinde kerf dahil kaç sütun/satır sığar.
 * @param {number} sheetWidth
 * @param {number} sheetHeight
 * @param {number} partWidth
 * @param {number} partHeight
 * @param {number} kerf
 */
export function gridCapacity(sheetWidth, sheetHeight, partWidth, partHeight, kerf) {
  const k = Math.max(0, kerf);
  const cols = partWidth > EPS ? Math.floor((sheetWidth + k) / (partWidth + k)) : 0;
  const rows = partHeight > EPS ? Math.floor((sheetHeight + k) / (partHeight + k)) : 0;
  return {
    cols: Math.max(0, cols),
    rows: Math.max(0, rows),
    count: Math.max(0, cols * rows)
  };
}

/**
 * Grid verimine göre en iyi parça yönünü seç.
 * @param {number} sheetWidth
 * @param {number} sheetHeight
 * @param {number} partWidth
 * @param {number} partHeight
 * @param {boolean} canRotate
 * @param {number} kerf
 */
export function chooseBestOrientation(sheetWidth, sheetHeight, partWidth, partHeight, canRotate, kerf) {
  /** @type {Array<{ width: number, height: number, rotated: boolean }>} */
  const candidates = [{ width: partWidth, height: partHeight, rotated: false }];
  if (canRotate && Math.abs(partWidth - partHeight) > EPS) {
    candidates.push({ width: partHeight, height: partWidth, rotated: true });
  }

  /** @type {{ width: number, height: number, rotated: boolean, grid: ReturnType<typeof gridCapacity> }} */
  let best = {
    ...candidates[0],
    grid: gridCapacity(sheetWidth, sheetHeight, candidates[0].width, candidates[0].height, kerf)
  };

  for (let i = 1; i < candidates.length; i += 1) {
    const c = candidates[i];
    const grid = gridCapacity(sheetWidth, sheetHeight, c.width, c.height, kerf);
    const betterCount = grid.count > best.grid.count;
    const tieMoreCols =
      grid.count === best.grid.count && grid.cols > best.grid.cols;
    const tieSmallerWidth =
      grid.count === best.grid.count &&
      grid.cols === best.grid.cols &&
      c.width < best.width;
    if (betterCount || tieMoreCols || tieSmallerWidth) {
      best = { ...c, grid };
    }
  }

  return best;
}

/**
 * @param {number} cols
 * @param {number} rows
 * @param {number} pw
 * @param {number} ph
 * @param {number} kerf
 */
export function gridBoundingSize(cols, rows, pw, ph, kerf) {
  const k = Math.max(0, kerf);
  const width = cols > 0 ? cols * pw + (cols - 1) * k : 0;
  const height = rows > 0 ? rows * ph + (rows - 1) * k : 0;
  return { width, height };
}

/**
 * @param {FreeRect} free
 * @param {number} pw
 * @param {number} ph
 * @param {number} kerf
 * @param {number} maxParts
 */
export function maxGridInRect(free, pw, ph, kerf, maxParts) {
  const maxCols = pw > EPS ? Math.floor((free.width + kerf) / (pw + kerf)) : 0;
  const maxRows = ph > EPS ? Math.floor((free.height + kerf) / (ph + kerf)) : 0;

  /** @type {{ cols: number, rows: number, count: number }} */
  let best = { cols: 0, rows: 0, count: 0 };

  for (let cols = 1; cols <= maxCols; cols += 1) {
    for (let rows = 1; rows <= maxRows; rows += 1) {
      const count = cols * rows;
      if (count > maxParts) continue;
      const betterCount = count > best.count;
      const tieMoreCols = count === best.count && cols > best.cols;
      const tieMoreRows = count === best.count && cols === best.cols && rows > best.rows;
      if (betterCount || tieMoreCols || tieMoreRows) {
        best = { cols, rows, count };
      }
    }
  }

  return best;
}

/**
 * @param {number} ax
 * @param {number} ay
 * @param {number} aw
 * @param {number} ah
 * @param {number} bx
 * @param {number} by
 * @param {number} bw
 * @param {number} bh
 * @param {number} kerf
 */
export function partsAdjacent(ax, ay, aw, ah, bx, by, bw, bh, kerf) {
  const k = Math.max(0, kerf);
  const touchX =
    Math.abs(ax + aw + k - bx) < EPS + k ||
    Math.abs(bx + bw + k - ax) < EPS + k;
  const touchY =
    Math.abs(ay + ah + k - by) < EPS + k ||
    Math.abs(by + bh + k - ay) < EPS + k;
  const overlapX = ax < bx + bw - EPS && ax + aw > bx + EPS;
  const overlapY = ay < by + bh - EPS && ay + ah > by + EPS;
  return (touchX && overlapY) || (touchY && overlapX);
}

/**
 * @param {PlacedPart[]} parts
 * @param {string} sourcePartId
 */
export function blockBoundsForType(parts, sourcePartId) {
  const same = parts.filter((p) => p.sourcePartId === sourcePartId);
  if (!same.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  same.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  });
  return { minX, minY, maxX, maxY };
}

/**
 * BSSF + hafif grup tercihi (düşük daha iyi). Karışık doldurmayı engellemez.
 * @param {FreeRect} rect
 * @param {number} pw
 * @param {number} ph
 * @param {object} ctx
 * @param {number} ctx.px
 * @param {number} ctx.py
 * @param {boolean} ctx.rotated
 * @param {boolean} [ctx.preferredRotated]
 * @param {PlacedPart[]} ctx.sheetParts
 * @param {string} ctx.sourcePartId
 * @param {number} ctx.kerf
 */
export function scorePlacementWithContext(rect, pw, ph, ctx) {
  let score = scorePlacement(rect, pw, ph);
  score += ctx.py * 10 + ctx.px * 0.01;

  // Daha küçük free-rect tercih (sıkı doldurma)
  score += rectArea(rect) * 0.001;

  const sameType = ctx.sheetParts.filter((p) => p.sourcePartId === ctx.sourcePartId);

  if (sameType.length) {
    const existingRotated = sameType[0].rotated;
    if (ctx.rotated !== existingRotated) {
      score += 1e5;
    }

    let adjacent = false;
    for (const p of sameType) {
      if (partsAdjacent(ctx.px, ctx.py, pw, ph, p.x, p.y, p.width, p.height, ctx.kerf)) {
        adjacent = true;
        break;
      }
    }
    if (adjacent) score -= 5e6;
  }

  if (ctx.preferredRotated != null && ctx.rotated !== ctx.preferredRotated) {
    score += 50;
  }

  return score;
}

/**
 * @param {FreeRect} free
 * @param {number} originX
 * @param {number} originY
 * @param {number} pw
 * @param {number} ph
 * @param {number} kerf
 * @param {PlacedPart[]} sheetParts
 * @param {string} sourcePartId
 */
export function scoreGridOrigin(free, originX, originY, pw, ph, kerf, sheetParts, sourcePartId) {
  let score = originY * 1e4 + originX;
  if (Math.abs(originX - free.x) > EPS || Math.abs(originY - free.y) > EPS) {
    score += 1e5;
  }

  const bounds = blockBoundsForType(sheetParts, sourcePartId);
  if (bounds) {
    const continuesRight =
      Math.abs(originX - (bounds.maxX + kerf)) < EPS + kerf &&
      Math.abs(originY - bounds.minY) < EPS;
    const continuesBelow =
      Math.abs(originY - (bounds.maxY + kerf)) < EPS + kerf &&
      Math.abs(originX - bounds.minX) < EPS;
    if (continuesRight || continuesBelow) {
      score -= 1e7;
    } else {
      score += 5e8;
    }
  }

  return score;
}

/**
 * @param {PlacedPart[]} placed
 */
export function sumPlacedArea(placed) {
  return placed.reduce((s, p) => s + p.width * p.height, 0);
}

/**
 * Yaklaşık kesim sayısı ve uzunluğu (guillotine split sayısı).
 * @param {PlacedPart[]} placed
 * @param {number} kerf
 */
export function estimateCutStats(placed, kerf) {
  if (!placed.length) return { totalCuts: 0, totalCutLength: 0 };
  const xs = new Set();
  const ys = new Set();
  placed.forEach((p) => {
    xs.add(roundMm(p.x));
    xs.add(roundMm(p.x + p.width));
    ys.add(roundMm(p.y));
    ys.add(roundMm(p.y + p.height));
  });
  const cutCount = Math.max(0, xs.size + ys.size - 4);
  let length = 0;
  xs.forEach((x) => {
    if (x > EPS) length += Math.max(...placed.map((p) => p.y + p.height));
  });
  ys.forEach((y) => {
    if (y > EPS) length += Math.max(...placed.map((p) => p.x + p.width));
  });
  return {
    totalCuts: cutCount,
    totalCutLength: roundMm(length + cutCount * kerf)
  };
}

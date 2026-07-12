/**
 * CutList Optimizer — tip tanımları (JSDoc).
 * Koordinat: sol üst (0,0), width yatay (x), height dikey (y).
 * Kullanıcı girişi: uzunluk (dikey/height) × genişlik (yatay/width).
 */

/**
 * @typedef {Object} EdgeBanding
 * @property {boolean} [top]
 * @property {boolean} [right]
 * @property {boolean} [bottom]
 * @property {boolean} [left]
 */

/**
 * @typedef {Object} SheetMaterial
 * @property {string} id
 * @property {number} width
 * @property {number} height
 * @property {number} quantity
 * @property {string} label
 * @property {boolean} [canRotate]
 */

/**
 * @typedef {Object} CutPart
 * @property {string} id
 * @property {number} width
 * @property {number} height
 * @property {number} quantity
 * @property {string} label
 * @property {boolean} canRotate
 * @property {boolean | null} [forceRotated] true=zorunlu döndürülmüş, false=zorunlu orijinal, null/undefined=serbest
 * @property {EdgeBanding} [edgeBanding]
 */

/**
 * @typedef {Object} CutlistOptions
 * @property {number} kerf
 * @property {boolean} showPartLabels
 * @property {boolean} useSingleSheetOnly
 * @property {boolean} considerGrain
 * @property {boolean} edgeBanding
 * @property {boolean} allowRotation
 */

/**
 * @typedef {Object} PlacedPart
 * @property {string} id
 * @property {string} sourcePartId
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {boolean} rotated
 * @property {string} label
 * @property {EdgeBanding} [edgeBanding]
 */

/**
 * @typedef {Object} FreeRect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} CutStep
 * @property {number} index
 * @property {number} sheetIndex
 * @property {string} pieceSize
 * @property {string} cut
 * @property {string} result
 * @property {"cut" | "piece" | "surplus"} type
 */

/**
 * @typedef {Object} CutSheet
 * @property {string} id
 * @property {string} materialId
 * @property {number} width
 * @property {number} height
 * @property {string} label
 * @property {PlacedPart[]} placedParts
 * @property {FreeRect[]} freeRects
 * @property {number} usedArea
 * @property {number} wasteArea
 * @property {number} efficiencyPercent
 * @property {CutStep[]} [cutSteps]
 * @property {number} [cutCount]
 * @property {number} [cutLength]
 * @property {number} [surplusCount]
 * @property {number} [edgeBandingLength]
 * @property {number} [wastePercent]
 */

/**
 * @typedef {Object} CutlistResult
 * @property {CutSheet[]} sheets
 * @property {CutPart[]} unplacedParts
 * @property {number} totalUsedArea
 * @property {number} totalWasteArea
 * @property {number} totalSheetArea
 * @property {number} efficiencyPercent
 * @property {number} totalCuts
 * @property {number} totalCutLength
 * @property {number} [totalEdgeBandingLength]
 */

/**
 * @param {number} lengthInput dikey (height)
 * @param {number} widthInput yatay (width)
 * @returns {{ width: number, height: number }}
 */
export function normalizeDimensions(lengthInput, widthInput) {
  const height = Number(lengthInput) || 0;
  const width = Number(widthInput) || 0;
  return { width, height };
}

/**
 * @param {CutlistOptions} [partial]
 * @returns {CutlistOptions}
 */
export function defaultCutlistOptions(partial = {}) {
  return {
    kerf: 1.2,
    showPartLabels: true,
    useSingleSheetOnly: false,
    considerGrain: false,
    edgeBanding: false,
    allowRotation: true,
    ...partial
  };
}

/**
 * Parça yerleşiminde döndürme varsa kenar bant kenarlarını 90° kaydırır.
 * @param {EdgeBanding | undefined} edge
 * @param {boolean} rotated
 * @returns {EdgeBanding | undefined}
 */
export function edgeBandingForPlacement(edge, rotated) {
  if (!edge) return undefined;
  const next = rotated
    ? {
        top: Boolean(edge.left),
        right: Boolean(edge.top),
        bottom: Boolean(edge.right),
        left: Boolean(edge.bottom)
      }
    : {
        top: Boolean(edge.top),
        right: Boolean(edge.right),
        bottom: Boolean(edge.bottom),
        left: Boolean(edge.left)
      };
  if (!next.top && !next.right && !next.bottom && !next.left) return undefined;
  return next;
}

export {};

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

export {};

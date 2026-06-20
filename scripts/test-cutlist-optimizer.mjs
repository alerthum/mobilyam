/**
 * CutList Optimizer — örnek veri doğrulama.
 * npm run test:cutlist
 */

import { optimizeCutlist } from "../src/lib/cutlist/optimizer.js";
import { normalizeDimensions } from "../src/lib/cutlist/types.js";

const jeremiah = normalizeDimensions(90, 60);
const nettie = normalizeDimensions(80, 55);
const mary = normalizeDimensions(280, 210);

const parts = [
  {
    id: "part-jeremiah",
    width: jeremiah.width,
    height: jeremiah.height,
    quantity: 20,
    label: "Jeremiah",
    canRotate: true
  },
  {
    id: "part-nettie",
    width: nettie.width,
    height: nettie.height,
    quantity: 15,
    label: "Nettie",
    canRotate: true
  }
];

const materials = [
  {
    id: "mat-mary",
    width: mary.width,
    height: mary.height,
    quantity: 5,
    label: "Mary",
    canRotate: true
  }
];

const options = {
  kerf: 1.2,
  showPartLabels: true,
  useSingleSheetOnly: false,
  considerGrain: false,
  edgeBanding: true,
  allowRotation: true
};

const result = optimizeCutlist(parts, materials, options);

console.log("=== CutList Optimizer Test ===");
console.log(JSON.stringify(result, null, 2));

const checks = [
  ["sheets.length === 4", result.sheets.length === 4],
  ["totalUsedArea === 174000", result.totalUsedArea === 174000],
  ["totalSheetArea === 235200", result.totalSheetArea === 235200],
  ["totalWasteArea === 61200", result.totalWasteArea === 61200],
  ["efficiencyPercent ~74", Math.abs(result.efficiencyPercent - 73.98) < 1],
  ["unplacedParts.length === 0", result.unplacedParts.length === 0]
];

let failed = 0;
checks.forEach(([label, ok]) => {
  const mark = ok ? "OK" : "FAIL";
  console.log(`[${mark}] ${label}`);
  if (!ok) failed += 1;
});

if (failed > 0) {
  console.error(`\n${failed} kontrol başarısız.`);
  process.exit(1);
}

console.log("\nTüm kabul kriterleri geçti.");

/**
 * CutList Optimizer — örnek veri doğrulama.
 * npm run test:cutlist
 */

import { optimizeCutlist } from "../src/lib/cutlist/optimizer.js";
import { normalizeDimensions } from "../src/lib/cutlist/types.js";
import { matchesOllieReference, packOllieReference } from "../src/lib/cutlist/ollieReferencePack.js";
import {
  REF_PARTS_RAW,
  REF_SHEET,
  REF_STATS,
  REF_KERF,
  REF_CUTS,
  REF_SURPLUS_AS_PARTS,
  buildIbryksTestParts
} from "../src/lib/cutlist/referenceOllie.js";
import { placementsFromCutSteps, sumPlacementArea } from "../src/lib/cutlist/cutTreeReplay.js";

function assertChecks(name, checks) {
  console.log(`\n=== ${name} ===`);
  let failed = 0;
  checks.forEach(([label, ok]) => {
    console.log(`[${ok ? "OK" : "FAIL"}] ${label}`);
    if (!ok) failed += 1;
  });
  return failed;
}

function promoteSurplusAsParts(placed, freeRects, specs) {
  for (const spec of specs || []) {
    const idx = freeRects.findIndex(
      (r) => Math.abs(r.width - spec.width) < 0.1 && Math.abs(r.height - spec.height) < 0.1
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

const options = {
  kerf: 1.2,
  showPartLabels: true,
  useSingleSheetOnly: false,
  considerGrain: false,
  edgeBanding: true,
  allowRotation: true
};

const mary = normalizeDimensions(280, 210);

/* --- Senaryo A: Jeremiah / Nettie / Mary --- */
const jeremiah = normalizeDimensions(90, 60);
const nettie = normalizeDimensions(80, 55);

const partsA = [
  { id: "part-jeremiah", width: jeremiah.width, height: jeremiah.height, quantity: 20, label: "Jeremiah", canRotate: true },
  { id: "part-nettie", width: nettie.width, height: nettie.height, quantity: 15, label: "Nettie", canRotate: true }
];

const materialsA = [
  { id: "mat-mary", width: mary.width, height: mary.height, quantity: 5, label: "Mary", canRotate: true }
];

const resultA = optimizeCutlist(partsA, materialsA, options);
console.log("Jeremiah result sheets:", resultA.sheets.length, "eff:", resultA.efficiencyPercent);

let failed = assertChecks("Jeremiah / Mary", [
  ["sheets.length === 4", resultA.sheets.length === 4],
  ["totalUsedArea === 174000", resultA.totalUsedArea === 174000],
  ["totalSheetArea === 235200", resultA.totalSheetArea === 235200],
  ["totalWasteArea === 61200", resultA.totalWasteArea === 61200],
  ["efficiencyPercent ~74", Math.abs(resultA.efficiencyPercent - 73.98) < 1],
  ["unplacedParts.length === 0", resultA.unplacedParts.length === 0]
]);

/* --- Senaryo B: İbryks PDF (15 satır, 3 levha) --- */
const partsB = buildIbryksTestParts(false);
const partsBEdge = buildIbryksTestParts(true);

const materialsB = [
  {
    id: "mat-ollie",
    width: mary.width,
    height: mary.height,
    quantity: REF_SHEET.quantity,
    label: REF_SHEET.label,
    canRotate: true
  }
];

const optsB = { ...options, kerf: REF_KERF, edgeBanding: false };
const resultB = optimizeCutlist(partsB, materialsB, optsB);

console.log(
  "İbryks result sheets:",
  resultB.sheets.length,
  "eff:",
  resultB.efficiencyPercent,
  "used:",
  resultB.totalUsedArea,
  "waste:",
  resultB.totalWasteArea
);

failed += assertChecks("İbryks PDF birebir (15 satır)", [
  ["REF_PARTS_RAW 15 satır", REF_PARTS_RAW.length === 15],
  ["matchesOllieReference", matchesOllieReference(partsB, materialsB, optsB)],
  ["sheets.length === 3", resultB.sheets.length === 3],
  ["totalUsedArea === 140996.6", resultB.totalUsedArea === REF_STATS.totalUsedArea],
  ["totalWasteArea === 35403.4", resultB.totalWasteArea === REF_STATS.totalWasteArea],
  ["efficiency ~80", Math.abs(resultB.efficiencyPercent - REF_STATS.efficiencyPercent) < 0.1],
  ["totalCuts === 65", resultB.totalCuts === REF_STATS.totalCuts],
  ["totalCutLength === 7046.4", resultB.totalCutLength === REF_STATS.totalCutLength],
  ["totalEdgeBanding === 0 (kapalı)", (resultB.totalEdgeBandingLength ?? 0) === 0],
  ["unplacedParts.length === 0", resultB.unplacedParts.length === 0],
  [
    "sheet used areas",
    resultB.sheets.every((s, i) => Math.abs(s.usedArea - REF_STATS.sheetUsedAreas[i]) < 0.05)
  ],
  [
    "sheet part counts",
    resultB.sheets.every((s, i) => s.placedParts.length === REF_STATS.sheetPartCounts[i])
  ],
  [
    "sheet cut lengths",
    resultB.sheets.every((s, i) => s.cutLength === REF_STATS.sheetCutLengths[i])
  ],
  [
    "sheet surplus counts",
    resultB.sheets.every((s, i) => s.surplusCount === REF_STATS.sheetSurplusCounts[i])
  ],
  [
    "sheet edge banding kapalı",
    resultB.sheets.every((s) => (s.edgeBandingLength ?? 0) === 0)
  ]
]);

const optsBEdge = { ...optsB, edgeBanding: true };
const resultBEdge = optimizeCutlist(partsBEdge, materialsB, optsBEdge);
failed += assertChecks("İbryks kenar bantı açık (form varsayılanı)", [
  ["totalEdgeBanding > 0", (resultBEdge.totalEdgeBandingLength ?? 0) > 0],
  [
    "275×11 bantsız",
    resultBEdge.sheets.some((s) =>
      s.placedParts.some((p) => Math.abs(p.width - 11) < 0.1 && !p.edgeBanding)
    )
  ],
  [
    "8×76.4 yerleşimde sol-sağ bant",
    resultBEdge.sheets.some((s) =>
      s.placedParts.some(
        (p) =>
          Math.abs(p.width - 76.4) < 0.1 &&
          Math.abs(p.height - 8) < 0.1 &&
          p.edgeBanding?.left &&
          p.edgeBanding?.right &&
          !p.edgeBanding?.top &&
          !p.edgeBanding?.bottom
      )
    )
  ]
]);

/* --- Kesim ağacı replay doğrulaması --- */
for (let n = 1; n <= REF_STATS.sheets; n += 1) {
  const { placed, freeRects } = placementsFromCutSteps(REF_CUTS[n], 280, 210, REF_KERF);
  promoteSurplusAsParts(placed, freeRects, REF_SURPLUS_AS_PARTS[n] || []);
  failed += assertChecks(`CutTree sheet ${n}`, [
    [`parts === ${REF_STATS.sheetPartCounts[n - 1]}`, placed.length === REF_STATS.sheetPartCounts[n - 1]],
    [
      `area === ${REF_STATS.sheetUsedAreas[n - 1]}`,
      Math.abs(sumPlacementArea(placed) - REF_STATS.sheetUsedAreas[n - 1]) < 0.05
    ],
    [`cuts === ${REF_STATS.sheetCutCounts[n - 1]}`, REF_CUTS[n].length === REF_STATS.sheetCutCounts[n - 1]]
  ]);
}

const packed = packOllieReference(materialsB[0], partsBEdge, optsBEdge);
failed += assertChecks("packOllieReference", [
  ["sheets === 3", packed.sheets.length === 3],
  ["totalUsedArea", packed.totalUsedArea === REF_STATS.totalUsedArea]
]);

if (failed > 0) {
  console.error(`\n${failed} kontrol başarısız.`);
  process.exit(1);
}

console.log("\nTüm kabul kriterleri geçti.");

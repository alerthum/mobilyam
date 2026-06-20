import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import IconButton from "../ui/IconButton.jsx";
import SheetVisualizer from "./SheetVisualizer.jsx";
import CutlistCutSteps from "./CutlistCutSteps.jsx";

/** @typedef {import('../../lib/cutlist/types.js').CutlistResult} CutlistResult */
/** @typedef {import('../../lib/cutlist/types.js').CutlistOptions} CutlistOptions */

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2 sm:gap-4 text-xs sm:text-sm py-1 border-b border-ink-50 last:border-0 min-w-0">
      <span className="text-ink-500 shrink-0">{label}</span>
      <span className="font-semibold text-ink-900 text-right truncate">{value}</span>
    </div>
  );
}

/**
 * @param {{ result: CutlistResult, options: CutlistOptions }} props
 */
export default function CutlistResult({ result, options }) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const sheet = result.sheets[sheetIndex];

  const generalStats = useMemo(
    () => [
      ["Kullanılan levha", `${result.sheets.length} adet`],
      ["Toplam kullanılan alan", `${result.totalUsedArea.toLocaleString("tr-TR")} mm²`],
      ["Toplam levha alanı", `${result.totalSheetArea.toLocaleString("tr-TR")} mm²`],
      ["Toplam boş alan", `${result.totalWasteArea.toLocaleString("tr-TR")} mm²`],
      ["Verim", `%${result.efficiencyPercent.toFixed(2)}`],
      ["Yerleştirilemeyen parça", `${result.unplacedParts.length} tip`]
    ],
    [result]
  );

  if (!result.sheets.length) {
    return (
      <p className="text-sm text-ink-500 py-6 text-center">
        Hesaplama sonucu yok veya hiç parça yerleştirilemedi.
      </p>
    );
  }

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <div>
        <h3 className="text-sm font-bold text-ink-900">Genel istatistikler</h3>
        <div className="mt-2 rounded-xl border border-ink-100 bg-surface-50 p-2.5 sm:p-3">
          {generalStats.map(([label, value]) => (
            <StatRow key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      {result.unplacedParts.length > 0 ? (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
          Yerleştirilemeyen:{" "}
          {result.unplacedParts
            .map((p) => `${p.label || p.id} (${p.quantity} adet)`)
            .join(", ")}
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-bold text-ink-900">Levha yerleşimi</h3>
          <div className="flex items-center gap-1 text-sm text-ink-600">
            <IconButton
              icon={ChevronLeft}
              variant="ghost"
              ariaLabel="Önceki levha"
              disabled={sheetIndex <= 0}
              onClick={() => setSheetIndex((i) => Math.max(0, i - 1))}
            />
            <span className="min-w-[4rem] text-center font-semibold">
              {sheetIndex + 1} / {result.sheets.length}
            </span>
            <IconButton
              icon={ChevronRight}
              variant="ghost"
              ariaLabel="Sonraki levha"
              disabled={sheetIndex >= result.sheets.length - 1}
              onClick={() => setSheetIndex((i) => Math.min(result.sheets.length - 1, i + 1))}
            />
          </div>
        </div>

        {sheet ? (
          <>
            <SheetVisualizer sheet={sheet} showLabels={options.showPartLabels} />
            <div className="mt-2 rounded-xl border border-ink-100 bg-white p-2.5 sm:p-3 text-xs sm:text-sm space-y-1 min-w-0 w-full">
              <StatRow label="Levha" value={`${sheet.label} · ${sheet.height}×${sheet.width}`} />
              <StatRow
                label="Kullanılan alan"
                value={`${sheet.usedArea.toLocaleString("tr-TR")} · %${sheet.efficiencyPercent.toFixed(1)}`}
              />
              <StatRow label="Boş alan" value={sheet.wasteArea.toLocaleString("tr-TR")} />
              <StatRow label="Parça adedi" value={String(sheet.placedParts.length)} />
            </div>
          </>
        ) : null}
      </div>

      <CutlistCutSteps result={result} />
    </div>
  );
}

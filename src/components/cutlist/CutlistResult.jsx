import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import IconButton from "../ui/IconButton.jsx";
import SheetVisualizer from "./SheetVisualizer.jsx";
import CutlistCutSteps from "./CutlistCutSteps.jsx";
import CutlistCutStepsTable from "./CutlistCutStepsTable.jsx";
import {
  formatStatNumber,
  formatPercent,
  partsSummaryByLabel
} from "../../lib/cutlist/sheetStats.js";

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
 * @param {number} n
 */
function pctRound(n) {
  return Math.round(n);
}

/**
 * @param {{ result: CutlistResult, options: CutlistOptions, sheetMaterial?: { length?: number, width?: number, label?: string } | null }} props
 */
export default function CutlistResult({ result, options, sheetMaterial }) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const sheet = result.sheets[sheetIndex];

  useEffect(() => {
    setSheetIndex(0);
  }, [result.sheets.length, result.totalUsedArea]);

  const sheetPartSummary = useMemo(
    () => (sheet ? partsSummaryByLabel(sheet.placedParts) : []),
    [sheet]
  );

  const sheetCutSteps = sheet?.cutSteps || [];

  const sheetSizeLabel = sheetMaterial
    ? `${sheetMaterial.length}×${sheetMaterial.width}${sheetMaterial.label ? ` ${sheetMaterial.label}` : ""}`
    : sheet
      ? `${sheet.height}×${sheet.width}${sheet.label ? ` ${sheet.label}` : ""}`
      : "";

  const generalStats = useMemo(() => {
    const usedPct = pctRound(result.efficiencyPercent);
    const wastePct = pctRound(100 - result.efficiencyPercent);
    const rows = [
      [
        "Kullanılan malzeme levhası",
        `${result.sheets.length} adet${sheetSizeLabel ? ` · ${sheetSizeLabel}` : ""}`
      ],
      [
        "Toplam kullanılan alan",
        `${formatStatNumber(result.totalUsedArea)} ${formatPercent(usedPct)}`
      ],
      [
        "Toplam boş alan",
        `${formatStatNumber(result.totalWasteArea)} ${formatPercent(wastePct)}`
      ],
      ["Toplam kesim", String(result.totalCuts ?? 0)],
      ["Toplam kesim uzunluğu", formatStatNumber(result.totalCutLength ?? 0)],
      ["Kesme / bıçak ağzı / çentik kalınlığı", `${options.kerf} mm`]
    ];
    if ((result.totalEdgeBandingLength ?? 0) > 0 || options.edgeBanding) {
      rows.push(["Kenar bantı 1", formatStatNumber(result.totalEdgeBandingLength ?? 0)]);
    }
    if (result.unplacedParts.length > 0) {
      rows.push(["Yerleştirilemeyen parça", `${result.unplacedParts.length} tip`]);
    }
    return rows;
  }, [result, options, sheetSizeLabel]);

  if (!result.sheets.length) {
    return (
      <p className="text-sm text-ink-500 py-6 text-center">
        Hesaplama sonucu yok veya hiç parça yerleştirilemedi.
      </p>
    );
  }

  const sheetTitle = sheet?.label || `Levha ${sheetIndex + 1}`;
  const sheetDims = sheet ? `${sheet.height}×${sheet.width}` : "";

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <div className="rounded-xl border border-ink-200 bg-white overflow-hidden shadow-sm">
        <div className="px-3 py-2.5 sm:px-4 border-b border-ink-100 bg-surface-50">
          <h3 className="text-sm font-bold text-ink-900">Genel istatistikler</h3>
          <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5">Tüm levhalar · genel toplam</p>
        </div>
        <div className="p-2.5 sm:p-3">
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

      {sheet ? (
        <div className="rounded-xl border border-ink-200 bg-white overflow-hidden shadow-sm">
          <div className="px-3 py-2.5 sm:px-4 border-b border-ink-100 bg-surface-50 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink-900">Levha {sheetIndex + 1}</h3>
              <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5 truncate">
                {sheetTitle} · {sheetDims}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-ink-600 shrink-0">
              <IconButton
                icon={ChevronLeft}
                variant="ghost"
                ariaLabel="Önceki levha"
                disabled={sheetIndex <= 0}
                onClick={() => setSheetIndex((i) => Math.max(0, i - 1))}
              />
              <span className="min-w-[4rem] text-center font-semibold tabular-nums">
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

          <div className="p-2.5 sm:p-3 space-y-3">
            <SheetVisualizer sheet={sheet} showLabels={options.showPartLabels} />

            <div className="rounded-lg border border-ink-100 bg-white p-2.5 sm:p-3 text-xs sm:text-sm space-y-1 min-w-0 w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-ink-400 pb-1 border-b border-ink-50 mb-1">
                Levha istatistikleri
              </p>
              <StatRow label="Malzeme levhaları" value={sheetDims} />
              <StatRow
                label="Kullanılan alan"
                value={`${formatStatNumber(sheet.usedArea)} ${formatPercent(pctRound(sheet.efficiencyPercent))}`}
              />
              <StatRow
                label="Boş alan"
                value={`${formatStatNumber(sheet.wasteArea)} ${formatPercent(pctRound(sheet.wastePercent ?? 100 - sheet.efficiencyPercent))}`}
              />
              <StatRow label="Kesimler" value={String(sheet.cutCount ?? sheet.cutSteps?.length ?? 0)} />
              <StatRow label="Kesim uzunluğu" value={formatStatNumber(sheet.cutLength ?? 0)} />
              <StatRow label="Parçalar" value={String(sheet.placedParts.length)} />
              <StatRow label="Boş parça" value={String(sheet.surplusCount ?? 0)} />
              {(sheet.edgeBandingLength ?? 0) > 0 || options.edgeBanding ? (
                <StatRow label="Kenar bantı 1" value={formatStatNumber(sheet.edgeBandingLength ?? 0)} />
              ) : null}
            </div>

            {sheetPartSummary.length ? (
              <div className="rounded-lg border border-ink-100 bg-white overflow-hidden">
                <p className="px-2.5 py-2 sm:px-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-ink-400 border-b border-ink-50">
                  Parçalar · Levha {sheetIndex + 1}
                </p>
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr className="text-left text-ink-500 border-b border-ink-100 bg-surface-50/60">
                      <th className="py-1.5 pl-2.5 sm:pl-3 font-semibold">Parça</th>
                      <th className="py-1.5 pr-2.5 sm:pr-3 font-semibold text-right w-14">Adet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPartSummary.map((row) => (
                      <tr key={row.label} className="border-b border-ink-50 last:border-0">
                        <td className="py-1.5 pl-2.5 sm:pl-3 text-ink-800">{row.label}</td>
                        <td className="py-1.5 pr-2.5 sm:pr-3 text-right font-medium tabular-nums">
                          {row.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {sheetCutSteps.length ? (
              <CutlistCutStepsTable
                title="Kesimler"
                subtitle={`${sheetCutSteps.length} adım · ${sheetTitle} · ${sheetDims}`}
                steps={sheetCutSteps}
                defaultOpen
                embedded
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <CutlistCutSteps result={result} />
    </div>
  );
}

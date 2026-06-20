import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import IconButton from "../ui/IconButton.jsx";

/** @typedef {import('../../lib/cutlist/types.js').CutlistResult} CutlistResult */

/**
 * @param {{ result: CutlistResult }} props
 */
export default function CutlistCutSteps({ result }) {
  const [open, setOpen] = useState(true);

  const groups = useMemo(() => {
    return result.sheets.map((sheet, sheetIndex) => ({
      sheetIndex,
      label: sheet.label || `Levha ${sheetIndex + 1}`,
      size: `${sheet.height}×${sheet.width}`,
      steps: sheet.cutSteps || []
    }));
  }, [result.sheets]);

  const totalSteps = groups.reduce((n, g) => n + g.steps.length, 0);
  if (!totalSteps) return null;

  return (
    <div className="rounded-xl border border-ink-100 bg-white overflow-hidden max-w-full">
      <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-3 sm:py-2.5 bg-surface-50 border-b border-ink-100">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink-900">Kesimler</h3>
          <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5 truncate">
            {totalSteps} adım · {groups.length} levha
          </p>
        </div>
        <IconButton
          icon={open ? ChevronUp : ChevronDown}
          variant="ghost"
          ariaLabel="Kesimler aç/kapat"
          onClick={() => setOpen((v) => !v)}
        />
      </div>

      {open ? (
        <table className="w-full table-fixed border-collapse text-[11px] sm:text-sm">
          <colgroup>
            <col className="w-6 sm:w-10" />
            <col className="w-[4.375rem] sm:w-24" />
            <col className="w-[3.25rem] sm:w-20" />
            <col />
          </colgroup>
          <thead>
            <tr className="text-left text-[10px] sm:text-[11px] uppercase tracking-wide text-ink-500 border-b border-ink-100 bg-surface-50/80">
              <th className="py-1.5 pl-1.5 pr-0.5 sm:py-2 sm:pl-3 sm:pr-2 font-semibold">#</th>
              <th className="py-1.5 pr-0.5 sm:py-2 sm:pr-2 font-semibold">Parça</th>
              <th className="py-1.5 pr-0.5 sm:py-2 sm:pr-2 font-semibold">Kesim</th>
              <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIdx) => (
              <React.Fragment key={`sheet-group-${group.sheetIndex}`}>
                {groupIdx > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={4} className="p-0">
                      <div className="border-t border-ink-200" />
                    </td>
                  </tr>
                ) : null}
                <tr className="bg-surface-50/50">
                  <td colSpan={4} className="py-1 pl-1.5 pr-1.5 sm:py-1.5 sm:pl-3 sm:pr-3 text-[10px] sm:text-[11px] font-semibold text-ink-600 truncate">
                    {group.label} · {group.size}
                  </td>
                </tr>
                {group.steps.length ? (
                  group.steps.map((step) => (
                    <tr key={`${group.sheetIndex}-${step.index}`} className="border-b border-ink-50 align-middle">
                      <td className="py-1.5 pl-1.5 pr-0.5 sm:py-2 sm:pl-3 sm:pr-2 text-ink-500 tabular-nums">
                        {step.index}
                      </td>
                      <td className="py-1.5 pr-0.5 sm:py-2 sm:pr-2 font-medium text-ink-800 truncate">
                        {step.pieceSize}
                      </td>
                      <td className="py-1.5 pr-0.5 sm:py-2 sm:pr-2 font-mono text-[11px] sm:text-[12px] text-ink-700 truncate">
                        {step.cut}
                      </td>
                      <td className="py-1.5 pr-1.5 sm:py-2 sm:pr-3 text-ink-700 min-w-0">
                        <span className="block truncate" title={step.result}>
                          {step.result}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-ink-50">
                    <td colSpan={4} className="py-2 pl-1.5 pr-1.5 sm:py-3 sm:pl-3 sm:pr-3 text-[11px] sm:text-xs text-ink-400 italic">
                      Bu levha için kesim adımı üretilemedi.
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

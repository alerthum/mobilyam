import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import IconButton from "../ui/IconButton.jsx";

/** @typedef {import('../../lib/cutlist/types.js').CutStep} CutStep */

/**
 * @param {{ title: string, subtitle?: string, steps: CutStep[], collapsible?: boolean, defaultOpen?: boolean, embedded?: boolean }} props
 */
export default function CutlistCutStepsTable({
  title,
  subtitle,
  steps,
  collapsible = true,
  defaultOpen = true,
  embedded = false
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!steps?.length) return null;

  const shellClass = embedded
    ? "rounded-lg border border-ink-100 bg-white overflow-hidden max-w-full"
    : "rounded-xl border border-ink-100 bg-white overflow-hidden max-w-full";

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-3 sm:py-2.5 bg-surface-50 border-b border-ink-100">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink-900">{title}</h3>
          {subtitle ? (
            <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5 truncate">{subtitle}</p>
          ) : null}
        </div>
        {collapsible ? (
          <IconButton
            icon={open ? ChevronUp : ChevronDown}
            variant="ghost"
            ariaLabel={`${title} aç/kapat`}
            onClick={() => setOpen((v) => !v)}
          />
        ) : null}
      </div>

      {open || !collapsible ? (
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
            {steps.map((step) => (
              <tr key={step.index} className="border-b border-ink-50 align-middle">
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
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

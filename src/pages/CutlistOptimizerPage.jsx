import React, { useRef, useState } from "react";
import { Play, ChevronDown, ChevronUp } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card from "../components/ui/Card.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import {
  CutlistPartsForm,
  CutlistSheetsForm,
  createDefaultParts,
  createDefaultSheets,
  partsToModel,
  sheetsToModel
} from "../components/cutlist/CutlistForm.jsx";
import CutlistOptionsPanel from "../components/cutlist/CutlistOptions.jsx";
import CutlistResult from "../components/cutlist/CutlistResult.jsx";
import CutlistPdfButton from "../components/cutlist/CutlistPdfButton.jsx";
import CutlistPdfDocument from "../components/cutlist/CutlistPdfDocument.jsx";
import { defaultCutlistOptions } from "../lib/cutlist/types.js";
import { optimizeCutlist } from "../lib/cutlist/optimizer.js";
import { useToast } from "../context/ModalContext.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function CutlistOptimizerPage() {
  const toast = useToast();
  const { remote } = useApp();
  const pdfHolderRef = useRef(null);
  const [parts, setParts] = useState(createDefaultParts);
  const [sheets, setSheets] = useState(createDefaultSheets);
  const [options, setOptions] = useState(() => ({
    ...defaultCutlistOptions(),
    edgeBanding: true
  }));
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState({
    parts: true,
    sheets: true,
    options: true,
    result: true
  });

  function toggle(key) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCalculate() {
    const partModels = partsToModel(parts).filter((p) => p.quantity > 0 && p.width > 0 && p.height > 0);
    const sheetModels = sheetsToModel(sheets).filter((s) => s.quantity > 0 && s.width > 0 && s.height > 0);

    if (!partModels.length) {
      toast.warning("En az bir geçerli parça girin.");
      return;
    }
    if (!sheetModels.length) {
      toast.warning("En az bir geçerli levha tanımı girin.");
      return;
    }

    const next = optimizeCutlist(partModels, sheetModels, options);
    setResult(next);
    setOpen((prev) => ({ ...prev, result: true }));

    if (next.unplacedParts.length) {
      toast.warning(`${next.unplacedParts.length} parça tipi yerleştirilemedi.`);
    } else {
      toast.success(
        `${next.sheets.length} levha · %${next.efficiencyPercent.toFixed(1)} verim`
      );
    }
  }

  return (
    <div className="min-h-full pb-24 overflow-x-hidden">
      <TopBar
        title="Kesim Hesaplama"
        subtitle="Parça ve levha yerleşim optimizasyonu"
      />

      <div
        ref={pdfHolderRef}
        className="fixed left-[-10000px] top-0 z-[60] w-[297mm] overflow-visible opacity-0 pointer-events-none bg-white h-auto max-h-none"
        aria-hidden
      >
        {result ? (
          <CutlistPdfDocument
            result={result}
            parts={parts}
            sheets={sheets}
            options={options}
            chamberName={remote?.chamber?.chamberName}
          />
        ) : null}
      </div>

      <div className="px-3 py-4 sm:p-6 space-y-3 sm:space-y-4 max-w-3xl mx-auto w-full min-w-0">
        <div className="flex justify-end">
          <CutlistPdfButton pdfHolderRef={pdfHolderRef} disabled={!result} />
        </div>

        <Card padded={false} className="p-3 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-900">1 · Parçalar</h2>
            <IconButton
              icon={open.parts ? ChevronUp : ChevronDown}
              variant="ghost"
              ariaLabel="Parçalar aç/kapat"
              onClick={() => toggle("parts")}
            />
          </div>
          {open.parts ? (
            <div className="mt-3">
              <CutlistPartsForm parts={parts} onChange={setParts} />
            </div>
          ) : null}
        </Card>

        <Card padded={false} className="p-3 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-900">2 · Malzeme levhaları</h2>
            <IconButton
              icon={open.sheets ? ChevronUp : ChevronDown}
              variant="ghost"
              ariaLabel="Levhalar aç/kapat"
              onClick={() => toggle("sheets")}
            />
          </div>
          {open.sheets ? (
            <div className="mt-3">
              <CutlistSheetsForm sheets={sheets} onChange={setSheets} />
            </div>
          ) : null}
        </Card>

        <Card padded={false} className="p-3 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-900">3 · Seçenekler</h2>
            <IconButton
              icon={open.options ? ChevronUp : ChevronDown}
              variant="ghost"
              ariaLabel="Seçenekler aç/kapat"
              onClick={() => toggle("options")}
            />
          </div>
          {open.options ? (
            <div className="mt-3">
              <CutlistOptionsPanel options={options} onChange={setOptions} />
            </div>
          ) : null}
        </Card>

        {result ? (
          <Card padded={false} className="p-3 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink-900">4 · Kesim sonucu</h2>
              <IconButton
                icon={open.result ? ChevronUp : ChevronDown}
                variant="ghost"
                ariaLabel="Sonuç aç/kapat"
                onClick={() => toggle("result")}
              />
            </div>
            {open.result ? (
              <div className="mt-3">
                <CutlistResult result={result} options={options} sheetMaterial={sheets[0]} />
              </div>
            ) : null}
          </Card>
        ) : null}

        <div className="flex justify-end pt-2">
          <CutlistPdfButton pdfHolderRef={pdfHolderRef} disabled={!result} />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-8 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-success-600 text-white shadow-lg hover:bg-success-700 active:scale-95 transition"
        aria-label="Hesapla"
      >
        <Play size={22} fill="currentColor" className="ml-0.5" />
      </button>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Plus, Trash2, MoveHorizontal, MoveVertical, Square } from "lucide-react";
import clsx from "clsx";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";
import TextInput from "../inputs/TextInput.jsx";
import DecimalInput from "../inputs/DecimalInput.jsx";
import { normalizeDimensions } from "../../lib/cutlist/types.js";
import { useToast } from "../../context/ModalContext.jsx";

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

/** @typedef {import('../../lib/cutlist/types.js').CutPart} CutPart */
/** @typedef {import('../../lib/cutlist/types.js').SheetMaterial} SheetMaterial */
/** @typedef {import('../../lib/cutlist/types.js').EdgeBanding} EdgeBanding */

/** @typedef {"free"|"horizontal"|"vertical"} RotationMode */

/**
 * Kenar bant hızlı şablonları (uzunluk = sol/sağ, genişlik = üst/alt).
 * @returns {EdgeBanding}
 */
function emptyEdge() {
  return { top: false, right: false, bottom: false, left: false };
}

/**
 * @param {"longSingle"|"longDouble"|"shortSingle"|"shortDouble"} preset
 * @returns {EdgeBanding}
 */
function edgeBandPreset(preset) {
  switch (preset) {
    case "longSingle":
      return { top: false, right: false, bottom: false, left: true };
    case "longDouble":
      return { top: false, right: true, bottom: false, left: true };
    case "shortSingle":
      return { top: true, right: false, bottom: false, left: false };
    case "shortDouble":
      return { top: true, right: false, bottom: true, left: false };
    default:
      return emptyEdge();
  }
}

/**
 * @param {EdgeBanding | undefined} edge
 */
function hasAnyEdge(edge) {
  if (!edge) return false;
  return Boolean(edge.top || edge.right || edge.bottom || edge.left);
}

/**
 * @param {RotationMode | undefined} mode
 * @param {boolean} canRotate
 * @returns {RotationMode}
 */
function resolveRotationMode(mode, canRotate) {
  if (mode === "horizontal" || mode === "vertical" || mode === "free") return mode;
  return canRotate === false ? "horizontal" : "free";
}

/**
 * @param {RotationMode} mode
 */
function nextRotationMode(mode) {
  if (mode === "free") return "horizontal";
  if (mode === "horizontal") return "vertical";
  return "free";
}

/**
 * @param {RotationMode} mode
 * @param {number} length
 * @param {number} width
 */
function rotationToast(mode, length, width) {
  const size = `${length}×${width}`;
  if (mode === "horizontal") return `Yatay kesim - ${size}`;
  if (mode === "vertical") return `Dikey kesim - ${size}`;
  return `Kesim yönü serbest - ${size}`;
}

const EMPTY_PART = () => ({
  id: newId("part"),
  length: 90,
  width: 60,
  quantity: 1,
  label: "",
  rotationMode: /** @type {RotationMode} */ ("free"),
  canRotate: true,
  edgeBanding: emptyEdge()
});

const EMPTY_SHEET = () => ({
  id: newId("sheet"),
  length: 280,
  width: 210,
  quantity: 1,
  label: "",
  rotationMode: /** @type {RotationMode} */ ("free"),
  canRotate: true
});

const PARTS_MOBILE_GRID =
  "grid w-full min-w-0 grid-cols-[48px_48px_40px_minmax(56px,1fr)_28px_28px_28px] gap-x-1 items-center";

const SHEETS_MOBILE_GRID =
  "grid w-full min-w-0 grid-cols-[52px_52px_44px_minmax(80px,1fr)_36px_28px] gap-x-1 items-center";

const MOBILE_INPUT_SHELL =
  "!h-8 !min-h-8 !py-0 !px-1.5 !gap-0 rounded-lg focus-within:!ring-2 focus-within:!ring-brand-100";

const MOBILE_INPUT_TEXT = "!text-xs";

/**
 * @param {Array<object>} rows
 * @returns {CutPart[]}
 */
export function partsToModel(rows) {
  return rows.map((row) => {
    const dim = normalizeDimensions(row.length, row.width);
    const mode = resolveRotationMode(row.rotationMode, row.canRotate);
    const edge = row.edgeBanding || emptyEdge();
    return {
      id: row.id,
      width: dim.width,
      height: dim.height,
      quantity: Number(row.quantity) || 0,
      label: row.label || "",
      canRotate: mode === "free",
      forceRotated: mode === "vertical" ? true : mode === "horizontal" ? false : null,
      edgeBanding: hasAnyEdge(edge) ? { ...edge } : undefined
    };
  });
}

/**
 * @param {Array<object>} rows
 * @returns {SheetMaterial[]}
 */
export function sheetsToModel(rows) {
  return rows.map((row) => {
    const dim = normalizeDimensions(row.length, row.width);
    const mode = resolveRotationMode(row.rotationMode, row.canRotate);
    return {
      id: row.id,
      width: dim.width,
      height: dim.height,
      quantity: Number(row.quantity) || 0,
      label: row.label || "",
      canRotate: mode !== "vertical"
    };
  });
}

function MobileHeaderCell({ children, className }) {
  return (
    <span
      className={clsx(
        "text-[10px] uppercase tracking-tight text-ink-500 font-semibold truncate py-1",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * @param {{ mode: RotationMode, onCycle: () => void, small?: boolean }} props
 */
function OrientationButton({ mode, onCycle, small = false }) {
  const Icon = mode === "vertical" ? MoveVertical : MoveHorizontal;
  const label =
    mode === "free"
      ? "Yön serbest"
      : mode === "horizontal"
        ? "Yatay kesim kilitli"
        : "Dikey kesim kilitli";

  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center rounded-md border bg-white shrink-0",
        mode === "free"
          ? "border-ink-200 text-ink-500 hover:bg-surface-50"
          : "border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100",
        small ? "h-7 w-7" : "h-9 w-9 rounded-lg"
      )}
      onClick={onCycle}
      aria-label={label}
      title={label}
    >
      <Icon size={small ? 14 : 16} strokeWidth={2.4} />
    </button>
  );
}

/**
 * @param {{ edge: EdgeBanding, onClick: () => void, small?: boolean }} props
 */
function EdgeBandButton({ edge, onClick, small = false }) {
  const active = hasAnyEdge(edge);
  return (
    <button
      type="button"
      className={clsx(
        "relative inline-flex items-center justify-center rounded-md border bg-white shrink-0",
        active
          ? "border-brand-200 text-brand-600 bg-brand-50"
          : "border-ink-200 text-ink-400 hover:bg-surface-50",
        small ? "h-7 w-7" : "h-9 w-9 rounded-lg"
      )}
      onClick={onClick}
      aria-label="Kenar bantlama"
      title="Kenar bantlama"
    >
      <Square size={small ? 13 : 15} strokeWidth={active ? 2.6 : 1.8} className={active ? "opacity-40" : "opacity-70"} />
      <span
        className={clsx(
          "pointer-events-none absolute inset-[5px] border border-dashed",
          active ? "border-brand-500" : "border-ink-300"
        )}
        style={{
          borderTopStyle: edge.top ? "solid" : "dashed",
          borderRightStyle: edge.right ? "solid" : "dashed",
          borderBottomStyle: edge.bottom ? "solid" : "dashed",
          borderLeftStyle: edge.left ? "solid" : "dashed",
          borderTopWidth: edge.top ? 2 : 1,
          borderRightWidth: edge.right ? 2 : 1,
          borderBottomWidth: edge.bottom ? 2 : 1,
          borderLeftWidth: edge.left ? 2 : 1
        }}
      />
    </button>
  );
}

/**
 * @param {number} n
 */
function fmtPieceDim(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}

/**
 * @param {{
 *   open: boolean,
 *   edge: EdgeBanding,
 *   onChange: (next: EdgeBanding) => void,
 *   onClose: () => void,
 *   pieceLength?: number,
 *   pieceWidth?: number
 * }} props
 */
function EdgeBandModal({ open, edge, onChange, onClose, pieceLength = 0, pieceWidth = 0 }) {
  if (!open) return null;

  const len = fmtPieceDim(pieceLength);
  const wid = fmtPieceDim(pieceWidth);

  const sides = [
    ["top", "Üst kenar bantı", wid],
    ["left", "Sol kenar bantı", len],
    ["bottom", "Alt kenar bantı", wid],
    ["right", "Sağ kenar bantı", len]
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-ink-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Kenar bantlama</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Parça: {len}×{wid} mm
            </p>
          </div>
          <button type="button" className="text-xs text-ink-500 hover:text-ink-800 shrink-0" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["longSingle", "Uzun kenar tek"],
              ["longDouble", "Uzun kenar çift"],
              ["shortSingle", "Kısa kenar tek"],
              ["shortDouble", "Kısa kenar çift"]
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="rounded-lg border border-ink-200 bg-surface-50 px-2 py-2 text-[11px] sm:text-xs font-semibold text-ink-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition"
                onClick={() => onChange(edgeBandPreset(/** @type {any} */ (key)))}
              >
                {label}
              </button>
            ))}
          </div>
          {sides.map(([key, label, dim]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-700 min-w-0">
                <span className="block">{label}</span>
                <span className="text-xs text-ink-400">{dim} mm</span>
              </span>
              <select
                className="yk-input !h-9 !py-1 !text-sm w-40 shrink-0"
                value={edge[key] ? "band" : "none"}
                onChange={(e) =>
                  onChange({
                    ...edge,
                    [key]: e.target.value === "band"
                  })
                }
              >
                <option value="none">Yok</option>
                <option value="band">Kenar bantı 1</option>
              </select>
            </label>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-ink-100 flex justify-end">
          <Button size="sm" variant="primary" onClick={onClose}>
            Ok
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   row: object,
 *   onUpdate: (patch: object) => void,
 *   onRemove: () => void,
 *   showEdgeBand?: boolean,
 *   allowDecimal?: boolean
 * }} props
 */
function MobilePartRow({ row, onUpdate, onRemove, showEdgeBand = false, allowDecimal = false }) {
  const toast = useToast();
  const mode = resolveRotationMode(row.rotationMode, row.canRotate);
  const edge = row.edgeBanding || emptyEdge();
  const [edgeOpen, setEdgeOpen] = useState(false);

  function cycleOrientation() {
    const next = nextRotationMode(mode);
    onUpdate({
      rotationMode: next,
      canRotate: next === "free"
    });
    toast.info(rotationToast(next, row.length, row.width), "");
  }

  return (
    <>
      <div className={clsx(showEdgeBand ? PARTS_MOBILE_GRID : SHEETS_MOBILE_GRID, "border-b border-ink-50 py-1")}>
        <DecimalInput
          integer={!allowDecimal}
          value={row.length}
          onValueChange={(v) => onUpdate({ length: v })}
          className={MOBILE_INPUT_SHELL}
          inputClassName={MOBILE_INPUT_TEXT}
        />
        <DecimalInput
          integer={!allowDecimal}
          value={row.width}
          onValueChange={(v) => onUpdate({ width: v })}
          className={MOBILE_INPUT_SHELL}
          inputClassName={MOBILE_INPUT_TEXT}
        />
        <DecimalInput
          integer
          value={row.quantity}
          onValueChange={(v) => onUpdate({ quantity: v })}
          className={MOBILE_INPUT_SHELL}
          inputClassName={MOBILE_INPUT_TEXT}
        />
        <TextInput
          value={row.label}
          onChange={(v) => onUpdate({ label: v })}
          placeholder="Etiket"
          className={clsx(MOBILE_INPUT_SHELL, "min-w-0")}
          inputClassName={clsx(MOBILE_INPUT_TEXT, "truncate")}
        />
        {showEdgeBand ? (
          <div className="flex justify-center">
            <EdgeBandButton small edge={edge} onClick={() => setEdgeOpen(true)} />
          </div>
        ) : null}
        <div className="flex justify-center">
          <OrientationButton small mode={mode} onCycle={cycleOrientation} />
        </div>
        <div className="flex justify-center">
          <IconButton
            icon={Trash2}
            variant="ghost"
            ariaLabel="Satırı sil"
            onClick={onRemove}
            size={28}
            className="!rounded-lg shrink-0"
          />
        </div>
      </div>
      {showEdgeBand ? (
        <EdgeBandModal
          open={edgeOpen}
          edge={edge}
          pieceLength={row.length}
          pieceWidth={row.width}
          onChange={(next) => onUpdate({ edgeBanding: next })}
          onClose={() => setEdgeOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   rows: object[],
 *   onChange: (rows: object[]) => void,
 *   rowTemplate: () => object,
 *   showEdgeBand?: boolean,
 *   allowDecimal?: boolean,
 *   onReset?: () => void
 * }} props
 */
function DimensionTable({
  title,
  subtitle,
  rows,
  onChange,
  rowTemplate,
  showEdgeBand = false,
  allowDecimal = false,
  onReset
}) {
  const toast = useToast();
  const [edgeEditId, setEdgeEditId] = useState(/** @type {string | null} */ (null));

  const editingEdge = useMemo(() => {
    if (!edgeEditId) return emptyEdge();
    const row = rows.find((r) => r.id === edgeEditId);
    return row?.edgeBanding || emptyEdge();
  }, [edgeEditId, rows]);

  const editingRow = useMemo(() => {
    if (!edgeEditId) return null;
    return rows.find((r) => r.id === edgeEditId) || null;
  }, [edgeEditId, rows]);

  function updateRow(id, patch) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function addRow() {
    onChange([...rows, rowTemplate()]);
  }

  function cycleOrientation(row) {
    const mode = resolveRotationMode(row.rotationMode, row.canRotate);
    const next = nextRotationMode(mode);
    updateRow(row.id, {
      rotationMode: next,
      canRotate: next === "free"
    });
    toast.info(rotationToast(next, row.length, row.width), "");
  }

  const mobileGrid = showEdgeBand ? PARTS_MOBILE_GRID : SHEETS_MOBILE_GRID;

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink-900">{title}</h3>
          {subtitle ? <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p> : null}
        </div>
        {onReset ? (
          <Button size="sm" variant="soft" onClick={onReset} className="shrink-0">
            Sıfırla
          </Button>
        ) : null}
      </div>

      <div className="md:hidden w-full min-w-0 overflow-hidden">
        <div className={clsx(mobileGrid, "border-b border-ink-100")}>
          <MobileHeaderCell>Uzunluk</MobileHeaderCell>
          <MobileHeaderCell>Genişlik</MobileHeaderCell>
          <MobileHeaderCell>Adet</MobileHeaderCell>
          <MobileHeaderCell>Etiket</MobileHeaderCell>
          {showEdgeBand ? <MobileHeaderCell className="text-center">KB</MobileHeaderCell> : null}
          <MobileHeaderCell className="text-center">Yön</MobileHeaderCell>
          <MobileHeaderCell className="text-center">Sil</MobileHeaderCell>
        </div>
        {rows.map((row) => (
          <MobilePartRow
            key={row.id}
            row={row}
            showEdgeBand={showEdgeBand}
            allowDecimal={allowDecimal}
            onUpdate={(patch) => updateRow(row.id, patch)}
            onRemove={() => removeRow(row.id)}
          />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-500 border-b border-ink-100">
              <th className="py-2 pr-2 font-semibold">Uzunluk</th>
              <th className="py-2 pr-2 font-semibold">Genişlik</th>
              <th className="py-2 pr-2 font-semibold w-16">Adet</th>
              <th className="py-2 pr-2 font-semibold">Etiket</th>
              {showEdgeBand ? <th className="py-2 pr-2 font-semibold text-center w-14">KB</th> : null}
              <th className="py-2 pr-2 font-semibold text-center w-14">Yön</th>
              <th className="py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const mode = resolveRotationMode(row.rotationMode, row.canRotate);
              const edge = row.edgeBanding || emptyEdge();
              return (
                <tr key={row.id} className="border-b border-ink-50 align-middle">
                  <td className="py-2 pr-2">
                    <DecimalInput
                      integer={!allowDecimal}
                      value={row.length}
                      onValueChange={(v) => updateRow(row.id, { length: v })}
                      className="w-24"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <DecimalInput
                      integer={!allowDecimal}
                      value={row.width}
                      onValueChange={(v) => updateRow(row.id, { width: v })}
                      className="w-24"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <DecimalInput
                      integer
                      value={row.quantity}
                      onValueChange={(v) => updateRow(row.id, { quantity: v })}
                      className="w-16"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <TextInput
                      value={row.label}
                      onChange={(v) => updateRow(row.id, { label: v })}
                      placeholder="Etiket"
                    />
                  </td>
                  {showEdgeBand ? (
                    <td className="py-2 pr-2 text-center">
                      <EdgeBandButton edge={edge} onClick={() => setEdgeEditId(row.id)} />
                    </td>
                  ) : null}
                  <td className="py-2 pr-2 text-center">
                    <OrientationButton mode={mode} onCycle={() => cycleOrientation(row)} />
                  </td>
                  <td className="py-2">
                    <IconButton
                      icon={Trash2}
                      variant="ghost"
                      ariaLabel="Satırı sil"
                      onClick={() => removeRow(row.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button size="sm" variant="soft" icon={Plus} onClick={addRow}>
        Satır ekle
      </Button>

      {showEdgeBand ? (
        <EdgeBandModal
          open={Boolean(edgeEditId)}
          edge={editingEdge}
          pieceLength={editingRow?.length}
          pieceWidth={editingRow?.width}
          onChange={(next) => {
            if (edgeEditId) updateRow(edgeEditId, { edgeBanding: next });
          }}
          onClose={() => setEdgeEditId(null)}
        />
      ) : null}
    </div>
  );
}

export function CutlistPartsForm({ parts, onChange }) {
  const toast = useToast();

  function handleReset() {
    onChange([EMPTY_PART()]);
    toast.info("Parça listesi sıfırlandı.", "");
  }

  return (
    <DimensionTable
      title="Parçalar"
      subtitle="Uzunluk = dikey (mm), Genişlik = yatay (mm) · Yön ve kenar bant satırdan değişir"
      rows={parts}
      onChange={onChange}
      rowTemplate={EMPTY_PART}
      showEdgeBand
      allowDecimal
      onReset={handleReset}
    />
  );
}

export function CutlistSheetsForm({ sheets, onChange }) {
  return (
    <DimensionTable
      title="Malzeme levhaları"
      subtitle="Örn. 280 × 210 → uzunluk 280, genişlik 210"
      rows={sheets}
      onChange={onChange}
      rowTemplate={EMPTY_SHEET}
    />
  );
}

function partRow(length, width, quantity, label = "", edge = null, rotationMode = "free") {
  return {
    id: newId("part"),
    length,
    width,
    quantity,
    label,
    rotationMode: /** @type {RotationMode} */ (rotationMode),
    canRotate: rotationMode === "free",
    edgeBanding: edge || emptyEdge()
  };
}

export function createDefaultParts() {
  /** Referans: WhatsApp 17.10.10 — 15 satır, sıra/adet/bant/yön birebir */
  const bandTB = { top: true, right: false, bottom: true, left: false };
  const bandTL = { top: true, right: false, bottom: false, left: true };
  const none = emptyEdge();

  return [
    partRow(76, 41.7, 1, "", none, "horizontal"),
    partRow(76.4, 63, 2, "", bandTB, "horizontal"),
    partRow(76.4, 8, 4, "", bandTB, "horizontal"),
    partRow(78, 63, 4, "", bandTB, "horizontal"),
    partRow(66.4, 63, 2, "", bandTB, "horizontal"),
    partRow(66.4, 8, 4, "", bandTB, "horizontal"),
    partRow(80, 34, 6, "", bandTL, "horizontal"),
    partRow(76.4, 34, 6, "", bandTB, "horizontal"),
    partRow(76.4, 32, 6, "", bandTB, "horizontal"),
    partRow(80, 34, 4, "", bandTL, "horizontal"),
    partRow(66.4, 34, 4, "", bandTB, "horizontal"),
    partRow(66.4, 32, 4, "", bandTB, "horizontal"),
    partRow(275, 11, 1, "", none, "horizontal"),
    partRow(275, 12, 2, "", bandTB, "horizontal"),
    partRow(275, 20, 2, "", bandTB, "horizontal")
  ];
}

export function createDefaultSheets() {
  return [
    {
      id: newId("sheet"),
      length: 280,
      width: 210,
      quantity: 7,
      label: "Ollie",
      rotationMode: /** @type {RotationMode} */ ("free"),
      canRotate: true
    }
  ];
}

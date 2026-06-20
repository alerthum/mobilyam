import React from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import clsx from "clsx";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";
import TextInput from "../inputs/TextInput.jsx";
import DecimalInput from "../inputs/DecimalInput.jsx";
import { normalizeDimensions } from "../../lib/cutlist/types.js";

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

/** @typedef {import('../../lib/cutlist/types.js').CutPart} CutPart */
/** @typedef {import('../../lib/cutlist/types.js').SheetMaterial} SheetMaterial */

const EMPTY_PART = () => ({
  id: newId("part"),
  length: 90,
  width: 60,
  quantity: 1,
  label: "",
  canRotate: true
});

const EMPTY_SHEET = () => ({
  id: newId("sheet"),
  length: 280,
  width: 210,
  quantity: 1,
  label: "",
  canRotate: true
});

const MOBILE_ROW_GRID =
  "grid w-full min-w-0 grid-cols-[52px_52px_44px_minmax(80px,1fr)_36px_28px] gap-x-1 items-center";

const MOBILE_INPUT_SHELL =
  "!h-8 !min-h-8 !py-0 !px-1.5 !gap-0 rounded-lg focus-within:!ring-2 focus-within:!ring-brand-100";

const MOBILE_INPUT_TEXT = "!text-xs";

/**
 * @param {Array<{ id: string, length: number, width: number, quantity: number, label: string, canRotate: boolean }>} rows
 * @returns {CutPart[]}
 */
export function partsToModel(rows) {
  return rows.map((row) => {
    const dim = normalizeDimensions(row.length, row.width);
    return {
      id: row.id,
      width: dim.width,
      height: dim.height,
      quantity: Number(row.quantity) || 0,
      label: row.label || "",
      canRotate: row.canRotate !== false,
      edgeBanding: undefined
    };
  });
}

/**
 * @param {Array<{ id: string, length: number, width: number, quantity: number, label: string, canRotate: boolean }>} rows
 * @returns {SheetMaterial[]}
 */
export function sheetsToModel(rows) {
  return rows.map((row) => {
    const dim = normalizeDimensions(row.length, row.width);
    return {
      id: row.id,
      width: dim.width,
      height: dim.height,
      quantity: Number(row.quantity) || 0,
      label: row.label || "",
      canRotate: row.canRotate !== false
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
 * @param {{ checked: boolean, onChange: () => void, small?: boolean }} props
 */
function RotateToggle({ checked, onChange, small = false }) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center rounded-md border border-ink-200 hover:bg-surface-50 bg-white shrink-0",
        small ? "h-7 w-7" : "h-9 w-9 rounded-lg"
      )}
      onClick={onChange}
      aria-label={checked ? "Döndürme açık" : "Döndürme kapalı"}
    >
      {checked ? (
        <Check size={small ? 14 : 16} className="text-success-600" />
      ) : (
        <X size={small ? 14 : 16} className="text-ink-400" />
      )}
    </button>
  );
}

/**
 * @param {{
 *   row: { id: string, length: number, width: number, quantity: number, label: string, canRotate: boolean },
 *   onUpdate: (patch: object) => void,
 *   onRemove: () => void
 * }} props
 */
function MobileDimensionRow({ row, onUpdate, onRemove }) {
  return (
    <div className={clsx(MOBILE_ROW_GRID, "border-b border-ink-50 py-1")}>
      <DecimalInput
        integer
        value={row.length}
        onValueChange={(v) => onUpdate({ length: v })}
        className={MOBILE_INPUT_SHELL}
        inputClassName={MOBILE_INPUT_TEXT}
      />
      <DecimalInput
        integer
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
      <div className="flex justify-center">
        <RotateToggle
          small
          checked={row.canRotate}
          onChange={() => onUpdate({ canRotate: !row.canRotate })}
        />
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
  );
}

function DimensionTable({ title, subtitle, rows, onChange, rowTemplate }) {
  function updateRow(id, patch) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function addRow() {
    onChange([...rows, rowTemplate()]);
  }

  return (
    <div className="space-y-3 min-w-0">
      <div>
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
        {subtitle ? <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p> : null}
      </div>

      <div className="md:hidden w-full min-w-0 overflow-hidden">
        <div className={clsx(MOBILE_ROW_GRID, "border-b border-ink-100")}>
          <MobileHeaderCell>Uzunluk</MobileHeaderCell>
          <MobileHeaderCell>Genişlik</MobileHeaderCell>
          <MobileHeaderCell>Adet</MobileHeaderCell>
          <MobileHeaderCell>Etiket</MobileHeaderCell>
          <MobileHeaderCell className="text-center">Döndür</MobileHeaderCell>
          <MobileHeaderCell className="text-center">Sil</MobileHeaderCell>
        </div>
        {rows.map((row) => (
          <MobileDimensionRow
            key={row.id}
            row={row}
            onUpdate={(patch) => updateRow(row.id, patch)}
            onRemove={() => removeRow(row.id)}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-500 border-b border-ink-100">
              <th className="py-2 pr-2 font-semibold">Uzunluk</th>
              <th className="py-2 pr-2 font-semibold">Genişlik</th>
              <th className="py-2 pr-2 font-semibold w-16">Adet</th>
              <th className="py-2 pr-2 font-semibold">Etiket</th>
              <th className="py-2 pr-2 font-semibold text-center w-20">Döndür</th>
              <th className="py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink-50 align-middle">
                <td className="py-2 pr-2">
                  <DecimalInput
                    integer
                    value={row.length}
                    onValueChange={(v) => updateRow(row.id, { length: v })}
                    className="w-20"
                  />
                </td>
                <td className="py-2 pr-2">
                  <DecimalInput
                    integer
                    value={row.width}
                    onValueChange={(v) => updateRow(row.id, { width: v })}
                    className="w-20"
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
                <td className="py-2 pr-2 text-center">
                  <RotateToggle
                    checked={row.canRotate}
                    onChange={() => updateRow(row.id, { canRotate: !row.canRotate })}
                  />
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
            ))}
          </tbody>
        </table>
      </div>

      <Button size="sm" variant="soft" icon={Plus} onClick={addRow}>
        Satır ekle
      </Button>
    </div>
  );
}

export function CutlistPartsForm({ parts, onChange }) {
  return (
    <DimensionTable
      title="Parçalar"
      subtitle="Uzunluk = dikey (mm), Genişlik = yatay (mm)"
      rows={parts}
      onChange={onChange}
      rowTemplate={EMPTY_PART}
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

export function createDefaultParts() {
  return [
    { id: newId("part"), length: 90, width: 60, quantity: 20, label: "Jeremiah", canRotate: true },
    { id: newId("part"), length: 80, width: 55, quantity: 15, label: "Nettie", canRotate: true }
  ];
}

export function createDefaultSheets() {
  return [
    { id: newId("sheet"), length: 280, width: 210, quantity: 5, label: "Mary", canRotate: true }
  ];
}

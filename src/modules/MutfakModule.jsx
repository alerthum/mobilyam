import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, ChefHat, ChevronDown, ChevronUp } from "lucide-react";
import Field from "../components/inputs/Field.jsx";
import DecimalInput from "../components/inputs/DecimalInput.jsx";
import Toggle from "../components/inputs/Toggle.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import { getMutfakM2Breakdown } from "../utils/calculations.js";
import { formatNumber } from "../utils/format.js";

const FIELDS = [
  { key: "ceilingHeight", label: "Tavan yüksekliği", suffix: "cm" },
  { key: "wallWidth", label: "Duvar genişliği", suffix: "cm" },
  { key: "doorWidth", label: "Kapı genişliği", suffix: "cm" },
  { key: "boyDolapEn", label: "Boy dolap eni", suffix: "cm" },
  { key: "buzDolapEn", label: "Buzdolabı dolabı eni", suffix: "cm" },
  { key: "buzYanakAdet", label: "Buzdolabı yanak", suffix: "adet", integer: true }
];

/** Hesaba dahil seçimi — mobilde de tek dokunuşla açılıp kapanır. */
function IncludeChip({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
        checked
          ? "border-brand-500 ring-4 ring-brand-50 text-ink-900 bg-white"
          : "border-ink-200 text-ink-500 bg-surface-50 hover:border-ink-300"
      )}
    >
      <span
        className={clsx(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
          checked ? "bg-brand-500 border-brand-500 text-white" : "border-ink-300 bg-white"
        )}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

export default function MutfakModule({ room, onChange }) {
  const basic = room.basic || {};
  const kademeliMutfak = Boolean(basic.kademeliMutfak);
  /* Eski kayıtlarda alan yok → dahil sayılır (hesaplama ile aynı kural) */
  const altDolapDahil = basic.altDolapDahil !== false;
  const ustDolapDahil = basic.ustDolapDahil !== false;
  const [ozetOpen, setOzetOpen] = useState(false);

  const breakdown = useMemo(() => getMutfakM2Breakdown(basic), [basic]);
  const haricTutulan = [!altDolapDahil && "alt dolap", !ustDolapDahil && "üst dolap"]
    .filter(Boolean)
    .join(" ve ");

  function patch(key, v) {
    onChange({ ...room, basic: { ...basic, [key]: v } });
  }

  return (
    <Card>
      <CardHeader
        icon={ChefHat}
        title="Mutfak Ölçüleri"
        subtitle="Excel maliyet raporuyla uyumlu hesap"
        accent="bg-accent-100 text-accent-600"
      />
      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-ink-200 bg-white px-4 py-3">
          <p className="text-sm font-bold text-ink-900">Hesaba dahil</p>
          <p className="text-xs text-ink-500 mt-0.5">
            Seçimi kaldırılan dolap toplam m²'ye eklenmez.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <IncludeChip
              checked={altDolapDahil}
              onChange={(v) => patch("altDolapDahil", v)}
              label="Alt dolap"
            />
            <IncludeChip
              checked={ustDolapDahil}
              onChange={(v) => patch("ustDolapDahil", v)}
              label="Üst dolap"
            />
          </div>
        </div>
        <Toggle
          checked={kademeliMutfak}
          onChange={(v) => patch("kademeliMutfak", v)}
          disabled={!ustDolapDahil}
          label="Kademeli mutfak"
          description={
            !ustDolapDahil
              ? "Üst dolap hesaba dahil olmadığı için uygulanmaz."
              : kademeliMutfak
                ? "Üst dolap yüzölçümüne %30 ilave uygulanır."
                : "İşaretlenirse üst dolap alanına %30 ilave uygulanır."
          }
        />
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <DecimalInput
              value={basic[f.key]}
              onValueChange={(v) => patch(f.key, v)}
              suffix={f.suffix}
              integer={Boolean(f.integer)}
            />
          </Field>
        ))}
        <Field
          label="Toplam mutfak m²"
          hint={
            haricTutulan
              ? `Hesaba dahil edilmeyen: ${haricTutulan}.`
              : "Üst + alt + buz + yanak + boy alanlarının toplamı (cm² → m²)."
          }
        >
          <div className="yk-input-shell-flat w-full py-2.5 px-3 text-sm font-semibold text-ink-800 tabular-nums">
            {formatNumber(breakdown.totalM2, " m²")}
          </div>
        </Field>
      </div>

      <Card className="mt-4" padded={false}>
        <div className="p-4 border-b border-ink-100 flex items-center justify-between">
          <p className="text-sm font-bold text-ink-900">m² Özeti</p>
          <IconButton
            icon={ozetOpen ? ChevronUp : ChevronDown}
            variant="ghost"
            ariaLabel="m² özetini aç/kapat"
            onClick={() => setOzetOpen((v) => !v)}
          />
        </div>
        {ozetOpen && (
          <div className="p-4 space-y-2 text-xs text-ink-700">
            {breakdown.rows.map((row) => (
              <div
                key={row.key}
                className="rounded-lg border border-ink-100 bg-surface-50 p-2.5"
              >
                <p className="font-semibold text-ink-900">
                  {row.label}:{" "}
                  <span className="tabular-nums text-brand-700">
                    {formatNumber(row.m2, " m²")}
                  </span>
                </p>
                <p className="text-[11px] text-ink-500 mt-1 leading-snug">{row.detail}</p>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-ink-200 bg-white p-2.5">
              <p className="font-semibold text-ink-800">
                Tezgah (Excel satırı — uzunluk):{" "}
                <span className="tabular-nums">{formatNumber(breakdown.tezgahLinearM, " m")}</span>
              </p>
              <p className="text-[11px] text-ink-500 mt-1">{breakdown.tezgahLinearDetail}</p>
            </div>
            <p className="text-[11px] font-semibold text-ink-600 pt-1 border-t border-ink-100">
              Toplam alan (m²):{" "}
              <span className="tabular-nums text-brand-700">
                {formatNumber(breakdown.totalM2, " m²")}
              </span>{" "}
              (satırların toplamı; tezgah uzunluğu dahil değildir)
            </p>
          </div>
        )}
      </Card>
    </Card>
  );
}

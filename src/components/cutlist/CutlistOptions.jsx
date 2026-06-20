import React from "react";
import Toggle from "../inputs/Toggle.jsx";
import DecimalInput from "../inputs/DecimalInput.jsx";
import Field from "../inputs/Field.jsx";
import { defaultCutlistOptions } from "../../lib/cutlist/types.js";

/** @typedef {import('../../lib/cutlist/types.js').CutlistOptions} CutlistOptions */

/**
 * @param {{ options: CutlistOptions, onChange: (next: CutlistOptions) => void }} props
 */
export default function CutlistOptions({ options, onChange }) {
  const o = { ...defaultCutlistOptions(), ...options };

  function patch(partial) {
    onChange({ ...o, ...partial });
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-ink-900">Seçenekler</h3>
        <p className="text-xs text-ink-500 mt-0.5">Kesim ve yerleşim kuralları</p>
      </div>

      <Field label="Kesme / Bıçak ağzı / Çentik kalınlığı (kerf, mm)">
        <DecimalInput
          value={o.kerf}
          onValueChange={(v) => patch({ kerf: v })}
        />
      </Field>

      <Toggle
        label="Parça etiketleri"
        description="Görselde parça adlarını göster"
        checked={o.showPartLabels}
        onChange={(v) => patch({ showPartLabels: v })}
      />
      <Toggle
        label="Malzemeden sadece bir tane levha kullan"
        description="Açıkken sığmayan parçalar yerleştirilmez"
        checked={o.useSingleSheetOnly}
        onChange={(v) => patch({ useSingleSheetOnly: v })}
      />
      <Toggle
        label="Malzemeyi düşünün (damar yönü)"
        description="Açıkken parça döndürme devre dışı"
        checked={o.considerGrain}
        onChange={(v) => patch({ considerGrain: v })}
      />
      <Toggle
        label="Kenar bantlama"
        description="Veri modelinde saklanır (Faz 1: maliyet yok)"
        checked={o.edgeBanding}
        onChange={(v) => patch({ edgeBanding: v })}
      />
      <Toggle
        label="Kesim yönünü seç (döndürme)"
        description="Parça 90° döndürülerek denenebilir"
        checked={o.allowRotation}
        onChange={(v) => patch({ allowRotation: v })}
        disabled={o.considerGrain}
      />
    </div>
  );
}

export { defaultCutlistOptions };

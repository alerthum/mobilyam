import React from "react";
import { StretchHorizontal } from "lucide-react";
import Field from "../inputs/Field.jsx";
import DecimalInput from "../inputs/DecimalInput.jsx";
import MoneyInput from "../inputs/MoneyInput.jsx";
import Card, { CardHeader } from "../ui/Card.jsx";
import { formatCurrency } from "../../utils/format.js";

/**
 * Mutfak tezgah satırı — katalog `RoomEditor` üzerinden gelir (güncel remote).
 */
export default function MutfakTezgahSection({ room, onChange, countertopCatalog = [] }) {
  const basic = room.basic || {};

  function patch(key, v) {
    onChange({ ...room, basic: { ...basic, [key]: v } });
  }

  function patchBasic(partial) {
    onChange({ ...room, basic: { ...basic, ...partial } });
  }

  function onCountertopPick(catalogId) {
    const id = catalogId || "";
    const item = countertopCatalog.find((x) => x.id === id);
    patchBasic({
      countertopCatalogId: id,
      countertopLabel: item?.name || "",
      countertopUnitPrice: item ? Number(item.price) || 0 : 0
    });
  }

  return (
    <Card>
      <CardHeader
        icon={StretchHorizontal}
        title="Tezgah özellikleri"
        subtitle="Katalogdan tezgah tipi; mtül ve birim fiyat teklifte ayrı satır olur"
        accent="bg-amber-50 text-amber-700"
      />
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <Field label="Tezgah tipi" hint="Fiyatlar → Tezgah özellikleri kataloğundan yönetilir">
          <select
            className="yk-input-shell-flat w-full"
            value={basic.countertopCatalogId || ""}
            onChange={(e) => onCountertopPick(e.target.value)}
          >
            <option value="">Seçiniz (isteğe bağlı)</option>
            {countertopCatalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="mtül (metre)" hint="Tezgah uzunluğu / ölçü">
          <DecimalInput
            value={basic.countertopMtul}
            onValueChange={(v) => patch("countertopMtul", v)}
            suffix="m"
          />
        </Field>
        <Field
          label="Birim fiyat (mtül)"
          hint="Katalog varsayılanı çoğu zaman 0; buradan istediğiniz fiyatı girebilirsiniz"
        >
          <MoneyInput
            value={basic.countertopUnitPrice}
            onValueChange={(v) => patch("countertopUnitPrice", v)}
          />
        </Field>
        <Field label="Tezgah tutarı (önizleme)">
          <div className="yk-input-shell-flat w-full py-2.5 px-3 text-sm font-bold text-ink-900 tabular-nums">
            {formatCurrency(
              (Number(basic.countertopMtul) || 0) * (Number(basic.countertopUnitPrice) || 0)
            )}
          </div>
        </Field>
      </div>
    </Card>
  );
}

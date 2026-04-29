import React from "react";
import { ChefHat } from "lucide-react";
import Field from "../components/inputs/Field.jsx";
import DecimalInput from "../components/inputs/DecimalInput.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";

const FIELDS = [
  { key: "ceilingHeight", label: "Tavan yüksekliği", suffix: "cm" },
  { key: "wallWidth", label: "Duvar genişliği", suffix: "cm" },
  { key: "doorWidth", label: "Kapı genişliği", suffix: "cm" },
  { key: "boyDolapEn", label: "Boy dolap eni", suffix: "cm" },
  { key: "buzDolapEn", label: "Buzdolabı dolabı eni", suffix: "cm" },
  { key: "buzYanakAdet", label: "Buzdolabı yanak", suffix: "adet", integer: true },
  { key: "ustKorMesafe", label: "Üst kör mesafesi", suffix: "cm" },
  { key: "altKorMesafe", label: "Alt kör mesafesi", suffix: "cm" },
  { key: "tezgahM2", label: "Tezgah m² (bilgi)", suffix: "m²" }
];

export default function MutfakModule({ room, onChange }) {
  const basic = room.basic || {};
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
      </div>
    </Card>
  );
}

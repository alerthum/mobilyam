import React from "react";
import { Shirt } from "lucide-react";
import Field from "../components/inputs/Field.jsx";
import DecimalInput from "../components/inputs/DecimalInput.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";

/**
 * Vestiyer — sadece boy dolap (en, boy, derinlik).
 * Dekor panel KALDIRILDI.
 *  - depth ≤ 45 → en × boy
 *  - 45 < depth ≤ 60 → × 1.30
 *  - depth > 60 → × 1.45
 */
export default function VestiyerModule({ room, onChange }) {
  const basic = room.basic || {};
  function patch(p) {
    onChange({ ...room, basic: { ...basic, ...p } });
  }

  const d = Number(basic.depth || 0);
  const factorBadge =
    d > 60 ? "× 1.45 (derinlik > 60)" : d > 45 ? "× 1.30 (derinlik 46-60)" : "katsayı uygulanmaz";

  return (
    <Card>
      <CardHeader
        icon={Shirt}
        title="Boy Dolap"
        subtitle={`Derinlik kuralı: ${factorBadge}`}
        accent="bg-purple-50 text-purple-700"
      />
      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        <Field label="Genişlik">
          <DecimalInput
            value={basic.width}
            onValueChange={(v) => patch({ width: v })}
            suffix="cm"
          />
        </Field>
        <Field label="Yükseklik">
          <DecimalInput
            value={basic.height}
            onValueChange={(v) => patch({ height: v })}
            suffix="cm"
          />
        </Field>
        <Field label="Derinlik" hint="≤45 cm ilavesiz · >45 +%30 · >60 +%45">
          <DecimalInput
            value={basic.depth}
            onValueChange={(v) => patch({ depth: v })}
            suffix="cm"
          />
        </Field>
      </div>
    </Card>
  );
}

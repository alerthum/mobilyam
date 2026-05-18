import React from "react";
import { Flame, Sun } from "lucide-react";
import Field from "../components/inputs/Field.jsx";
import DecimalInput from "../components/inputs/DecimalInput.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";

/**
 * Balkon: kombi dolabı (en×boy) + balkon dolabı (en×boy; derinlik ≥60 cm ise +%30).
 */
export default function BalkonModule({ room, onChange }) {
  function patch(partial) {
    onChange({ ...room, ...partial });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Flame}
          title="Kombi dolabı"
          subtitle="Panel eşdeğeri: en × boy (cm → m²)"
          accent="bg-sky-50 text-sky-600"
        />
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Genişlik (en)">
            <DecimalInput
              value={room.kombiWidth}
              onValueChange={(v) => patch({ kombiWidth: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Yükseklik (boy)">
            <DecimalInput
              value={room.kombiHeight}
              onValueChange={(v) => patch({ kombiHeight: v })}
              suffix="cm"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Sun}
          title="Balkon dolabı"
          subtitle="Ölçüler en, boy ve derinlik; alan en × boy m² — derinlik 60 cm ve üzeri ise +%30"
          accent="bg-sky-50 text-sky-600"
        />
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <Field label="Genişlik (en)">
            <DecimalInput
              value={room.balkonWidth}
              onValueChange={(v) => patch({ balkonWidth: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Yükseklik (boy)">
            <DecimalInput
              value={room.balkonHeight}
              onValueChange={(v) => patch({ balkonHeight: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Derinlik" hint="≥ 60 cm: alana ×1.30 uygulanır">
            <DecimalInput
              value={room.balkonDepth}
              onValueChange={(v) => patch({ balkonDepth: v })}
              suffix="cm"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}

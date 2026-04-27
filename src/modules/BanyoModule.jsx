import React from "react";
import { Bath } from "lucide-react";
import Field from "../components/inputs/Field.jsx";
import DecimalInput from "../components/inputs/DecimalInput.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";

/**
 * Banyo: alt modül + üst modül + boy dolap.
 * Derinlik HİÇBİR yerde kullanılmaz.
 *  - Alt modül & boy dolap → en × boy × 1.30
 *  - Üst modül             → en × boy
 */
export default function BanyoModule({ room, onChange }) {
  const basic = room.basic || {};
  function patch(p) {
    onChange({ ...room, basic: { ...basic, ...p } });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Bath}
          title="Alt Modül"
          subtitle="en × boy × 1.30"
          accent="bg-cyan-50 text-cyan-700"
        />
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Alt modül uzunluğu">
            <DecimalInput
              value={basic.lowerWidth}
              onValueChange={(v) => patch({ lowerWidth: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Alt modül yüksekliği">
            <DecimalInput
              value={basic.lowerHeight}
              onValueChange={(v) => patch({ lowerHeight: v })}
              suffix="cm"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Bath}
          title="Üst Modül (Ayna Üstü)"
          subtitle="en × boy"
          accent="bg-cyan-50 text-cyan-700"
        />
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Üst modül uzunluğu">
            <DecimalInput
              value={basic.upperWidth}
              onValueChange={(v) => patch({ upperWidth: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Üst modül yüksekliği">
            <DecimalInput
              value={basic.upperHeight}
              onValueChange={(v) => patch({ upperHeight: v })}
              suffix="cm"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Bath}
          title="Boy Dolap (opsiyonel)"
          subtitle="en × boy × 1.30"
          accent="bg-cyan-50 text-cyan-700"
        />
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Boy dolap uzunluğu">
            <DecimalInput
              value={basic.tallWidth}
              onValueChange={(v) => patch({ tallWidth: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Boy dolap yüksekliği">
            <DecimalInput
              value={basic.tallHeight}
              onValueChange={(v) => patch({ tallHeight: v })}
              suffix="cm"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}

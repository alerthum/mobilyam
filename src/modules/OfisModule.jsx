import React from "react";
import { Briefcase } from "lucide-react";
import Field from "../components/inputs/Field.jsx";
import DecimalInput from "../components/inputs/DecimalInput.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";

export default function OfisModule({ room, onChange }) {
  const basic = room.basic || {};
  function patch(p) {
    onChange({ ...room, basic: { ...basic, ...p } });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Briefcase}
          title="Masa"
          subtitle="en × boy"
          accent="bg-emerald-50 text-emerald-700"
        />
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Masa uzunluğu">
            <DecimalInput
              value={basic.masaWidth}
              onValueChange={(v) => patch({ masaWidth: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Masa yüksekliği">
            <DecimalInput
              value={basic.masaHeight}
              onValueChange={(v) => patch({ masaHeight: v })}
              suffix="cm"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Briefcase}
          title="Arşiv Dolabı"
          subtitle="en × boy"
          accent="bg-emerald-50 text-emerald-700"
        />
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Arşiv dolabı genişliği">
            <DecimalInput
              value={basic.arsivWidth}
              onValueChange={(v) => patch({ arsivWidth: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Arşiv dolabı yüksekliği">
            <DecimalInput
              value={basic.arsivHeight}
              onValueChange={(v) => patch({ arsivHeight: v })}
              suffix="cm"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}

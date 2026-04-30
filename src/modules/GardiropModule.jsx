import React from "react";
import { Plus, Trash2, Sofa, Bed, Layers, Grid3x3, Sparkles } from "lucide-react";
import Field from "../components/inputs/Field.jsx";
import DecimalInput from "../components/inputs/DecimalInput.jsx";
import MoneyInput from "../components/inputs/MoneyInput.jsx";
import TextInput from "../components/inputs/TextInput.jsx";
import Toggle from "../components/inputs/Toggle.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import Button from "../components/ui/Button.jsx";
import {
  createKomidin,
  createKaryola,
  createSifonyer,
  createCam
} from "../config/rooms.js";
import { useConfirm } from "../context/ModalContext.jsx";

/**
 * Gardırop modülü = Gardırop + Yatak Odası birleşik.
 * Kapaklı/Kapaksız toggle, komidin/karyola/şifonyer ve cam çeşitleri.
 */
export default function GardiropModule({ room, onChange }) {
  const confirm = useConfirm();

  function patch(partial) {
    onChange({ ...room, ...partial });
  }

  function patchList(field, list) {
    onChange({ ...room, [field]: list });
  }

  function addKomidin() {
    patchList("komidinler", [...(room.komidinler || []), createKomidin()]);
  }
  function addKaryola() {
    patchList("karyolalar", [...(room.karyolalar || []), createKaryola()]);
  }
  function addSifonyer() {
    patchList("sifonyerler", [...(room.sifonyerler || []), createSifonyer()]);
  }
  function addCam() {
    patchList("camlar", [...(room.camlar || []), createCam()]);
  }

  async function removeFrom(field, id, label) {
    const ok = await confirm({
      variant: "danger",
      title: `${label} kaldırılsın mı?`,
      description: "Bu öğe odadan silinecek ve fiyat anında güncellenecek.",
      confirmLabel: "Sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    patchList(
      field,
      (room[field] || []).filter((x) => x.id !== id)
    );
  }

  return (
    <div className="space-y-4">
      {/* Ana gardırop ölçüleri */}
      <Card>
        <CardHeader
          icon={Sofa}
          title="Gardırop Ölçüleri"
          subtitle="Toplam genişlik ve yükseklik yeterli"
          accent="bg-brand-50 text-brand-600"
        />
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <Field label="Genişlik">
            <DecimalInput
              value={room.width}
              onValueChange={(v) => patch({ width: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Yükseklik">
            <DecimalInput
              value={room.height}
              onValueChange={(v) => patch({ height: v })}
              suffix="cm"
            />
          </Field>
          <Field label="Derinlik" hint="≤45 ilavesiz · 46–60 +%30 · >60 +%45 (gardırop alanına)">
            <DecimalInput
              value={room.depth}
              onValueChange={(v) => patch({ depth: v })}
              suffix="cm"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Toggle
            checked={Boolean(room.kapakli)}
            onChange={(v) => patch({ kapakli: v })}
            label={room.kapakli ? "Kapaklı gardırop" : "Kapaksız gardırop"}
            description={
              room.kapakli
                ? "Kapak için en × boy × 1.30; derinlik kuralı buna ek çarpan olarak uygulanır."
                : "Kapaksızda en × boy; derinlik kuralı (46–60 %30, >60 %45) çarpan olarak uygulanır."
            }
          />
        </div>
      </Card>

      {/* Komidin */}
      <SubItemList
        title="Komidin"
        icon={Layers}
        emptyHint="Henüz komidin eklenmedi."
        onAdd={addKomidin}
        items={room.komidinler || []}
        renderItem={(k, idx) => (
          <KomidinForm
            key={k.id}
            index={idx}
            value={k}
            onChange={(next) =>
              patchList(
                "komidinler",
                (room.komidinler || []).map((x) => (x.id === k.id ? next : x))
              )
            }
            onRemove={() => removeFrom("komidinler", k.id, "Komidin")}
          />
        )}
      />

      {/* Karyola */}
      <SubItemList
        title="Karyola"
        icon={Bed}
        emptyHint="Henüz karyola eklenmedi."
        onAdd={addKaryola}
        items={room.karyolalar || []}
        renderItem={(k, idx) => (
          <KaryolaForm
            key={k.id}
            index={idx}
            value={k}
            onChange={(next) =>
              patchList(
                "karyolalar",
                (room.karyolalar || []).map((x) => (x.id === k.id ? next : x))
              )
            }
            onRemove={() => removeFrom("karyolalar", k.id, "Karyola")}
          />
        )}
      />

      {/* Şifonyer */}
      <SubItemList
        title="Şifonyer"
        icon={Grid3x3}
        emptyHint="Henüz şifonyer eklenmedi."
        onAdd={addSifonyer}
        items={room.sifonyerler || []}
        renderItem={(s, idx) => (
          <SifonyerForm
            key={s.id}
            index={idx}
            value={s}
            onChange={(next) =>
              patchList(
                "sifonyerler",
                (room.sifonyerler || []).map((x) => (x.id === s.id ? next : x))
              )
            }
            onRemove={() => removeFrom("sifonyerler", s.id, "Şifonyer")}
          />
        )}
      />

      {/* Cam çeşitleri */}
      <SubItemList
        title="Cam çeşitleri"
        icon={Sparkles}
        emptyHint="Cam eklenirse fiyatı doğrudan toplama eklenir."
        accent="bg-accent-100 text-accent-600"
        onAdd={addCam}
        items={room.camlar || []}
        renderItem={(c) => (
          <CamForm
            key={c.id}
            value={c}
            onChange={(next) =>
              patchList(
                "camlar",
                (room.camlar || []).map((x) => (x.id === c.id ? next : x))
              )
            }
            onRemove={() => removeFrom("camlar", c.id, "Cam")}
          />
        )}
      />
    </div>
  );
}

function SubItemList({ title, icon: Icon, items, onAdd, renderItem, emptyHint, accent }) {
  return (
    <Card>
      <CardHeader
        icon={Icon}
        title={title}
        subtitle={`${items.length} kayıt`}
        accent={accent || "bg-brand-50 text-brand-600"}
        action={
          <Button variant="soft" size="sm" icon={Plus} onClick={onAdd}>
            Ekle
          </Button>
        }
      />
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">{emptyHint}</p>
      ) : (
        <div className="mt-4 space-y-3">{items.map(renderItem)}</div>
      )}
    </Card>
  );
}

function ItemRow({ index, label, onRemove, children }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-surface-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide">
          {label} {typeof index === "number" ? `#${index + 1}` : ""}
        </p>
        <IconButton icon={Trash2} variant="danger" onClick={onRemove} ariaLabel="Sil" size={32} />
      </div>
      {children}
    </div>
  );
}

function KomidinForm({ index, value, onChange, onRemove }) {
  return (
    <ItemRow index={index} label="Komidin" onRemove={onRemove}>
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Adet">
          <DecimalInput
            integer
            value={value.adet}
            onValueChange={(v) => onChange({ ...value, adet: v })}
            suffix="adet"
          />
        </Field>
        <Field label="Çekmece">
          <DecimalInput
            integer
            value={value.cekmece}
            onValueChange={(v) => onChange({ ...value, cekmece: v })}
            suffix="adet"
          />
        </Field>
        <Field label="En">
          <DecimalInput
            value={value.width}
            onValueChange={(v) => onChange({ ...value, width: v })}
            suffix="cm"
          />
        </Field>
        <Field label="Boy">
          <DecimalInput
            value={value.height}
            onValueChange={(v) => onChange({ ...value, height: v })}
            suffix="cm"
          />
        </Field>
      </div>
    </ItemRow>
  );
}

function KaryolaForm({ index, value, onChange, onRemove }) {
  return (
    <ItemRow index={index} label="Karyola" onRemove={onRemove}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="En">
          <DecimalInput
            value={value.width}
            onValueChange={(v) => onChange({ ...value, width: v })}
            suffix="cm"
          />
        </Field>
        <Field label="Boy" hint="Otomatik %30 ilave">
          <DecimalInput
            value={value.height}
            onValueChange={(v) => onChange({ ...value, height: v })}
            suffix="cm"
          />
        </Field>
      </div>
    </ItemRow>
  );
}

function SifonyerForm({ index, value, onChange, onRemove }) {
  const factorActive = Number(value.depth || 0) > 45;
  return (
    <ItemRow index={index} label="Şifonyer" onRemove={onRemove}>
      <div className="grid sm:grid-cols-5 gap-3">
        <Field label="Adet">
          <DecimalInput
            integer
            value={value.adet}
            onValueChange={(v) => onChange({ ...value, adet: v })}
            suffix="adet"
          />
        </Field>
        <Field label="Çekmece">
          <DecimalInput
            integer
            value={value.cekmece}
            onValueChange={(v) => onChange({ ...value, cekmece: v })}
            suffix="adet"
          />
        </Field>
        <Field label="En">
          <DecimalInput
            value={value.width}
            onValueChange={(v) => onChange({ ...value, width: v })}
            suffix="cm"
          />
        </Field>
        <Field label="Boy">
          <DecimalInput
            value={value.height}
            onValueChange={(v) => onChange({ ...value, height: v })}
            suffix="cm"
          />
        </Field>
        <Field
          label="Derinlik"
          hint={factorActive ? "%30 ilave aktif" : "≤ 45 cm: ilavesiz"}
        >
          <DecimalInput
            value={value.depth}
            onValueChange={(v) => onChange({ ...value, depth: v })}
            suffix="cm"
          />
        </Field>
      </div>
    </ItemRow>
  );
}

function CamForm({ value, onChange, onRemove }) {
  return (
    <ItemRow label="Cam" onRemove={onRemove}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Cam adı">
          <TextInput
            value={value.name}
            onChange={(v) => onChange({ ...value, name: v })}
            placeholder="ör. Kumlu cam"
          />
        </Field>
        <Field label="Fiyat" hint="Toplam tutara doğrudan eklenir">
          <MoneyInput
            value={value.price}
            onValueChange={(v) => onChange({ ...value, price: v })}
          />
        </Field>
      </div>
    </ItemRow>
  );
}

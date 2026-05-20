import React, { useState } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import Card, { CardHeader } from "../ui/Card.jsx";
import Field from "../inputs/Field.jsx";
import TextInput from "../inputs/TextInput.jsx";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";
import Badge from "../ui/Badge.jsx";
import Modal from "../modals/Modal.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { useConfirm } from "../../context/ModalContext.jsx";

function emptyPartner() {
  return {
    id: `PRT-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    fullName: "",
    company: "",
    city: "",
    phone: "",
    email: "",
    status: "active"
  };
}

export default function AgreedPartnersSection({ partners, canEdit, onChange }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const list = Array.isArray(partners) ? partners : [];

  function savePartner(draft) {
    const next = list.some((p) => p.id === draft.id)
      ? list.map((p) => (p.id === draft.id ? draft : p))
      : [...list, draft];
    onChange(next);
    setEditing(null);
  }

  async function removePartner(p) {
    const ok = await confirm({
      variant: "danger",
      title: "Firma silinsin mi?",
      description: `${p.company || p.fullName} listeden kaldırılacak.`,
      confirmLabel: "Sil"
    });
    if (!ok) return;
    onChange(list.filter((x) => x.id !== p.id));
  }

  return (
    <Card>
      <CardHeader
        icon={Building2}
        title="Anlaşmalı firmalar"
        subtitle="Kesim / malzeme tedarikçileri — mobilyacılar sözleşme sonrası mail gönderir"
        action={
          canEdit ? (
            <Button size="sm" icon={Plus} onClick={() => setEditing(emptyPartner())}>
              Firma ekle
            </Button>
          ) : null
        }
      />
      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Henüz firma yok"
            description="Anlaşmalı kesimci veya malzemecileri buradan ekleyin."
          />
        ) : (
          <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
            {list.map((p) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink-900">{p.company || p.fullName}</span>
                    <Badge variant={p.status === "passive" ? "danger" : "success"}>
                      {p.status === "passive" ? "Pasif" : "Aktif"}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {p.fullName}
                    {p.city ? ` · ${p.city}` : ""}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </p>
                  <p className="text-xs text-brand-600 mt-0.5">{p.email || "E-posta yok"}</p>
                </div>
                {canEdit ? (
                  <div className="flex gap-1 shrink-0">
                    <IconButton
                      icon={Pencil}
                      variant="ghost"
                      ariaLabel="Düzenle"
                      onClick={() => setEditing({ ...p })}
                    />
                    <IconButton
                      icon={Trash2}
                      variant="danger"
                      ariaLabel="Sil"
                      onClick={() => removePartner(p)}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {editing ? (
        <PartnerFormModal
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={savePartner}
        />
      ) : null}
    </Card>
  );
}

function PartnerFormModal({ draft, onClose, onSave }) {
  const [form, setForm] = useState(draft);
  return (
    <Modal open onClose={onClose} size="md">
      <div className="p-6 space-y-4">
        <h3 className="yk-display text-lg text-ink-900">
          {draft.company || draft.fullName ? "Firmayı düzenle" : "Yeni firma"}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ad soyad">
            <TextInput value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          </Field>
          <Field label="Firma adı">
            <TextInput value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          </Field>
          <Field label="Şehir">
            <TextInput value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          </Field>
          <Field label="Telefon">
            <TextInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </Field>
          <Field label="E-posta" className="sm:col-span-2">
            <TextInput
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
          </Field>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
          <input
            type="checkbox"
            checked={form.status !== "passive"}
            onChange={(e) =>
              setForm({ ...form, status: e.target.checked ? "active" : "passive" })
            }
          />
          Aktif firma
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!String(form.email || "").trim()) return;
              onSave(form);
            }}
          >
            Kaydet
          </Button>
        </div>
      </div>
    </Modal>
  );
}

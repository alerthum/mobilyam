import React, { useMemo, useState } from "react";
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  Receipt,
  Calendar,
  Building2,
  Wrench
} from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import Modal from "../components/modals/Modal.jsx";
import Field from "../components/inputs/Field.jsx";
import TextInput from "../components/inputs/TextInput.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { useConfirm, useToast } from "../context/ModalContext.jsx";
import { formatDate, todayIso, addOneYear } from "../utils/format.js";

const ROLE_LABEL = {
  chamber: "Oda Yönetimi",
  producer: "Mobilyacı",
  system_admin: "Sistem Admin"
};

export default function UsersPage() {
  const { remote, commit } = useApp();
  const user = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const allUsers = (remote?.users || []).filter(
    (u) => !u.hiddenFromManagement && u.role !== "system_admin"
  );

  const projects = remote?.projects || [];
  const userStats = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const id = p.ownerUserId;
      if (!id) return;
      const arr = map.get(id) || { quotes: 0, lastDate: "" };
      const qs = p.quotes || [];
      arr.quotes += qs.length;
      qs.forEach((q) => {
        if (q.date && q.date > arr.lastDate) arr.lastDate = q.date;
      });
      map.set(id, arr);
    });
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return allUsers;
    return allUsers.filter((u) =>
      [u.fullName, u.username, u.company]
        .filter(Boolean)
        .some((s) => s.toLocaleLowerCase("tr").includes(q))
    );
  }, [allUsers, query]);

  if (user?.role !== "chamber" && user?.role !== "system_admin") {
    return (
      <>
        <TopBar title="Kullanıcılar" />
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <EmptyState
            icon={UsersIcon}
            title="Yetkisiz erişim"
            description="Bu sayfayı yalnızca oda yönetimi görüntüleyebilir."
          />
        </div>
      </>
    );
  }

  function newUser() {
    setEditing({
      id: `USR-${Date.now()}`,
      fullName: "",
      username: "",
      password: "",
      role: "producer",
      company: "",
      status: "active",
      hiddenFromManagement: false,
      licenseStartDate: todayIso(),
      licenseEndDate: addOneYear()
    });
  }

  async function saveEditing(next) {
    const result = await commit((d) => {
      d.users = d.users || [];
      const idx = d.users.findIndex((u) => u.id === next.id);
      if (idx >= 0) d.users[idx] = next;
      else d.users.push(next);
    });
    setEditing(null);
    if (result?.ok) toast.success("Kullanıcı kaydedildi");
    else toast.error("Kayıt başarısız oldu");
  }

  async function deleteUser(u) {
    const ok = await confirm({
      variant: "danger",
      title: "Kullanıcı silinsin mi?",
      description: `"${u.fullName}" kullanıcısı kalıcı olarak silinecek.`,
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    const result = await commit((d) => {
      d.users = (d.users || []).filter((x) => x.id !== u.id);
    });
    if (result?.ok) toast.success("Kullanıcı silindi");
    else toast.error("Silme başarısız oldu");
  }

  return (
    <>
      <TopBar
        title="Kullanıcılar"
        subtitle="Mobilyacı & Oda yönetimi"
        action={
          <Button icon={Plus} size="sm" onClick={newUser}>
            <span className="hidden sm:inline">Yeni</span>
          </Button>
        }
      />
      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-4">
        <div className="yk-input-shell">
          <Search size={18} className="text-ink-400" />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim, kullanıcı adı veya firmaya göre ara"
            className="w-full bg-transparent outline-none text-ink-900 placeholder:text-ink-400 text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Kullanıcı bulunamadı"
            description="Arama kriterleri eşleşmedi veya henüz kullanıcı eklenmedi."
            action={
              <Button icon={Plus} onClick={newUser}>
                Kullanıcı ekle
              </Button>
            }
          />
        ) : (
          <Card padded={false}>
            <div className="divide-y divide-ink-100">
              {filtered.map((u) => {
                const stats = userStats.get(u.id) || { quotes: 0, lastDate: "" };
                return (
                  <div
                    key={u.id}
                    className="p-4 sm:p-5 flex items-center gap-3"
                  >
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                      {u.role === "chamber" ? (
                        <Building2 size={18} strokeWidth={2.2} />
                      ) : (
                        <Wrench size={18} strokeWidth={2.2} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-ink-900 truncate">
                          {u.fullName || u.username}
                        </h3>
                        <Badge
                          variant={u.role === "chamber" ? "accent" : "default"}
                        >
                          {ROLE_LABEL[u.role]}
                        </Badge>
                        <Badge
                          variant={u.status === "passive" ? "danger" : "success"}
                        >
                          {u.status === "passive" ? "Pasif" : "Aktif"}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-500 truncate mt-0.5">
                        @{u.username} · {u.company || "—"}
                      </p>
                      {u.role === "producer" && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge icon={Receipt} variant="brand">
                            {stats.quotes} teklif
                          </Badge>
                          <Badge icon={Calendar} variant="default">
                            {stats.lastDate
                              ? `Son: ${formatDate(stats.lastDate)}`
                              : "Henüz teklif yok"}
                          </Badge>
                          {u.licenseEndDate && (
                            <Badge variant="warning">
                              Lisans: {formatDate(u.licenseEndDate)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton
                        icon={Pencil}
                        variant="ghost"
                        ariaLabel="Düzenle"
                        onClick={() => setEditing({ ...u })}
                      />
                      <IconButton
                        icon={Trash2}
                        variant="danger"
                        ariaLabel="Sil"
                        onClick={() => deleteUser(u)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <UserEditModal
        value={editing}
        onClose={() => setEditing(null)}
        onSave={saveEditing}
      />
    </>
  );
}

function UserEditModal({ value, onClose, onSave }) {
  const [draft, setDraft] = useState(value);
  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!value || !draft) return null;

  return (
    <Modal open onClose={onClose} size="lg">
      <div className="p-5 sm:p-7">
        <p className="yk-eyebrow">Kullanıcı</p>
        <h3 className="yk-display text-xl text-ink-900 mt-1 mb-4">
          {draft.id ? "Düzenle" : "Yeni Kullanıcı"}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ad Soyad" required>
            <TextInput
              value={draft.fullName}
              onChange={(v) => setDraft({ ...draft, fullName: v })}
            />
          </Field>
          <Field label="Firma">
            <TextInput
              value={draft.company}
              onChange={(v) => setDraft({ ...draft, company: v })}
            />
          </Field>
          <Field label="Kullanıcı adı" required>
            <TextInput
              value={draft.username}
              onChange={(v) => setDraft({ ...draft, username: v })}
            />
          </Field>
          <Field label="Şifre" required>
            <TextInput
              value={draft.password}
              onChange={(v) => setDraft({ ...draft, password: v })}
            />
          </Field>
          <Field label="Rol">
            <select
              className="yk-input-shell-flat w-full"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            >
              <option value="producer">Mobilyacı</option>
              <option value="chamber">Oda Yönetimi</option>
            </select>
          </Field>
          <Field label="Durum">
            <select
              className="yk-input-shell-flat w-full"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </Field>
          {draft.role === "producer" && (
            <>
              <Field label="Lisans başlangıç">
                <input
                  type="date"
                  className="yk-input-shell-flat w-full"
                  value={draft.licenseStartDate || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, licenseStartDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Lisans bitiş">
                <input
                  type="date"
                  className="yk-input-shell-flat w-full"
                  value={draft.licenseEndDate || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, licenseEndDate: e.target.value })
                  }
                />
              </Field>
            </>
          )}
        </div>
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={() => onSave(draft)}>Kaydet</Button>
        </div>
      </div>
    </Modal>
  );
}

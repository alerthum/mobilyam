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
  Wrench,
  Clock
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
import { formatDate, todayIso, addOneYear, addYears } from "../utils/format.js";

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
  const [extendUser, setExtendUser] = useState(null);

  const scopedUsers = (remote?.users || []).filter(
    (u) => !u.hiddenFromManagement && u.role !== "system_admin"
  );
  const isSysAdmin = user?.role === "system_admin";

  /** Oda yönetimi: yalnızca kendi oda kullanıcıları (sunucu da filtreler; ikinci koruma). */
  const allUsers =
    user?.role === "chamber"
      ? scopedUsers.filter((u) => u.chamberId === user.chamberId)
      : scopedUsers;

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
    const base = isSysAdmin
      ? scopedUsers.filter((u) => u.role === "chamber")
      : allUsers;
    if (!q) return base;
    return base.filter((u) =>
      [u.fullName, u.username, u.company]
        .filter(Boolean)
        .some((s) => s.toLocaleLowerCase("tr").includes(q))
    );
  }, [allUsers, query, isSysAdmin, scopedUsers]);

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

  function pushEmptyChamberIfMissing(d, next) {
    const nid = String(next.chamberId || "").trim();
    if (!nid) return;
    d.chambers = Array.isArray(d.chambers) ? d.chambers : [];
    if (d.chambers.some((c) => c.id === nid)) return;

    let label = "";
    if (next.role === "chamber") {
      label =
        next.company?.trim() || next.fullName?.trim() || "Yeni Oda";
    } else {
      const admin = (d.users || []).find(
        (u) => u.role === "chamber" && u.chamberId === nid
      );
      label =
        admin?.company?.trim() ||
        admin?.fullName?.trim() ||
        String(d.chamber?.chamberName || "").trim() ||
        "Üretici bağlısı oda";
    }

    const today = new Date().toISOString().slice(0, 10);
    d.chambers.push({
      id: nid,
      chamberName: label,
      updatedAt: today,
      laborHourlyRate: 0,
      overheadRate: 0,
      chamberMarginRate: 0,
      installationMtPrice: 0,
      packagingSqmPrice: 0,
      minimumProfitRate: 0,
      broadcasts: [],
      qualities: [],
      hardwarePackages: [],
      servicesCatalog: []
    });
  }

  function newUser() {
    if (isSysAdmin) {
      setEditing({
        id: `USR-${Date.now()}`,
        fullName: "",
        username: "",
        password: "",
        role: "chamber",
        company: "",
        chamberId: "",
        phone: "",
        addressLine: "",
        cityProvince: "",
        district: "",
        taxOffice: "",
        taxNumber: "",
        nationalIdMasked: "",
        status: "active",
        hiddenFromManagement: false,
        licenseStartDate: todayIso(),
        licenseEndDate: addOneYear()
      });
      return;
    }

    setEditing({
      id: `USR-${Date.now()}`,
      fullName: "",
      username: "",
      password: "",
      role: "producer",
      company: "",
      chamberId: user?.role === "chamber" ? user.chamberId : "",
      phone: "",
      addressLine: "",
      cityProvince: "",
      district: "",
      taxOffice: "",
      taxNumber: "",
      nationalIdMasked: "",
      status: "active",
      hiddenFromManagement: false,
      licenseStartDate: todayIso(),
      licenseEndDate: addOneYear()
    });
  }

  function cascadePassiveUnderChamber(d, cid) {
    if (!cid) return;
    (d.users || []).forEach((x) => {
      if (x.chamberId !== cid) return;
      if (x.role === "chamber" || x.role === "producer") x.status = "passive";
    });
  }

  async function saveEditing(nextDraft) {
    let next = { ...nextDraft };

    if (user?.role === "chamber") {
      next.role = "producer";
      next.chamberId = user.chamberId;
    }

    if (user?.role === "system_admin" && next.role === "chamber") {
      if (!String(next.chamberId || "").trim()) {
        next.chamberId = `CH-${Date.now().toString(36)}-${Math.floor(Math.random() * 899 + 100)}`;
      }
    }

    if (isSysAdmin && next.role !== "chamber") {
      toast.error("Sistem yöneticisi yalnızca oda (oda yönetimi) kaydı ekleyebilir veya düzenler.");
      return;
    }

    const result = await commit((d) => {
      if (user?.role === "system_admin") {
        if (next.role === "chamber") {
          pushEmptyChamberIfMissing(d, next);
        }
      }

      d.users = d.users || [];
      const idx = d.users.findIndex((u) => u.id === next.id);
      if (idx >= 0) d.users[idx] = next;
      else d.users.push(next);

      if (next.role === "chamber" && next.status === "passive" && next.chamberId) {
        cascadePassiveUnderChamber(d, next.chamberId);
      }
    });
    setEditing(null);
    if (result?.ok) toast.success("Kullanıcı kaydedildi");
    else toast.error("Kayıt başarısız oldu");
  }

  async function toggleChamberAccountStatus(u) {
    if (u.role !== "chamber") return;
    const next = u.status === "passive" ? "active" : "passive";
    const result = await commit((d) => {
      d.users = (d.users || []).map((x) =>
        x.id === u.id ? { ...x, status: next } : x
      );
      if (next === "passive" && u.chamberId) {
        cascadePassiveUnderChamber(d, u.chamberId);
      }
    });
    if (result?.ok) {
      toast.success(
        next === "active" ? "Oda hesabı aktifleştirildi" : "Oda hesabı ve bağlı kullanıcılar pasife alındı"
      );
    } else toast.error("Durum güncellenemedi");
  }

  async function toggleProducerStatus(u) {
    if (user?.role !== "chamber") return;
    if (u.role !== "producer") return;
    const next = u.status === "passive" ? "active" : "passive";
    const result = await commit((d) => {
      d.users = (d.users || []).map((x) =>
        x.id === u.id ? { ...x, status: next } : x
      );
    });
    if (result?.ok) {
      toast.success(next === "active" ? "Kullanıcı aktifleştirildi" : "Kullanıcı pasife alındı");
    } else toast.error("Durum güncellenemedi");
  }

  async function deleteUser(u) {
    if (isSysAdmin && u.role === "producer") {
      toast.error("Mobilyacı hesaplarını sistem yöneticisi silemez — oda yönetimi yapar.");
      return;
    }

    if (u.role === "chamber") {
      if (!isSysAdmin) {
        toast.error("Oda yönetim hesabı silinemez.");
        return;
      }
      const ok = await confirm({
        variant: "danger",
        title: "Oda kaydı silinsin mi?",
        description: `"${u.fullName}" oda hesabı ve bağlı chambers[] kaydı kaldırılacak (üretici hesapları silinmez; gerekirse ayrıca silin).`,
        confirmLabel: "Evet, sil",
        cancelLabel: "Vazgeç"
      });
      if (!ok) return;
      const cid = u.chamberId;
      const result = await commit((d) => {
        d.users = (d.users || []).filter((x) => x.id !== u.id);
        if (cid) {
          d.chambers = (d.chambers || []).filter((c) => c.id !== cid);
        }
      });
      if (result?.ok) toast.success("Oda kaydı silindi");
      else toast.error("Silme başarısız oldu");
      return;
    }
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
        subtitle={
          isSysAdmin
            ? "Yalnızca oda hesaplarını yönetirsiniz; mobilyacılar bilgi içindir"
            : "Mobilyacı & Oda yönetimi"
        }
        action={
          (user?.role === "chamber" || isSysAdmin) && (
          <Button icon={Plus} size="sm" onClick={newUser}>
            <span className="hidden sm:inline">{isSysAdmin ? "Oda ekle" : "Yeni"}</span>
          </Button>
          )
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

        {isSysAdmin && filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Kayıt yok"
            description="Henüz oda kaydı yok — üst menüden oda ekleyin."
            action={
              <Button icon={Plus} onClick={newUser}>
                Oda kaydı ekle
              </Button>
            }
          />
        ) : isSysAdmin ? (
          <>
            <Card padded={false}>
              <div className="p-4 sm:p-5 border-b border-ink-100">
                <p className="yk-eyebrow">Yönetim</p>
                <h3 className="yk-display text-lg text-ink-900 mt-1">Oda hesapları</h3>
                <p className="text-xs text-ink-500 mt-1">
                  Pasife alınca aynı odaya bağlı tüm kullanıcılar pasife çekilir (lisans ve durum).
                </p>
              </div>
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-ink-500">
                  Aramanızla eşleşen oda yok — filtre sıfırlayın veya yeni ekleyin.
                </div>
              ) : (
                <div className="divide-y divide-ink-100">
                  {filtered.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="shrink-0 w-11 h-11 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
                        <Building2 size={18} strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-ink-900 truncate">
                            {u.fullName || u.username}
                          </h3>
                          <Badge variant="accent">{ROLE_LABEL.chamber}</Badge>
                          <Badge variant={u.status === "passive" ? "danger" : "success"}>
                            {u.status === "passive" ? "Pasif" : "Aktif"}
                          </Badge>
                          <span className="text-[11px] font-mono text-ink-400">{u.chamberId}</span>
                        </div>
                        <p className="text-xs text-ink-500 truncate mt-0.5">
                          @{u.username} · {u.company || "—"}
                        </p>
                        {u.licenseEndDate && (
                          <p className="text-[11px] text-ink-500 mt-1">
                            Oda lisans bitiş: {formatDate(u.licenseEndDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={u.status === "passive" ? "primary" : "outline"}
                          onClick={() => toggleChamberAccountStatus(u)}
                        >
                          {u.status === "passive" ? "Aktifleştir" : "Pasife çek (oda + üyeler)"}
                        </Button>
                        <Button
                          size="sm"
                          variant="soft"
                          icon={Clock}
                          onClick={() => setExtendUser({ ...u })}
                        >
                          Lisans uzat
                        </Button>
                        <div className="flex items-center gap-1 justify-end">
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
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Kullanıcı bulunamadı"
            description="Arama kriterleri eşleşmedi veya henüz kullanıcı eklenmedi."
            action={
              user?.role === "chamber" ? (
              <Button icon={Plus} onClick={newUser}>
                Kullanıcı ekle
              </Button>
              ) : null
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
                      {u.role === "chamber" && u.licenseEndDate && (
                        <div className="mt-2">
                          <Badge variant="warning">
                            Oda lisansı: {formatDate(u.licenseEndDate)}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      {u.role === "producer" && user?.role === "chamber" && (
                        <>
                          <Button
                            size="sm"
                            variant={u.status === "passive" ? "primary" : "outline"}
                            onClick={() => toggleProducerStatus(u)}
                          >
                            {u.status === "passive" ? "Aktifleştir" : "Pasife çek"}
                          </Button>
                          <Button
                            size="sm"
                            variant="soft"
                            icon={Clock}
                            onClick={() => setExtendUser({ ...u })}
                          >
                            Lisans uzat
                          </Button>
                        </>
                      )}
                      {u.role === "chamber" && user?.role === "chamber" && (
                        <>
                          <Button
                            size="sm"
                            variant={u.status === "passive" ? "primary" : "outline"}
                            onClick={() => toggleChamberAccountStatus(u)}
                          >
                            {u.status === "passive" ? "Aktifleştir" : "Pasife çek (oda + üyeler)"}
                          </Button>
                          <Button
                            size="sm"
                            variant="soft"
                            icon={Clock}
                            onClick={() => setExtendUser({ ...u })}
                          >
                            Lisans uzat
                          </Button>
                        </>
                      )}
                      <div className="flex items-center gap-1 justify-end">
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
                          disabled={u.role === "chamber"}
                        />
                      </div>
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
        registryChamberOnly={isSysAdmin}
      />

      <LicenseExtendModal
        target={extendUser}
        onClose={() => setExtendUser(null)}
        onApply={async ({ id, licenseEndDate }) => {
          const result = await commit((d) => {
            d.users = (d.users || []).map((x) =>
              x.id === id ? { ...x, licenseEndDate } : x
            );
          });
          if (result?.ok) {
            toast.success("Lisans süresi güncellendi");
            setExtendUser(null);
          } else toast.error("Kayıt başarısız");
        }}
      />
    </>
  );
}

function licenseExtendBaseDate(endDate) {
  const t = todayIso();
  if (!endDate || endDate < t) return t;
  return endDate;
}

function LicenseExtendModal({ target, onClose, onApply }) {
  if (!target) return null;

  const base = licenseExtendBaseDate(target.licenseEndDate);

  function apply(years) {
    if (years < 1 || years > 3) return;
    const nextEnd = addYears(base, years);
    onApply({ id: target.id, licenseEndDate: nextEnd });
  }

  return (
    <Modal open onClose={onClose} size="md">
      <div className="p-5 sm:p-7">
        <p className="yk-eyebrow">Lisans uzat</p>
        <h3 className="yk-display text-xl text-ink-900 mt-1 mb-1">
          {target.fullName || target.username}
        </h3>
        <p className="text-sm text-ink-500 mb-4">
          Uzatma, geçerli bitiş ({formatDate(base)} üzerinden) veya (süresi dolduysa) bugünden
          itibaren uygulanır. Tek seferde en fazla 3 yıl eklenir.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => apply(1)}>
            +1 yıl
          </Button>
          <Button variant="outline" onClick={() => apply(2)}>
            +2 yıl
          </Button>
          <Button variant="outline" onClick={() => apply(3)}>
            +3 yıl
          </Button>
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function UserEditModal({ value, onClose, onSave, registryChamberOnly }) {
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
            {registryChamberOnly ? (
              <div className="yk-input-shell-flat w-full text-sm font-semibold text-ink-800 py-2.5 px-3">
                Oda Yönetimi
              </div>
            ) : (
              <div className="yk-input-shell-flat w-full text-sm font-semibold text-ink-800 py-2.5 px-3">
                {draft.role === "chamber" ? "Oda Yönetimi" : "Mobilyacı"}
              </div>
            )}
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
          <Field label="Telefon" className="sm:col-span-2">
            <TextInput
              value={draft.phone ?? ""}
              onChange={(v) => setDraft({ ...draft, phone: v })}
              inputMode="tel"
            />
          </Field>
          <Field label="Adres" className="sm:col-span-2">
            <TextInput
              value={draft.addressLine ?? ""}
              onChange={(v) => setDraft({ ...draft, addressLine: v })}
            />
          </Field>
          <Field label="İl">
            <TextInput
              value={draft.cityProvince ?? ""}
              onChange={(v) => setDraft({ ...draft, cityProvince: v })}
            />
          </Field>
          <Field label="İlçe">
            <TextInput
              value={draft.district ?? ""}
              onChange={(v) => setDraft({ ...draft, district: v })}
            />
          </Field>
          <Field label="Vergi dairesi">
            <TextInput
              value={draft.taxOffice ?? ""}
              onChange={(v) => setDraft({ ...draft, taxOffice: v })}
            />
          </Field>
          <Field label="Vergi no / TC (son hane saklanabilir)">
            <TextInput
              value={draft.taxNumber ?? ""}
              onChange={(v) => setDraft({ ...draft, taxNumber: v })}
            />
          </Field>
          {(draft.role === "producer" || draft.role === "chamber") && (
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

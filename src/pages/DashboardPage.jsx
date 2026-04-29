import React, { useMemo, useState } from "react";
import { Wallet, Receipt, Folder, Layers3, Send, Pencil, Trash2, Eye } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import KpiCard from "../components/ui/KpiCard.jsx";
import Field from "../components/inputs/Field.jsx";
import TextInput from "../components/inputs/TextInput.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/modals/Modal.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { useConfirm, useToast } from "../context/ModalContext.jsx";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatNumber } from "../utils/format.js";

export default function DashboardPage() {
  const { remote, commit } = useApp();
  const user = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variant, setVariant] = useState("info");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [editingBroadcast, setEditingBroadcast] = useState(null);
  const [viewingBroadcast, setViewingBroadcast] = useState(null);

  const isChamber = user?.role === "chamber";

  const stats = useMemo(() => {
    const quotes = remote?.quotes || [];
    let totalRevenue = 0;
    let totalArea = 0;
    quotes.forEach((q) => {
      const calc = calculateQuoteTotals(q, remote?.qualities || []);
      totalRevenue += calc.totals.dealerGrandTotal;
      totalArea += calc.rooms.reduce((s, r) => s + r.price.panelEquivalentM2, 0);
    });
    return { totalProjects: quotes.length, totalQuotes: quotes.length, totalRevenue, totalArea };
  }, [remote]);

  async function publishBroadcast() {
    if (!title.trim()) {
      toast.error("Başlık girin.");
      return;
    }
    const id = `BRD-${Date.now()}`;
    let endAt = null;
    if (endsAtLocal) {
      const d = new Date(endsAtLocal);
      endAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const result = await commit((d) => {
      d.chamber ??= {};
      const list = [...(d.chamber.broadcasts || [])];
      list.push({
        id,
        title: title.trim(),
        body: body.trim(),
        variant: variant || "info",
        endAt,
        publishedAt: new Date().toISOString()
      });
      d.chamber.broadcasts = list;
      d.chamber.updatedAt = new Date().toLocaleDateString("tr-TR");
    });
    if (result?.ok) {
      toast.success("Duyuru yayınlandı.");
      setTitle("");
      setBody("");
      setVariant("info");
      setEndsAtLocal("");
    } else toast.error("Kaydedilemedi.");
  }

  async function saveBroadcastEdit() {
    if (!editingBroadcast?.id || !editingBroadcast.title?.trim()) {
      toast.error("Başlık zorunlu.");
      return;
    }
    const result = await commit((d) => {
      d.chamber ??= {};
      const list = [...(d.chamber.broadcasts || [])];
      const idx = list.findIndex((x) => x.id === editingBroadcast.id);
      if (idx < 0) return;
      list[idx] = {
        ...list[idx],
        title: editingBroadcast.title.trim(),
        body: (editingBroadcast.body || "").trim(),
        variant: editingBroadcast.variant || "info",
        endAt: editingBroadcast.endAt || null
      };
      d.chamber.broadcasts = list;
      d.chamber.updatedAt = new Date().toLocaleDateString("tr-TR");
    });
    if (result?.ok) {
      toast.success("Duyuru güncellendi.");
      setEditingBroadcast(null);
    } else {
      toast.error("Güncellenemedi.");
    }
  }

  async function deleteBroadcast(item) {
    const ok = await confirm({
      variant: "danger",
      title: "Duyuru silinsin mi?",
      description: `"${item.title || "Duyuru"}" kalıcı olarak kaldırılacak.`,
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    const result = await commit((d) => {
      d.chamber ??= {};
      d.chamber.broadcasts = (d.chamber.broadcasts || []).filter((b) => b.id !== item.id);
      d.users = (d.users || []).map((u) => ({
        ...u,
        dismissedBroadcastIds: (u.dismissedBroadcastIds || []).filter((id) => id !== item.id),
        broadcastViews: (u.broadcastViews || []).filter((v) => v.broadcastId !== item.id)
      }));
    });
    if (result?.ok) toast.success("Duyuru silindi.");
    else toast.error("Silinemedi.");
  }

  const viewersForBroadcast = useMemo(() => {
    if (!viewingBroadcast?.id) return [];
    const allUsers = Array.isArray(remote?.users) ? remote.users : [];
    return allUsers
      .filter((u) => !u.hiddenFromManagement && u.role === "producer")
      .map((u) => {
        const seen = (u.broadcastViews || []).find((v) => v.broadcastId === viewingBroadcast.id);
        return {
          id: u.id,
          fullName: u.fullName || u.username,
          username: u.username,
          seenAt: seen?.seenAt || null
        };
      })
      .sort((a, b) => {
        if (a.seenAt && b.seenAt) return new Date(b.seenAt) - new Date(a.seenAt);
        if (a.seenAt) return -1;
        if (b.seenAt) return 1;
        return a.fullName.localeCompare(b.fullName, "tr");
      });
  }, [remote?.users, viewingBroadcast]);

  if (isChamber) {
    const activeList = [...(remote?.chamber?.broadcasts || [])].sort((a, b) => {
      const ta = new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      return ta;
    });

    return (
      <>
        <TopBar title="Duyurular" subtitle="Üyeler giriş yaptığında bildirim görür" />
        <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-5">
          <Card>
            <CardHeader
              title="Üyelere duyuru"
              subtitle="Mobilyacılar giriş yaptığında bildirim olarak görünür."
            />
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <Field label="Başlık" required>
                <TextInput
                  value={title}
                  onChange={setTitle}
                  placeholder='Örn. "Tarifeler güncellendi"'
                />
              </Field>
              <Field label="Türü">
                <select
                  className="yk-input-shell-flat w-full"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                >
                  <option value="info">Bilgi</option>
                  <option value="success">Başarı</option>
                  <option value="warning">Uyarı</option>
                  <option value="danger">Önemli</option>
                </select>
              </Field>
              <Field
                label="Bitiş tarihi/saati"
                hint="Boş — süresiz. Dolu ise bu zamandan sonra üyeye gösterilmez."
              >
                <input
                  type="datetime-local"
                  className="yk-input-shell-flat w-full"
                  value={endsAtLocal}
                  onChange={(e) => setEndsAtLocal(e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Mesaj gövdesi">
                  <textarea
                    className="yk-input-shell-flat w-full min-h-[104px] px-3 py-2.5 text-sm rounded-xl resize-y"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Kısa açıklama metni..."
                    rows={4}
                  />
                </Field>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button icon={Send} variant="dark" onClick={publishBroadcast}>
                Yayınla
              </Button>
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-5 border-b border-ink-100">
              <CardHeader title="Son yayınlar" subtitle="Liste yalnızca yöneticiye görünür" />
            </div>
            {activeList.length === 0 ? (
              <p className="p-6 text-sm text-ink-500">
                Henüz kayıtlı duyuru yok.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {activeList.slice(0, 12).map((b) => (
                  <li key={b.id} className="px-5 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-ink-900">{b.title}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          variant="ghost"
                          icon={Eye}
                          onClick={() => setViewingBroadcast(b)}
                        >
                          Detay
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          variant="ghost"
                          icon={Pencil}
                          onClick={() =>
                            setEditingBroadcast({
                              id: b.id,
                              title: b.title || "",
                              body: b.body || "",
                              variant: b.variant || "info",
                              endAt: b.endAt ? new Date(b.endAt).toISOString().slice(0, 16) : ""
                            })
                          }
                        >
                          Düzenle
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => deleteBroadcast(b)}
                        >
                          Sil
                        </Button>
                      </div>
                    </div>
                    {b.body && (
                      <p className="text-ink-600 mt-1 whitespace-pre-wrap line-clamp-2">
                        {b.body}
                      </p>
                    )}
                    <p className="text-[11px] text-ink-400 mt-1">
                      {[b.variant, b.endAt ? `Bitiş: ${new Date(b.endAt).toLocaleString("tr-TR")}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <BroadcastEditModal
          value={editingBroadcast}
          onClose={() => setEditingBroadcast(null)}
          onChange={setEditingBroadcast}
          onSave={saveBroadcastEdit}
        />
        <BroadcastDetailModal
          broadcast={viewingBroadcast}
          viewers={viewersForBroadcast}
          onClose={() => setViewingBroadcast(null)}
        />
      </>
    );
  }

  return (
    <>
      <TopBar title="Özet" subtitle="Genel görünüm" />
      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Toplam Teklif" value={stats.totalProjects} icon={Folder} />
          <KpiCard label="Toplam Teklif" value={stats.totalQuotes} icon={Receipt} accent="ink" />
          <KpiCard
            label="Toplam Hacim"
            value={formatCurrency(stats.totalRevenue)}
            icon={Wallet}
            accent="success"
          />
          <KpiCard
            label="Toplam Alan"
            value={formatNumber(stats.totalArea, " m²")}
            icon={Layers3}
            accent="accent"
          />
        </div>

        <Card>
          <CardHeader title="Sistem Bilgisi" subtitle="Veri kaynağı ve oda bilgileri" />
          <p className="mt-3 text-sm text-ink-600 leading-relaxed">
            Tüm hesaplamalar 2026 yılında güncellenen iş kurallarına göre yapılır.
            Gardırop kapaklı/kapaksız seçeneği, vestiyer derinlik kuralları ve
            banyo sade hesaplamaları otomatik uygulanır.
          </p>
        </Card>
      </div>
    </>
  );
}

function BroadcastEditModal({ value, onClose, onChange, onSave }) {
  if (!value) return null;
  return (
    <Modal open onClose={onClose} size="lg">
      <div className="p-5 sm:p-7">
        <p className="yk-eyebrow">Duyuru düzenle</p>
        <h3 className="yk-display text-xl text-ink-900 mt-1 mb-4">Duyuru bilgileri</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Başlık" required>
            <TextInput value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
          </Field>
          <Field label="Türü">
            <select
              className="yk-input-shell-flat w-full"
              value={value.variant}
              onChange={(e) => onChange({ ...value, variant: e.target.value })}
            >
              <option value="info">Bilgi</option>
              <option value="success">Başarı</option>
              <option value="warning">Uyarı</option>
              <option value="danger">Önemli</option>
            </select>
          </Field>
          <Field label="Bitiş tarihi/saati" className="sm:col-span-2">
            <input
              type="datetime-local"
              className="yk-input-shell-flat w-full"
              value={value.endAt || ""}
              onChange={(e) => onChange({ ...value, endAt: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Mesaj gövdesi">
              <textarea
                className="yk-input-shell-flat w-full min-h-[104px] px-3 py-2.5 text-sm rounded-xl resize-y"
                value={value.body || ""}
                onChange={(e) => onChange({ ...value, body: e.target.value })}
                rows={4}
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={onSave}>Kaydet</Button>
        </div>
      </div>
    </Modal>
  );
}

function BroadcastDetailModal({ broadcast, viewers, onClose }) {
  if (!broadcast) return null;
  return (
    <Modal open onClose={onClose} size="lg">
      <div className="p-5 sm:p-7">
        <p className="yk-eyebrow">Duyuru detayları</p>
        <h3 className="yk-display text-xl text-ink-900 mt-1">{broadcast.title || "Duyuru"}</h3>
        <p className="text-xs text-ink-500 mt-1">
          Yayınlanma: {broadcast.publishedAt ? new Date(broadcast.publishedAt).toLocaleString("tr-TR") : "—"}
        </p>
        <div className="mt-4 max-h-[45vh] overflow-y-auto border border-ink-100 rounded-xl">
          <div className="divide-y divide-ink-100">
            {viewers.map((v) => (
              <div key={v.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  {v.fullName} <span className="text-ink-400">@{v.username}</span>
                </p>
                <p className="text-xs text-ink-500 mt-1">
                  {v.seenAt ? `Gördü: ${new Date(v.seenAt).toLocaleString("tr-TR")}` : "Henüz görmedi"}
                </p>
              </div>
            ))}
          </div>
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

import React, { useMemo } from "react";
import clsx from "clsx";
import {
  Plus,
  Folder,
  Wallet,
  Receipt,
  Layers3,
  Trash2,
  ArrowRight,
  Pencil
} from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import KpiCard from "../components/ui/KpiCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import Logo from "../components/ui/Logo.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { useConfirm, useToast } from "../context/ModalContext.jsx";
import { useProjectActions } from "../hooks/useProjectActions.js";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatDate } from "../utils/format.js";

export default function HomePage({ onCreateProject, onOpenQuote, onOpenProject }) {
  const { remote } = useApp();
  const user = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();
  const actions = useProjectActions();

  const visibleProjects = useMemo(() => {
    if (!remote) return [];
    if (user?.role === "producer") {
      return (remote.projects || []).filter((p) => p.ownerUserId === user.id);
    }
    return remote.projects || [];
  }, [remote, user]);

  const stats = useMemo(() => {
    let totalQuotes = 0;
    let totalRevenue = 0;
    let totalArea = 0;
    visibleProjects.forEach((p) => {
      (p.quotes || []).forEach((q) => {
        totalQuotes++;
        const calc = calculateQuoteTotals(q, remote?.qualities || []);
        totalRevenue += calc.totals.dealerGrandTotal;
        totalArea += calc.rooms.reduce((s, r) => s + r.price.panelEquivalentM2, 0);
      });
    });
    return { totalQuotes, totalRevenue, totalArea };
  }, [visibleProjects, remote]);

  async function handleCreate() {
    const id = onCreateProject();
    return id;
  }

  async function deleteProject(p) {
    const ok = await confirm({
      variant: "danger",
      title: "Proje silinsin mi?",
      description: `"${p.projectName}" projesi ve tüm teklifleri kalıcı olarak silinecek.`,
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    actions.deleteProject(p.id);
    toast.success("Proje silindi");
  }

  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "";
  const isChamber = user?.role === "chamber";

  const producerCount = useMemo(() => {
    if (!remote?.users) return 0;
    return remote.users.filter(
      (u) => !u.hiddenFromManagement && u.role === "producer"
    ).length;
  }, [remote?.users]);

  if (isChamber) {
    return (
      <>
        <TopBar title="Anasayfa" subtitle="Oda yönetimi" action={null} />

        <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-5">
          <div className="yk-card-dark p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-brand-500/30 blur-2xl" />
            <div className="relative">
              <span className="yk-chip-brand inline-flex">
                <span>Oda yönetimi{firstName ? ` · ${firstName}` : ""}</span>
              </span>
              <h2 className="yk-display text-xl sm:text-2xl mt-3 leading-tight">
                Üyelerinizi kullanıcı bilgilerinden yönetin
              </h2>
              <p className="text-sm text-white/60 mt-2 max-w-lg">
                Bu ekranda teklif veya proje listesi yok. Kayıtlar menüsünden üyeleri, Duyurular
                ekranından mesajları, Katalog’dan m² fiyat ve hizmetleri yönetin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card padded>
              <p className="yk-eyebrow">Kayıtlı mobilyacı sayısı</p>
              <p className="yk-display text-3xl text-ink-900 tabular-nums mt-2">
                {producerCount}
              </p>
            </Card>
          </div>

          <Card padded={false}>
            <div className="p-5">
              <p className="yk-eyebrow">Hızlı erişim</p>
              <h2 className="yk-display text-lg text-ink-900 mt-1">Menüden devam edin</h2>
              <p className="text-sm text-ink-500 mt-2 leading-relaxed">
                <strong>Kayıtlar</strong>: mobilyacı hesapları.{" "}
                <strong>Duyurular</strong>: üye bildirimleri.{" "}
                <strong>Katalog</strong>: malzeme m² ve ek hizmet fiyatları.
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Anasayfa"
        subtitle="Resmi Teklif Motoru"
        action={
          <Button icon={Plus} onClick={handleCreate} size="sm" variant="dark">
            <span className="hidden sm:inline">Yeni proje</span>
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-5">
        {/* Hero — Coffy tarzı siyah kart + turuncu accent */}
        <div className="yk-card-dark p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-brand-500/30 blur-2xl" />
          <div className="absolute -right-2 top-2 w-2 h-24 rounded-full bg-brand-500" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <span className="yk-chip-brand inline-flex">
                <span>Hoş geldin{firstName ? `, ${firstName}` : ""}</span>
              </span>
              <Logo size={48} variant="tile-dark" className="hidden sm:inline-flex" />
            </div>
            <h2 className="yk-display text-2xl sm:text-3xl mt-3 leading-tight">
              Premium teklif <br />
              <span className="text-brand-400">tek dokunuşta hazır.</span>
            </h2>
            <p className="text-sm text-white/60 mt-2 max-w-md">
              Resmi fiyatlar, otomatik hesaplama ve sözleşme — tek noktadan yönet.
            </p>
            <button
              type="button"
              onClick={handleCreate}
              className="mt-4 yk-btn-primary"
            >
              <Plus size={18} strokeWidth={2.4} />
              Yeni teklif başlat
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard
            label="Toplam Proje"
            value={visibleProjects.length}
            icon={Folder}
            accent="brand"
          />
          <KpiCard
            label="Toplam Teklif"
            value={stats.totalQuotes}
            icon={Receipt}
            accent="ink"
          />
          <KpiCard
            label="Toplam Hacim"
            value={formatCurrency(stats.totalRevenue)}
            icon={Wallet}
            accent="success"
            className="col-span-2 lg:col-span-1"
          />
        </div>

        <Card padded={false}>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="yk-eyebrow">Projeler</p>
              <h2 className="yk-display text-xl text-ink-900 mt-1">
                Aktif Projeler
              </h2>
            </div>
            <Button icon={Plus} onClick={handleCreate} size="sm" variant="dark">
              Ekle
            </Button>
          </div>
          {visibleProjects.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Folder}
                title="İlk projenizi ekleyin"
                description="Yeni bir proje oluşturarak teklif hazırlamaya başlayın."
                action={
                  <Button icon={Plus} onClick={handleCreate}>
                    Proje oluştur
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="px-2 pb-2">
              {visibleProjects.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  qualities={remote?.qualities || []}
                  onOpen={() => {
                    const lastQuote = p.quotes?.[p.quotes.length - 1];
                    if (lastQuote) onOpenQuote?.(p.id, lastQuote.id);
                    else onOpenProject?.(p.id);
                  }}
                  onDelete={() => deleteProject(p)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function ProjectRow({ project, qualities, onOpen, onDelete, readOnly }) {
  const lastQuote = project.quotes?.[project.quotes.length - 1];
  const calc = lastQuote ? calculateQuoteTotals(lastQuote, qualities) : null;
  return (
    <div
      className={clsx(
        "rounded-xl flex items-center gap-3 p-3 sm:p-4",
        readOnly ? "opacity-90" : "hover:bg-surface-100 transition"
      )}
    >
      <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
        <Folder size={18} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ink-900 truncate">
            {project.projectName || "Yeni Proje"}
          </h3>
          <Badge variant="dark">{project.quotes?.length || 0} teklif</Badge>
          {readOnly && (
            <Badge variant="default" className="text-[10px]">
              Salt okunur
            </Badge>
          )}
        </div>
        <p className="text-xs text-ink-500 truncate">
          {project.customerName || "—"}{project.customerPhone ? ` · ${project.customerPhone}` : ""}
        </p>
        {calc && (
          <p className="text-sm font-extrabold text-brand-600 mt-1 tabular-nums">
            {formatCurrency(calc.totals.dealerGrandTotal)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!readOnly && (
          <>
            <IconButton
              icon={ArrowRight}
              variant="dark"
              ariaLabel="Aç"
              onClick={onOpen}
            />
            <IconButton
              icon={Trash2}
              variant="danger"
              ariaLabel="Sil"
              onClick={onDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Plus,
  Folder,
  Search,
  Trash2,
  ArrowRight
} from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import Logo from "../components/ui/Logo.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { useConfirm, useToast } from "../context/ModalContext.jsx";
import { useProjectActions } from "../hooks/useProjectActions.js";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency } from "../utils/format.js";
import { isProjectActive } from "../utils/projectLifecycle.js";
import { quoteWorkflow } from "../constants/quoteWorkflow.js";

export default function HomePage({ onCreateProject, onOpenQuote }) {
  const { remote } = useApp();
  const user = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();
  const actions = useProjectActions();
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("active");
  const [quoteSearch, setQuoteSearch] = useState("");

  const visibleQuotes = useMemo(() => {
    if (!remote) return [];
    if (user?.role === "producer") {
      return (remote.quotes || []).filter((q) => q.ownerUserId === user.id);
    }
    return remote.quotes || [];
  }, [remote, user]);

  const filteredQuotes = useMemo(() => {
    let list = visibleQuotes;
    if (quoteStatusFilter === "active") {
      list = list.filter((q) => isProjectActive(q) && !["contracted", "completed"].includes(quoteWorkflow(q)));
    }
    if (quoteStatusFilter === "inactive") {
      list = list.filter((q) => !isProjectActive(q));
    }
    if (quoteStatusFilter === "contracted") {
      list = list.filter((q) => ["contracted", "completed"].includes(quoteWorkflow(q)));
    }
    const q = quoteSearch.trim().toLocaleLowerCase("tr");
    if (!q) return list;
    return list.filter((item) => {
      const hay = [item.projectName, item.customerName, item.contractCode, item.customerPhone]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");
      return hay.includes(q);
    });
  }, [visibleQuotes, quoteStatusFilter, quoteSearch]);

  async function handleCreate() {
    const id = await onCreateProject();
    return id;
  }

  async function deleteQuote(item) {
    const ok = await confirm({
      variant: "danger",
      title: "Teklif silinsin mi?",
      description: `"${item.projectName}" teklifi kalıcı olarak silinecek.`,
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç"
    });
    if (!ok) return;
    actions.deleteProject(item.id);
    toast.success("Teklif silindi");
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
      <TopBar title="Anasayfa" subtitle="Resmi Teklif Motoru" />

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

        <Card padded={false}>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="yk-eyebrow">Teklifler</p>
              <h2 className="yk-display text-xl text-ink-900 mt-1">
                Teklif listesi
              </h2>
            </div>
          </div>
          <div className="px-4 pb-4 space-y-3 border-b border-ink-100">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
                aria-hidden
              />
              <input
                type="search"
                value={quoteSearch}
                onChange={(e) => setQuoteSearch(e.target.value)}
                placeholder="Teklif, müşteri, kod veya telefon…"
                className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "active", label: "Aktif teklifler" },
                { id: "inactive", label: "Pasif teklifler" },
                { id: "contracted", label: "Sözleşmeler" }
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setQuoteStatusFilter(chip.id)}
                  className={clsx(
                    "yk-chip text-xs font-semibold transition",
                    quoteStatusFilter === chip.id
                      ? "bg-ink-900 text-white border-ink-900"
                      : "bg-white text-ink-600 border-ink-200 hover:border-ink-300"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          {visibleQuotes.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-500">
              Henüz teklif bulunmuyor.
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-500">
              Arama veya filtreyle eşleşen teklif yok.
            </div>
          ) : (
            <div className="px-2 pb-2">
              {filteredQuotes.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  qualities={remote?.qualities || []}
                  onOpen={() => {
                    onOpenQuote?.(p.id, p.id);
                  }}
                  onDelete={() => deleteQuote(p)}
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
  const calc = calculateQuoteTotals(project, qualities);
  const activeProject = isProjectActive(project);
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
            {project.projectName || "Yeni Teklif"}
          </h3>
          <Badge variant="dark">Teklif #{project.number || 1}</Badge>
          {!activeProject && (
            <Badge variant="default" className="text-[10px] bg-ink-200 text-ink-800 border-ink-300">
              Pasif
            </Badge>
          )}
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

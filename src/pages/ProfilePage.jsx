import React from "react";
import { User2, LogOut, ShieldCheck, Building2, Briefcase, Wallet, Receipt } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import KpiCard from "../components/ui/KpiCard.jsx";
import Button from "../components/ui/Button.jsx";
import Logo from "../components/ui/Logo.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { useConfirm } from "../context/ModalContext.jsx";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatDate } from "../utils/format.js";

const ROLE_LABEL = {
  system_admin: "Sistem Admin",
  chamber: "Oda Yönetimi",
  producer: "Mobilyacı"
};

export default function ProfilePage() {
  const { remote, logout, storageMode } = useApp();
  const user = useCurrentUser();
  const confirm = useConfirm();

  const myProjects = (remote?.projects || []).filter(
    (p) => p.ownerUserId === user?.id
  );
  const myQuotes = myProjects.flatMap((p) => p.quotes || []);
  const totalRevenue = myQuotes.reduce(
    (s, q) =>
      s + calculateQuoteTotals(q, remote?.qualities || []).totals.dealerGrandTotal,
    0
  );

  async function handleLogout() {
    const ok = await confirm({
      variant: "warning",
      title: "Çıkış yapılsın mı?",
      description: "Aktif oturumunuz sonlandırılacak ve giriş ekranına dönülecek.",
      confirmLabel: "Çıkış yap",
      cancelLabel: "Vazgeç"
    });
    if (ok) logout();
  }

  return (
    <>
      <TopBar title="Profil" subtitle="Hesap bilgileri" />
      <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto space-y-5">
        <div className="yk-card-dark p-5 flex items-center gap-4">
          <Logo size={64} variant="tile-dark" />
          <div className="min-w-0">
            <h2 className="yk-display text-2xl truncate">
              {user?.fullName || "—"}
            </h2>
            <p className="text-sm text-white/60 truncate">
              {user?.company || ""}
            </p>
            <span className="yk-chip-brand mt-2">
              {ROLE_LABEL[user?.role] || user?.role}
            </span>
          </div>
        </div>

        {user?.role === "producer" && (
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Toplam Teklif"
              value={myQuotes.length}
              icon={Receipt}
            />
            <KpiCard
              label="Toplam Hacim"
              value={formatCurrency(totalRevenue)}
              icon={Wallet}
              accent="success"
            />
          </div>
        )}

        <Card>
          <CardHeader title="Hesap Detayı" subtitle="Lisans ve bağlantı durumu" />
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <InfoRow label="Kullanıcı adı" value={user?.username} icon={User2} />
            <InfoRow label="Rol" value={ROLE_LABEL[user?.role] || "—"} icon={ShieldCheck} />
            <InfoRow label="Firma" value={user?.company} icon={Building2} />
            <InfoRow
              label="Lisans"
              value={
                user?.licenseEndDate
                  ? `Bitiş: ${formatDate(user.licenseEndDate)}`
                  : "Süresiz"
              }
              icon={Briefcase}
            />
            <InfoRow
              label="Bağlantı modu"
              value={
                storageMode === "live"
                  ? "Canlı veritabanı"
                  : storageMode === "browser"
                    ? "Çevrimdışı önbellek"
                    : "Demo / yerel"
              }
            />
          </div>
        </Card>

        <Button
          variant="ghost"
          size="lg"
          icon={LogOut}
          fullWidth
          onClick={handleLogout}
        >
          Çıkış yap
        </Button>
      </div>
    </>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3.5 flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-surface-100 text-ink-700 flex items-center justify-center shrink-0">
          <Icon size={16} strokeWidth={2.2} />
        </div>
      )}
      <div className="min-w-0">
        <p className="yk-eyebrow truncate">{label}</p>
        <p className="text-sm font-bold text-ink-900 mt-0.5 truncate">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

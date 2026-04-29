import React, { useRef } from "react";
import { User2, LogOut, ShieldCheck, Building2, Briefcase, Wallet, Receipt, FileDown } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import KpiCard from "../components/ui/KpiCard.jsx";
import Button from "../components/ui/Button.jsx";
import Logo from "../components/ui/Logo.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { useConfirm, useToast } from "../context/ModalContext.jsx";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatDate } from "../utils/format.js";
import { downloadElementAsPdf, formatPdfErrorForUser } from "../utils/pdf.js";

const ROLE_LABEL = {
  system_admin: "Sistem Admin",
  chamber: "Oda Yönetimi",
  producer: "Mobilyacı"
};

export default function ProfilePage() {
  const { remote, logout, storageMode } = useApp();
  const user = useCurrentUser();
  const confirm = useConfirm();
  const toast = useToast();
  const guidePdfRef = useRef(null);

  const myQuotes = (remote?.quotes || []).filter((q) => q.ownerUserId === user?.id);
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

  async function downloadGuidePdf() {
    if (!guidePdfRef.current) {
      toast.error("Kılavuz içeriği hazırlanamadı.");
      return;
    }
    try {
      await downloadElementAsPdf(guidePdfRef.current, "kullanim-kilavuzu");
    } catch (err) {
      toast.error(formatPdfErrorForUser(err, "Kılavuz PDF indirilemedi"));
    }
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

        <Card>
          <CardHeader
            title="Hızlı Kullanım Kılavuzu"
            subtitle="Projenin temel akışı ve operasyon adımları"
            action={
              <Button size="sm" variant="outline" icon={FileDown} onClick={downloadGuidePdf}>
                PDF indir
              </Button>
            }
          />
          <div className="mt-4 space-y-3 text-sm text-ink-700 leading-relaxed">
            <GuideBlock
              title="1) Teklif Oluşturma"
              description="Ana sayfadan yeni teklif başlatın, teklif bilgilerini girin ve odaları ekleyin."
            />
            <GuideBlock
              title="2) Oda Hesaplama"
              description="Oda ölçülerini girin, kalite seçin, ek hırdavat/hizmet satırlarını düzenleyin."
            />
            <GuideBlock
              title="3) İndirim ve Toplam"
              description="İndirim oranı ile manuel tutar senkron çalışır. Net tutar üst KPI kartlarında izlenir."
            />
            <GuideBlock
              title="4) Duyuru ve Kullanıcı Yönetimi"
              description="Oda yönetimi panelinden kullanıcıları yönetin, duyuru yayınlayın ve okunma detayını takip edin."
            />
            <p className="text-xs text-ink-500">
              Not: Bu özet, günlük operasyon için temel akışı sunar. PDF çıktısı aynı içerikle paylaşım için uygundur.
            </p>
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

      <div className="fixed left-0 top-0 z-[60] w-[210mm] max-w-[100vw] max-h-[100vh] overflow-auto opacity-[0.02] pointer-events-none bg-white" aria-hidden>
        <div ref={guidePdfRef} data-yk-print-root className="p-6 bg-white text-black">
          <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>Yokuş Mobilya Yazılımı - Kullanım Kılavuzu</h1>
          <p style={{ fontSize: "12px", marginBottom: "14px" }}>Oluşturulma: {new Date().toLocaleString("tr-TR")}</p>
          <ol style={{ fontSize: "13px", lineHeight: 1.7, paddingLeft: "18px" }}>
            <li><b>Teklif Oluşturma:</b> Ana sayfa üzerinden yeni teklif başlatılır, müşteri bilgileri kaydedilir.</li>
            <li><b>Oda Ekleme:</b> Oda tipi seçilir, ölçüler girilir, kalite seçilir ve oda kaydedilir.</li>
            <li><b>İndirim ve Ek Hizmet:</b> Ek hizmetler ve indirimler kartlar üzerinden güncellenir.</li>
            <li><b>PDF ve Sözleşme:</b> Teklif PDF çıktısı alınır, gerekirse sözleşme aşamasına çevrilir.</li>
            <li><b>Oda Yönetimi:</b> Kullanıcılar, lisanslar ve duyurular merkezi panelden yönetilir.</li>
          </ol>
          <div style={{ marginTop: "16px", border: "1px solid #ddd", borderRadius: "8px", padding: "10px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700 }}>Ekran Özeti</p>
            <p style={{ fontSize: "12px", marginTop: "4px" }}>
              Ana ekran: teklif listesi ve hızlı aksiyonlar • Teklif düzenleyici: oda, indirim, süreç kartları •
              Oda yönetimi: kullanıcı ve duyuru operasyonları
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function GuideBlock({ title, description }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-surface-50 p-3">
      <p className="font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-xs text-ink-600">{description}</p>
    </div>
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

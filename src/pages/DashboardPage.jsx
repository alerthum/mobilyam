import React, { useMemo } from "react";
import { Wallet, Receipt, Folder, Layers3 } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import KpiCard from "../components/ui/KpiCard.jsx";
import { useApp } from "../context/AppContext.jsx";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatNumber } from "../utils/format.js";

export default function DashboardPage() {
  const { remote } = useApp();

  const stats = useMemo(() => {
    const projects = remote?.projects || [];
    let totalQuotes = 0;
    let totalRevenue = 0;
    let totalArea = 0;
    projects.forEach((p) => {
      (p.quotes || []).forEach((q) => {
        totalQuotes++;
        const calc = calculateQuoteTotals(q, remote?.qualities || []);
        totalRevenue += calc.totals.dealerGrandTotal;
        totalArea += calc.rooms.reduce((s, r) => s + r.price.panelEquivalentM2, 0);
      });
    });
    return { totalProjects: projects.length, totalQuotes, totalRevenue, totalArea };
  }, [remote]);

  return (
    <>
      <TopBar title="Özet" subtitle="Genel görünüm" />
      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Toplam Proje" value={stats.totalProjects} icon={Folder} />
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

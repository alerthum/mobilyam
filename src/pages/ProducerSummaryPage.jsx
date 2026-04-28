import React, { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Layers3,
  Truck,
  Puzzle,
  Lightbulb,
  Wallet,
  LayoutGrid,
  Palette
} from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card, { CardHeader } from "../components/ui/Card.jsx";
import KpiCard from "../components/ui/KpiCard.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency } from "../utils/format.js";
import { quoteWorkflow } from "../constants/quoteWorkflow.js";
import { buildProducerAnalytics } from "../utils/producerAnalytics.js";
import { isProjectActive } from "../utils/projectLifecycle.js";

function ymKey(dateStr) {
  if (!dateStr || dateStr.length < 7) return null;
  return dateStr.slice(0, 7);
}

function quoteExtrasFlags(quote, qualities) {
  const c = calculateQuoteTotals(quote, qualities);
  const hw = c.totals.hardwareExtrasTotal > 0;
  const glass = c.totals.glassExtrasTotal > 0;
  const svc = c.totals.servicesTotal > 0;
  return { hw, glass, svc, hasExtras: hw || glass || svc };
}

function isConverted(wf) {
  return wf === "contracted" || wf === "completed";
}

function BarRank({ label, value, max }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs gap-2">
        <span className="text-ink-700 font-medium truncate">{label}</span>
        <span className="shrink-0 font-bold text-ink-900 tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProducerSummaryPage() {
  const user = useCurrentUser();
  const { remote } = useApp();
  const qualities = remote?.qualities || [];

  const rows = useMemo(() => {
    const quotes =
      user?.role === "system_admin"
        ? remote?.quotes || []
        : (remote?.quotes || []).filter((q) => q.ownerUserId === user?.id);

    const list = [];
    quotes.forEach((q) => {
      if (!isProjectActive(q)) return;
      const wf = quoteWorkflow(q);
      const calc = calculateQuoteTotals(q, qualities);
      list.push({
        project: q,
        quote: q,
        date: q.date,
        ym: ymKey(q.date),
        wf,
        projectName: q.projectName,
        total: calc.totals.dealerGrandTotal,
        ...quoteExtrasFlags(q, qualities),
        converted: isConverted(wf)
      });
    });
    return list;
  }, [remote?.quotes, qualities, user?.id, user?.role]);

  const analytics = useMemo(() => buildProducerAnalytics(rows, qualities), [rows, qualities]);

  const maxRoom = useMemo(
    () => Math.max(1, ...analytics.topRooms.map(([, n]) => n)),
    [analytics.topRooms]
  );
  const maxQual = useMemo(
    () => Math.max(1, ...analytics.topQualities.map(([, n]) => n)),
    [analytics.topQualities]
  );

  const byMonth = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (!r.ym) return;
      const cur = map.get(r.ym) || { count: 0, amount: 0, converted: 0 };
      cur.count += 1;
      cur.amount += r.total;
      if (r.converted) cur.converted += 1;
      map.set(r.ym, cur);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 24);
  }, [rows]);

  const kpis = useMemo(() => {
    const totalQ = rows.length;
    const conv = rows.filter((r) => r.converted).length;
    const withX = rows.filter((r) => r.hasExtras);
    const woX = rows.filter((r) => !r.hasExtras);
    const rate = (subset) =>
      subset.length === 0 ? 0 : subset.filter((r) => r.converted).length / subset.length;
    const sumTot = rows.reduce((s, r) => s + r.total, 0);
    return {
      totalQ,
      conv,
      convRate: totalQ ? conv / totalQ : 0,
      withExtrasRate: rate(withX),
      withoutExtrasRate: rate(woX),
      sumTot,
      uniqueProjects: new Set(rows.map((r) => r.project.legacyProjectId || r.project.id)).size
    };
  }, [rows]);

  const insights = useMemo(() => {
    const lines = [];
    if (rows.length === 0) {
      lines.push("Henüz teklif kaydı yok. İlk teklifleri oluşturdukça bu panel otomatik dolacak.");
      return lines;
    }
    const topR = analytics.topRooms[0]?.[0];
    const topQ = analytics.topQualities[0]?.[0];
    lines.push(
      `Toplam ${kpis.totalQ} teklif, ${kpis.uniqueProjects} projede; net tutarlar toplamı ${formatCurrency(kpis.sumTot)}.`
    );
    lines.push(
      `Sözleşme / tamamlandı olan ${kpis.conv} teklif (${(kpis.convRate * 100).toFixed(1)}%).`
    );
    if (topR) lines.push(`Modül / oda tipi olarak en çok teklif gördüğünüz başlık: “${topR}”.`);
    if (topQ) lines.push(`En sık seçilen kalite yüzeyi: “${topQ}”.`);
    if (kpis.withExtrasRate !== kpis.withoutExtrasRate) {
      lines.push(
        `Ek hırdavat, cam veya ek hizmet satırları olan tekliflerde dönüşüm oranı yaklaşık %${(kpis.withExtrasRate * 100).toFixed(1)}; sadece ana kalemlerle kalanlarda %${(kpis.withoutExtrasRate * 100).toFixed(1)}.`
      );
    }
    return lines;
  }, [rows, analytics, kpis]);

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden">
      <TopBar title="Özet" subtitle="Satış hafızası — oda, kalite ve dönüşüm" />
      <div className="px-3 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto w-full space-y-4 sm:space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <KpiCard label="Toplam teklif" value={kpis.totalQ} icon={BarChart3} accent="brand" />
          <KpiCard label="Projeler" value={kpis.uniqueProjects} icon={LayoutGrid} accent="accent" />
          <KpiCard label="Dönüşüm" value={`%${(kpis.convRate * 100).toFixed(1)}`} icon={TrendingUp} accent="success" />
          <KpiCard label="Net hacim" value={formatCurrency(kpis.sumTot)} icon={Wallet} accent="ink" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card padded>
            <CardHeader title="En çok eklenen modüller" subtitle="Oda tipi (gardırop, mutfak…)" icon={LayoutGrid} />
            <div className="mt-4 space-y-3">
              {analytics.topRooms.length === 0 ? (
                <p className="text-sm text-ink-500">Henüz örnek yok.</p>
              ) : (
                analytics.topRooms.map(([label, n]) => (
                  <BarRank key={label} label={label} value={n} max={maxRoom} />
                ))
              )}
            </div>
          </Card>
          <Card padded>
            <CardHeader title="Kalite seçimleri" subtitle="Kalite yüzeyi sıklığı" icon={Palette} />
            <div className="mt-4 space-y-3">
              {analytics.topQualities.length === 0 ? (
                <p className="text-sm text-ink-500">Henüz örnek yok.</p>
              ) : (
                analytics.topQualities.map(([label, n]) => (
                  <BarRank key={label} label={label} value={n} max={maxQual} />
                ))
              )}
            </div>
          </Card>
        </div>

        <Card padded={false}>
          <div className="p-5 border-b border-ink-100">
            <CardHeader title="Kalite × oda ısı haritası (özet)" subtitle="Hangi modülde hangi kalite sık seçilmiş?" />
          </div>
          <div className="divide-y divide-ink-100 max-h-[340px] overflow-y-auto">
            {analytics.heatRows.length === 0 ? (
              <p className="p-5 text-sm text-ink-500">Veri oluşunca doldurulur.</p>
            ) : (
              analytics.heatRows.map(({ roomLabel, qualLabel, n }) => (
                <div key={`${roomLabel}-${qualLabel}`} className="px-5 py-3 flex justify-between text-sm gap-4">
                  <span className="font-semibold text-ink-900">
                    {roomLabel}
                    <span className="text-ink-400 font-normal"> · </span>
                    <span className="text-brand-700">{qualLabel}</span>
                  </span>
                  <span className="shrink-0 font-black tabular-nums text-ink-800">{n} satır</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Kurumsal içgörüler"
            subtitle="Davranış ve dönüşüm (aktif projeler)"
            icon={Lightbulb}
            accent="bg-warning-50 text-warning-700"
          />
          <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-[11px] sm:text-sm text-ink-600 leading-snug sm:leading-relaxed">
            {insights.map((t, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="text-brand-500 font-bold shrink-0">{i + 1}.</span>
                <span className="min-w-0 break-words">{t}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padded={false}>
          <div className="p-5 border-b border-ink-100">
            <CardHeader title="Ay bazında hacim" subtitle="Teklif tarihi (yyyy-aa)" icon={Layers3} />
          </div>
          {byMonth.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">Yeterli tarih örüklemi yok.</p>
          ) : (
            <div className="divide-y divide-ink-100 max-h-[360px] overflow-y-auto">
              {byMonth.map(([month, agg]) => (
                <div
                  key={month}
                  className="px-5 py-4 flex flex-wrap items-center gap-4 justify-between"
                >
                  <span className="font-bold text-ink-900">{month}</span>
                  <div className="flex flex-wrap gap-3 text-xs text-ink-600">
                    <span className="yk-chip">{agg.count} teklif</span>
                    <span className="yk-chip-brand">{formatCurrency(agg.amount)}</span>
                    <span className="yk-chip text-success-700">{agg.converted} dönüşüm</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="yk-card overflow-hidden p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Ek kalemler
                </p>
                <p className="mt-1 text-[11px] leading-snug text-ink-600">
                  Cam · hırdavat · ek hizmet dahil tekliflerde dönüşüm oranı.
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-brand-600 text-white shadow-md ring-1 ring-white/20">
                <Truck size={18} strokeWidth={2.2} aria-hidden />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums text-brand-700">
              %{(kpis.withExtrasRate * 100).toFixed(1)}
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-ink-500">Bu gruptaki sözleşmeye dönüş.</p>
          </div>
          <div className="yk-card overflow-hidden p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Ana kalemler
                </p>
                <p className="mt-1 text-[11px] leading-snug text-ink-600">
                  Yalnızca ana kalem satırları; ek satır yok. Karşılaştırma.
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-800 text-white shadow-md ring-1 ring-white/15">
                <Puzzle size={18} strokeWidth={2.2} aria-hidden />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums text-ink-800">
              %{(kpis.withoutExtrasRate * 100).toFixed(1)}
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-ink-500">Sadece çekirdek kalemler grubu.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

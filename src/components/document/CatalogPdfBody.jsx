import React from "react";
import { formatCurrency } from "../../utils/format.js";

/** Kalite + (isteğe bağlı) ek hizmet kataloğu — salt görüntü PDF. */
export default function CatalogPdfBody({ qualities, services = [] }) {
  return (
    <div
      className="text-ink-900 text-[13px] p-10 max-w-[210mm] mx-auto bg-white"
      data-yk-print-root
    >
      <header className="border-b-2 border-ink-900 pb-4 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
          Resmi fiyat kataloğu
        </p>
        <h1 className="text-2xl font-black tracking-tight text-ink-900 mt-1">
          Malzeme m² fiyatları
        </h1>
      </header>
      <div className="space-y-2 mb-10">
        {(qualities || []).map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-surface-50 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-ink-900">{q.name}</p>
              {q.note && <p className="text-[11px] text-ink-500 mt-0.5">{q.note}</p>}
            </div>
            <p className="shrink-0 font-extrabold text-ink-900 tabular-nums">
              {formatCurrency(q.officialSqmPrice)}
              <span className="text-ink-400 font-semibold text-sm"> / m²</span>
            </p>
          </div>
        ))}
      </div>

      {(services || []).length > 0 && (
        <>
          <header className="border-b-2 border-ink-900 pb-4 mb-6">
            <h2 className="text-xl font-black text-ink-900">Ek hizmetler</h2>
            <p className="text-xs text-ink-500 mt-1">Birim fiyatlar — teklif satırında kullanılır.</p>
          </header>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-ink-900 text-white text-left">
                <th className="py-2.5 px-3 font-semibold rounded-tl-lg">Hizmet</th>
                <th className="py-2.5 px-3 font-semibold">Birim</th>
                <th className="py-2.5 px-3 font-semibold text-right rounded-tr-lg">Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr
                  key={s.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-surface-50"}
                >
                  <td className="py-2.5 px-3 border-b border-ink-100 font-semibold">{s.name}</td>
                  <td className="py-2.5 px-3 border-b border-ink-100 text-ink-600">{s.unit}</td>
                  <td className="py-2.5 px-3 border-b border-ink-100 text-right font-bold tabular-nums">
                    {formatCurrency(s.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

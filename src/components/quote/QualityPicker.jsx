import React from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { formatCurrency } from "../../utils/format.js";

/**
 * Görsel kalite seçimi — dropdown yerine kart bazlı seçim.
 *
 * Her kalitede “Bu oda” tutarı: yalnızca m² × o kalitenin birim fiyatı (`baseOfficial`).
 * Ek hırdavat ayrı satır; bu kartlar hırdavat girilse bile sadece kalite×m² gösterir.
 */
export default function QualityPicker({ value, onChange, qualities, calcRoomPrice }) {
  if (!qualities?.length) {
    return (
      <p className="text-sm text-ink-500">Kalite tanımı bulunamadı.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {qualities.map((q) => {
        const active = value === q.id;
        const priceForRoom = calcRoomPrice ? calcRoomPrice(q) : null;
        const showRoomTotal =
          priceForRoom && priceForRoom.panelEquivalentM2 > 0;

        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onChange(q.id)}
            className={clsx(
              "rounded-xl border bg-white p-3 text-left transition active:scale-[0.99] flex flex-col gap-2",
              active
                ? "border-brand-500 ring-4 ring-brand-50"
                : "border-ink-100 hover:border-ink-200"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-ink-900 truncate">
                {q.name}
              </span>
              {active && (
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-500 text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-ink-500 tabular-nums">
              {formatCurrency(q.officialSqmPrice)}{" "}
              <span className="text-ink-400 font-medium">/ m²</span>
            </p>

            {showRoomTotal ? (
              <div
                className={clsx(
                  "rounded-lg px-2.5 py-2 mt-auto",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "bg-surface-100 text-ink-900"
                )}
              >
                <p className="yk-eyebrow leading-none">Bu oda</p>
                <p className="yk-display text-base mt-1 tabular-nums leading-none">
                  {formatCurrency(priceForRoom.baseOfficial)}
                </p>
                <p className="text-[10px] text-ink-500 mt-1 tabular-nums">
                  {priceForRoom.panelEquivalentM2.toLocaleString("tr-TR", {
                    maximumFractionDigits: 2
                  })}{" "}
                  m² × {formatCurrency(q.officialSqmPrice)}
                </p>
              </div>
            ) : (
              q.note && (
                <p className="text-[11px] text-ink-400 truncate">{q.note}</p>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}

import { calculateQuoteTotals, getMutfakM2Breakdown } from "./calculations.js";
import { getRoomDefinition } from "../config/rooms.js";
import { formatNumber, formatDate } from "./format.js";

function fmtM2(n) {
  return formatNumber(Number(n) || 0, " m²");
}

/**
 * Sözleşme maili için fiyatsız m² raporu (oda oda detay).
 */
export function buildQuoteM2Report(quote, qualities, countertopCatalog, context = {}) {
  const calc = calculateQuoteTotals(quote, qualities || [], countertopCatalog || []);
  const rooms = (calc.rooms || []).map(({ room, price }) => {
    const def = getRoomDefinition(room.type);
    const roomLabel = room.label || def?.label || room.type || "Oda";
    const lines = [];

    (price.metrics?.breakdown || []).forEach((row) => {
      lines.push({
        label: row.label,
        m2: fmtM2(row.m2),
        formula: row.formula || "",
        detail: row.meta || row.formula || ""
      });
    });

    if (room.type === "mutfak" || room.type === "kitchen") {
      const mutfak = getMutfakM2Breakdown(room.basic || {});
      mutfak.rows.forEach((row) => {
        lines.push({
          label: row.label,
          m2: fmtM2(row.m2),
          formula: "",
          detail: row.detail || ""
        });
      });
      if (mutfak.tezgahLinearM > 0) {
        lines.push({
          label: "Tezgah uzunluğu",
          m2: formatNumber(mutfak.tezgahLinearM, " m"),
          formula: "",
          detail: mutfak.tezgahLinearDetail || ""
        });
      }
    }

    return {
      roomLabel,
      roomType: room.type,
      totalM2: fmtM2(price.panelEquivalentM2),
      lines
    };
  });

  const totalM2Num = (calc.rooms || []).reduce(
    (s, r) => s + (Number(r.price.panelEquivalentM2) || 0),
    0
  );

  return {
    projectName: quote.projectName || context.projectName || "Proje",
    quoteNumber: quote.number,
    quoteDate: formatDate(quote.date),
    contractDate: formatDate(quote.contractedAt || quote.date),
    chamberName: context.chamberName || "",
    producerName: context.producerName || "",
    producerCompany: context.producerCompany || "",
    roomCount: rooms.length,
    totalM2: fmtM2(totalM2Num),
    rooms
  };
}

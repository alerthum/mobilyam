import { getRoomDefinition } from "../config/rooms.js";

/**
 * Üretici özet ekranı — teklif geçmişinden sektör analizi.
 */
export function buildProducerAnalytics(rowsWithQuote, qualitiesList) {
  const qualityById = new Map((qualitiesList || []).map((q) => [q.id, q.name]));
  const roomCounts = new Map();
  const qualityCounts = new Map();
  const pairMap = new Map();

  (rowsWithQuote || []).forEach((row) => {
    const q = row.quote;
    if (!q?.rooms) return;
    q.rooms.forEach((room) => {
      const def = getRoomDefinition(room.type);
      const label = def?.label || room.type || "Diğer";
      roomCounts.set(label, (roomCounts.get(label) || 0) + 1);

      const qid = room.selectedQualityId;
      const qname = qualityById.get(qid) || "—";
      qualityCounts.set(qname, (qualityCounts.get(qname) || 0) + 1);

      const key = `${label}||${qname}`;
      pairMap.set(key, (pairMap.get(key) || 0) + 1);
    });
  });

  const topRooms = [...roomCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topQualities = [...qualityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const heatRows = [...pairMap.entries()]
    .map(([k, n]) => {
      const [roomLabel, qualLabel] = k.split("||");
      return { roomLabel, qualLabel, n };
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 24);

  return { topRooms, topQualities, heatRows, roomCounts, qualityCounts };
}

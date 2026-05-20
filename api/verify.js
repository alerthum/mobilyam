const { getRemoteState } = require("./_db");
const { pickChamberBlock } = require("./_auth");
const { publicMemberDto } = require("./_verifyPublic");

function extractToken(req) {
  const url = req.url || "";
  const q = url.indexOf("?");
  const path = q >= 0 ? url.slice(0, q) : url;
  const parts = path.split("/").filter(Boolean);
  const idx = parts.indexOf("verify");
  if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
  if (req.query?.token) return String(req.query.token);
  return "";
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      res.status(405).json({ error: "Yalnızca GET" });
      return;
    }

    const token = extractToken(req);
    if (!token) {
      res.status(400).json({ error: "Token gerekli" });
      return;
    }

    const payload = await getRemoteState();
    const users = payload.data?.users || [];
    const user = users.find((u) => u && u.verifyToken === token);
    if (!user || user.hiddenFromManagement || user.role === "system_admin") {
      res.status(404).json({ error: "Üyelik kaydı bulunamadı" });
      return;
    }

    const block = pickChamberBlock(payload.data, user.chamberId);
    const chamberName = block?.chamberName || payload.data?.chamber?.chamberName || "Oda";

    res.status(200).json({ ok: true, member: publicMemberDto(user, chamberName) });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", detail: error.message });
  }
};

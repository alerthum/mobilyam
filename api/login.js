const { getRemoteState } = require("./_db");
const { canLogin, createSessionToken, filterStateForUser } = require("./_auth");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "Bu endpoint sadece POST destekler" });
      return;
    }

    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "").trim();

    if (!username || !password) {
      res.status(400).json({ error: "Kullanıcı adı ve şifre zorunludur" });
      return;
    }

    const payload = await getRemoteState();
    const user = (payload.data.users || []).find((item) => item.username === username && item.password === password);

    if (!user) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      return;
    }

    if (!canLogin(user)) {
      res.status(403).json({ error: "Bu kullanıcının lisansı pasif veya süresi dolmuş" });
      return;
    }

    res.status(200).json({
      ok: true,
      token: createSessionToken(user),
      auth: { userId: user.id, role: user.role },
      data: filterStateForUser(payload.data, user),
      storageMode: payload.storageMode || "live"
    });
  } catch (error) {
    res.status(500).json({
      error: "Sunucu hatası",
      detail: error.message
    });
  }
};

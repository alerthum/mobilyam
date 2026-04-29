const { getRemoteState, saveRemoteState } = require("./_db");
const { canLogin, createSessionToken, filterStateForUser } = require("./_auth");

function cloneState(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

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

    const now = new Date().toISOString();
    const data = cloneState(payload.data);
    data.users = (data.users || []).map((item) =>
      item.id === user.id ? { ...item, lastLoginAt: now } : item
    );
    await saveRemoteState(data);

    const freshUser = (data.users || []).find((item) => item.id === user.id) || user;

    res.status(200).json({
      ok: true,
      token: createSessionToken(freshUser),
      auth: { userId: freshUser.id, role: freshUser.role },
      data: filterStateForUser(data, freshUser),
      storageMode: payload.storageMode || "live"
    });
  } catch (error) {
    res.status(500).json({
      error: "Sunucu hatası",
      detail: error.message
    });
  }
};

const { getRemoteState, saveRemoteState } = require("./_db");
const { authenticateRequest, filterStateForUser, mergeStateForUser } = require("./_auth");

module.exports = async function handler(req, res) {
  try {
    const payload = await getRemoteState();
    const user = authenticateRequest(req, payload.data);

    if (!user) {
      res.status(401).json({ error: "Oturum gerekli veya geçersiz" });
      return;
    }

    if (req.method === "GET") {
      res.status(200).json({
        data: filterStateForUser(payload.data, user),
        auth: { userId: user.id, role: user.role },
        storageMode: payload.storageMode || "live"
      });
      return;
    }

    if (req.method === "POST") {
      const nextState = req.body?.data;
      if (!nextState) {
        res.status(400).json({ error: "data alanı zorunludur" });
        return;
      }

      const mergedState = mergeStateForUser(payload.data, nextState, user);
      const result = await saveRemoteState(mergedState);
      res.status(200).json({
        ...result,
        auth: { userId: user.id, role: user.role }
      });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Bu endpoint sadece GET ve POST destekler" });
  } catch (error) {
    res.status(500).json({
      error: "Sunucu hatası",
      detail: error.message
    });
  }
};

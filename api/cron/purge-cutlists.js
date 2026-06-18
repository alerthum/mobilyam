const { getRemoteState, saveRemoteState } = require("../_db");
const { purgeExpiredCutLists } = require("../_cutlist");
const storage = require("../_cutlistStorage");

function authorizeCron(req) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers?.authorization || "";
  if (header === `Bearer ${secret}`) return true;
  const cronHeader = req.headers?.["x-cron-secret"] || req.headers?.["X-Cron-Secret"] || "";
  return cronHeader === secret;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      res.status(405).json({ error: "Yalnızca GET veya POST" });
      return;
    }
    if (!authorizeCron(req)) {
      res.status(401).json({ error: "Yetkisiz cron isteği" });
      return;
    }

    const payload = await getRemoteState();
    const result = await purgeExpiredCutLists(payload.data, storage);
    if (result.removed > 0) {
      await saveRemoteState(result.data);
    }

    res.status(200).json({
      ok: true,
      removed: result.removed,
      storageProvider: storage.useBlob() ? "vercel-blob" : "local-file"
    });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", detail: error.message });
  }
};

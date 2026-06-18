const { getRemoteState, saveRemoteState } = require("./_db");
const { authenticateRequest } = require("./_auth");
const {
  clone,
  newCutListId,
  sanitizeFileName,
  extFromFileName,
  resolveMime,
  buildStorageKey,
  findQuote,
  findCutList,
  expiresAtIso,
  MAX_BYTES,
  EXT_BY_MIME,
  sanitizeCutListsForClient
} = require("./_cutlist");
const storage = require("./_cutlistStorage");

async function readRawBody(req) {
  if (req.body && Buffer.isBuffer(req.body)) return req.body;
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return Buffer.alloc(0);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseUrl(req) {
  const host = req.headers?.host || "localhost";
  const url = new URL(req.url || "/", `http://${host}`);
  return url;
}

module.exports = async function handler(req, res) {
  try {
    const url = parseUrl(req);
    const action = String(url.searchParams.get("action") || "").trim();
    const quoteId = String(url.searchParams.get("quoteId") || "").trim();
    const cutListId = String(url.searchParams.get("cutListId") || "").trim();

    const payload = await getRemoteState();
    const user = authenticateRequest(req, payload.data);
    if (!user || user.role !== "producer") {
      res.status(403).json({ error: "Kesim listesi yalnızca mobilyacı hesapları içindir" });
      return;
    }

    if (req.method === "GET" && action === "download") {
      if (!quoteId || !cutListId) {
        res.status(400).json({ error: "quoteId ve cutListId zorunludur" });
        return;
      }
      const quote = findQuote(payload.data, quoteId, user.id);
      const item = findCutList(quote, cutListId);
      if (!item) {
        res.status(404).json({ error: "Kesim listesi bulunamadı" });
        return;
      }
      const buffer = await storage.getFileBuffer(item);
      if (!buffer) {
        res.status(404).json({ error: "Dosya depolamada bulunamadı" });
        return;
      }
      res.setHeader("Content-Type", item.mimeType || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(item.fileName || "kesim-listesi")}"`
      );
      res.setHeader("Cache-Control", "private, no-store");
      res.status(200).end(buffer);
      return;
    }

    if (req.method === "GET") {
      if (!quoteId) {
        res.status(400).json({ error: "quoteId zorunludur" });
        return;
      }
      const quote = findQuote(payload.data, quoteId, user.id);
      if (!quote) {
        res.status(404).json({ error: "Teklif bulunamadı" });
        return;
      }
      const items = sanitizeCutListsForClient(quote.cutLists || []);
      res.status(200).json({ ok: true, items, storageProvider: storage.useBlob() ? "vercel-blob" : "local-file" });
      return;
    }

    if (req.method === "POST") {
      if (!quoteId) {
        res.status(400).json({ error: "quoteId zorunludur" });
        return;
      }
      const fileName = sanitizeFileName(url.searchParams.get("fileName") || "kesim-listesi");
      const contentType = resolveMime(req.headers?.["content-type"], fileName);
      if (!contentType) {
        res.status(400).json({ error: "Yalnızca PDF veya resim (JPG, PNG, WEBP) yüklenebilir" });
        return;
      }

      const buffer = await readRawBody(req);
      if (!buffer.length) {
        res.status(400).json({ error: "Dosya gövdesi boş" });
        return;
      }
      if (buffer.length > MAX_BYTES) {
        res.status(413).json({
          error: `Dosya çok büyük (en fazla ${Math.round(MAX_BYTES / (1024 * 1024))} MB)`
        });
        return;
      }

      const quote = findQuote(payload.data, quoteId, user.id);
      if (!quote) {
        res.status(404).json({ error: "Teklif bulunamadı" });
        return;
      }

      const id = newCutListId();
      const ext = extFromFileName(fileName) || EXT_BY_MIME[contentType] || "";
      const storageKey = buildStorageKey(user.id, quoteId, id, ext);
      const stored = await storage.putFile(storageKey, buffer, contentType);
      const uploadedAt = new Date().toISOString();

      const meta = {
        id,
        fileName,
        mimeType: contentType,
        sizeBytes: buffer.length,
        storageKey: stored.storageKey,
        blobUrl: stored.blobUrl,
        provider: stored.provider,
        uploadedAt,
        ownerUserId: user.id,
        quoteId
      };

      const data = clone(payload.data);
      const q = (data.quotes || []).find((x) => x.id === quoteId && x.ownerUserId === user.id);
      q.cutLists = Array.isArray(q.cutLists) ? q.cutLists : [];
      q.cutLists.unshift(meta);
      await saveRemoteState(data);

      res.status(200).json({
        ok: true,
        item: sanitizeCutListsForClient([{ ...meta, expiresAt: expiresAtIso(uploadedAt) }])[0]
      });
      return;
    }

    if (req.method === "DELETE") {
      if (!quoteId || !cutListId) {
        res.status(400).json({ error: "quoteId ve cutListId zorunludur" });
        return;
      }
      const quote = findQuote(payload.data, quoteId, user.id);
      const item = findCutList(quote, cutListId);
      if (!item) {
        res.status(404).json({ error: "Kesim listesi bulunamadı" });
        return;
      }

      try {
        await storage.removeFile(item);
      } catch (e) {
        console.warn("[cutlist] delete blob:", cutListId, e.message);
      }

      const data = clone(payload.data);
      const q = (data.quotes || []).find((x) => x.id === quoteId && x.ownerUserId === user.id);
      q.cutLists = (q.cutLists || []).filter((c) => c.id !== cutListId);
      await saveRemoteState(data);

      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ error: "Desteklenmeyen metod" });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", detail: error.message });
  }
};

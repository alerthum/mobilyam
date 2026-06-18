const crypto = require("crypto");
const path = require("path");

const CUTLIST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);

const EXT_BY_MIME = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function newCutListId() {
  return `CL-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function sanitizeFileName(name) {
  const base = path.basename(String(name || "kesim-listesi").trim());
  const cleaned = base.replace(/[^\w.\-ğüşıöçĞÜŞİÖÇ ]+/gi, "_").slice(0, 120);
  return cleaned || "kesim-listesi";
}

function extFromFileName(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  if ([".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  return "";
}

function resolveMime(contentType, fileName) {
  const mime = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (ALLOWED_MIME.has(mime)) return mime === "image/jpg" ? "image/jpeg" : mime;
  const ext = extFromFileName(fileName);
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "";
}

function buildStorageKey(userId, quoteId, cutListId, ext) {
  const safeExt = ext && ext.startsWith(".") ? ext : "";
  return `cutlists/${userId}/${quoteId}/${cutListId}${safeExt}`;
}

function isCutListExpired(item) {
  const t = Date.parse(item?.uploadedAt || "");
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > CUTLIST_TTL_MS;
}

function expiresAtIso(uploadedAt) {
  const t = Date.parse(uploadedAt || "");
  if (!Number.isFinite(t)) return new Date(Date.now() + CUTLIST_TTL_MS).toISOString();
  return new Date(t + CUTLIST_TTL_MS).toISOString();
}

function findQuote(state, quoteId, userId) {
  return (state.quotes || []).find((q) => q.id === quoteId && q.ownerUserId === userId) || null;
}

function findCutList(quote, cutListId) {
  return (quote?.cutLists || []).find((c) => c.id === cutListId) || null;
}

function stripCutListsFromQuotes(quotes) {
  return (Array.isArray(quotes) ? quotes : []).map((q) => {
    const next = { ...q };
    delete next.cutLists;
    return next;
  });
}

function sanitizeCutListsForClient(cutLists) {
  return (Array.isArray(cutLists) ? cutLists : []).map((item) => ({
    id: item.id,
    fileName: item.fileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    uploadedAt: item.uploadedAt,
    quoteId: item.quoteId,
    ownerUserId: item.ownerUserId,
    expiresAt: expiresAtIso(item.uploadedAt)
  }));
}

function sanitizeQuotesCutListsForClient(quotes) {
  return (Array.isArray(quotes) ? quotes : []).map((q) => ({
    ...q,
    cutLists: sanitizeCutListsForClient(q.cutLists)
  }));
}

async function purgeExpiredCutLists(state, storage) {
  const data = clone(state);
  let removed = 0;
  const quotes = Array.isArray(data.quotes) ? data.quotes : [];

  for (const quote of quotes) {
    const list = Array.isArray(quote.cutLists) ? quote.cutLists : [];
    const keep = [];
    for (const item of list) {
      if (!isCutListExpired(item)) {
        keep.push(item);
        continue;
      }
      try {
        await storage.remove(item);
      } catch (e) {
        console.warn("[cutlist] purge blob:", item.id, e.message);
      }
      removed += 1;
    }
    quote.cutLists = keep;
  }

  data.quotes = quotes;
  return { data, removed };
}

module.exports = {
  ALLOWED_MIME,
  CUTLIST_TTL_MS,
  MAX_BYTES,
  EXT_BY_MIME,
  clone,
  newCutListId,
  sanitizeFileName,
  extFromFileName,
  resolveMime,
  buildStorageKey,
  isCutListExpired,
  expiresAtIso,
  findQuote,
  findCutList,
  stripCutListsFromQuotes,
  sanitizeCutListsForClient,
  sanitizeQuotesCutListsForClient,
  purgeExpiredCutLists
};

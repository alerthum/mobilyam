const fs = require("fs");
const path = require("path");

const LOCAL_ROOT = path.join(process.cwd(), "data", "cutlists");

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localFilePath(storageKey) {
  const normalized = String(storageKey || "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const filePath = path.join(LOCAL_ROOT, ...parts);
  if (!filePath.startsWith(LOCAL_ROOT)) {
    throw new Error("Geçersiz depolama yolu");
  }
  return filePath;
}

async function putLocal(storageKey, buffer) {
  const filePath = localFilePath(storageKey);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return { storageKey, blobUrl: `local://${storageKey}`, provider: "local-file" };
}

async function getLocalBuffer(meta) {
  const filePath = localFilePath(meta.storageKey);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

async function removeLocal(meta) {
  const filePath = localFilePath(meta.storageKey);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function putBlob(storageKey, buffer, contentType) {
  const { put } = require("@vercel/blob");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const baseOptions = {
    token,
    contentType: contentType || "application/octet-stream",
    addRandomSuffix: false,
    allowOverwrite: true
  };

  try {
    const blob = await put(storageKey, buffer, { ...baseOptions, access: "private" });
    return { storageKey: blob.pathname || storageKey, blobUrl: blob.url, provider: "vercel-blob" };
  } catch (error) {
    const msg = String(error?.message || "");
    if (!msg.includes("private access on a public store")) {
      throw error;
    }
    const blob = await put(storageKey, buffer, { ...baseOptions, access: "public" });
    return { storageKey: blob.pathname || storageKey, blobUrl: blob.url, provider: "vercel-blob-public" };
  }
}

async function getBlobBuffer(meta) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const target = meta.blobUrl || meta.storageKey;
  if (!target) return null;

  const isPublic =
    meta.provider === "vercel-blob-public" ||
    String(meta.blobUrl || "").includes(".public.blob.vercel-storage.com");

  if (isPublic && meta.blobUrl && meta.blobUrl.startsWith("http")) {
    const res = await fetch(meta.blobUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  const { get } = require("@vercel/blob");
  const access = isPublic ? "public" : "private";
  const result = await get(target, { token, access });
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream) return null;
  const chunks = [];
  for await (const chunk of result.stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function removeBlob(meta) {
  const { del } = require("@vercel/blob");
  if (meta.blobUrl) {
    await del(meta.blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return;
  }
  if (meta.storageKey) {
    await del(meta.storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
}

async function putFile(storageKey, buffer, contentType) {
  if (useBlob()) return putBlob(storageKey, buffer, contentType);
  return putLocal(storageKey, buffer);
}

async function getFileBuffer(meta) {
  if (!meta) return null;
  if (meta.provider === "vercel-blob" ||
    meta.provider === "vercel-blob-public" ||
    (meta.blobUrl && !String(meta.blobUrl).startsWith("local://"))) {
    return getBlobBuffer(meta);
  }
  return getLocalBuffer(meta);
}

async function removeFile(meta) {
  if (!meta) return;
  if (meta.provider === "vercel-blob" ||
    meta.provider === "vercel-blob-public" ||
    (meta.blobUrl && !String(meta.blobUrl).startsWith("local://"))) {
    await removeBlob(meta);
    return;
  }
  await removeLocal(meta);
}

module.exports = {
  useBlob,
  putFile,
  getFileBuffer,
  removeFile
};

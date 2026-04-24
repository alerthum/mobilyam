/**
 * Tek seferlik: BLOB_READ_WRITE_TOKEN ile Vercel Blob'dan state/app-state.json indirir.
 *
 * Not: Tarayicida public URL 403 "blocked" verse bile, @vercel/blob `get()` token ile
 * dogrudan storage API'sine gider; list+fetch(downloadUrl) yolundan farklidir.
 *
 * 1) .env.local: BLOB_READ_WRITE_TOKEN=vercel_...
 * 2) npm run export:blob
 */

const fs = require("fs");
const path = require("path");
const { get } = require("@vercel/blob");

const STATE_BLOB_PATH = "state/app-state.json";
const ROOT = path.join(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const i = trimmed.indexOf("=");
    if (i <= 0) return;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

const outArg = process.argv[2];
const outFile = outArg
  ? path.isAbsolute(outArg)
    ? outArg
    : path.join(process.cwd(), outArg)
  : path.join(ROOT, "mobilya-state-backup.json");

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error(".env.local icinde BLOB_READ_WRITE_TOKEN yok.");
  process.exit(1);
}

function repairString(value) {
  if (typeof value !== "string" || !/[\u00C3\u00C5\u00C4\u00E2]/.test(value)) return value;
  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function repairPayload(value) {
  if (typeof value === "string") return repairString(value);
  if (Array.isArray(value)) return value.map((item) => repairPayload(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, item]) => [k, repairPayload(item)]));
  }
  return value;
}

async function readWebStreamToString(stream) {
  const chunks = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function printBlockedHelp() {
  console.error(`
Blob API tum erisimleri reddediyor (store blocked). Yedek icin:

1) Tarayicida mobilyam.vercel.app ac (yuklu veri varsa).
2) Sayfayi YENILEME - sunucu demo donerse eski onbellek silinebilir.
3) F12 > Console, sifre koyma, yapistir:

   copy(JSON.stringify(JSON.parse(localStorage.getItem("yokus-oda-remote-cache-v3")||"{}"), null, 2))

4) Notepad ac, yapistir, mobilya-state-backup.json olarak kaydet.
   (Oda hesabiyla giris yaptiysan veri EKSIK olabilir; mumkunse system_admin ile tam yedek.)

5) Vercel Support: blob dışa aktarma talebi.
`);
}

async function main() {
  let result;
  try {
    result = await get(STATE_BLOB_PATH, {
      access: "public",
      token,
      useCache: false
    });
  } catch (e) {
    console.error("get() hatasi:", e.message || e);
    printBlockedHelp();
    process.exit(1);
  }

  if (!result || result.statusCode !== 200 || !result.stream) {
    console.error("Beklenmeyen yanit:", result);
    printBlockedHelp();
    process.exit(1);
  }

  const raw = await readWebStreamToString(result.stream);
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("JSON parse hatasi:", e.message);
    process.exit(1);
  }

  const repaired = repairPayload(data);
  fs.writeFileSync(outFile, JSON.stringify(repaired, null, 2), "utf8");
  console.log("Tamam. Yedek dosya:", outFile);
}

main().catch((e) => {
  console.error(e);
  printBlockedHelp();
  process.exit(1);
});

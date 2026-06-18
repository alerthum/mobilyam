/**
 * Kesim listesi TTL temizliği — yerel veya manuel çalıştırma.
 *
 * .env.local: DATABASE_URL, BLOB_READ_WRITE_TOKEN, CRON_SECRET (opsiyonel)
 *
 *   npm run purge:cutlists
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(ROOT, ".env.local");

if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return;
      const i = t.indexOf("=");
      if (i <= 0) return;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    });
}

const require = createRequire(import.meta.url);
const { getRemoteState, saveRemoteState } = require(path.join(ROOT, "api", "_db.js"));
const { purgeExpiredCutLists } = require(path.join(ROOT, "api", "_cutlist.js"));
const storage = require(path.join(ROOT, "api", "_cutlistStorage.js"));

async function main() {
  const payload = await getRemoteState();
  const result = await purgeExpiredCutLists(payload.data, storage);
  if (result.removed > 0) {
    await saveRemoteState(result.data);
    console.log(`Temizlendi: ${result.removed} kesim listesi (30+ gün)`);
  } else {
    console.log("Silinecek süresi dolmuş kesim listesi yok.");
  }
  console.log(`Depolama: ${storage.useBlob() ? "vercel-blob" : "local-file"}`);
}

main().catch((e) => {
  console.error("Hata:", e.message);
  process.exit(1);
});

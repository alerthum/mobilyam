const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

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
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

async function main() {
  loadLocalEnv();
  const backupArg = process.argv[2];
  if (!backupArg) {
    console.error("Kullanim: node scripts/restore-app-state.js backups/<dosya>.json");
    process.exit(1);
  }
  const backupPath = path.isAbsolute(backupArg) ? backupArg : path.join(ROOT, backupArg);
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const payload = backup?.row?.payload;
  if (!payload) {
    console.error("Yedek dosyasinda row.payload yok.");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!databaseUrl) {
    console.error("DATABASE_URL bulunamadi.");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`INSERT INTO app_state (id, payload, updated_at)
            VALUES ('main', ${JSON.stringify(payload)}::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE
            SET payload = EXCLUDED.payload, updated_at = NOW()`;
  console.log("Geri yukleme tamamlandi:", backupPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

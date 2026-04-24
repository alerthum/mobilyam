/**
 * One-off: yedeklenen uygulama state JSON dosyasini Postgres app_state (id=main) satirina yazar.
 *
 * Kullanim:
 *   set DATABASE_URL=...   (Windows PowerShell: $env:DATABASE_URL="...")
 *   npm run migrate:state -- yol/backup.json
 *
 * Proje kok dizininde .env.local icinde DATABASE_URL varsa o da yuklenir.
 */

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
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
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

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL ||
    ""
  );
}

loadLocalEnv();

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Kullanim: npm run migrate:state -- <json-dosya-yolu>");
  process.exit(1);
}

const jsonPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
if (!fs.existsSync(jsonPath)) {
  console.error("Dosya bulunamadi:", jsonPath);
  process.exit(1);
}

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  console.error("DATABASE_URL tanimi yok. .env.local ekleyin veya ortam degiskeni verin.");
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
} catch (e) {
  console.error("JSON okunamadi:", e.message);
  process.exit(1);
}

async function main() {
  const sql = neon(databaseUrl);
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const json = JSON.stringify(payload);
  await sql`
    INSERT INTO app_state (id, payload, updated_at)
    VALUES ('main', ${json}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
  `;
  console.log("Tamam. app_state id=main guncellendi. Kaynak:", jsonPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

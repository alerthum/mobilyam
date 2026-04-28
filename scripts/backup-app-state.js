/**
 * PostgreSQL app_state(main) satirini JSON yedek olarak kaydeder.
 * Kullanim: npm run backup:state
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
    const i = trimmed.indexOf("=");
    if (i <= 0) return;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
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

async function main() {
  loadLocalEnv();

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error("DATABASE_URL bulunamadi. .env.local dosyanizi kontrol edin.");
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

  const rows = await sql`
    SELECT id, payload, updated_at
    FROM app_state
    WHERE id = 'main'
    LIMIT 1
  `;

  const backupsDir = path.join(ROOT, "backups");
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(
    backupsDir,
    `app-state-pre-quotes-migration-${timestamp}.json`
  );

  const backup = {
    exportedAt: new Date().toISOString(),
    source: "app_state row id=main",
    row: rows[0] || null
  };

  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Yedek yazildi: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

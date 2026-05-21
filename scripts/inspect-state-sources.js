const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
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
      if (!process.env[key]) process.env[key] = value;
    });
}

function summarize(label, raw) {
  const payload = raw?.row?.payload || raw;
  const users = (payload.users || []).filter((u) => !u.hiddenFromManagement);
  const quotes = payload.quotes || [];
  console.log(
    `${label}: users=${users.length}, quotes=${quotes.length}, producers=${users.filter((u) => u.role === "producer").length}`
  );
  users.slice(0, 20).forEach((u) => {
    console.log(`  - ${u.username} (${u.role}) ${u.fullName || ""}`);
  });
}

function countFile(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log(`${rel}: YOK`);
    return;
  }
  summarize(rel, JSON.parse(fs.readFileSync(file, "utf8")));
}

async function main() {
  countFile("data/local-app-state.json");
  countFile("data/default-state.json");
  countFile("mobilya-state-backup.json");
  countFile("backups/app-state-pre-quotes-migration-2026-04-28T17-53-51-649Z.json");

  loadLocalEnv();
  const hasDb = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  console.log("DATABASE_URL configured:", hasDb);

  const { getRemoteState } = require("../api/_db");
  const live = await getRemoteState();
  summarize(`ACTIVE [${live.storageMode}]`, live.data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

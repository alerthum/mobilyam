const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");
const { migrateInboundState } = require("./stateMigration");

function repairString(value) {
  if (!/[\u00C3\u00C5\u00C4\u00E2]/.test(value)) return value;
  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch (error) {
    return value;
  }
}

function repairPayload(value) {
  if (typeof value === "string") return repairString(value);
  if (Array.isArray(value)) return value.map((item) => repairPayload(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairPayload(item)]));
  }
  return value;
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

function readSeedState() {
  const seedPath = path.join(process.cwd(), "data", "default-state.json");
  return repairPayload(JSON.parse(fs.readFileSync(seedPath, "utf8")));
}

/** Postgres yokken (npm run dev) kalıcı depolama — yerel disk. */
const LOCAL_STATE_PATH = path.join(process.cwd(), "data", "local-app-state.json");

function readLocalFileState() {
  if (!fs.existsSync(LOCAL_STATE_PATH)) return null;
  try {
    return repairPayload(JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, "utf8")));
  } catch (e) {
    console.warn("[state] Yerel state dosyasi okunamadi:", e.message);
    return null;
  }
}

function writeLocalFileState(nextState) {
  const dir = path.dirname(LOCAL_STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCAL_STATE_PATH, JSON.stringify(repairPayload(nextState), null, 2), "utf8");
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function readPostgresState(databaseUrl) {
  const sql = neon(databaseUrl);
  await ensureSchema(sql);
  const rows = await sql`SELECT payload FROM app_state WHERE id = 'main' LIMIT 1`;

  if (!rows.length) {
    const seed = migrateInboundState(readSeedState());
    await sql`
      INSERT INTO app_state (id, payload, updated_at)
      VALUES ('main', ${JSON.stringify(seed)}::jsonb, NOW())
    `;
    return { data: seed, storageMode: "live" };
  }

  return {
    data: migrateInboundState(repairPayload(rows[0].payload)),
    storageMode: "live"
  };
}

async function writePostgresState(databaseUrl, nextState) {
  const sql = neon(databaseUrl);
  await ensureSchema(sql);
  const repairedState = repairPayload(nextState);
  await sql`
    INSERT INTO app_state (id, payload, updated_at)
    VALUES ('main', ${JSON.stringify(repairedState)}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
  `;
}

async function getRemoteState() {
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    try {
      return await readPostgresState(databaseUrl);
    } catch (error) {
      console.warn("[state] Veritabani okunamadi, yerel demo veriye dusuluyor:", error.message);
      return { data: migrateInboundState(readSeedState()), storageMode: "demo" };
    }
  }

  const local = readLocalFileState();
  if (local) {
    return { data: migrateInboundState(local), storageMode: "local-file" };
  }
  return { data: migrateInboundState(readSeedState()), storageMode: "local-file" };
}

async function saveRemoteState(nextState) {
  const patched = migrateInboundState(nextState);
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    try {
      await writePostgresState(databaseUrl, patched);
      return { ok: true, storageMode: "live" };
    } catch (error) {
      console.warn("[state] Veritabanina yazilamadi:", error.message);
      return { ok: false, storageMode: "demo" };
    }
  }

  try {
    writeLocalFileState(patched);
    return { ok: true, storageMode: "local-file" };
  } catch (error) {
    console.warn("[state] Yerel dosyaya yazilamadi:", error.message);
    return { ok: false, storageMode: "local-file" };
  }
}

module.exports = {
  getRemoteState,
  saveRemoteState
};

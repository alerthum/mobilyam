const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const DIST_ROOT = path.join(ROOT, "dist");
const STATIC_ROOT = fs.existsSync(path.join(DIST_ROOT, "index.html")) ? DIST_ROOT : ROOT;
const apiStateHandler = require("./api/state");
const apiLoginHandler = require("./api/login");
const apiVerifyHandler = require("./api/verify");
const apiTestSmtpHandler = require("./api/test-smtp");
const apiSendPartnerMailHandler = require("./api/send-partner-mail");
const apiCutlistsHandler = require("./api/cutlists");
const apiPurgeCutlistsHandler = require("./api/cron/purge-cutlists");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

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

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.join(STATIC_ROOT, requested);

  if (!filePath.startsWith(STATIC_ROOT)) {
    return path.join(STATIC_ROOT, "index.html");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  return path.join(STATIC_ROOT, "index.html");
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function decorateResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = (payload) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
    return res;
  };

  return res;
}

loadLocalEnv();

http
  .createServer(async (req, res) => {
    if (
      req.url?.startsWith("/api/state") ||
      req.url?.startsWith("/api/login") ||
      req.url?.startsWith("/api/verify") ||
      req.url?.startsWith("/api/test-smtp") ||
      req.url?.startsWith("/api/send-partner-mail") ||
      req.url?.startsWith("/api/cutlists") ||
      req.url?.startsWith("/api/cron/purge-cutlists")
    ) {
      try {
        decorateResponse(res);
        const isCutlistUpload = req.url?.startsWith("/api/cutlists") && req.method === "POST";
        if (isCutlistUpload) {
          req.body = await readRawBody(req);
          await apiCutlistsHandler(req, res);
        } else if (req.url?.startsWith("/api/cron/purge-cutlists")) {
          req.body = {};
          await apiPurgeCutlistsHandler(req, res);
        } else if (req.url?.startsWith("/api/cutlists")) {
          req.body = {};
          await apiCutlistsHandler(req, res);
        } else {
          req.body = req.method === "POST" ? await parseJsonBody(req) : {};
          if (req.url?.startsWith("/api/login")) await apiLoginHandler(req, res);
          else if (req.url?.startsWith("/api/verify")) await apiVerifyHandler(req, res);
          else if (req.url?.startsWith("/api/test-smtp")) await apiTestSmtpHandler(req, res);
          else if (req.url?.startsWith("/api/send-partner-mail")) await apiSendPartnerMailHandler(req, res);
          else await apiStateHandler(req, res);
        }
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Geçersiz istek gövdesi", detail: error.message }));
      }
      return;
    }

    const filePath = resolveFile(req.url);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Sunucu dosyayı okuyamadı.");
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=86400"
      });
      res.end(data);
    });
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`Yokus Mobilya sistemi hazir:`);
    console.log(`  http://127.0.0.1:${PORT}`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`(Sunucuyu durdurmak icin Ctrl+C)`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} kullanimda. Baska bir uygulamayi kapatin veya PORT=4174 npm start deneyin.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });

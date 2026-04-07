const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;

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

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.join(ROOT, requested);

  if (!filePath.startsWith(ROOT)) {
    return path.join(ROOT, "index.html");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  return path.join(ROOT, "index.html");
}

http
  .createServer((req, res) => {
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
  .listen(PORT, () => {
    console.log(`Yokuş Mobilya sistemi hazır: http://localhost:${PORT}`);
  });

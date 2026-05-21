const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function readLogoBase64(filename) {
  const filePath = path.join(ROOT, "src", "assets", filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath).toString("base64");
}

let cached = null;

function getMailLogoDataUris() {
  if (cached) return cached;
  const mobar = readLogoBase64("ushak-mobar-logo.png");
  const chamber = readLogoBase64("ushak-marango-esnaf-odasi-logo.png");
  cached = {
    mobar: mobar ? `data:image/png;base64,${mobar}` : "",
    chamber: chamber ? `data:image/png;base64,${chamber}` : ""
  };
  return cached;
}

module.exports = { getMailLogoDataUris };

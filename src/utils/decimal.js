/**
 * Türkçe ondalık desteği: virgül VE nokta. "1.234,56" ya da "1,234.56" gibi
 * karışık formatlarda son ayraç ondalık olarak kabul edilir.
 *
 * Yalnızca rakam, virgül, nokta ve eksi karakterleri korunur.
 */
export function parseDecimal(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  let s = String(input).trim();
  if (!s) return 0;

  s = s.replace(/[^0-9,.\-]/g, "");
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma === -1 && lastDot === -1) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  let decimalSep;
  if (lastComma === -1) decimalSep = ".";
  else if (lastDot === -1) decimalSep = ",";
  else decimalSep = lastComma > lastDot ? "," : ".";

  const thousandSep = decimalSep === "," ? "." : ",";
  const cleaned = s.split(thousandSep).join("").replace(decimalSep, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Sadece kullanıcı yazarken izin verilen karakter setine kırp. */
export function sanitizeDecimalInput(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  s = s.replace(/[^0-9,.\-]/g, "");
  if (s.includes("-")) {
    s = (s.startsWith("-") ? "-" : "") + s.replace(/-/g, "");
  }
  // Tek bir virgül VEYA nokta tutarlılığı: birden fazla virgül girilirse ilkini bırak
  const firstComma = s.indexOf(",");
  if (firstComma !== -1) {
    s =
      s.slice(0, firstComma + 1) +
      s.slice(firstComma + 1).replace(/,/g, "");
  }
  return s;
}

/** Sadece pozitif tam sayı (adet) input için sanitize. */
export function sanitizeIntegerInput(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^0-9]/g, "");
}

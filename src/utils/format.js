const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("tr-TR");

export function formatCurrency(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return currencyFormatter.format(0);
  return currencyFormatter.format(n);
}

export function formatNumber(value, suffix = "") {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return `0${suffix}`;
  return `${numberFormatter.format(n)}${suffix}`;
}

export function formatDate(value) {
  if (!value) return "—";
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return "—";
  }
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addOneYear(dateValue = todayIso()) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function daysUntil(value) {
  if (!value) return Infinity;
  const current = new Date(`${todayIso()}T00:00:00`);
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target - current) / 86400000);
}

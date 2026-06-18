/**
 * API client — backend ile haberleşir.
 * Token & cache localStorage'da saklanır.
 */

const REMOTE_CACHE_KEY = "yokus-2026-remote-cache";
const SESSION_TOKEN_KEY = "yokus-2026-session-token";
const SESSION_AUTH_KEY = "yokus-2026-session-auth";

function getEmptyState() {
  return {
    chamber: {
      chamberName: "UŞAK MARANGOZLAR ESNAF VE SANATKARLAR ODASI",
      updatedAt: "",
      broadcasts: []
    },
    qualities: [],
    hardwarePackages: [],
    servicesCatalog: [],
    countertopCatalog: [],
    users: [],
    quotes: []
  };
}

export function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY) || "";
}

export function getSessionAuth() {
  try {
    const raw = localStorage.getItem(SESSION_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(token, auth) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(auth));
}

export function clearSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_AUTH_KEY);
  localStorage.removeItem(REMOTE_CACHE_KEY);
}

function authHeaders() {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username, password) {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.token) {
      return { ok: false, error: payload?.error || "Giriş yapılamadı" };
    }
    setSession(payload.token, payload.auth);
    localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(payload.data));
    return {
      ok: true,
      data: payload.data,
      auth: payload.auth,
      storageMode: payload.storageMode || "live"
    };
  } catch (e) {
    return { ok: false, error: "Sunucuya ulaşılamadı" };
  }
}

export function logout() {
  clearSession();
}

export async function loadState() {
  const token = getSessionToken();
  if (!token) {
    return { data: getEmptyState(), storageMode: "locked", auth: null };
  }
  try {
    const res = await fetch("/api/state", {
      cache: "no-store",
      headers: authHeaders()
    });
    if (res.status === 401) {
      clearSession();
      return { data: getEmptyState(), storageMode: "locked", auth: null };
    }
    if (!res.ok) throw new Error("state load failed");
    const payload = await res.json();
    if (payload?.data) {
      localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(payload.data));
    }
    if (payload?.auth) {
      localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(payload.auth));
    }
    return {
      data: payload.data || getEmptyState(),
      storageMode: payload.storageMode || "live",
      auth: payload.auth || getSessionAuth()
    };
  } catch {
    const cached = localStorage.getItem(REMOTE_CACHE_KEY);
    const auth = getSessionAuth();
    if (cached && auth) {
      return { data: JSON.parse(cached), storageMode: "browser", auth };
    }
    clearSession();
    return { data: getEmptyState(), storageMode: "locked", auth: null };
  }
}

export async function testSmtp(to, smtpSettings) {
  try {
    const res = await fetch("/api/test-smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ to, smtpSettings })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: payload?.error || "SMTP test başarısız" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Sunucuya ulaşılamadı" };
  }
}

export async function sendPartnerMail(quoteId, partnerId, reportSnapshot) {
  try {
    const res = await fetch("/api/send-partner-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ quoteId, partnerId, reportSnapshot })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: payload?.error || "Mail gönderilemedi",
        outboxItem: payload?.outboxItem
      };
    }
    return { ok: true, outboxItem: payload.outboxItem };
  } catch (e) {
    return { ok: false, error: "Sunucuya ulaşılamadı" };
  }
}

export async function uploadCutList(quoteId, file) {
  try {
    const params = new URLSearchParams({
      quoteId,
      fileName: file.name || "kesim-listesi"
    });
    const res = await fetch(`/api/cutlists?${params}`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": file.type || "application/octet-stream"
      },
      body: file
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: payload?.error || "Yükleme başarısız" };
    }
    return { ok: true, item: payload.item };
  } catch {
    return { ok: false, error: "Sunucuya ulaşılamadı" };
  }
}

export async function deleteCutList(quoteId, cutListId) {
  try {
    const params = new URLSearchParams({ quoteId, cutListId });
    const res = await fetch(`/api/cutlists?${params}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: payload?.error || "Silinemedi" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Sunucuya ulaşılamadı" };
  }
}

export async function fetchCutListBlob(quoteId, cutListId) {
  const params = new URLSearchParams({ quoteId, cutListId, action: "download" });
  const res = await fetch(`/api/cutlists?${params}`, { headers: authHeaders() });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || "Dosya alınamadı");
  }
  const blob = await res.blob();
  const mimeType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || blob.type || "application/octet-stream";
  return { blob, mimeType };
}

export async function downloadCutList(quoteId, cutListId, fileName) {
  const { blob } = await fetchCutListBlob(quoteId, cutListId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "kesim-listesi";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function saveState(remoteState) {
  const token = getSessionToken();
  if (!token) return { ok: false, storageMode: "locked", unauthorized: true };
  try {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ data: remoteState })
    });
    if (res.status === 401) {
      clearSession();
      return { ok: false, storageMode: "locked", unauthorized: true };
    }
    if (!res.ok) throw new Error("save failed");
    const payload = await res.json();
    const ok = payload.ok !== false;
    if (ok) {
      localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(remoteState));
    }
    return {
      ok,
      storageMode: payload.storageMode || "live",
      auth: payload.auth || getSessionAuth()
    };
  } catch {
    return { ok: false, storageMode: "browser" };
  }
}

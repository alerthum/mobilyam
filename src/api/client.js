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
      updatedAt: ""
    },
    qualities: [],
    hardwarePackages: [],
    servicesCatalog: [],
    users: [],
    projects: []
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
    localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(remoteState));
    return {
      ok: true,
      storageMode: payload.storageMode || "live",
      auth: payload.auth || getSessionAuth()
    };
  } catch {
    return { ok: false, storageMode: "browser" };
  }
}

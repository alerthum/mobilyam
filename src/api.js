import { LOCAL_STORAGE_KEY, getDefaultLocalState } from "./config.js";

const REMOTE_STATE_KEY = "yokus-oda-remote-cache-v3";
const SESSION_TOKEN_KEY = "yokus-oda-session-token";
const SESSION_AUTH_KEY = "yokus-oda-session-auth";

function getLockedRemoteState() {
  return {
    chamber: {
      chamberName: "UŞAK MARANGOZLAR ESNAF VE SANATKARLAR ODASI",
      updatedAt: "",
      laborHourlyRate: 0,
      overheadRate: 0,
      chamberMarginRate: 0,
      installationMtPrice: 0,
      packagingSqmPrice: 0,
      minimumProfitRate: 0
    },
    qualities: [],
    hardwarePackages: [],
    servicesCatalog: [],
    users: [],
    projects: []
  };
}

function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY) || "";
}

function getSessionAuth() {
  try {
    const raw = localStorage.getItem(SESSION_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setSession(token, auth) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(auth));
}

function clearSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_AUTH_KEY);
  localStorage.removeItem(REMOTE_STATE_KEY);
}

function getAuthHeaders() {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loadRemoteState() {
  const token = getSessionToken();
  if (!token) {
    return { data: getLockedRemoteState(), storageMode: "locked", auth: null };
  }

  try {
    const response = await fetch("/api/state", {
      cache: "no-store",
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      clearSession();
      return { data: getLockedRemoteState(), storageMode: "locked", auth: null };
    }

    if (!response.ok) {
      throw new Error("remote state not available");
    }

    const payload = await response.json();
    if (!payload?.data) {
      throw new Error("invalid remote payload");
    }

    localStorage.setItem(REMOTE_STATE_KEY, JSON.stringify(payload.data));
    if (payload.auth) {
      localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(payload.auth));
    }

    return {
      data: payload.data,
      storageMode: payload.storageMode || "live",
      auth: payload.auth || getSessionAuth()
    };
  } catch (error) {
    const cached = localStorage.getItem(REMOTE_STATE_KEY);
    const auth = getSessionAuth();
    if (cached && auth) {
      return { data: JSON.parse(cached), storageMode: "browser", auth };
    }
    clearSession();
    return { data: getLockedRemoteState(), storageMode: "locked", auth: null };
  }
}

export async function loginWithCredentials(username, password) {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.token || !payload?.data || !payload?.auth) {
      return {
        ok: false,
        error: payload?.error || "Giriş yapılamadı"
      };
    }

    setSession(payload.token, payload.auth);
    localStorage.setItem(REMOTE_STATE_KEY, JSON.stringify(payload.data));

    return {
      ok: true,
      data: payload.data,
      auth: payload.auth,
      storageMode: payload.storageMode || "live"
    };
  } catch (error) {
    return {
      ok: false,
      error: "Sunucuya ulaşılamadı"
    };
  }
}

export async function saveRemoteState(remoteState) {
  const token = getSessionToken();
  if (!token) {
    return { ok: false, storageMode: "locked", unauthorized: true };
  }

  try {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ data: remoteState })
    });

    if (response.status === 401) {
      clearSession();
      return { ok: false, storageMode: "locked", unauthorized: true };
    }

    if (!response.ok) {
      throw new Error("remote save failed");
    }

    const payload = await response.json();
    localStorage.setItem(REMOTE_STATE_KEY, JSON.stringify(remoteState));
    return { ok: true, storageMode: payload.storageMode || "live", auth: payload.auth || getSessionAuth() };
  } catch (error) {
    return { ok: false, storageMode: "browser" };
  }
}

export function logout() {
  clearSession();
}

export function loadLocalUiState() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? { ...getDefaultLocalState(), ...JSON.parse(raw) } : getDefaultLocalState();
  } catch (error) {
    return getDefaultLocalState();
  }
}

export function saveLocalUiState(uiState) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(uiState));
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import * as api from "../api/client.js";

/**
 * Uygulama global state — uzaktan veri (chamber, qualities, users, quotes)
 * + oturum yönetimi.
 *
 * Kayıt modeli:
 *  - `updateRemote(mutator)` SADECE local state'i değiştirir, API'ye gitmez.
 *  - Yapısal aksiyonlar (oluştur/sil) `commit(mutator)` ile yapılır:
 *      hem state değişir hem hemen API'ye yazılır.
 *  - Form alanları (teklif bilgileri, indirim, vs.) için kullanıcı kendi
 *    "Güncelle" butonu ile `saveNow()` çağırarak commit eder.
 *
 * Otomatik kaydetme yoktur. saveStatus sadece aktif bir save sırasında
 * `saving` veya hata sonrası `error` olur, aksi halde `idle` kalır.
 */
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [remote, setRemote] = useState(null);
  const [auth, setAuth] = useState(api.getSessionAuth());
  const [storageMode, setStorageMode] = useState("locked");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error

  // Son persist edilen state. UI dirty-check için kullanır.
  const lastSavedRef = useRef(null);
  // Aktif state'in canlı referansı; saveNow her zaman güncel veriyi kullansın diye.
  const remoteRef = useRef(null);
  remoteRef.current = remote;

  // İlk yükleme
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await api.loadState();
      if (cancelled) return;
      setRemote(result.data);
      lastSavedRef.current = result.data;
      setAuth(result.auth);
      setStorageMode(result.storageMode);
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (nextState) => {
    if (!nextState) return { ok: false };
    setSaveStatus("saving");
    const result = await api.saveState(nextState);
    if (result.ok) {
      lastSavedRef.current = nextState;
      setSaveStatus("saved");
      if (result.auth) setAuth(result.auth);
      if (result.storageMode) setStorageMode(result.storageMode);
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 1200);
    } else if (result.unauthorized) {
      setSaveStatus("error");
      setAuth(null);
      setRemote(null);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus((s) => (s === "error" ? "idle" : s)), 2200);
    }
    return result;
  }, []);

  const updateRemote = useCallback((mutator) => {
    setRemote((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      const result = mutator(draft);
      return result || draft;
    });
  }, []);

  // O an ki en güncel state'i (veya verilen state'i) sunucuya kaydet.
  const saveNow = useCallback(
    async (overrideState) => {
      const target = overrideState || remoteRef.current;
      return persist(target);
    },
    [persist]
  );

  // Atomic: hem state'i mutate et hem hemen sunucuya yaz.
  // Add/Delete gibi yapısal işlemler için ideal.
  const commit = useCallback(
    async (mutator) => {
      const prev = remoteRef.current;
      if (!prev) return { ok: false };
      const draft = structuredClone(prev);
      const result = mutator(draft);
      const next = result || draft;
      setRemote(next);
      return persist(next);
    },
    [persist]
  );

  const login = useCallback(async (username, password) => {
    const result = await api.login(username, password);
    if (result.ok) {
      setRemote(result.data);
      lastSavedRef.current = result.data;
      setAuth(result.auth);
      setStorageMode(result.storageMode);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setAuth(null);
    setRemote(null);
    lastSavedRef.current = null;
    setStorageMode("locked");
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      remote,
      auth,
      storageMode,
      bootstrapped,
      saveStatus,
      updateRemote,
      commit,
      saveNow,
      login,
      logout
    }),
    [
      remote,
      auth,
      storageMode,
      bootstrapped,
      saveStatus,
      updateRemote,
      commit,
      saveNow,
      login,
      logout
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp yalnızca AppProvider içinde çağrılabilir.");
  return ctx;
}

export function useCurrentUser() {
  const { remote, auth } = useApp();
  if (!remote || !auth) return null;
  return remote.users?.find((u) => u.id === auth.userId) || null;
}

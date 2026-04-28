import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { todayIso } from "../utils/format.js";

/**
 * Teklif manipülasyon yardımcıları (CRUD).
 *
 * Kayıt politikası:
 *  - Yapısal işlemler (create/add/delete/replace) `commit` ile
 *    hem local state'i değiştirir hem hemen sunucuya yazar.
 *  - Field güncellemeleri (`updateProject`, `updateQuote`, `updateRoom`)
 *    SADECE local state'i değiştirir. Sunucuya yazmak için kullanıcı
 *    UI'da ilgili "Güncelle" butonuna basar (saveNow tetiklenir).
 */
export function useProjectActions() {
  const { updateRemote, commit } = useApp();
  const user = useCurrentUser();

  function newQuoteId() {
    return `QT-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  }

  async function createProject() {
    const id = newQuoteId();
    const result = await commit((draft) => {
      draft.quotes = draft.quotes || [];
      const ownerId = user?.id || null;
      const ownerQuotes = draft.quotes.filter((q) => q.ownerUserId === ownerId);
      const nextNumber =
        ownerQuotes.reduce((max, q) => Math.max(max, Number(q?.number) || 0), 0) + 1;
      draft.quotes.unshift({
        id,
        ownerUserId: ownerId,
        chamberId: user?.chamberId || null,
        contractCode: `ODA-${new Date().getFullYear().toString().slice(-2)}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`,
        status: "active",
        projectName: `Yeni Teklif ${nextNumber}`,
        customerName: "",
        customerPhone: "",
        merchantName: user?.company || user?.fullName || "",
        projectAddress: "",
        rooms: [],
        services: [],
        contractServiceLines: [],
        producerDiscountRate: 0,
        generalDiscountAmount: 0,
        notes: "",
        workflowStatus: "preparing",
        number: nextNumber,
        date: todayIso(),
        lifecycleStatus: "active",
        saved: true
      });
    });
    return { id, ok: !!result?.ok, result };
  }

  async function addQuote() {
    return createProject();
  }

  // Field güncellemesi: sadece local state. Kaydetmek için kullanıcı
  // ilgili kartın "Güncelle" butonuna basacak.
  function updateProject(projectId, mutator) {
    updateRemote((draft) => {
      const q = draft.quotes?.find((x) => x.id === projectId);
      if (!q) return;
      mutator(q);
    });
  }

  function updateQuote(projectId, quoteId, mutator) { // projectId legacy arg
    updateRemote((draft) => {
      const targetId = quoteId || projectId;
      const q = draft.quotes?.find((x) => x.id === targetId);
      if (!q) return;
      mutator(q);
    });
  }

  function deleteProject(projectId) {
    commit((draft) => {
      draft.quotes = (draft.quotes || []).filter((q) => q.id !== projectId);
    });
  }

  /** 'active' | 'inactive' — teklif listelerinde ve ana sayfada filtre için */
  function setProjectLifecycle(projectId, status) {
    commit((draft) => {
      const q = draft.quotes?.find((x) => x.id === projectId);
      if (!q) return;
      q.lifecycleStatus = status;
    });
  }

  function toggleProjectLifecycle(projectId) {
    commit((draft) => {
      const q = draft.quotes?.find((x) => x.id === projectId);
      if (!q) return;
      q.lifecycleStatus = q.lifecycleStatus === "inactive" ? "active" : "inactive";
    });
  }

  function deleteQuote(projectId, quoteId) { // projectId legacy arg
    commit((draft) => {
      const targetId = quoteId || projectId;
      draft.quotes = (draft.quotes || []).filter((q) => q.id !== targetId);
    });
  }

  function addRoom(projectId, quoteId, room) { // projectId legacy arg
    commit((draft) => {
      const targetId = quoteId || projectId;
      const q = draft.quotes?.find((x) => x.id === targetId);
      if (!q) return;
      q.rooms = q.rooms || [];
      q.rooms.push(room);
    });
  }

  function updateRoom(projectId, quoteId, roomId, mutator) { // projectId legacy arg
    updateRemote((draft) => {
      const targetId = quoteId || projectId;
      const q = draft.quotes?.find((x) => x.id === targetId);
      if (!q) return;
      const room = q.rooms?.find((r) => r.id === roomId);
      if (!room) return;
      mutator(room);
    });
  }

  function replaceRoom(projectId, quoteId, roomId, nextRoom) { // projectId legacy arg
    commit((draft) => {
      const targetId = quoteId || projectId;
      const q = draft.quotes?.find((x) => x.id === targetId);
      if (!q) return;
      q.rooms = (q.rooms || []).map((r) => (r.id === roomId ? nextRoom : r));
    });
  }

  function deleteRoom(projectId, quoteId, roomId) { // projectId legacy arg
    commit((draft) => {
      const targetId = quoteId || projectId;
      const q = draft.quotes?.find((x) => x.id === targetId);
      if (!q) return;
      q.rooms = (q.rooms || []).filter((r) => r.id !== roomId);
    });
  }

  return {
    createProject,
    addQuote,
    updateProject,
    updateQuote,
    deleteProject,
    deleteQuote,
    addRoom,
    updateRoom,
    replaceRoom,
    deleteRoom,
    setProjectLifecycle,
    toggleProjectLifecycle
  };
}

import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { todayIso } from "../utils/format.js";

/**
 * Proje ve teklif manipülasyon yardımcıları (CRUD).
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

  function newProjectId() {
    return `PRJ-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  }
  function newQuoteId() {
    return `QT-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  }

  function createProject() {
    const id = newProjectId();
    commit((draft) => {
      draft.projects = draft.projects || [];
      draft.projects.unshift({
        id,
        ownerUserId: user?.id || null,
        chamberId: user?.chamberId || null,
        contractCode: `ODA-${new Date().getFullYear().toString().slice(-2)}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`,
        projectName: "Yeni Proje",
        customerName: "",
        customerPhone: "",
        merchantName: user?.company || user?.fullName || "",
        projectAddress: "",
        saved: true,
        quotes: [createQuoteRaw()]
      });
    });
    return id;
  }

  function createQuoteRaw() {
    return {
      id: newQuoteId(),
      number: 1,
      date: todayIso(),
      rooms: [],
      services: [],
      contractServiceLines: [],
      producerDiscountRate: 0,
      generalDiscountAmount: 0,
      notes: "",
      workflowStatus: "preparing"
    };
  }

  function addQuote(projectId) {
    let id;
    commit((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = createQuoteRaw();
      id = q.id;
      q.number = (p.quotes?.length || 0) + 1;
      p.quotes = p.quotes || [];
      p.quotes.push(q);
    });
    return id;
  }

  // Field güncellemesi: sadece local state. Kaydetmek için kullanıcı
  // ilgili kartın "Güncelle" butonuna basacak.
  function updateProject(projectId, mutator) {
    updateRemote((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      mutator(p);
    });
  }

  function updateQuote(projectId, quoteId, mutator) {
    updateRemote((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = p.quotes?.find((x) => x.id === quoteId);
      if (!q) return;
      mutator(q);
    });
  }

  function deleteProject(projectId) {
    commit((draft) => {
      draft.projects = (draft.projects || []).filter((p) => p.id !== projectId);
    });
  }

  function deleteQuote(projectId, quoteId) {
    commit((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      p.quotes = (p.quotes || []).filter((q) => q.id !== quoteId);
      p.quotes.forEach((q, i) => {
        q.number = i + 1;
      });
    });
  }

  function addRoom(projectId, quoteId, room) {
    commit((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = p.quotes?.find((x) => x.id === quoteId);
      if (!q) return;
      q.rooms = q.rooms || [];
      q.rooms.push(room);
    });
  }

  function updateRoom(projectId, quoteId, roomId, mutator) {
    updateRemote((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = p.quotes?.find((x) => x.id === quoteId);
      if (!q) return;
      const room = q.rooms?.find((r) => r.id === roomId);
      if (!room) return;
      mutator(room);
    });
  }

  function replaceRoom(projectId, quoteId, roomId, nextRoom) {
    commit((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = p.quotes?.find((x) => x.id === quoteId);
      if (!q) return;
      q.rooms = (q.rooms || []).map((r) => (r.id === roomId ? nextRoom : r));
    });
  }

  function deleteRoom(projectId, quoteId, roomId) {
    commit((draft) => {
      const p = draft.projects?.find((x) => x.id === projectId);
      if (!p) return;
      const q = p.quotes?.find((x) => x.id === quoteId);
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
    deleteRoom
  };
}

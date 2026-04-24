import {
  NAV_ITEMS,
  ROLE_ACCESS,
  ROLE_LABELS,
  ROOM_TEMPLATES,
  ROOM_TYPE_ORDER,
  DETAIL_FIELDS,
  createProject,
  createRoom,
  getVisibleFields,
  pushQuote,
  renumberQuotesInPlace,
  canAccess
} from "./config.js";
import { loadRemoteState, saveRemoteState, loadLocalUiState, saveLocalUiState, loginWithCredentials, logout } from "./api.js";
import {
  calculateQuote,
  calculateContractDocument,
  calculateRoomForQuality,
  calculateRoomBase,
  calculateKitchenExcelMetrics
} from "./calc.js";

const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("tr-TR");
const userListCollator = new Intl.Collator("tr", { sensitivity: "base", numeric: true });
const USER_SORT_COLUMNS = ["fullName", "company", "role", "status", "licenseEnd", "daysLeft"];
const CHAMBER_DEFAULT = "UŞAK MARANGOZLAR ESNAF VE SANATKARLAR ODASI";

const state = {
  remote: null,
  ui: loadLocalUiState(),
  savingTimer: null,
  toastTimer: null
};

function createLockedRemoteState() {
  return {
    chamber: {
      chamberName: CHAMBER_DEFAULT,
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

const els = {
  body: document.body,
  pageTitle: document.querySelector("#pageTitle"),
  infoBanner: document.querySelector("#infoBanner"),
  stickySummary: document.querySelector("#stickySummary"),
  viewContainer: document.querySelector("#viewContainer"),
  sidebarNav: document.querySelector("#sidebarNav"),
  bottomNav: document.querySelector("#bottomNav"),
  sessionInfo: document.querySelector("#sessionInfo"),
  openLoginBtn: document.querySelector("#openLoginBtn"),
  newProjectBtn: document.querySelector("#newProjectBtn"),
  printContractBtn: document.querySelector("#printContractBtn"),
  themeToggleBtn: document.querySelector("#themeToggleBtn"),
  loginDialog: document.querySelector("#loginDialog"),
  loginForm: document.querySelector("#loginForm"),
  demoGrid: document.querySelector("#demoGrid"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword")
};

const iconPaths = {
  projects:
    '<path d="M6 4h9l5 5v11H6z"></path><path d="M15 4v5h5"></path><path d="M9 13h8M9 17h5"></path>',
  dashboard:
    '<path d="M5 5h6v6H5zM13 5h6v10h-6zM5 13h6v6H5zM13 17h6v2h-6z"></path>',
  catalog:
    '<path d="M5 7h14M7 4h10a2 2 0 0 1 2 2v12H5V6a2 2 0 0 1 2-2z"></path><path d="M8 11h8M8 15h6"></path>',
  users:
    '<path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"></path><path d="M4 20a8 8 0 0 1 16 0"></path>',
  contracts:
    '<path d="M7 4h10l3 3v13H7z"></path><path d="M17 4v3h3"></path><path d="M10 12h7M10 16h7"></path>',
  room_prices: '<path d="M4 6h16M4 12h16M4 18h10"></path>',
  sparkle:
    '<path d="M12 2l1.7 4.8L18 8.5l-4.3 1.7L12 15l-1.7-4.8L6 8.5l4.3-1.7z"></path>',
  theme:
    '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8z"></path>',
  database:
    '<ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5"></path><path d="M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3"></path>',
  print:
    '<path d="M7 9V4h10v5"></path><path d="M7 14H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"></path><path d="M7 12h10v8H7z"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path><circle cx="12" cy="12" r="3"></circle>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16v4z"></path><path d="M13 7l4 4"></path>',
  trash: '<path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path>',
  ban: '<circle cx="12" cy="12" r="9"></circle><path d="M7 7l10 10"></path>',
  refresh: '<path d="M20 11a8 8 0 1 0 2 5"></path><path d="M20 4v7h-7"></path>',
  x: '<path d="M18 6L6 18"></path><path d="M6 6l12 12"></path>',
  check: '<path d="M5 13l4 4L19 7"></path>',
  info: '<path d="M12 17v-5"></path><path d="M12 7h.01"></path><circle cx="12" cy="12" r="9"></circle>',
  room: '<path d="M4 11l8-6 8 6v8H4z"></path><path d="M9 19v-5h6v5"></path>',
  chamber_staff: '<path d="M4 11l8-6 8 6v8H4z"></path><path d="M9 19v-5h6v5"></path><circle cx="17" cy="7" r="2.5"></circle>',
  profile:
    '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="8" r="4"></circle>'
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addOneYear(dateValue = todayIso()) {
  const date = new Date(dateValue);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function formatNumber(value, suffix = "") {
  return `${number.format(Number(value || 0))}${suffix}`;
}

function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

function daysUntil(value) {
  if (!value) return Infinity;
  const current = new Date(`${todayIso()}T00:00:00`);
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target - current) / 86400000);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.sparkle}</g></svg>`;
}

function modalFooterCancelIconButton(action, label = "İptal") {
  return `<button type="button" class="enterprise-icon-btn enterprise-icon-btn--danger-cancel" data-action="${escapeHtml(action)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon("x")}</button>`;
}

function tag(label, variant = "accent") {
  return `<span class="tag ${variant}">${escapeHtml(label)}</span>`;
}

function normalizeChamberName(name) {
  if (!name || /yoku[şs]/i.test(name)) return CHAMBER_DEFAULT;
  return name;
}

function normalizeUser(user, chamberName) {
  const nextUser = { ...user };
  if (nextUser.role === "admin") nextUser.role = "chamber";
  if (nextUser.role === "customer") nextUser.role = "producer";

  if (nextUser.role === "system_admin") {
    nextUser.hiddenFromManagement = true;
    nextUser.status = "active";
    return nextUser;
  }

  nextUser.hiddenFromManagement = false;
  nextUser.status = nextUser.status || "active";
  if (nextUser.role === "chamber") nextUser.company = chamberName;

  if (nextUser.role === "producer") {
    nextUser.licenseStartDate = nextUser.licenseStartDate || todayIso();
    nextUser.licenseEndDate = nextUser.licenseEndDate || addOneYear(nextUser.licenseStartDate);
  }

  return nextUser;
}

function migrateProducerProject(project) {
  if (Array.isArray(project.quotes)) {
    const {
      rooms: _r,
      services: _s,
      producerDiscountRate: _p,
      generalDiscountAmount: _g,
      notes: _n,
      quotePhase: _q,
      quotes: _ignored,
      ...rest
    } = project;
    const quotes = (project.quotes || []).map((q) => ({
      ...q,
      rooms: q.rooms || [],
      services: q.services || [],
      contractServiceLines: q.contractServiceLines || [],
      producerDiscountRate: q.producerDiscountRate ?? 0,
      generalDiscountAmount: q.generalDiscountAmount ?? 0,
      notes: q.notes ?? ""
    }));
    renumberQuotesInPlace(quotes);
    return {
      ...rest,
      ownerUserId: project.ownerUserId,
      saved: project.saved !== false,
      quotes
    };
  }

  const oldRooms = project.rooms || [];
  const hasContent =
    oldRooms.length > 0 || (project.services || []).some((line) => Number(line.quantity || 0) > 0);
  const legacyQuote = {
    id: `QT-${project.id}-mig`,
    number: 1,
    date: todayIso(),
    rooms: oldRooms,
    services: project.services || [],
    contractServiceLines: [],
    producerDiscountRate: project.producerDiscountRate ?? 0,
    generalDiscountAmount: project.generalDiscountAmount ?? 0,
    notes: project.notes ?? ""
  };
  const { rooms, services, producerDiscountRate, generalDiscountAmount, notes, quotePhase, ...rest } = project;
  return {
    ...rest,
    saved: Boolean(project.saved) || hasContent || project.quotePhase === "rooms",
    quotes: hasContent ? [legacyQuote] : []
  };
}

function normalizeRemoteState(remoteState) {
  const nextState = structuredClone(remoteState);
  nextState.chamber = nextState.chamber || {};
  nextState.chamber.chamberName = normalizeChamberName(nextState.chamber.chamberName);
  nextState.qualities = (nextState.qualities || []).map((item, idx) => ({
    id: item.id || `quality-${idx + 1}`,
    name: item.name || `Kalite ${idx + 1}`,
    officialSqmPrice: Number(item.officialSqmPrice || 0),
    note: item.note || ""
  }));
  nextState.users = (nextState.users || [])
    .filter((user) => user.role !== "customer" && user.username !== "musteri")
    .map((user) => normalizeUser(user, nextState.chamber.chamberName));

  const firstProducer = nextState.users.find((user) => user.role === "producer");
  nextState.projects = (nextState.projects || []).map((project) => {
    const migrated = migrateProducerProject(project);
    return {
      ...migrated,
      ownerUserId: migrated.ownerUserId || firstProducer?.id || null
    };
  });

  return nextState;
}

function getUserById(userId) {
  return state.remote.users.find((user) => user.id === userId) || null;
}

function getSignedInUser() {
  return state.ui.currentUserId ? getUserById(state.ui.currentUserId) : null;
}

function isAuthenticated() {
  return Boolean(getSignedInUser());
}

function isSystemAdminSession() {
  return getSignedInUser()?.role === "system_admin";
}

function getCurrentUser() {
  const signedInUser = getSignedInUser();
  if (!signedInUser) return null;
  if (isSystemAdminSession() && state.ui.proxyUserId) {
    return getUserById(state.ui.proxyUserId) || signedInUser;
  }
  return signedInUser;
}

function isImpersonating() {
  return isSystemAdminSession() && Boolean(state.ui.proxyUserId);
}

function getLicenseState(user) {
  if (user.role !== "producer") {
    return { code: user.status === "passive" ? "passive" : "active", label: user.status === "passive" ? "Pasif" : "Aktif" };
  }
  if (user.status === "passive") return { code: "passive", label: "Pasif" };
  if (user.licenseEndDate && user.licenseEndDate < todayIso()) return { code: "expired", label: "Lisans Süresi Doldu" };
  return { code: "active", label: "Aktif Lisans" };
}

function canLogin(user) {
  if (!user) return false;
  if (user.role === "system_admin") return true;
  return getLicenseState(user).code === "active";
}

function getVisibleProjects() {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== "producer") return [];
  return state.remote.projects.filter((project) => project.ownerUserId === currentUser.id);
}

function getCurrentProject() {
  const visibleProjects = getVisibleProjects();
  return visibleProjects.find((project) => project.id === state.ui.selectedProjectId) || null;
}

function getCurrentQuote() {
  const project = getCurrentProject();
  if (!project?.quotes?.length) return null;
  return project.quotes.find((q) => q.id === state.ui.selectedQuoteId) || project.quotes[0] || null;
}

function getAccessViews() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  if (currentUser.role === "producer" && !canLogin(currentUser)) return ["dashboard"];
  return ROLE_ACCESS[currentUser.role] || ["dashboard"];
}

function getManageableUsers() {
  return state.remote.users.filter((user) => !user.hiddenFromManagement);
}

/** Kullanıcılar listesi: yalnızca mobilyacı (üretici) hesapları. */
function getProducerManagementUsers() {
  return state.remote.users.filter((user) => !user.hiddenFromManagement && user.role === "producer");
}

/** Oda yönetimi listesi: oda (chamber) rolündeki hesaplar. */
function getChamberStaffUsers() {
  return state.remote.users.filter((user) => !user.hiddenFromManagement && user.role === "chamber");
}

function getProducerUsers() {
  return getProducerManagementUsers();
}

function ensureUiSelections() {
  if (typeof state.ui.userSearchQuery !== "string") state.ui.userSearchQuery = "";
  if (typeof state.ui.userQuickFilter !== "string") state.ui.userQuickFilter = "";
  if (typeof state.ui.chamberStaffSearchQuery !== "string") state.ui.chamberStaffSearchQuery = "";
  if (!USER_SORT_COLUMNS.includes(state.ui.userSortColumn)) state.ui.userSortColumn = "fullName";
  if (state.ui.userSortDir !== "asc" && state.ui.userSortDir !== "desc") state.ui.userSortDir = "asc";
  if (typeof state.ui.catalogTab !== "string") state.ui.catalogTab = "quality";
  if (typeof state.ui.catalogEditorOpen !== "boolean") state.ui.catalogEditorOpen = false;
  if (!state.ui.catalogEditMode) state.ui.catalogEditMode = "edit";
  if (!("catalogEditType" in state.ui)) state.ui.catalogEditType = "quality";
  if (!("catalogEditTargetId" in state.ui)) state.ui.catalogEditTargetId = null;
  if (!("catalogEditDraft" in state.ui)) state.ui.catalogEditDraft = null;
  if (typeof state.ui.chamberEditorOpen !== "boolean") state.ui.chamberEditorOpen = false;
  if (!("chamberEditDraft" in state.ui)) state.ui.chamberEditDraft = null;
  if (!("confirmModal" in state.ui)) state.ui.confirmModal = null;
  if (state.ui.confirmModal != null) {
    const cm = state.ui.confirmModal;
    if (typeof cm !== "object" || !cm.kind || !cm.id) state.ui.confirmModal = null;
  }
  if (state.ui.sessionNoticeModal != null) {
    const sn = state.ui.sessionNoticeModal;
    if (typeof sn !== "object" || !String(sn.message || "").trim()) state.ui.sessionNoticeModal = null;
  }
  if (typeof state.ui.userEditorOpen !== "boolean") state.ui.userEditorOpen = false;
  if (!state.ui.userEditMode) state.ui.userEditMode = "edit";
  if (!("userEditTargetId" in state.ui)) state.ui.userEditTargetId = null;
  if (!("userEditDraft" in state.ui)) state.ui.userEditDraft = null;

  if (state.ui.currentUserId && !getUserById(state.ui.currentUserId)) state.ui.currentUserId = null;

  if (!isSystemAdminSession()) state.ui.proxyUserId = null;
  if (state.ui.proxyUserId && !getUserById(state.ui.proxyUserId)) state.ui.proxyUserId = null;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    state.ui.currentView = "dashboard";
    state.ui.selectedProjectId = null;
    state.ui.selectedQuoteId = null;
    state.ui.contractQuoteId = null;
    state.ui.producerFlow = "project";
    state.ui.selectedRoomId = null;
    state.ui.roomCreatorOpen = false;
    state.ui.editingRoomId = null;
    state.ui.roomEditDraft = null;
    state.ui.roomTypeModalOpen = false;
    state.ui.producerProjectHub = true;
    state.ui.producerContractFlow = "list";
    els.body.dataset.theme = state.ui.theme || "light";
    els.themeToggleBtn.hidden = true;
    els.openLoginBtn.textContent = "Giriş Yap";
    if (els.newProjectBtn) {
      els.newProjectBtn.hidden = true;
    }
    els.printContractBtn.hidden = true;
    return;
  }
  state.ui.sessionNoticeModal = null;
  const visibleProjects = getVisibleProjects();

  if (state.ui.selectedProjectId && !visibleProjects.some((item) => item.id === state.ui.selectedProjectId)) {
    state.ui.selectedProjectId = null;
    state.ui.selectedQuoteId = null;
    state.ui.selectedRoomId = null;
  }

  if (currentUser.role === "producer" && canLogin(currentUser) && visibleProjects.length && !state.ui.producerProjectHub) {
    if (!state.ui.selectedProjectId) {
      state.ui.selectedProjectId = visibleProjects[0].id;
    }
  }

  const project = getCurrentProject();
  const quote = getCurrentQuote();

  if (state.ui.producerFlow === "room-edit") {
    if (!quote || state.ui.currentView !== "projects" || !state.ui.roomEditDraft) {
      state.ui.producerFlow = quote ? "quote" : project?.saved ? "quotes" : "project";
      state.ui.editingRoomId = null;
      state.ui.roomEditDraft = null;
    } else if (state.ui.editingRoomId !== "new" && !quote.rooms.some((room) => room.id === state.ui.editingRoomId)) {
      state.ui.producerFlow = "quote";
      state.ui.editingRoomId = null;
      state.ui.roomEditDraft = null;
    }
  }

  if (state.ui.producerFlow === "quote" && quote && !quote.rooms.some((room) => room.id === state.ui.selectedRoomId)) {
    state.ui.selectedRoomId = quote.rooms[0]?.id || null;
  }
  if (state.ui.producerFlow === "quote" && project && !getCurrentQuote()) {
    state.ui.producerFlow = project.saved ? "quotes" : "project";
    state.ui.selectedQuoteId = null;
  }

  if (currentUser.role === "producer" && canLogin(currentUser) && project && !project.saved) {
    state.ui.producerFlow = "project";
  }

  if (
    currentUser.role === "producer" &&
    canLogin(currentUser) &&
    state.ui.currentView === "contracts" &&
    state.ui.producerContractFlow === "detail" &&
    project?.quotes?.length
  ) {
    if (!project.quotes.some((q) => q.id === state.ui.contractQuoteId)) {
      state.ui.contractQuoteId = project.quotes[0].id;
    }
  }

  if (!canAccess(state.ui.currentView, currentUser.role) || !getAccessViews().includes(state.ui.currentView)) {
    state.ui.currentView = getAccessViews()[0];
  }
  if (state.ui.currentView !== "users" && state.ui.currentView !== "chamber_staff" && state.ui.userEditorOpen) {
    state.ui.userEditorOpen = false;
    state.ui.userEditTargetId = null;
    state.ui.userEditDraft = null;
  }
  if (state.ui.currentView !== "catalog" && state.ui.catalogEditorOpen) {
    state.ui.catalogEditorOpen = false;
    state.ui.catalogEditTargetId = null;
    state.ui.catalogEditDraft = null;
  }
  if (state.ui.currentView !== "catalog" && state.ui.chamberEditorOpen) {
    state.ui.chamberEditorOpen = false;
    state.ui.chamberEditDraft = null;
  }

  els.body.dataset.theme = state.ui.theme || "light";
  els.themeToggleBtn.hidden = true;
  els.openLoginBtn.textContent = "Giriş Yap";
  els.openLoginBtn.hidden = true;
  const producerView = currentUser.role === "producer" && canLogin(currentUser);
  if (els.newProjectBtn) {
    els.newProjectBtn.hidden = true;
  }
  if (producerView) {
    els.printContractBtn.hidden = true;
  } else {
    els.printContractBtn.hidden = !producerView;
  }
}

function captureFocusState() {
  const active = document.activeElement;
  if (!active || !active.dataset?.focusId) return null;
  const v = String(active.value ?? "");
  let start = active.selectionStart;
  let end = active.selectionEnd;
  const selOk =
    typeof start === "number" &&
    typeof end === "number" &&
    !Number.isNaN(start) &&
    !Number.isNaN(end) &&
    start >= 0 &&
    end >= 0;
  if (!selOk) {
    start = v.length;
    end = v.length;
  } else {
    start = Math.min(Math.max(0, start), v.length);
    end = Math.min(Math.max(0, end), v.length);
  }
  return {
    focusId: active.dataset.focusId,
    start,
    end,
    scrollY: window.scrollY
  };
}

function restoreFocusState(snapshot) {
  if (!snapshot) return;
  const fid = String(snapshot.focusId || "");
  const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(fid) : fid.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const next = document.querySelector(`[data-focus-id="${esc}"]`);
  if (!next) return;
  next.focus({ preventScroll: true });
  if (typeof next.setSelectionRange === "function") {
    const v = String(next.value ?? "");
    let a = Number(snapshot.start);
    let b = Number(snapshot.end);
    if (!Number.isFinite(a)) a = v.length;
    if (!Number.isFinite(b)) b = a;
    a = Math.min(Math.max(0, a), v.length);
    b = Math.min(Math.max(0, b), v.length);
    try {
      next.setSelectionRange(a, b);
    } catch {
      /* bazı tarayıcılar number/date için seçim desteklemez */
    }
  }
  window.scrollTo({ top: snapshot.scrollY, left: 0, behavior: "auto" });
}

function persistUi() {
  const persistable = { ...state.ui };
  delete persistable.confirmModal;
  delete persistable.sessionNoticeModal;
  delete persistable.documentPreview;
  saveLocalUiState(persistable);
}

function dismissSessionNoticeAndOpenLogin() {
  state.ui.sessionNoticeModal = null;
  persistUi();
  render();
  openLoginDialog();
}

function openLoginDialogAfterSessionNoticeIfNeeded() {
  if (state.ui.sessionNoticeModal) dismissSessionNoticeAndOpenLogin();
  else openLoginDialog();
}

function lockSession(message = "", noticeKind = "expired") {
  logout();
  state.remote = createLockedRemoteState();
  state.ui.currentUserId = null;
  state.ui.proxyUserId = null;
  state.ui.selectedProjectId = null;
  state.ui.selectedQuoteId = null;
  state.ui.contractQuoteId = null;
  state.ui.producerFlow = "project";
  state.ui.selectedRoomId = null;
  state.ui.roomCreatorOpen = false;
  state.ui.editingRoomId = null;
  state.ui.roomEditDraft = null;
  state.ui.roomTypeModalOpen = false;
  state.ui.producerProjectHub = true;
  state.ui.producerContractFlow = "list";
  state.ui.userSearchQuery = "";
  state.ui.chamberStaffSearchQuery = "";
  state.ui.userQuickFilter = "";
  state.ui.userSortColumn = "fullName";
  state.ui.userSortDir = "asc";
  state.ui.userEditorOpen = false;
  state.ui.userEditMode = "edit";
  state.ui.userEditTargetId = null;
  state.ui.userEditDraft = null;
  state.ui.catalogTab = "quality";
  state.ui.catalogEditorOpen = false;
  state.ui.catalogEditMode = "edit";
  state.ui.catalogEditType = "quality";
  state.ui.catalogEditTargetId = null;
  state.ui.catalogEditDraft = null;
  state.ui.chamberEditorOpen = false;
  state.ui.chamberEditDraft = null;
  state.ui.confirmModal = null;
  state.ui.sessionNoticeModal = null;
  state.ui.currentView = "dashboard";
  state.ui.saveStatus = "idle";
  if (message) {
    state.ui.sessionNoticeModal = { message, kind: noticeKind };
  }
  persistUi();
  render();
  if (!state.ui.sessionNoticeModal) openLoginDialog();
}

function getSaveLabel() {
  if (state.ui.saveStatus === "saving") return "Veritabanına yazılıyor";
  if (state.ui.saveStatus === "saved" || state.ui.saveStatus === "idle") return "Veritabanında güncel";
  return "Çevrimdışı (yerel)";
}

function showToast(message, variant = "success") {
  let toastEl = document.querySelector("#appToast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "appToast";
    toastEl.className = "app-toast";
    document.body.appendChild(toastEl);
  }
  toastEl.className = `app-toast app-toast--${variant} is-visible`;
  toastEl.textContent = message;
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
  }, 1800);
}

async function syncRemoteToServer() {
  const result = await saveRemoteState(state.remote);
  if (result.unauthorized) {
    lockSession("Oturum süresi doldu. Lütfen tekrar giriş yapın.", "expired");
    return result;
  }
  state.ui.saveStatus = result.ok ? "saved" : "local";
  state.ui.storageMode = result.storageMode;
  persistUi();
  return result;
}

function scheduleSave() {
  clearTimeout(state.savingTimer);
  state.ui.saveStatus = "saving";
  persistUi();
  state.savingTimer = setTimeout(async () => {
    await syncRemoteToServer();
    render({ preserveFocus: true });
  }, 400);
}

async function flushPendingSave() {
  clearTimeout(state.savingTimer);
  state.savingTimer = null;
  if (!isAuthenticated()) return;
  state.ui.saveStatus = "saving";
  persistUi();
  await syncRemoteToServer();
  if (document.visibilityState === "visible") {
    render({ preserveFocus: true });
  }
}

function updateCurrentProject(mutator) {
  const project = getCurrentProject();
  if (!project) return;
  mutator(project);
  scheduleSave();
}

function updateCurrentQuote(mutator) {
  const quote = getCurrentQuote();
  if (!quote) return;
  mutator(quote);
  scheduleSave();
}

function buildFocusId(parts) {
  return parts.filter(Boolean).join("--");
}

function inputField({ label, value, bind, type = "text", step = "0.1", min = "0", focusId, disabled = false, decimalText = false }) {
  const useTextDecimal = Boolean(decimalText) && type === "number";
  const htmlType = useTextDecimal ? "text" : type;
  const inputmode = type === "number" || useTextDecimal ? "decimal" : "text";
  const numAttrs = type === "number" && !useTextDecimal ? `min="${min}" step="${step}"` : "";
  const textDecimalAttrs = useTextDecimal ? `autocomplete="off" autocorrect="off" spellcheck="false"` : "";
  const displayValue = value === null || value === undefined ? "" : value;
  return `
    <label class="mp-field">
      <span class="mp-field-label">${escapeHtml(label)}</span>
      <input class="mp-input" data-bind="${escapeHtml(bind)}" data-focus-id="${escapeHtml(focusId)}" type="${htmlType}" inputmode="${inputmode}" ${numAttrs} ${textDecimalAttrs} ${disabled ? "disabled" : ""} value="${escapeHtml(
        String(displayValue)
      )}" />
    </label>
  `;
}

function selectField({ label, bind, value, options, focusId, disabled = false }) {
  return `
    <label class="mp-field">
      <span class="mp-field-label">${escapeHtml(label)}</span>
      <select class="mp-input mp-select" data-bind="${escapeHtml(bind)}" data-focus-id="${escapeHtml(focusId)}" ${disabled ? "disabled" : ""}>
        ${options
          .map(
            (option) =>
              `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`
          )
          .join("")}
      </select>
    </label>
  `;
}

function choiceGroup({ label, action, activeValue, options, extraData = {} }) {
  const dataAttrs = Object.entries(extraData)
    .map(([key, value]) => `data-${escapeHtml(key)}="${escapeHtml(value)}"`)
    .join(" ");

  return `
    <div class="choice-group">
      <span class="choice-label">${escapeHtml(label)}</span>
      <div class="choice-grid">
        ${options
          .map(
            (option) => `
              <button type="button" class="choice-pill ${option.value === activeValue ? "active" : ""}" data-action="${escapeHtml(
                action
              )}" ${dataAttrs} data-value="${escapeHtml(option.value)}">
                ${escapeHtml(option.label)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function plusActionButton(action, label) {
  return `<button type="button" class="icon-button plus-action-button" data-action="${escapeHtml(action)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon("plus")}</button>`;
}

function iconOnlyActionButton(action, iconKey, label, dataset = "") {
  return `<button type="button" class="enterprise-icon-btn" data-action="${escapeHtml(action)}" ${dataset} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon(iconKey)}</button>`;
}

function buildNavButton(item, mobile = false) {
  const active = item.id === state.ui.currentView ? "active" : "";
  const cls = mobile ? "bottom-nav-button" : "nav-button";
  return `
    <button class="${cls} ${active}" data-action="set-view" data-view="${item.id}">
      <span class="nav-left">
        <span class="nav-icon">${icon(item.id)}</span>
        <span>${escapeHtml(mobile ? item.short : item.label)}</span>
      </span>
      ${mobile ? "" : `<span>${item.id === state.ui.currentView ? "Açık" : ""}</span>`}
    </button>
  `;
}

/** Instagram tarzı 5 sekme (orta: FAB aksiyon). */
function getMobileBottomTabs() {
  const user = getCurrentUser();
  if (!user) return [];
  if (user.role === "producer") {
    if (!canLogin(user)) {
      return [{ kind: "view", view: "dashboard", iconKey: "dashboard", label: "Durum" }];
    }
    return [
      { kind: "view", view: "projects", iconKey: "projects", label: "Ana sayfa" },
      { kind: "view", view: "room_prices", iconKey: "room_prices", label: "Fiyatlar" },
      { kind: "action", action: "new-project-quick", iconKey: "plus", label: "Yeni proje ekle", fab: true },
      { kind: "view", view: "contracts", iconKey: "contracts", label: "Sözleşme" },
      { kind: "view", view: "account", iconKey: "profile", label: "Profil" }
    ];
  }
  if (user.role === "chamber") {
    return [
      { kind: "view", view: "chamber_staff", iconKey: "chamber_staff", label: "Oda" },
      { kind: "view", view: "users", iconKey: "users", label: "Kişiler" },
      { kind: "view", view: "catalog", iconKey: "catalog", label: "Fiyatlar" },
      { kind: "view", view: "dashboard", iconKey: "dashboard", label: "Özet" },
      { kind: "view", view: "account", iconKey: "profile", label: "Profil" }
    ];
  }
  if (user.role === "system_admin") {
    return [
      { kind: "view", view: "chamber_staff", iconKey: "chamber_staff", label: "Oda" },
      { kind: "view", view: "users", iconKey: "users", label: "Kişiler" },
      { kind: "view", view: "catalog", iconKey: "catalog", label: "Fiyatlar" },
      { kind: "view", view: "dashboard", iconKey: "dashboard", label: "Özet" },
      { kind: "view", view: "account", iconKey: "profile", label: "Profil" }
    ];
  }
  return [];
}

function buildInstagramBottomTab(tab) {
  if (tab.kind === "action") {
    return `
      <button type="button" class="bottom-nav-tab bottom-nav-tab--fab" data-action="${escapeHtml(tab.action)}" aria-label="${escapeHtml(tab.label)}" title="${escapeHtml(tab.label)}">
        <span class="bottom-nav-fab-icon">${icon(tab.iconKey)}</span>
      </button>
    `;
  }
  const active = state.ui.currentView === tab.view ? "is-active" : "";
  return `
    <button type="button" class="bottom-nav-tab ${active}" data-action="set-view" data-view="${tab.view}">
      <span class="bottom-nav-tab-icon">${icon(tab.iconKey)}</span>
      <span class="bottom-nav-tab-label">${escapeHtml(tab.label)}</span>
    </button>
  `;
}

function renderNavigation() {
  if (!isAuthenticated()) {
    els.sidebarNav.innerHTML = "";
    els.bottomNav.innerHTML = "";
    document.body.classList.remove("has-instagram-nav");
    return;
  }
  let allowed = NAV_ITEMS.filter((item) => getAccessViews().includes(item.id));
  const currentUser = getCurrentUser();
  if (currentUser?.role === "producer") {
    const producerOrder = ["projects", "contracts", "room_prices", "account"];
    allowed = allowed.sort((a, b) => producerOrder.indexOf(a.id) - producerOrder.indexOf(b.id));
  }
  els.sidebarNav.innerHTML = allowed.map((item) => buildNavButton(item)).join("");
  const tabs = getMobileBottomTabs();
  els.bottomNav.className = "bottom-nav" + (tabs.length < 5 ? " bottom-nav--few" : "");
  els.bottomNav.innerHTML = tabs.map((t) => buildInstagramBottomTab(t)).join("");
  document.body.classList.add("has-instagram-nav");
}

function renderSessionInfo() {
  const signedInUser = getSignedInUser();
  if (!signedInUser) {
    els.sessionInfo.innerHTML = `
      <div class="step-card compact-card">
        <span class="muted">Durum</span>
        <strong>Giriş yapılmadı</strong>
        <p class="form-hint">Sistemi kullanmak için yetkili hesapla giriş yapın.</p>
      </div>
    `;
    return;
  }
  const companyLabel = signedInUser.company || getCurrentUser()?.company || "—";
  els.sessionInfo.innerHTML = `
    <div class="session-chip">
      ${icon("users")}
      <strong>${escapeHtml(companyLabel)}</strong>
    </div>
  `;
}

function renderInfoBanner() {
  if (!isAuthenticated()) {
    els.infoBanner.hidden = false;
    const storageLabel =
      state.ui.storageMode === "live"
        ? "Canlı veritabanı hazır"
        : state.ui.storageMode === "demo"
          ? "Veritabanı bağlantısı bekliyor"
          : "Tarayıcı önbelleği";

    els.infoBanner.innerHTML = `
      <div class="info-line">
        <span class="summary-icon">${icon("info")}</span>
        <div>
          <strong>Giriş gerekli</strong>
          <div class="muted">Ziyaretçi modu kapalıdır. Sadece oda yönetimi, mobilyacı kullanıcıları ve gizli sistem admin hesabı giriş yapabilir.</div>
        </div>
      </div>
      <div class="save-pill ${state.ui.storageMode === "live" ? "live" : "demo"}">
        ${icon("database")}
        <span>${escapeHtml(storageLabel)}</span>
      </div>
    `;
    return;
  }

  const currentUser = getCurrentUser();
  const signedInUser = getSignedInUser();
  let title = "Bilgi";
  let message = "Yaptığınız değişiklikler otomatik olarak veritabanına yazılır.";

  if (currentUser.role === "producer") {
    if (!canLogin(currentUser)) {
      els.infoBanner.hidden = false;
      title = "Lisans bilgisi";
      message = "Lisans pasif veya süresi dolmuş. Oda yönetimi lisansı tekrar açmadan teklif ekranı kullanılamaz.";
    } else {
      els.infoBanner.hidden = true;
      els.infoBanner.innerHTML = "";
      return;
    }
  } else if (signedInUser.role === "system_admin" && !isImpersonating()) {
    els.infoBanner.hidden = false;
    title = "Sistem admini";
    message = "Admin / Admin hesabı kullanıcı listesinde görünmez. Bu hesapla oda yönetimi veya kullanıcı görünümüne şifresiz geçebilirsiniz.";
  } else {
    els.infoBanner.hidden = false;
    title = "Oda yönetimi";
    message = "Bu rol sadece resmi kalite fiyatlarını, paket şablonlarını ve kullanıcı lisanslarını yönetir. Teklif ve sözleşme verilerine erişmez.";
  }

  const storageLabel =
    state.ui.storageMode === "live"
      ? "Canlı veritabanı aktif"
      : state.ui.storageMode === "demo"
        ? "Veritabanı bağlantısı bekliyor"
        : "Tarayıcı önbelleği";

  els.infoBanner.innerHTML = `
    <div class="info-line">
      <span class="summary-icon">${icon("info")}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <div class="muted">${escapeHtml(message)}</div>
      </div>
    </div>
    <div class="save-pill ${state.ui.storageMode === "live" ? "live" : "demo"}">
      ${icon("database")}
      <span>${escapeHtml(storageLabel)}</span>
    </div>
  `;
}

function renderStickySummary() {
  if (!isAuthenticated()) {
    els.stickySummary.innerHTML = `
      <div class="summary-strip">
        <div class="summary-box primary"><span class="muted">Erişim</span><strong>Giriş bekleniyor</strong></div>
        <div class="summary-box"><span class="muted">Güvenlik</span><strong>Ziyaretçi erişimi kapalı</strong></div>
      </div>
    `;
    return;
  }

  const currentUser = getCurrentUser();
  const producers = getProducerUsers();
  const activeCount = producers.filter((user) => getLicenseState(user).code === "active").length;
  const passiveCount = producers.filter((user) => getLicenseState(user).code === "passive").length;
  const expiredCount = producers.filter((user) => getLicenseState(user).code === "expired").length;

  if (currentUser.role === "producer" && canLogin(currentUser)) {
    const onQuoteWorkspace =
      state.ui.currentView === "projects" &&
      !state.ui.producerProjectHub &&
      (state.ui.producerFlow === "quote" || state.ui.producerFlow === "room-edit");
    if (!onQuoteWorkspace) {
      els.stickySummary.innerHTML = "";
      return;
    }
    const quote = getCurrentQuote();
    const calculation = quote ? calculateQuote(quote, state.remote) : null;
    els.stickySummary.innerHTML = calculation
      ? `
        <div class="summary-strip summary-strip--producer">
          <div class="summary-box primary"><span class="muted">Toplam teklif</span><strong>${formatCurrency(calculation.totals.netGrandTotal)}</strong></div>
          <div class="summary-box secondary"><span class="muted">Liste / oda</span><strong>${formatCurrency(calculation.totals.officialGrandTotal)}</strong></div>
          <div class="summary-box"><span class="muted">İndirim</span><strong>${formatCurrency(calculation.totals.totalDiscount)}</strong></div>
          <div class="summary-box success"><span class="muted">Senkron</span><strong>${getSaveLabel()}</strong></div>
        </div>
      `
      : "";
    return;
  }

  els.stickySummary.innerHTML = `
    <div class="summary-strip">
      <div class="summary-box primary"><span class="muted">Toplam mobilyacı</span><strong>${producers.length}</strong></div>
      <div class="summary-box success"><span class="muted">Aktif lisans</span><strong>${activeCount}</strong></div>
      <div class="summary-box secondary"><span class="muted">Pasif lisans</span><strong>${passiveCount}</strong></div>
      <div class="summary-box"><span class="muted">Süresi dolan</span><strong>${expiredCount}</strong></div>
    </div>
  `;
}

function renderRoomPricesReadOnlyView() {
  const rows = [...(state.remote.qualities || [])].sort(
    (a, b) => Number(a.officialSqmPrice || 0) - Number(b.officialSqmPrice || 0)
  );
  return `
    <section class="panel-stack">
      <article class="surface-card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Mobilya kaliteleri</p>
            <h3>Oda birim fiyatları (salt okunur)</h3>
          </div>
        </div>
        <p class="form-hint">Resmi m² fiyatları yalnızca oda yönetimi tarafından güncellenir. Bu ekranda değişiklik yapılamaz.</p>
        <div class="room-prices-table-wrap">
          <table class="room-prices-table">
            <thead>
              <tr>
                <th>Kalite</th>
                <th>Resmi m² (₺)</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (q) => `
                <tr>
                  <td data-label="Kalite"><strong>${escapeHtml(q.name)}</strong></td>
                  <td data-label="Resmi m²">${formatCurrency(q.officialSqmPrice)}</td>
                  <td data-label="Not">${escapeHtml(q.note || "—")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${!rows.length ? `<p class="form-hint">Henüz kalite tanımı yok.</p>` : ""}
      </article>
    </section>
  `;
}

function draftBasicDisplay(draft, key) {
  const v = draft.basic[key];
  if (v === 0 || v === null || v === undefined) return "";
  return v;
}

function draftDetailDisplay(draft, key) {
  const v = draft.details[key];
  if (v === 0 || v === null || v === undefined) return "";
  return v;
}

function renderRoomDraftCalcSteps(draft) {
  const base = calculateRoomBase(draft);
  const m2 = base.panelEquivalentM2;
  if (draft.type === "kitchen") {
    const k = calculateKitchenExcelMetrics(draft.basic || {});
    const steps = [
      ["Üst dolap (cm² hesabı)", formatNumber(k.lines.ustDolap, "")],
      ["Alt dolap", formatNumber(k.lines.altDolap, "")],
      ["Tezgah", formatNumber(k.lines.tezgah, "")],
      ["Buzdolabı dolabı", formatNumber(k.lines.buzDolap, "")],
      ["Buzdolabı yanak", formatNumber(k.lines.buzYanak, "")],
      ["Boy dolap", formatNumber(k.lines.boyDolap, "")],
      ["→ Toplam m² (maliyet raporu)", formatNumber(k.toplamM2, " m²")]
    ];
    return `
      <div class="calc-steps-panel">
        <p class="section-kicker">M² hesap adımları</p>
        <p class="form-hint">Ölçüleri girdikçe Excel maliyet raporu satırlarına paralel ara değerler güncellenir.</p>
        <ul class="calc-steps-list">
          ${steps.map(([a, b]) => `<li><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></li>`).join("")}
        </ul>
        <div class="calc-step-total"><span>Panel eşdeğeri m²</span><strong>${formatNumber(m2, " m²")}</strong></div>
      </div>
    `;
  }
  return `
    <div class="calc-steps-panel">
      <p class="section-kicker">M² özeti</p>
      <p class="form-hint">Ölçüler ve detay adetleri panel eşdeğer m² sonucunu belirler.</p>
      <ul class="calc-steps-list">
        <li><span>Gövde alanı (yaklaşık)</span><strong>${formatNumber(base.bodyAreaM2, " m²")}</strong></li>
        <li><span>Ön yüzey / kapak payı</span><strong>${formatNumber(base.frontAreaM2, " m²")}</strong></li>
        <li><span>Detay çarpanı</span><strong>${formatNumber(base.detailFactor, "")}</strong></li>
        <li><span>Eşdeğer panel m²</span><strong>${formatNumber(m2, " m²")}</strong></li>
      </ul>
    </div>
  `;
}

function renderRoomTypeModalLayer() {
  if (!state.ui.roomTypeModalOpen) return "";
  return `
    <div class="modal-overlay" data-action="backdrop-close-room-modal">
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="roomTypeModalTitle">
        <div class="modal-head">
          <h3 id="roomTypeModalTitle">Oda tipi seçin</h3>
          <button type="button" class="icon-button" data-action="close-room-type-modal" aria-label="Kapat">×</button>
        </div>
        <p class="form-hint">Seçtiğiniz oda için ölçü sayfası açılır.</p>
        <div class="modal-room-type-grid">
          ${ROOM_TYPE_ORDER.filter((id) => ROOM_TEMPLATES[id])
            .map(
              (id) => `
            <button type="button" class="modal-room-tile" data-action="pick-room-type-modal" data-room-type="${id}">
              <strong>${escapeHtml(ROOM_TEMPLATES[id].label)}</strong>
              <span class="muted">${escapeHtml(ROOM_TEMPLATES[id].info || "").slice(0, 72)}${(ROOM_TEMPLATES[id].info || "").length > 72 ? "…" : ""}</span>
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderUserEditorModalLayer() {
  if (!state.ui.userEditorOpen || !state.ui.userEditDraft) return "";
  const draft = state.ui.userEditDraft;
  const modeLabel = state.ui.userEditMode === "create" ? "Yeni kullanıcı" : "Kullanıcı düzenle";
  const actionLabel = state.ui.userEditMode === "create" ? "Kaydet" : "Güncelle";
  return `
    <div class="modal-overlay" data-action="backdrop-close-user-modal">
      <div class="modal-sheet user-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="userEditorTitle">
        <div class="modal-head">
          <h3 id="userEditorTitle">${modeLabel}</h3>
          <button type="button" class="icon-button" data-action="close-user-editor" aria-label="Kapat">×</button>
        </div>
        <div class="compact-grid">
          ${inputField({ label: "Ad Soyad", value: draft.fullName || "", bind: "userdraft.fullName", focusId: "userdraft-name" })}
          ${inputField({ label: "Kullanıcı adı", value: draft.username || "", bind: "userdraft.username", focusId: "userdraft-username" })}
          ${inputField({ label: "Şifre", value: draft.password || "", bind: "userdraft.password", focusId: "userdraft-password" })}
          ${inputField({ label: "Firma", value: draft.company || "", bind: "userdraft.company", focusId: "userdraft-company" })}
          ${selectField({
            label: "Durum",
            bind: "userdraft.status",
            value: draft.status || "active",
            focusId: "userdraft-status",
            options: [{ value: "active", label: "Aktif" }, { value: "passive", label: "Pasif" }]
          })}
          ${inputField({ label: "Lisans başlangıç", value: draft.licenseStartDate || "", bind: "userdraft.licenseStartDate", focusId: "userdraft-license-start", type: "date" })}
          ${inputField({ label: "Lisans bitiş", value: draft.licenseEndDate || "", bind: "userdraft.licenseEndDate", focusId: "userdraft-license-end", type: "date" })}
        </div>
        <div class="modal-footer-actions">
          ${modalFooterCancelIconButton("close-user-editor", "İptal")}
          <button type="button" class="enterprise-icon-btn enterprise-icon-btn--primary" data-action="save-user-editor" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${icon("check")}</button>
        </div>
      </div>
    </div>
  `;
}

function renderCatalogEditorModalLayer() {
  if (!state.ui.catalogEditorOpen || !state.ui.catalogEditDraft) return "";
  const type = state.ui.catalogEditType || "quality";
  const draft = state.ui.catalogEditDraft;
  const modeLabel = state.ui.catalogEditMode === "create" ? "Yeni kayıt" : "Kayıt düzenle";
  return `
    <div class="modal-overlay" data-action="backdrop-close-catalog-modal">
      <div class="modal-sheet user-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="catalogEditorTitle">
        <div class="modal-head">
          <h3 id="catalogEditorTitle">${modeLabel}</h3>
          ${iconOnlyActionButton("close-catalog-editor", "ban", "Kapat")}
        </div>
        <div class="compact-grid">
          ${
            type === "quality"
              ? `
                ${inputField({ label: "Kalite adı", value: draft.name || "", bind: "catalogdraft.name", focusId: "catalogdraft-name" })}
                ${inputField({ label: "m² fiyatı", value: draft.officialSqmPrice || 0, bind: "catalogdraft.officialSqmPrice", type: "number", step: "50", focusId: "catalogdraft-sqm" })}
                ${inputField({ label: "Açıklama", value: draft.note || "", bind: "catalogdraft.note", focusId: "catalogdraft-note" })}
              `
              : type === "package"
                ? `
                  ${inputField({ label: "Paket adı", value: draft.name || "", bind: "catalogdraft.name", focusId: "catalogdraft-name" })}
                  ${inputField({ label: "Menteşe", value: draft.hingePrice || 0, bind: "catalogdraft.hingePrice", type: "number", step: "5", focusId: "catalogdraft-hinge" })}
                  ${inputField({ label: "Çekmece", value: draft.drawerPrice || 0, bind: "catalogdraft.drawerPrice", type: "number", step: "10", focusId: "catalogdraft-drawer" })}
                  ${inputField({ label: "Ray", value: draft.railPrice || 0, bind: "catalogdraft.railPrice", type: "number", step: "10", focusId: "catalogdraft-rail" })}
                  ${inputField({ label: "Kulp", value: draft.handlePrice || 0, bind: "catalogdraft.handlePrice", type: "number", step: "5", focusId: "catalogdraft-handle" })}
                  ${inputField({ label: "Mekanizma", value: draft.liftPrice || 0, bind: "catalogdraft.liftPrice", type: "number", step: "10", focusId: "catalogdraft-lift" })}
                  ${inputField({ label: "Cam kapak farkı", value: draft.glassDoorPremium || 0, bind: "catalogdraft.glassDoorPremium", type: "number", step: "10", focusId: "catalogdraft-glass" })}
                `
                : `
                  ${inputField({ label: "Hizmet adı", value: draft.name || "", bind: "catalogdraft.name", focusId: "catalogdraft-name" })}
                  ${inputField({ label: "Birim", value: draft.unit || "", bind: "catalogdraft.unit", focusId: "catalogdraft-unit" })}
                  ${inputField({ label: "Fiyat", value: draft.price || 0, bind: "catalogdraft.price", type: "number", step: "10", focusId: "catalogdraft-price" })}
                  ${inputField({ label: "Varsayılan miktar", value: draft.defaultQuantity || 0, bind: "catalogdraft.defaultQuantity", type: "number", step: "0.1", focusId: "catalogdraft-default" })}
                `
          }
        </div>
        <div class="modal-footer-actions">
          ${modalFooterCancelIconButton("close-catalog-editor", "İptal")}
          <button type="button" class="enterprise-icon-btn enterprise-icon-btn--primary" data-action="save-catalog-editor" aria-label="Kaydet" title="Kaydet">${icon("check")}</button>
        </div>
      </div>
    </div>
  `;
}

function createChamberEditDraft() {
  const c = state.remote.chamber;
  return {
    chamberName: c.chamberName || "",
    updatedAt: c.updatedAt || "",
    laborHourlyRate: Number(c.laborHourlyRate || 0),
    installationMtPrice: Number(c.installationMtPrice || 0),
    packagingSqmPrice: Number(c.packagingSqmPrice || 0),
    overheadRate: Number(c.overheadRate || 0),
    chamberMarginRate: Number(c.chamberMarginRate || 0),
    minimumProfitRate: Number(c.minimumProfitRate || 0)
  };
}

function renderChamberEditorModalLayer() {
  if (!state.ui.chamberEditorOpen || !state.ui.chamberEditDraft) return "";
  const draft = state.ui.chamberEditDraft;
  return `
    <div class="modal-overlay" data-action="backdrop-close-chamber-modal">
      <div class="modal-sheet user-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="chamberEditorTitle">
        <div class="modal-head">
          <h3 id="chamberEditorTitle">Resmi hesap ayarları</h3>
          ${iconOnlyActionButton("close-chamber-editor", "ban", "Kapat")}
        </div>
        <div class="compact-grid">
          ${inputField({ label: "Oda adı", value: draft.chamberName || "", bind: "chamberdraft.chamberName", focusId: "chamberdraft-name" })}
          ${inputField({ label: "Güncelleme tarihi", value: draft.updatedAt || "", bind: "chamberdraft.updatedAt", focusId: "chamberdraft-date" })}
          ${inputField({ label: "Saatlik işçilik", value: draft.laborHourlyRate || 0, bind: "chamberdraft.laborHourlyRate", type: "number", step: "5", focusId: "chamberdraft-labor" })}
          ${inputField({ label: "Montaj mt fiyatı", value: draft.installationMtPrice || 0, bind: "chamberdraft.installationMtPrice", type: "number", step: "5", focusId: "chamberdraft-install" })}
          ${inputField({ label: "Paketleme m² fiyatı", value: draft.packagingSqmPrice || 0, bind: "chamberdraft.packagingSqmPrice", type: "number", step: "5", focusId: "chamberdraft-packaging" })}
          ${inputField({ label: "Genel gider oranı", value: draft.overheadRate || 0, bind: "chamberdraft.overheadRate", type: "number", step: "0.01", focusId: "chamberdraft-overhead" })}
          ${inputField({ label: "Oda kar oranı", value: draft.chamberMarginRate || 0, bind: "chamberdraft.chamberMarginRate", type: "number", step: "0.01", focusId: "chamberdraft-margin" })}
          ${inputField({ label: "Asgari kar oranı", value: draft.minimumProfitRate || 0, bind: "chamberdraft.minimumProfitRate", type: "number", step: "0.01", focusId: "chamberdraft-min-profit" })}
        </div>
        <div class="modal-footer-actions">
          ${modalFooterCancelIconButton("close-chamber-editor", "İptal")}
          <button type="button" class="enterprise-icon-btn enterprise-icon-btn--primary" data-action="save-chamber-editor" aria-label="Kaydet" title="Kaydet">${icon("check")}</button>
        </div>
      </div>
    </div>
  `;
}

function openConfirmModal(payload) {
  state.ui.confirmModal = payload;
  render();
}

function closeConfirmModal() {
  state.ui.confirmModal = null;
  render();
}

function executeConfirmModalAction() {
  const m = state.ui.confirmModal;
  if (!m?.kind || !m.id) return;
  const id = m.id;
  switch (m.kind) {
    case "remove-user": {
      const user = getUserById(id);
      if (!user || user.role !== "producer") {
        window.alert("Bu kullanıcı silinemez.");
        return;
      }
      state.remote.users = state.remote.users.filter((item) => item.id !== id);
      state.remote.projects = state.remote.projects.filter((project) => project.ownerUserId !== id);
      if (state.ui.currentUserId === id) {
        state.ui.currentUserId = getManageableUsers().find((item) => item.role === "chamber")?.id || state.remote.users[0]?.id || null;
      }
      scheduleSave();
      showToast("Kullanıcı silindi.");
      break;
    }
    case "deactivate-user": {
      const user = getUserById(id);
      if (!user) {
        state.ui.confirmModal = null;
        render();
        return;
      }
      user.status = "passive";
      scheduleSave();
      showToast("Kullanıcı pasife alındı.");
      break;
    }
    case "renew-license": {
      const user = getUserById(id);
      if (!user || user.role !== "producer") {
        window.alert("Lisans yalnızca üretici hesaplarında uzatılabilir.");
        return;
      }
      user.status = "active";
      user.licenseStartDate = todayIso();
      user.licenseEndDate = addOneYear();
      scheduleSave();
      showToast("Lisans yenilendi.");
      break;
    }
    case "remove-quality": {
      if (state.remote.qualities.length <= 1) {
        window.alert("Son kalan kalite kaydı silinemez.");
        return;
      }
      state.remote.qualities = state.remote.qualities.filter((item) => item.id !== id);
      scheduleSave();
      showToast("Kalite kaydı silindi.");
      break;
    }
    case "remove-package": {
      if (state.remote.hardwarePackages.length <= 1) {
        window.alert("Son kalan paket silinemez.");
        return;
      }
      state.remote.hardwarePackages = state.remote.hardwarePackages.filter((item) => item.id !== id);
      scheduleSave();
      showToast("Paket silindi.");
      break;
    }
    case "remove-service": {
      state.remote.servicesCatalog = state.remote.servicesCatalog.filter((item) => item.id !== id);
      state.remote.projects.forEach((project) => {
        (project.quotes || []).forEach((quote) => {
          quote.services = (quote.services || []).filter((item) => item.id !== id);
          quote.contractServiceLines = (quote.contractServiceLines || []).filter((item) => item.id !== id);
        });
      });
      scheduleSave();
      showToast("Hizmet silindi.");
      break;
    }
    default:
      return;
  }
  state.ui.confirmModal = null;
  render();
}

function renderConfirmModalLayer() {
  const m = state.ui.confirmModal;
  if (!m?.kind || !m.id) return "";
  let title = "Onay";
  let message = "Bu işlemi onaylıyor musunuz?";
  const user = getUserById(m.id);
  const quality = state.remote.qualities.find((q) => q.id === m.id);
  const pkg = state.remote.hardwarePackages.find((p) => p.id === m.id);
  const service = state.remote.servicesCatalog.find((s) => s.id === m.id);
  if (m.kind === "remove-user" && user) {
    title = "Kullanıcıyı sil";
    message = `<strong>${escapeHtml(user.fullName)}</strong> (${escapeHtml(user.username)}) hesabı ve bu kullanıcıya ait projeler kalıcı olarak silinecek. Bu işlem geri alınamaz.`;
  } else if (m.kind === "deactivate-user" && user) {
    title = "Kullanıcıyı pasife al";
    message = `<strong>${escapeHtml(user.fullName)}</strong> giriş yapamayacak; kayıtlar silinmez. İstediğiniz zaman tekrar aktifleştirebilirsiniz.`;
  } else if (m.kind === "renew-license" && user) {
    title = "Lisansı uzat";
    message = `<strong>${escapeHtml(user.fullName)}</strong> için lisans bugünden itibaren bir yıl uzatılacak ve hesap aktif yapılacak.`;
  } else if (m.kind === "remove-quality" && quality) {
    title = "Kalite kaydını sil";
    message = `<strong>${escapeHtml(quality.name)}</strong> resmi kalite satırı silinecek. Mevcut tekliflerdeki oda satırları etkilenmez; yeni tekliflerde bu kalite seçilemez.`;
  } else if (m.kind === "remove-package" && pkg) {
    title = "Paketi sil";
    message = `<strong>${escapeHtml(pkg.name)}</strong> hırdavat paketi silinecek.`;
  } else if (m.kind === "remove-service" && service) {
    title = "Hizmeti sil";
    message = `<strong>${escapeHtml(service.name)}</strong> hizmet kalemi silinecek; tekliflerdeki ilgili satırlar temizlenir.`;
  }
  return `
    <div class="modal-overlay" data-action="backdrop-close-confirm-modal">
      <div class="modal-sheet user-editor-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirmModalTitle" aria-describedby="confirmModalDesc">
        <div class="modal-head">
          <h3 id="confirmModalTitle">${escapeHtml(title)}</h3>
          <button type="button" class="icon-button" data-action="confirm-modal-cancel" aria-label="Kapat">×</button>
        </div>
        <p id="confirmModalDesc" class="form-hint confirm-modal-body">${message}</p>
        <div class="modal-footer-actions">
          ${modalFooterCancelIconButton("confirm-modal-cancel", "İptal")}
          <button type="button" class="${m.kind === "remove-user" ? "danger-button" : "primary-button"}" data-action="confirm-modal-confirm">Onayla</button>
        </div>
      </div>
    </div>
  `;
}

function renderSessionNoticeModalLayer() {
  const m = state.ui.sessionNoticeModal;
  if (!m?.message) return "";
  const title = m.kind === "signout" ? "Güvenli çıkış" : "Oturum süresi doldu";
  return `
    <div class="modal-overlay modal-overlay--session-notice" data-action="backdrop-close-session-notice">
      <div class="modal-sheet user-editor-sheet session-notice-sheet" role="alertdialog" aria-modal="true" aria-labelledby="sessionNoticeTitle" aria-describedby="sessionNoticeDesc">
        <div class="modal-head">
          <div class="session-notice-head">
            <span class="session-notice-icon" aria-hidden="true">${icon("info")}</span>
            <h3 id="sessionNoticeTitle">${escapeHtml(title)}</h3>
          </div>
          <button type="button" class="icon-button" data-action="dismiss-session-notice" aria-label="Kapat">×</button>
        </div>
        <p id="sessionNoticeDesc" class="confirm-modal-body session-notice-body">${escapeHtml(m.message)}</p>
        <div class="modal-footer-actions session-notice-footer">
          <button type="button" class="primary-button px-8" data-action="dismiss-session-notice">Tamam</button>
        </div>
      </div>
    </div>
  `;
}

function buildCorporateDocumentHtml(project, quote, calculation, kind) {
  const org = escapeHtml(state.remote?.chamber?.chamberName || CHAMBER_DEFAULT);
  const headline = kind === "contract" ? "Taslak sözleşme özeti" : "Resmi teklif özeti";
  const roomRows = calculation.roomResults
    .map(
      (rr) => `
      <tr>
        <td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;">${escapeHtml(rr.roomName)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(rr.selected.qualityName)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">${formatNumber(rr.selected.metrics.panelEquivalentM2, " m²")}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">${formatCurrency(rr.selected.officialSqmPrice)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#047857;">${formatCurrency(rr.selected.sqmOfficialTotal)}</td>
      </tr>`
    )
    .join("");
  const serviceRows =
    calculation.services?.length > 0
      ? calculation.services
          .map(
            (s) => `
      <tr>
        <td colspan="4" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#4b5563;">Hizmet: ${escapeHtml(s.name)} · ${formatNumber(s.quantity, " " + (s.unit || "adet"))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatCurrency(s.total)}</td>
      </tr>`
          )
          .join("")
      : "";
  const t = calculation.totals;
  const disc = Number(t.totalDiscount ?? 0);
  return `
    <div id="documentPreviewRoot" class="invoice-print-root" style="box-sizing:border-box;font-family:Inter,'Segoe UI',system-ui,sans-serif;color:#111827;font-size:11.5px;line-height:1.45;max-width:190mm;margin:0 auto;padding:12px 8px;background:#fff;">
      <header style="border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:14px;">
        <div style="font-size:9px;letter-spacing:0.14em;color:#64748b;text-transform:uppercase;font-weight:700;">${org}</div>
        <h1 style="margin:4px 0 0;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(headline)}</h1>
        <p style="margin:10px 0 0;color:#334155;font-size:12px;"><strong>Proje:</strong> ${escapeHtml(project.projectName)} &nbsp;·&nbsp; <strong>Müşteri:</strong> ${escapeHtml(project.customerName || "—")}</p>
        <p style="margin:6px 0 0;color:#64748b;font-size:11px;">${escapeHtml(project.merchantName || "")} &nbsp;·&nbsp; Tel: ${escapeHtml(project.customerPhone || "—")} &nbsp;·&nbsp; Kod: ${escapeHtml(project.contractCode || "—")}</p>
      </header>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">
          <div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700;">Teklif no</div>
          <div style="font-size:15px;font-weight:800;margin-top:2px;">${escapeHtml(String(quote.number))}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">
          <div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700;">Tarih</div>
          <div style="font-size:15px;font-weight:800;margin-top:2px;">${escapeHtml(formatDate(quote.date))}</div>
        </div>
      </div>
      <h2 style="font-size:11px;margin:0 0 6px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:0.06em;">Oda satırları</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff;">
            <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">Oda</th>
            <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">Kalite</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;">Panel m²</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;">m² fiyat</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;">Tutar</th>
          </tr>
        </thead>
        <tbody>${roomRows}${serviceRows}</tbody>
      </table>
      <div style="margin-top:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
        <div style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
          <div style="font-size:9px;color:#64748b;">Ara toplam</div>
          <div style="font-size:13px;font-weight:700;">${formatCurrency(t.officialGrandTotal)}</div>
        </div>
        <div style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
          <div style="font-size:9px;color:#64748b;">İndirimler</div>
          <div style="font-size:13px;font-weight:700;color:#b91c1c;">−${formatCurrency(disc)}</div>
        </div>
        <div style="grid-column:1/-1;padding:12px;border:2px solid #1d4ed8;border-radius:10px;background:#eff6ff;">
          <div style="font-size:9px;color:#1e40af;font-weight:700;text-transform:uppercase;">Net tutar</div>
          <div style="font-size:18px;font-weight:800;color:#1e3a8a;margin-top:4px;">${formatCurrency(t.netGrandTotal)}</div>
          <div style="font-size:10px;color:#475569;margin-top:4px;">Toplam panel m²: <strong>${formatNumber(t.panelTotal, " m²")}</strong></div>
        </div>
      </div>
      ${quote.notes ? `<p style="margin-top:14px;padding:10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:11px;color:#713f12;"><strong>Not:</strong> ${escapeHtml(quote.notes)}</p>` : ""}
      <p style="margin-top:18px;font-size:9px;color:#94a3b8;text-align:center;">Bu belge bilgilendirme amaçlıdır.</p>
    </div>
  `;
}

function renderDocumentPreviewModalLayer() {
  const prev = state.ui.documentPreview;
  if (!prev?.quoteId || !prev?.projectId) return "";
  const project = state.remote.projects.find((p) => p.id === prev.projectId);
  const quote = project?.quotes?.find((q) => q.id === prev.quoteId);
  if (!project || !quote) return "";
  const calculation =
    prev.kind === "contract" ? calculateContractDocument(quote, state.remote) : calculateQuote(quote, state.remote);
  const html = buildCorporateDocumentHtml(project, quote, calculation, prev.kind);
  const kindLabel = prev.kind === "contract" ? "Sözleşme önizlemesi" : "Teklif önizlemesi";
  return `
    <div class="modal-overlay modal-overlay--document-preview" data-action="backdrop-close-document-preview">
      <div class="modal-sheet document-preview-sheet" role="dialog" aria-modal="true" aria-labelledby="docPreviewTitle">
        <div class="modal-head document-preview-head">
          <div>
            <p class="section-kicker">${escapeHtml(kindLabel)}</p>
            <h3 id="docPreviewTitle">${escapeHtml(project.projectName)} — Teklif ${escapeHtml(String(quote.number))}</h3>
          </div>
          <div class="inline-actions document-preview-actions">
            <button type="button" class="primary-button" data-action="download-document-pdf">${icon("print")} PDF indir</button>
            <button type="button" class="ghost-button" data-action="close-document-preview">Kapat</button>
          </div>
        </div>
        <div class="document-preview-scroll">
          ${html}
        </div>
      </div>
    </div>
  `;
}

function renderQuoteRoomsTable(quote, calculation) {
  if (!quote.rooms.length) {
    return `<p class="form-hint">Henüz oda yok. <strong>Oda ekle</strong> ile yeni satır oluşturun.</p>`;
  }
  return `
    <div class="quote-rooms-table-wrap">
      <table class="quote-rooms-table">
        <thead>
          <tr>
            <th>Oda</th>
            <th>Tip</th>
            <th>Toplam m²</th>
            <th>Kalite</th>
            <th>Tutar</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${quote.rooms
            .map((room, index) => {
              const res = calculation.roomResults[index];
              const typeLabel = ROOM_TEMPLATES[room.type]?.label || room.type;
              return `
            <tr>
              <td data-label="Oda"><strong>${escapeHtml(room.name)}</strong></td>
              <td data-label="Tip">${escapeHtml(typeLabel)}</td>
              <td data-label="Toplam m²">${formatNumber(res?.selected?.metrics?.panelEquivalentM2 ?? 0, " m²")}</td>
              <td data-label="Kalite">${escapeHtml(res?.selected?.qualityName || "—")}</td>
              <td data-label="Tutar"><strong>${formatCurrency(res?.selected?.sqmOfficialTotal || 0)}</strong></td>
              <td data-label="İşlem">
                <div class="inline-actions inline-actions--compact">
                  <button type="button" class="ghost-button" data-action="open-room-editor" data-room-id="${room.id}">Düzenle</button>
                  <button type="button" class="danger-button ghost" data-action="remove-room" data-room-id="${room.id}">Sil</button>
                </div>
              </td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function deriveRoomNameFromType(draft, quote, editingRoomId) {
  const label = ROOM_TEMPLATES[draft.type]?.label || "Oda";
  const sameTypeOthers = quote.rooms.filter(
    (r) => r.type === draft.type && (editingRoomId === "new" || r.id !== editingRoomId)
  );
  if (sameTypeOthers.length === 0) return label;
  return `${label} ${sameTypeOthers.length + 1}`;
}

function renderRoomEditScreen(project, quote) {
  const draft = state.ui.roomEditDraft;
  if (!draft) return renderQuoteEditorScreen(project, quote);

  const hw =
    state.remote.hardwarePackages.find((p) => p.id === draft.hardwarePackageId) || state.remote.hardwarePackages[0];
  const visibleFields = getVisibleFields(draft.type);
  const basePreview = calculateRoomBase(draft);
  const hasM2 = basePreview.panelEquivalentM2 > 0;

  const qualityRows = (state.remote.qualities || []).map((quality) => {
    const res = calculateRoomForQuality(draft, quality, state.remote.chamber, hw);
    const active = draft.selectedQualityId === quality.id;
    const tutarLabel = hasM2 ? formatCurrency(res.sqmOfficialTotal) : "—";
    const priceLabel = hasM2 ? `m² ${formatCurrency(quality.officialSqmPrice)}` : "—";
    return `
      <button type="button" class="quality-pick-row ${active ? "active" : ""}" data-action="pick-room-quality" data-quality-id="${escapeHtml(quality.id)}">
        <span class="quality-pick-row-name">${escapeHtml(quality.name)}</span>
        <span class="quality-pick-row-price">${priceLabel}</span>
        <span class="quality-pick-row-tutar"><span class="quality-pick-row-tutar-dim">Tutar </span>${tutarLabel}</span>
      </button>
    `;
  });

  const typeLabel = ROOM_TEMPLATES[draft.type]?.label || draft.type;

  return `
    <section class="project-workspace project-workspace--solo room-edit-screen">
      ${renderProducerMobileBar()}
      <article class="surface-card">
        <div class="card-head">
          <div>
            <p class="section-kicker">${state.ui.editingRoomId === "new" ? "Yeni oda" : "Oda düzenle"}</p>
            <h3>${escapeHtml(typeLabel)}</h3>
            <p class="form-hint">Teklif ${quote.number}. Aynı tipte birden fazla oda varsa adlar otomatik numaralanır.</p>
          </div>
          <div class="producer-nav-cluster">
            ${producerHubListButton()}
            ${producerNavSoftButton("cancel-room-editor", "Teklife dön")}
          </div>
        </div>
        <div class="room-edit-layout-v2">
          <div class="room-edit-top-row">
            <div class="step-card collapse-line room-edit-measures">
              <h4>Ölçüler</h4>
              <div class="detail-grid">
                ${visibleFields
                  .map((field) =>
                    inputField({
                      label: `${field.label} (${field.unit})`,
                      value: draftBasicDisplay(draft, field.key),
                      bind: `roomdraft.basic.${field.key}`,
                      type: "number",
                      decimalText: true,
                      step: String(field.step ?? 0.1),
                      focusId: buildFocusId(["roomdraft", "basic", field.key])
                    })
                  )
                  .join("")}
              </div>
            </div>
            <aside class="room-edit-aside room-edit-calc-aside">
              ${renderRoomDraftCalcSteps(draft)}
            </aside>
          </div>
          <div class="step-card room-edit-quality-block">
            <h4>Kalite seçimi</h4>
            <p class="form-hint">Ölçü girildikçe tutarlar güncellenir. Bir satıra dokunarak seçim yapın.</p>
            <div class="quality-pick-list" role="list">
              ${qualityRows.join("")}
            </div>
          </div>
          <div class="step-card collapse-line room-edit-details-wide">
            <h4>Detay / adetler</h4>
            <div class="room-detail-fields-grid">
              ${DETAIL_FIELDS.map((field) =>
                inputField({
                  label: `${field.label} (${field.unit})`,
                  value: draftDetailDisplay(draft, field.key),
                  bind: `roomdraft.details.${field.key}`,
                  type: "number",
                  decimalText: true,
                  step: String(field.step ?? 1),
                  focusId: buildFocusId(["roomdraft", "details", field.key])
                })
              ).join("")}
            </div>
          </div>
          <div class="step-card room-edit-hw-block">
            <h4>İsteğe bağlı: hırdavat paketi</h4>
            <p class="form-hint">İşaretlerseniz kapak/çekmece birim fiyatları hesaba katılır.</p>
            <label class="hw-toggle-label">
              <input type="checkbox" class="roomdraft-include-hw" ${draft.includeHardwarePackage ? "checked" : ""} />
              <span>Hırdavat paketini uygula</span>
            </label>
            ${
              draft.includeHardwarePackage
                ? `<div style="margin-top:12px;max-width:320px">${selectField({
                    label: "Paket",
                    bind: "roomdraft.hardwarePackageId",
                    value: draft.hardwarePackageId,
                    options: state.remote.hardwarePackages.map((p) => ({ value: p.id, label: p.name })),
                    focusId: "roomdraft-hw"
                  })}</div>`
                : ""
            }
          </div>
          <div class="room-edit-actions pp-meta-step-actions">
            <button type="button" class="primary-button wide pp-cta-primary" data-action="save-room-editor">Odayı teklife ekle</button>
            <button type="button" class="ghost-button wide" data-action="cancel-room-editor">İptal</button>
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderProducerMobileBar() {
  return "";
}

function producerHubListButton() {
  return `<button type="button" class="producer-nav-btn" data-action="back-to-project-hub">Proje listesi</button>`;
}

function producerNavSoftButton(action, label, attrs = "") {
  return `<button type="button" class="producer-nav-btn producer-nav-btn--soft" data-action="${action}" ${attrs}>${escapeHtml(label)}</button>`;
}

function renderProducerProjectHub() {
  const projects = getVisibleProjects();
  return `
    <section class="project-hub project-workspace">
      ${renderProducerMobileBar()}
      <article class="surface-card">
        <div class="card-head card-head--producer-hub">
          <div>
            <p class="section-kicker">Projelerim</p>
            <h3>Tüm projeler</h3>
            <p class="form-hint">Bir projeye tıklayarak teklif ve odalarına gidin.</p>
          </div>
          <button type="button" class="primary-button producer-new-project-btn" data-action="new-project-quick">Yeni proje</button>
        </div>
        <div class="project-hub-list">
          ${projects
            .map((p) => {
              const lastQ = p.quotes?.length ? p.quotes[p.quotes.length - 1] : null;
              const calc = lastQ ? calculateQuote(lastQ, state.remote) : null;
              return `
            <button type="button" class="project-hub-row mp-list-row" data-action="open-project-workspace" data-project-id="${p.id}">
              <div class="project-hub-row-text">
                <strong>${escapeHtml(p.projectName)}</strong>
                <span class="muted">${escapeHtml(p.customerName || "Müşteri —")}</span>
              </div>
              <div class="project-hub-row-meta">
                <span class="muted">${p.saved ? `${p.quotes?.length || 0} teklif` : "Taslak"}</span>
                ${calc ? `<strong>${formatCurrency(calc.totals.netGrandTotal)}</strong>` : ""}
              </div>
            </button>
          `;
            })
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderProjectMetaScreen(project) {
  return `
    <section class="project-workspace project-workspace--solo">
      ${renderProducerMobileBar()}
      <article class="surface-card project-hero-card">
        <div class="card-head card-head--producer-flow">
          <div>
            <p class="section-kicker">1. Adım — Proje</p>
            <h3>Proje bilgileri</h3>
            <p class="form-hint">Alanlar her değişimde veritabanına yazılır. Proje bilgilerini tamamladıktan sonra teklif adımına geçin. Kod: ${escapeHtml(project.contractCode)}</p>
          </div>
          ${producerHubListButton()}
        </div>
        <div class="compact-grid compact-grid-two project-meta-grid">
          ${inputField({ label: "Proje adı", value: project.projectName, bind: "project.projectName", focusId: "project-name" })}
          ${inputField({ label: "Müşteri adı", value: project.customerName, bind: "project.customerName", focusId: "project-customer" })}
          ${inputField({ label: "Telefon", value: project.customerPhone || "", bind: "project.customerPhone", focusId: "project-phone" })}
          <label class="field-span-2 project-address-field mp-field">
            <span class="mp-field-label">Adres</span>
            <textarea class="mp-input" data-bind="project.projectAddress" data-focus-id="project-address" rows="5">${escapeHtml(
              project.projectAddress || ""
            )}</textarea>
          </label>
        </div>
        <div class="meta-step-actions pp-meta-step-actions">
          <button type="button" class="primary-button wide pp-cta-primary" data-action="save-project-meta">Tekliflere geç</button>
          <button type="button" class="danger-button wide pp-cta-danger" data-action="delete-project">Projeyi sil</button>
        </div>
      </article>
    </section>
  `;
}

function renderQuotesListScreen(project) {
  return `
    <section class="project-workspace project-workspace--solo">
      ${renderProducerMobileBar()}
      <article class="surface-card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Kayıtlı proje</p>
            <h3>${escapeHtml(project.projectName)}</h3>
            <p class="form-hint"><strong>Müşteri:</strong> ${escapeHtml(project.customerName || "—")} · ${escapeHtml(project.contractCode)}</p>
          </div>
          <div class="producer-nav-cluster">
            ${producerHubListButton()}
            ${producerNavSoftButton("go-to-project-meta", "Proje bilgisi")}
            <button type="button" class="producer-nav-btn producer-nav-btn--danger" data-action="delete-project">Projeyi sil</button>
          </div>
        </div>
      </article>
      <article class="surface-card">
        <div class="card-head">
          <div>
            <p class="section-kicker">2. Adım — Teklifler</p>
            <h3>Teklifler (${project.quotes.length})</h3>
          </div>
          ${plusActionButton("add-quote", "Teklif ekle")}
        </div>
        ${
          project.quotes.length
            ? `
        <div class="contracts-list-table-wrap">
          <table class="list-table user-list-table user-list-table--compact quote-list-table">
            <thead>
              <tr>
                <th scope="col">Teklif</th>
                <th scope="col">Tarih</th>
                <th scope="col">Toplam m²</th>
                <th scope="col">Net tutar</th>
                <th scope="col">Odalar (m² · tutar)</th>
                <th class="user-sort-th user-sort-th--static" scope="col">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              ${project.quotes
                .map((q) => {
                  const calc = calculateQuote(q, state.remote);
                  const totals = calc.totals;
                  const rooms = q.rooms || [];
                  const roomCount = rooms.length;
                  const panelM2 = totals.panelTotal ?? 0;
                  const netTotal = totals.netGrandTotal ?? 0;
                  const roomLines =
                    roomCount > 0
                      ? rooms
                          .map((room, idx) => {
                            const rr = calc.roomResults[idx];
                            const m2 = formatNumber(rr?.selected?.metrics?.panelEquivalentM2 ?? 0, " m²");
                            const amt = formatCurrency(rr?.selected?.sqmOfficialTotal ?? 0);
                            return `<li>${escapeHtml(room.name || "Oda")}: ${m2} · ${amt}</li>`;
                          })
                          .join("")
                      : "";
                  return `
                <tr>
                  <td data-label="Teklif"><strong>Teklif ${escapeHtml(String(q.number))}</strong></td>
                  <td data-label="Tarih">${escapeHtml(formatDate(q.date))}</td>
                  <td data-label="Toplam m²"><strong>${formatNumber(panelM2, " m²")}</strong></td>
                  <td data-label="Net tutar"><strong>${formatCurrency(netTotal)}</strong></td>
                  <td data-label="Odalar">
                    ${
                      roomCount
                        ? `<ul class="quote-table-room-lines">${roomLines}</ul>`
                        : `<span class="muted">—</span>`
                    }
                  </td>
                  <td data-label="İşlemler" class="user-row-actions">
                    <button type="button" class="ghost-button" data-action="open-quote" data-quote-id="${escapeHtml(q.id)}">Aç</button>
                    <button type="button" class="ghost-button" data-action="open-document-preview" data-kind="quote" data-project-id="${escapeHtml(project.id)}" data-quote-id="${escapeHtml(q.id)}">Önizle</button>
                    <button type="button" class="enterprise-icon-btn enterprise-icon-btn--danger" data-action="delete-quote" data-quote-id="${escapeHtml(q.id)}" aria-label="Teklifi sil" title="Sil">${icon("trash")}</button>
                  </td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>`
            : `<p class="form-hint">Henüz teklif yok. Numaralar otomatik verilir (1, 2, 3…).</p>`
        }
      </article>
    </section>
  `;
}

function renderQuoteEditorScreen(project, quote) {
  const calculation = calculateQuote(quote, state.remote);

  return `
    <section class="project-workspace project-workspace--solo">
      ${renderProducerMobileBar()}
      <article class="surface-card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Teklif düzenle</p>
            <h3>Teklif ${quote.number}</h3>
            <p class="form-hint quote-editor-meta">
              <span><span class="quote-editor-meta-k">Proje</span> ${escapeHtml(project.projectName || "—")}</span>
              <span class="quote-editor-meta-sep" aria-hidden="true">·</span>
              <span><span class="quote-editor-meta-k">Müşteri</span> ${escapeHtml(project.customerName || "—")}</span>
            </p>
          </div>
          <div class="producer-nav-cluster">
            ${producerHubListButton()}
            ${producerNavSoftButton("back-to-quotes", "Teklif listesi")}
            <button type="button" class="producer-nav-btn" data-action="open-document-preview" data-kind="quote" data-project-id="${escapeHtml(project.id)}" data-quote-id="${escapeHtml(quote.id)}">Önizle / PDF</button>
            <button type="button" class="producer-nav-btn producer-nav-btn--danger" data-action="delete-quote" data-quote-id="${quote.id}">Teklifi sil</button>
          </div>
        </div>
        <dl class="quote-meta-readonly">
          <div>
            <dt>Teklif numarası</dt>
            <dd>${escapeHtml(String(quote.number ?? ""))}</dd>
          </div>
          <div>
            <dt>Tarih</dt>
            <dd>${escapeHtml(formatDate(quote.date))}</dd>
          </div>
        </dl>
      </article>
      <article class="surface-card room-tabs-panel">
        <div class="card-head">
          <div>
            <p class="section-kicker">Odalar</p>
            <h3>Teklif satırları</h3>
            <p class="form-hint">Her oda ayrı ekranda eklenir; kalite ve ölçü bu ekranda seçilir.</p>
          </div>
          <div class="inline-actions">
            ${plusActionButton("open-room-add-editor", "Oda ekle")}
          </div>
        </div>
        ${renderQuoteRoomsTable(quote, calculation)}
      </article>
      ${renderQuoteSummaryPanel(quote, calculation)}
    </section>
  `;
}

function renderQuoteSummaryPanel(quote, calculation) {
  return `
    <article class="surface-card summary-panel">
      <div class="card-head">
        <div>
          <p class="section-kicker">Teklif özeti</p>
          <h3>İndirim ve not</h3>
        </div>
        <div class="inline-actions">
          <button type="button" class="primary-button" data-action="open-current-contract-detail">Sözleşme</button>
        </div>
      </div>
      <div class="summary-inline-totals">
        <div><span class="muted">Net teklif</span><strong>${formatCurrency(calculation.totals.netGrandTotal)}</strong></div>
        <div><span class="muted">Toplam m²</span><strong>${formatNumber(calculation.totals.panelTotal, " m²")}</strong></div>
      </div>
      <div class="step-card">
        <div class="compact-grid compact-grid-two">
          ${inputField({
            label: "İndirim oranı %",
            value: quote.producerDiscountRate || 0,
            bind: `quote.${quote.id}.producerDiscountRate`,
            type: "number",
            step: "0.1",
            focusId: `quote-${quote.id}-disc-rate`
          })}
          ${inputField({
            label: "Ek indirim tutarı",
            value: quote.generalDiscountAmount || 0,
            bind: `quote.${quote.id}.generalDiscountAmount`,
            type: "number",
            step: "50",
            focusId: `quote-${quote.id}-disc-amt`
          })}
        </div>
      </div>
      <label class="mp-field"><span class="mp-field-label">Teklif notu</span><textarea class="mp-input" data-bind="quote.${quote.id}.notes" data-focus-id="quote-${quote.id}-notes">${escapeHtml(quote.notes || "")}</textarea></label>
    </article>
  `;
}

function renderProjectEmptyState() {
  return `
    <article class="surface-card mp-empty">
      <div class="card-head">
        <div>
          <p class="section-kicker">Başlangıç</p>
          <h3>Proje oluşturun</h3>
        </div>
        ${plusActionButton("new-project-quick", "Yeni proje ekle")}
      </div>
      <div class="step-card">
        <strong>Henüz proje yok.</strong>
        <p class="form-hint"><strong>Yeni proje</strong> ile başlayın: önce proje bilgisini kaydedin, ardından teklif numaraları ve mutfak ölçüleri ekleyin.</p>
      </div>
    </article>
  `;
}

function renderProjectsView() {
  const visibleProjects = getVisibleProjects();
  const project = getCurrentProject();

  if (state.ui.producerProjectHub) {
    if (!visibleProjects.length) {
      return `
      <section class="project-layout project-layout-picker">
        ${renderProducerMobileBar()}
        ${renderProjectEmptyState()}
      </section>
    `;
    }
    return renderProducerProjectHub();
  }

  if (!visibleProjects.length) {
    return `
      <section class="project-layout project-layout-picker">
        ${renderProducerMobileBar()}
        ${renderProjectEmptyState()}
      </section>
    `;
  }

  if (!project) {
    return renderProducerProjectHub();
  }

  if (state.ui.producerFlow === "project" || !project.saved) {
    return renderProjectMetaScreen(project);
  }

  if (state.ui.producerFlow === "quotes") {
    return renderQuotesListScreen(project);
  }

  const quote = getCurrentQuote();
  if (state.ui.producerFlow === "room-edit" && quote) {
    return renderRoomEditScreen(project, quote);
  }
  if (state.ui.producerFlow === "quote" && quote) {
    return renderQuoteEditorScreen(project, quote);
  }

  return renderQuotesListScreen(project);
}

function renderAccountView() {
  const signedIn = getSignedInUser();
  const current = getCurrentUser();
  if (!signedIn || !current) return "";
  const isProxySession = isImpersonating();
  const impersonation = isProxySession
    ? `<p class="form-hint account-impersonation">Yönetim oturumu: <strong>${escapeHtml(signedIn.fullName)}</strong></p>`
    : "";
  const roleLabel = ROLE_LABELS[current.role] || "";
  const companyLabel = current.company || signedIn.company || "";
  const showCompany = Boolean(companyLabel && companyLabel !== current.fullName && companyLabel !== roleLabel);
  const licenseState = getLicenseState(current);
  const remainingDays = current.licenseEndDate ? daysUntil(current.licenseEndDate) : null;
  const remainingLabel =
    remainingDays === null
      ? "Lisans uygulanmaz"
      : remainingDays < 0
        ? "Süresi doldu"
        : `${remainingDays} gün kaldı`;
  return `
    <section class="account-view panel-stack">
      <article class="surface-card account-hero">
        <div class="account-avatar-ring" aria-hidden="true">
          <span class="account-avatar">${icon("profile")}</span>
        </div>
        <h3 class="account-name">${escapeHtml(current.fullName || "—")}</h3>
        <p class="muted account-role">${escapeHtml(roleLabel)}</p>
        ${showCompany ? `<p class="form-hint account-company">${escapeHtml(companyLabel)}</p>` : ""}
        ${impersonation}
        <div class="step-card compact-card">
          <span class="muted">Lisans durumu</span>
          <strong>${escapeHtml(licenseState.label)}</strong>
          <p class="form-hint">${escapeHtml(remainingLabel)}</p>
        </div>
        <div class="account-quick-actions">
          <button type="button" class="primary-button wide" data-action="secure-signout">Güvenli çıkış</button>
        </div>
      </article>
    </section>
  `;
}

function renderProducerDashboard() {
  const currentUser = getCurrentUser();
  const project = getCurrentProject();
  const licenseState = getLicenseState(currentUser);

  if (!canLogin(currentUser)) {
    return `
      <section class="grid-two">
        <article class="surface-card">
          <div class="card-head"><div><p class="section-kicker">Lisans Durumu</p><h3>Erişim kapalı</h3></div>${tag(licenseState.label, licenseState.code === "expired" ? "warning" : "danger")}</div>
          <div class="step-card">
            <strong>Bu kullanıcı şu anda teklif ekranını kullanamaz.</strong>
            <p class="form-hint">Lisans süresi dolmuş veya oda yönetimi tarafından pasife alınmış olabilir. Oda yönetimi lisansı yeniden aktif hale getirdiğinde giriş açılır.</p>
          </div>
        </article>
      </section>
    `;
  }

  const visibleProjects = getVisibleProjects();
  if (!project) {
    const title = visibleProjects.length ? "Proje seçilmedi" : "Henüz teklif yok";
    const body = visibleProjects.length
      ? "<strong>Projeler sekmesinden bir kayıt seçin.</strong><p class=\"form-hint\">Veya yeni taslak için <strong>Yeni Proje</strong> düğmesini kullanın.</p>"
      : "<strong>Yeni teklif hazırlayarak başlayabilirsiniz.</strong><p class=\"form-hint\">Bu kullanıcı yalnızca kendi projelerini ve kendi sözleşmelerini görür.</p>";
    return `
      <section class="grid-two">
        <article class="surface-card">
          <div class="card-head"><div><p class="section-kicker">Hızlı Durum</p><h3>${title}</h3></div></div>
          <div class="step-card">${body}</div>
        </article>
      </section>
    `;
  }

  const quote = project?.quotes?.[0];
  const calculation = quote
    ? calculateQuote(quote, state.remote)
    : { totals: { officialGrandTotal: 0, dealerGrandTotal: 0, panelTotal: 0 } };
  return `
    <section class="grid-two">
      <article class="surface-card">
        <div class="card-head"><div><p class="section-kicker">Hızlı Durum</p><h3>Teklif özeti</h3></div>${tag(licenseState.label, "success")}</div>
        <div class="card-stack">
          <div class="step-card"><strong>${formatCurrency(calculation.totals.officialGrandTotal)}</strong><div class="muted">Resmi toplam (ilk teklif)</div></div>
          <div class="step-card"><strong>${formatCurrency(calculation.totals.dealerGrandTotal)}</strong><div class="muted">Mağaza teklifi</div></div>
          <div class="step-card"><strong>${formatNumber(calculation.totals.panelTotal, " m²")}</strong><div class="muted">Toplam panel</div></div>
        </div>
      </article>
      <article class="surface-card">
        <div class="card-head"><div><p class="section-kicker">Lisans</p><h3>Kullanım süresi</h3></div></div>
        <div class="card-stack">
          <div class="step-card"><strong>Başlangıç</strong><p class="form-hint">${formatDate(currentUser.licenseStartDate)}</p></div>
          <div class="step-card"><strong>Bitiş</strong><p class="form-hint">${formatDate(currentUser.licenseEndDate)}</p></div>
          <div class="step-card"><strong>Kalan gün</strong><p class="form-hint">${daysUntil(currentUser.licenseEndDate)} gün</p></div>
        </div>
      </article>
    </section>
  `;
}

function renderChamberDashboard() {
  const producers = getProducerUsers();
  const activeCount = producers.filter((user) => getLicenseState(user).code === "active").length;
  const passiveCount = producers.filter((user) => getLicenseState(user).code === "passive").length;
  const expiredCount = producers.filter((user) => getLicenseState(user).code === "expired").length;
  const expiringSoon = producers.filter((user) => {
    const remaining = daysUntil(user.licenseEndDate);
    return remaining >= 0 && remaining <= 30 && getLicenseState(user).code === "active";
  }).length;

  return `
    <section class="grid-two">
      <article class="surface-card">
        <div class="card-head"><div><p class="section-kicker">Oda Yönetimi</p><h3>Lisans ve kullanıcı özeti</h3></div>${tag(state.remote.chamber.chamberName, "accent")}</div>
        <div class="card-stack">
          <div class="step-card enterprise-summary-row"><div><strong>${activeCount}</strong><div class="muted">Aktif lisans</div></div>${iconOnlyActionButton("view-users-by-filter", "eye", "Aktif lisansları göster", 'data-filter="active"')}</div>
          <div class="step-card enterprise-summary-row"><div><strong>${passiveCount}</strong><div class="muted">Pasife çekilen kullanıcı</div></div>${iconOnlyActionButton("view-users-by-filter", "eye", "Pasif kullanıcıları göster", 'data-filter="passive"')}</div>
          <div class="step-card enterprise-summary-row"><div><strong>${expiredCount}</strong><div class="muted">Süresi dolan lisans</div></div>${iconOnlyActionButton("view-users-by-filter", "eye", "Süresi dolanları göster", 'data-filter="expired"')}</div>
          <div class="step-card enterprise-summary-row"><div><strong>${expiringSoon}</strong><div class="muted">30 gün içinde bitecek lisans</div></div>${iconOnlyActionButton("view-users-by-filter", "eye", "Yakında bitecekleri göster", 'data-filter="expiring"')}</div>
        </div>
      </article>
      <article class="surface-card">
        <div class="card-head"><div><p class="section-kicker">Kural</p><h3>Erişim sınırı</h3></div></div>
        <div class="card-stack">
          <div class="step-card"><strong>Oda yönetimi teklif ve sözleşme görmez.</strong><p class="form-hint">Bu rol sadece resmi kalite fiyatlarını, hırdavat paketlerini ve kullanıcı lisanslarını yönetir.</p></div>
          <div class="step-card"><strong>Mobilyacılar birbirinin verisine erişemez.</strong><p class="form-hint">Her proje tek bir kullanıcı sahibine bağlıdır ve sadece o kullanıcıya gösterilir.</p></div>
        </div>
      </article>
    </section>
  `;
}

function renderSystemAdminDashboard() {
  const producers = getProducerUsers();
  const chamberUser = getManageableUsers().find((user) => user.role === "chamber");

  return `
    <section class="panel-stack">
      <article class="surface-card">
        <div class="card-head"><div><p class="section-kicker">Sistem Admin</p><h3>Şifresiz görünüm geçişi</h3></div>${tag("Gizli hesap", "warning")}</div>
        <div class="card-stack">
          <div class="step-card"><strong>Bu hesap kullanıcı listesinde görünmez.</strong><p class="form-hint">Admin / Admin ile giriş yapınca oda yönetimi veya herhangi bir mobilyacı ekranını doğrudan açabilirsiniz.</p></div>
          <div class="button-row">
            ${chamberUser ? `<button class="primary-button" data-action="impersonate-user" data-id="${chamberUser.id}">Oda Yönetimi Olarak Aç</button>` : ""}
            ${producers.map((user) => `<button class="ghost-button" data-action="impersonate-user" data-id="${user.id}">${escapeHtml(user.company)} Görünümü</button>`).join("")}
          </div>
        </div>
      </article>
      <article class="surface-card">
        <div class="card-head"><div><p class="section-kicker">Kontrol</p><h3>Güvenlik özeti</h3></div></div>
        <div class="card-stack">
          <div class="step-card"><strong>${producers.length}</strong><p class="form-hint">Toplam mobilyacı hesabı</p></div>
          <div class="step-card"><strong>${state.remote.projects.length}</strong><p class="form-hint">Toplam proje kaydı</p></div>
        </div>
      </article>
    </section>
  `;
}

function renderDashboardView() {
  const currentUser = getCurrentUser();
  if (currentUser.role === "producer") return renderProducerDashboard();
  if (isSystemAdminSession() && !isImpersonating()) return renderSystemAdminDashboard();
  return renderChamberDashboard();
}

function renderCatalogSection(items, type) {
  return `
    <div class="catalog-stack">
      ${items
        .map((item) =>
          type === "quality"
            ? `
              <div class="item-card">
                <div class="item-head"><div><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.note || "")}</div></div><button class="danger-button" data-action="remove-quality" data-id="${item.id}" ${state.remote.qualities.length <= 1 ? "disabled" : ""}>Sil</button></div>
                <div class="compact-grid">
                  ${inputField({ label: "Kalite adı", value: item.name, bind: `catalog.quality.${item.id}.name`, focusId: `quality-${item.id}-name` })}
                  ${inputField({ label: "Oda m² fiyatı", value: item.officialSqmPrice, bind: `catalog.quality.${item.id}.officialSqmPrice`, type: "number", step: "50", focusId: `quality-${item.id}-sqm` })}
                  ${inputField({ label: "Açıklama", value: item.note || "", bind: `catalog.quality.${item.id}.note`, focusId: `quality-${item.id}-note` })}
                </div>
              </div>
            `
            : `
              <div class="item-card">
                <div class="item-head"><div><strong>${escapeHtml(item.name)}</strong><div class="muted">Paket maliyet şablonu</div></div><button class="danger-button" data-action="remove-package" data-id="${item.id}" ${state.remote.hardwarePackages.length <= 1 ? "disabled" : ""}>Sil</button></div>
                <div class="compact-grid">
                  ${inputField({ label: "Paket adı", value: item.name, bind: `catalog.package.${item.id}.name`, focusId: `package-${item.id}-name` })}
                  ${inputField({ label: "Menteşe", value: item.hingePrice, bind: `catalog.package.${item.id}.hingePrice`, type: "number", step: "5", focusId: `package-${item.id}-hinge` })}
                  ${inputField({ label: "Çekmece", value: item.drawerPrice, bind: `catalog.package.${item.id}.drawerPrice`, type: "number", step: "10", focusId: `package-${item.id}-drawer` })}
                  ${inputField({ label: "Ray", value: item.railPrice, bind: `catalog.package.${item.id}.railPrice`, type: "number", step: "10", focusId: `package-${item.id}-rail` })}
                  ${inputField({ label: "Kulp", value: item.handlePrice, bind: `catalog.package.${item.id}.handlePrice`, type: "number", step: "5", focusId: `package-${item.id}-handle` })}
                  ${inputField({ label: "Mekanizma", value: item.liftPrice, bind: `catalog.package.${item.id}.liftPrice`, type: "number", step: "10", focusId: `package-${item.id}-lift` })}
                  ${inputField({ label: "Cam kapak farkı", value: item.glassDoorPremium, bind: `catalog.package.${item.id}.glassDoorPremium`, type: "number", step: "10", focusId: `package-${item.id}-glass` })}
                </div>
              </div>
            `
        )
        .join("")}
    </div>
  `;
}

function formatChamberRatePercent(value) {
  return formatNumber(Number(value || 0) * 100, " %");
}

function renderChamberSection() {
  const chamber = state.remote.chamber;
  return `
    <article class="catalog-card">
      <div class="card-head">
        <div>
          <p class="section-kicker">Genel Oda Katsayıları</p>
          <h3>Resmi hesap ayarları</h3>
        </div>
        <button type="button" class="ghost-button" data-action="open-chamber-editor">Düzenle</button>
      </div>
      <div class="chamber-summary-wrap">
        <table class="list-table chamber-summary-table" aria-label="Resmi hesap özeti">
          <thead>
            <tr>
              <th>Oda</th>
              <th>Günc.</th>
              <th>İşç./saat</th>
              <th>Montaj/m</th>
              <th>Paket/m²</th>
              <th>Gider</th>
              <th>Oda kâr</th>
              <th>Min.kâr</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Oda"><strong class="chamber-summary-name">${escapeHtml(chamber.chamberName || "—")}</strong></td>
              <td data-label="Günc.">${escapeHtml(chamber.updatedAt || "—")}</td>
              <td data-label="İşç./saat">${formatCurrency(chamber.laborHourlyRate)}</td>
              <td data-label="Montaj/m">${formatCurrency(chamber.installationMtPrice)}</td>
              <td data-label="Paket/m²">${formatCurrency(chamber.packagingSqmPrice)}</td>
              <td data-label="Gider">${formatChamberRatePercent(chamber.overheadRate)}</td>
              <td data-label="Oda kâr">${formatChamberRatePercent(chamber.chamberMarginRate)}</td>
              <td data-label="Min.kâr">${formatChamberRatePercent(chamber.minimumProfitRate)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderServicesCatalogSection() {
  return `
    <article class="catalog-card">
      <div class="card-head"><div><p class="section-kicker">Hizmet Kalemleri</p><h3>Ölçü, tasarım ve servis ücretleri</h3></div>${plusActionButton("add-service", "Hizmet ekle")}</div>
      <div class="catalog-stack">
        ${state.remote.servicesCatalog
          .map(
            (item) => `
              <div class="item-card">
                <div class="item-head"><div><strong>${escapeHtml(item.name)}</strong><div class="muted">Teklifte isteğe bağlı ekstra satır</div></div><button class="danger-button" data-action="remove-service" data-id="${item.id}">Sil</button></div>
                <div class="compact-grid">
                  ${inputField({ label: "Hizmet adı", value: item.name, bind: `catalog.service.${item.id}.name`, focusId: `service-${item.id}-name` })}
                  ${inputField({ label: "Birim", value: item.unit, bind: `catalog.service.${item.id}.unit`, focusId: `service-${item.id}-unit` })}
                  ${inputField({ label: "Fiyat", value: item.price, bind: `catalog.service.${item.id}.price`, type: "number", step: "10", focusId: `service-${item.id}-price` })}
                  ${inputField({ label: "Varsayılan miktar", value: item.defaultQuantity, bind: `catalog.service.${item.id}.defaultQuantity`, type: "number", step: "0.1", focusId: `service-${item.id}-default` })}
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function getCatalogTabConfig() {
  return {
    quality: { label: "Resmi Kalite Fiyatları", list: state.remote.qualities },
    package: { label: "Paket Maliyet Şablonu", list: state.remote.hardwarePackages },
    service: { label: "Hizmet Kalemleri", list: state.remote.servicesCatalog }
  };
}

function createCatalogDraft(type, item = null) {
  if (type === "quality") {
    return {
      name: item?.name || "Yeni Kalite",
      officialSqmPrice: Number(item?.officialSqmPrice || 6000),
      note: item?.note || ""
    };
  }
  if (type === "package") {
    return {
      name: item?.name || "Yeni Paket",
      hingePrice: Number(item?.hingePrice || 90),
      drawerPrice: Number(item?.drawerPrice || 600),
      railPrice: Number(item?.railPrice || 220),
      handlePrice: Number(item?.handlePrice || 180),
      liftPrice: Number(item?.liftPrice || 900),
      glassDoorPremium: Number(item?.glassDoorPremium || 360)
    };
  }
  return {
    name: item?.name || "Yeni Hizmet",
    unit: item?.unit || "adet",
    price: Number(item?.price || 1000),
    defaultQuantity: Number(item?.defaultQuantity || 0)
  };
}

function renderCatalogListRow(type, item) {
  if (type === "quality") {
    return `
      <tr>
        <td data-label="Ad"><strong>${escapeHtml(item.name)}</strong></td>
        <td data-label="m² Fiyat">${formatCurrency(item.officialSqmPrice)}</td>
        <td data-label="Not">${escapeHtml(item.note || "—")}</td>
        <td data-label="İşlem">
          <div class="user-row-actions">
            ${iconOnlyActionButton("open-catalog-editor", "edit", "Kalite düzenle", `data-type="quality" data-id="${item.id}"`)}
            <button type="button" class="enterprise-icon-btn enterprise-icon-btn--danger" data-action="remove-quality" data-id="${item.id}" aria-label="Kalite sil" title="Kalite sil" ${state.remote.qualities.length <= 1 ? "disabled" : ""}>${icon("trash")}</button>
          </div>
        </td>
      </tr>
    `;
  }
  if (type === "package") {
    return `
      <tr>
        <td data-label="Ad"><strong>${escapeHtml(item.name)}</strong></td>
        <td data-label="Menteşe">${formatCurrency(item.hingePrice)}</td>
        <td data-label="Çekmece">${formatCurrency(item.drawerPrice)}</td>
        <td data-label="Ray">${formatCurrency(item.railPrice)}</td>
        <td data-label="İşlem">
          <div class="user-row-actions">
            ${iconOnlyActionButton("open-catalog-editor", "edit", "Paket düzenle", `data-type="package" data-id="${item.id}"`)}
            <button type="button" class="enterprise-icon-btn enterprise-icon-btn--danger" data-action="remove-package" data-id="${item.id}" aria-label="Paket sil" title="Paket sil" ${state.remote.hardwarePackages.length <= 1 ? "disabled" : ""}>${icon("trash")}</button>
          </div>
        </td>
      </tr>
    `;
  }
  return `
    <tr>
      <td data-label="Ad"><strong>${escapeHtml(item.name)}</strong></td>
      <td data-label="Birim">${escapeHtml(item.unit)}</td>
      <td data-label="Fiyat">${formatCurrency(item.price)}</td>
      <td data-label="Varsayılan">${formatNumber(item.defaultQuantity)}</td>
      <td data-label="İşlem">
        <div class="user-row-actions">
          ${iconOnlyActionButton("open-catalog-editor", "edit", "Hizmet düzenle", `data-type="service" data-id="${item.id}"`)}
          <button type="button" class="enterprise-icon-btn enterprise-icon-btn--danger" data-action="remove-service" data-id="${item.id}" aria-label="Hizmet sil" title="Hizmet sil">${icon("trash")}</button>
        </div>
      </td>
    </tr>
  `;
}

function renderCatalogView() {
  const tabs = getCatalogTabConfig();
  const activeTab = tabs[state.ui.catalogTab] ? state.ui.catalogTab : "quality";
  const active = tabs[activeTab];
  return `
    <section class="panel-stack">
      ${renderChamberSection()}
      <article class="table-card user-management-full">
        <div class="card-head">
          <div>
            <p class="section-kicker">Fiyat Yönetimi</p>
            <h3>${escapeHtml(active.label)}</h3>
          </div>
          <button type="button" class="primary-button" data-action="open-catalog-editor" data-mode="create" data-type="${activeTab}">Yeni Kayıt</button>
        </div>
        <div class="catalog-tabs">
          <button type="button" class="choice-pill ${activeTab === "quality" ? "active" : ""}" data-action="set-catalog-tab" data-tab="quality">Resmi Kalite Fiyatları</button>
          <button type="button" class="choice-pill ${activeTab === "package" ? "active" : ""}" data-action="set-catalog-tab" data-tab="package">Paket Maliyet Şablonu</button>
          <button type="button" class="choice-pill ${activeTab === "service" ? "active" : ""}" data-action="set-catalog-tab" data-tab="service">Hizmet Kalemleri</button>
        </div>
        <div class="contracts-list-table-wrap">
          <table class="list-table user-list-table">
            <thead>
              ${
                activeTab === "quality"
                  ? `<tr><th>Ad</th><th>m² Fiyat</th><th>Not</th><th>İşlem</th></tr>`
                  : activeTab === "package"
                    ? `<tr><th>Ad</th><th>Menteşe</th><th>Çekmece</th><th>Ray</th><th>İşlem</th></tr>`
                    : `<tr><th>Ad</th><th>Birim</th><th>Fiyat</th><th>Varsayılan</th><th>İşlem</th></tr>`
              }
            </thead>
            <tbody>
              ${active.list.map((item) => renderCatalogListRow(activeTab, item)).join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderLicenseBadge(user) {
  const licenseState = getLicenseState(user);
  const variant = licenseState.code === "active" ? "success" : licenseState.code === "expired" ? "warning" : "danger";
  return tag(licenseState.label, variant);
}

function createUserDraft(index = 1) {
  return {
    fullName: `Yeni Kullanıcı ${index}`,
    username: `kullanici${index}`,
    password: "123456",
    company: "Yeni Mobilyacı",
    status: "active",
    role: "producer",
    licenseStartDate: todayIso(),
    licenseEndDate: addOneYear()
  };
}

function getUserQuickFilterLabel(quick) {
  if (quick === "active") return "Aktif lisanslı üreticiler";
  if (quick === "passive") return "Pasif kullanıcılar";
  if (quick === "expired") return "Süresi dolan lisanslar";
  if (quick === "expiring") return "30 gün içinde bitecek lisanslar";
  return "";
}

function getFilteredManagementUsers() {
  const query = String(state.ui.userSearchQuery || "").trim().toLocaleLowerCase("tr-TR");
  let users = getProducerManagementUsers();
  const quick = state.ui.userQuickFilter || "";
  if (quick) {
    users = users.filter((user) => {
      if (quick === "active") return getLicenseState(user).code === "active";
      if (quick === "passive") return getLicenseState(user).code === "passive";
      if (quick === "expired") return getLicenseState(user).code === "expired";
      if (quick === "expiring") {
        const d = daysUntil(user.licenseEndDate);
        return user.role === "producer" && getLicenseState(user).code === "active" && d >= 0 && d <= 30;
      }
      return true;
    });
  }
  if (!query) return users;
  return users.filter((user) => {
    const roleText = ROLE_LABELS[user.role] || "";
    const fields = [user.fullName, user.username, user.company, roleText, user.status, user.licenseEndDate, user.licenseStartDate];
    return fields.some((field) => String(field || "").toLocaleLowerCase("tr-TR").includes(query));
  });
}

function getLicenseStatusSortRank(user) {
  const code = getLicenseState(user).code;
  if (code === "active") return 0;
  if (code === "passive") return 1;
  if (code === "expired") return 2;
  return 3;
}

function sortManagementUsers(users, column, dir) {
  const mul = dir === "desc" ? -1 : 1;
  const tie = (a, b) => userListCollator.compare(String(a.fullName || ""), String(b.fullName || ""));
  const sorted = [...users];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (column) {
      case "fullName": {
        cmp = userListCollator.compare(String(a.fullName || ""), String(b.fullName || ""));
        if (cmp === 0) cmp = userListCollator.compare(String(a.username || ""), String(b.username || ""));
        break;
      }
      case "company": {
        cmp = userListCollator.compare(String(a.company || ""), String(b.company || ""));
        if (cmp === 0) cmp = tie(a, b);
        break;
      }
      case "role": {
        cmp = userListCollator.compare(String(ROLE_LABELS[a.role] || a.role || ""), String(ROLE_LABELS[b.role] || b.role || ""));
        if (cmp === 0) cmp = tie(a, b);
        break;
      }
      case "status": {
        cmp = getLicenseStatusSortRank(a) - getLicenseStatusSortRank(b);
        if (cmp === 0) cmp = userListCollator.compare(getLicenseState(a).label, getLicenseState(b).label);
        if (cmp === 0) cmp = tie(a, b);
        break;
      }
      case "licenseEnd": {
        const da = a.role === "producer" && a.licenseEndDate ? String(a.licenseEndDate) : "";
        const db = b.role === "producer" && b.licenseEndDate ? String(b.licenseEndDate) : "";
        if (!da && !db) cmp = 0;
        else if (!da) cmp = 1;
        else if (!db) cmp = -1;
        else cmp = da.localeCompare(db);
        if (cmp === 0) cmp = tie(a, b);
        break;
      }
      case "daysLeft": {
        const na = a.role === "producer" ? daysUntil(a.licenseEndDate) : Infinity;
        const nb = b.role === "producer" ? daysUntil(b.licenseEndDate) : Infinity;
        cmp = na - nb;
        if (cmp === 0) cmp = tie(a, b);
        break;
      }
      default:
        return 0;
    }
    return cmp * mul;
  });
  return sorted;
}

function getFilteredChamberStaffUsers() {
  const query = String(state.ui.chamberStaffSearchQuery || "").trim().toLocaleLowerCase("tr-TR");
  const users = getChamberStaffUsers();
  if (!query) return users;
  return users.filter((user) => {
    const roleText = ROLE_LABELS[user.role] || "";
    const fields = [user.fullName, user.username, user.company, roleText, user.status, user.licenseEndDate, user.licenseStartDate];
    return fields.some((field) => String(field || "").toLocaleLowerCase("tr-TR").includes(query));
  });
}

function renderUserSortTh(label, columnKey) {
  const active = state.ui.userSortColumn === columnKey;
  const arrow = active ? (state.ui.userSortDir === "asc" ? "▲" : "▼") : "";
  return `<th class="user-sort-th" scope="col"><button type="button" class="user-sort-btn" data-action="toggle-user-sort" data-column="${columnKey}" aria-label="${escapeHtml(label)} sütununa göre sırala">${escapeHtml(label)}${
    active ? ` <span class="user-sort-indicator" aria-hidden="true">${arrow}</span>` : ""
  }</button></th>`;
}

function renderUserListRow(user) {
  const isProducer = user.role === "producer";
  const statusTag = isProducer ? renderLicenseBadge(user) : tag("Yetkili", "accent");
  const licenseEnd = isProducer ? formatDate(user.licenseEndDate) : "-";
  const daysLeft = isProducer ? daysUntil(user.licenseEndDate) : null;
  const remainingLabel = isProducer ? (daysLeft < 0 ? "Süresi doldu" : `${daysLeft} gün`) : "-";
  return `
    <tr>
      <td data-label="Kullanıcı">
        <div class="user-row-main">
          <strong>${escapeHtml(user.fullName)}</strong>
          <span class="muted">${escapeHtml(user.username)}</span>
        </div>
      </td>
      <td data-label="Firma">${escapeHtml(user.company || "—")}</td>
      <td data-label="Rol">${escapeHtml(ROLE_LABELS[user.role] || "—")}</td>
      <td data-label="Durum">${statusTag}</td>
      <td data-label="Bitiş">${licenseEnd}</td>
      <td data-label="Kalan">${escapeHtml(remainingLabel)}</td>
      <td data-label="İşlem">
        <div class="user-row-actions">
          ${iconOnlyActionButton("open-user-editor", "edit", "Kullanıcıyı düzenle", `data-id="${user.id}"`)}
          ${isProducer ? iconOnlyActionButton(getLicenseState(user).code === "active" ? "deactivate-user" : "activate-user", "ban", getLicenseState(user).code === "active" ? "Kullanıcıyı pasife çek" : "Kullanıcıyı aktifleştir", `data-id="${user.id}"`) : ""}
          ${isProducer ? iconOnlyActionButton("renew-license", "refresh", "Lisansı uzat", `data-id="${user.id}"`) : ""}
          <button type="button" class="enterprise-icon-btn enterprise-icon-btn--danger" data-action="remove-user" data-id="${user.id}" aria-label="Kullanıcıyı sil" title="Kullanıcıyı sil" ${isProducer ? "" : "disabled"}>${icon("trash")}</button>
        </div>
      </td>
    </tr>
  `;
}

function renderUsersView() {
  const filtered = getFilteredManagementUsers();
  const rows = sortManagementUsers(filtered, state.ui.userSortColumn, state.ui.userSortDir);
  const quick = state.ui.userQuickFilter || "";
  const quickLabel = getUserQuickFilterLabel(quick);
  const queryRaw = String(state.ui.userSearchQuery || "").trim();
  const emptyHint = !rows.length
    ? quickLabel && !queryRaw
      ? "Bu hızlı filtreye uygun kullanıcı bulunamadı."
      : queryRaw
        ? "Arama sonucunda kullanıcı bulunamadı."
        : "Kayıt bulunamadı."
    : "";
  return `
    <section class="panel-stack">
      <article class="table-card user-management-full">
        <div class="card-head">
          <div>
            <p class="section-kicker">Kullanıcı Yönetimi</p>
            <h3>Lisans ve erişim yönetimi</h3>
          </div>
          <button type="button" class="primary-button" data-action="add-user">Yeni Kullanıcı</button>
        </div>
        ${
          quickLabel
            ? `
        <div class="user-filter-banner" role="status">
          <span class="user-filter-banner__text">Hızlı filtre: <strong>${escapeHtml(quickLabel)}</strong></span>
          <button type="button" class="ghost-button user-filter-banner__clear" data-action="clear-user-filter">Filtreyi kaldır</button>
        </div>`
            : ""
        }
        <div class="user-toolbar">
          <input class="mp-input user-search-input user-search-input--compact" data-bind="ui.userSearchQuery" data-focus-id="users-search" type="search" placeholder="Kullanıcı, firma, rol veya durum ara..." value="${escapeHtml(state.ui.userSearchQuery || "")}" />
        </div>
        <div class="contracts-list-table-wrap">
          <table class="list-table user-list-table user-list-table--compact">
            <thead>
              <tr>
                ${renderUserSortTh("Kullanıcı", "fullName")}
                ${renderUserSortTh("Firma", "company")}
                ${renderUserSortTh("Rol", "role")}
                ${renderUserSortTh("Durum", "status")}
                ${renderUserSortTh("Lisans Bitiş", "licenseEnd")}
                ${renderUserSortTh("Kalan", "daysLeft")}
                <th class="user-sort-th user-sort-th--static" scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? rows.map((user) => renderUserListRow(user)).join("")
                  : `<tr><td colspan="7"><div class="step-card"><strong>${escapeHtml(emptyHint)}</strong><p class="form-hint">${
                      quickLabel
                        ? "Tüm listeyi görmek için üstteki “Filtreyi kaldır” düğmesine basın veya arama metnini değiştirin."
                        : "Farklı bir anahtar kelime deneyin."
                    }</p></div></td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderChamberStaffView() {
  const filtered = getFilteredChamberStaffUsers();
  const rows = sortManagementUsers(filtered, state.ui.userSortColumn, state.ui.userSortDir);
  const queryRaw = String(state.ui.chamberStaffSearchQuery || "").trim();
  const emptyHint = !rows.length ? (queryRaw ? "Arama sonucunda kayıt bulunamadı." : "Oda yönetimi hesabı tanımlı değil.") : "";
  return `
    <section class="panel-stack">
      <article class="table-card user-management-full">
        <div class="card-head">
          <div>
            <p class="section-kicker">Oda yönetimi</p>
            <h3>Oda hesapları</h3>
          </div>
        </div>
        <div class="user-toolbar">
          <input class="mp-input user-search-input user-search-input--compact" data-bind="ui.chamberStaffSearchQuery" data-focus-id="chamber-staff-search" type="search" placeholder="Ad, kullanıcı adı veya firma ara..." value="${escapeHtml(state.ui.chamberStaffSearchQuery || "")}" />
        </div>
        <div class="contracts-list-table-wrap">
          <table class="list-table user-list-table user-list-table--compact">
            <thead>
              <tr>
                ${renderUserSortTh("Kullanıcı", "fullName")}
                ${renderUserSortTh("Firma", "company")}
                ${renderUserSortTh("Rol", "role")}
                ${renderUserSortTh("Durum", "status")}
                ${renderUserSortTh("Lisans Bitiş", "licenseEnd")}
                ${renderUserSortTh("Kalan", "daysLeft")}
                <th class="user-sort-th user-sort-th--static" scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? rows.map((user) => renderUserListRow(user)).join("")
                  : `<tr><td colspan="7"><div class="step-card"><strong>${escapeHtml(emptyHint)}</strong><p class="form-hint">Farklı bir anahtar kelime deneyin veya kullanıcı kaydının rolünün “Oda Yönetimi” olduğundan emin olun.</p></div></td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderContractsListView() {
  const rows = [];
  for (const p of getVisibleProjects()) {
    for (const q of p.quotes || []) {
      rows.push({ project: p, quote: q });
    }
  }
  rows.sort((a, b) => String(b.quote.date || "").localeCompare(String(a.quote.date || "")));
  if (!rows.length) {
    return `
      <section class="project-workspace">
        <article class="surface-card">
          <div class="card-head"><h3>Sözleşmeler</h3></div>
          <p class="form-hint">Henüz teklif yok. Önce <strong>Projeler</strong> bölümünden teklif oluşturun.</p>
          <button type="button" class="primary-button" data-action="set-view" data-view="projects">Projelere git</button>
        </article>
      </section>
    `;
  }
  return `
    <section class="contracts-list-view project-workspace">
      <article class="surface-card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Arşiv</p>
            <h3>Sözleşmeler</h3>
          </div>
        </div>
        <p class="form-hint">Her satır bir teklifin taslak sözleşmesidir. Açıp düzenleyebilir, yazdırabilir veya teklifi silebilirsiniz.</p>
        <div class="contracts-list-table-wrap">
          <table class="contracts-list-table">
            <thead>
              <tr>
                <th>Proje</th>
                <th>Müşteri</th>
                <th>Teklif</th>
                <th>Tarih</th>
                <th>Net</th>
                <th class="user-sort-th user-sort-th--static">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(({ project: p, quote: q }) => {
                  const calc = calculateContractDocument(q, state.remote);
                  return `
                <tr>
                  <td data-label="Proje"><strong>${escapeHtml(p.projectName)}</strong></td>
                  <td data-label="Müşteri">${escapeHtml(p.customerName || "—")}</td>
                  <td data-label="Teklif">${q.number}</td>
                  <td data-label="Tarih">${formatDate(q.date)}</td>
                  <td data-label="Net"><strong>${formatCurrency(calc.totals.netGrandTotal)}</strong></td>
                  <td data-label="İşlemler" class="user-row-actions">
                    <button type="button" class="ghost-button" data-action="open-contract-detail" data-project-id="${p.id}" data-quote-id="${q.id}">Aç</button>
                    <button type="button" class="ghost-button" data-action="open-document-preview" data-kind="contract" data-project-id="${p.id}" data-quote-id="${q.id}">Önizle</button>
                    <button type="button" class="enterprise-icon-btn enterprise-icon-btn--danger" data-action="delete-quote-from-list" data-project-id="${p.id}" data-quote-id="${q.id}" aria-label="Teklifi sil" title="Sil">${icon("trash")}</button>
                  </td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderContractsView() {
  const visibleProjects = getVisibleProjects();
  if (!visibleProjects.length) return renderProjectEmptyState();

  if (state.ui.producerContractFlow !== "detail") {
    return renderContractsListView();
  }

  const project = getCurrentProject();
  if (!project?.quotes?.length) {
    state.ui.producerContractFlow = "list";
    return renderContractsListView();
  }

  const contractQuote =
    project.quotes.find((q) => q.id === state.ui.contractQuoteId) || project.quotes[0];
  const calculation = calculateContractDocument(contractQuote, state.remote);

  return `
    <section class="project-workspace project-workspace--solo">
      <article class="contract-card contract-modern">
        <div class="contract-head">
          <div>
            <p class="section-kicker">Taslak sözleşme</p>
            <h3>${escapeHtml(project.projectName)}</h3>
            <p class="form-hint">${escapeHtml(project.customerName)} · ${escapeHtml(project.contractCode)}</p>
            <p class="form-hint">Teklif no: <strong>${contractQuote.number}</strong> · ${formatDate(contractQuote.date)}</p>
          </div>
          <div class="inline-actions contract-head-actions">
            <button type="button" class="ghost-button" data-action="back-contract-list">← Liste</button>
            <button type="button" class="primary-button" data-action="open-document-preview" data-kind="contract" data-project-id="${escapeHtml(project.id)}" data-quote-id="${escapeHtml(contractQuote.id)}">${icon("print")} Önizle / PDF</button>
          </div>
        </div>
        ${
          project.quotes.length > 1
            ? `<div class="step-card contract-quote-picker">
            <span class="muted">Sözleşmede kullanılacak teklif</span>
            <div class="choice-grid">
              ${project.quotes
                .map(
                  (q) => `
                <button type="button" class="choice-pill ${q.id === contractQuote.id ? "active" : ""}" data-action="select-contract-quote" data-quote-id="${q.id}">
                  Teklif ${q.number}
                </button>
              `
                )
                .join("")}
            </div>
          </div>`
            : ""
        }
        <div class="contract-grid compact-grid-two">
          <div class="step-card"><span class="muted">Mobilyacı</span><strong>${escapeHtml(project.merchantName)}</strong></div>
          <div class="step-card"><span class="muted">Telefon</span><strong>${escapeHtml(project.customerPhone || "-")}</strong></div>
          <div class="step-card"><span class="muted">Adres</span><strong>${escapeHtml(project.projectAddress || "-")}</strong></div>
          <div class="step-card"><span class="muted">Oda sayısı</span><strong>${contractQuote.rooms.length}</strong></div>
        </div>
        <table class="list-table contract-table">
          <thead>
            <tr>
              <th>Oda</th>
              <th>Kalite</th>
              <th>m²</th>
              <th>Oda m² fiyatı</th>
              <th>Oda toplamı</th>
            </tr>
          </thead>
          <tbody>
            ${calculation.roomResults
              .map(
                (roomResult) => `
                  <tr>
                    <td data-label="Oda">${escapeHtml(roomResult.roomName)}</td>
                    <td data-label="Kalite">${escapeHtml(roomResult.selected.qualityName)}</td>
                    <td data-label="m²">${formatNumber(roomResult.selected.metrics.panelEquivalentM2, " m²")}</td>
                    <td data-label="Oda m² fiyatı">${formatCurrency(roomResult.selected.officialSqmPrice)}</td>
                    <td data-label="Oda toplamı">${formatCurrency(roomResult.selected.sqmOfficialTotal)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        <div class="step-card contract-services-card">
          <h4>İsteğe bağlı hizmetler</h4>
          <p class="form-hint">İşaretlediğiniz satırlar sözleşme toplamına eklenir.</p>
          <div class="contract-service-checklist contract-service-checklist--polished">
            ${state.remote.servicesCatalog
              .map((service) => {
                const line = (contractQuote.contractServiceLines || []).find((l) => l.id === service.id);
                const checked = line && Number(line.quantity) > 0;
                const qty = checked ? Number(line.quantity) : Number(service.defaultQuantity ?? 1);
                return `
                  <div class="service-option-row">
                    <label class="service-option-label">
                      <input type="checkbox" class="contract-service-cb svc-cb" data-quote-id="${contractQuote.id}" data-service-id="${service.id}" ${checked ? "checked" : ""} />
                      <span class="svc-ui" aria-hidden="true"></span>
                      <span class="service-option-body">
                        <span class="service-name">${escapeHtml(service.name)}</span>
                        <span class="service-meta">${escapeHtml(service.unit)} birim · birim ${formatCurrency(service.price)}</span>
                      </span>
                    </label>
                    ${
                      checked
                        ? `<div class="service-qty-wrap">${inputField({
                            label: "Miktar",
                            value: qty,
                            bind: `quote.${contractQuote.id}.contractService.${service.id}`,
                            type: "number",
                            step: service.unit === "mt" ? "0.1" : "1",
                            focusId: `contract-svc-${contractQuote.id}-${service.id}`
                          })}</div>`
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
        ${
          calculation.services.length
            ? `
              <div class="step-card">
                <strong>Dahil edilen hizmet satırları</strong>
                <div class="service-summary-list">
                  ${calculation.services
                    .map(
                      (line) => `<div class="service-summary-item"><span>${escapeHtml(line.name)} (${formatNumber(line.quantity, " " + (line.unit || "adet"))})</span><strong>${formatCurrency(line.total)}</strong></div>`
                    )
                    .join("")}
                </div>
              </div>
            `
            : ""
        }
        <div class="contract-totals-grid">
          <div class="summary-mini-card">
            <span class="muted">Ara toplam</span>
            <strong>${formatCurrency(calculation.totals.officialGrandTotal)}</strong>
          </div>
          <div class="summary-mini-card">
            <span class="muted">İndirim oranı</span>
            <strong>${formatNumber(contractQuote.producerDiscountRate || 0, "%")}</strong>
          </div>
          <div class="summary-mini-card">
            <span class="muted">Ek indirim</span>
            <strong>${formatCurrency(contractQuote.generalDiscountAmount || 0)}</strong>
          </div>
          <div class="summary-mini-card highlight">
            <span class="muted">Net fiyat</span>
            <strong>${formatCurrency(calculation.totals.netGrandTotal)}</strong>
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderView() {
  if (!isAuthenticated()) {
    els.pageTitle.textContent = "Giriş";
    return `
      <article class="surface-card auth-card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Erişim Kontrolü</p>
            <h3>Bu sistemde ziyaretçi ekranı yok</h3>
          </div>
          ${tag("Yetkili giriş", "warning")}
        </div>
        <div class="card-stack">
          <div class="step-card">
            <strong>Sadece oda yönetimi, mobilyacı kullanıcıları ve gizli sistem admin hesabı giriş yapabilir.</strong>
            <p class="form-hint">Kullanıcılar birbirinin teklifini ve sözleşmesini göremez. Oda yönetimi de teklif ekranına erişmez.</p>
          </div>
          <div class="inline-actions">
            <button class="primary-button" id="inlineLoginBtn" type="button">Giriş Yap</button>
          </div>
        </div>
      </article>
    `;
  }
  const titles = {
    projects: "Projeler",
    dashboard: "Özet",
    catalog: "Fiyatlar",
    room_prices: "Oda Fiyatları",
    users: "Kullanıcılar",
    chamber_staff: "Oda yönetimi",
    contracts: "Sözleşmeler",
    account: "Hesap"
  };
  els.pageTitle.textContent = titles[state.ui.currentView] || "Projeler";
  switch (state.ui.currentView) {
    case "account":
      return renderAccountView();
    case "dashboard":
      return renderDashboardView();
    case "catalog":
      return renderCatalogView();
    case "room_prices":
      return renderRoomPricesReadOnlyView();
    case "users":
      return renderUsersView();
    case "chamber_staff":
      return renderChamberStaffView();
    case "contracts":
      return renderContractsView();
    default:
      return renderProjectsView();
  }
}

function renderLoadingState() {
  return `
    <section class="panel-stack">
      <article class="mp-skeleton">
        <div class="mp-skeleton-line w-2/5"></div>
        <div class="mp-skeleton-line w-full"></div>
        <div class="mp-skeleton-line w-4/5"></div>
      </article>
      <article class="mp-skeleton">
        <div class="mp-skeleton-line w-3/5"></div>
        <div class="mp-skeleton-line w-full"></div>
        <div class="mp-skeleton-line w-full"></div>
      </article>
    </section>
  `;
}

function render(options = {}) {
  const snapshot = options.preserveFocus ? captureFocusState() : null;
  ensureUiSelections();
  persistUi();
  renderSessionInfo();
  renderNavigation();
  renderInfoBanner();
  renderStickySummary();
  els.viewContainer.innerHTML =
    renderView() +
    renderRoomTypeModalLayer() +
    renderUserEditorModalLayer() +
    renderCatalogEditorModalLayer() +
    renderChamberEditorModalLayer() +
    renderConfirmModalLayer() +
    renderDocumentPreviewModalLayer() +
    renderSessionNoticeModalLayer();
  document.querySelector("#inlineLoginBtn")?.addEventListener("click", openLoginDialogAfterSessionNoticeIfNeeded);
  if (snapshot) {
    requestAnimationFrame(() => {
      restoreFocusState(snapshot);
      requestAnimationFrame(() => restoreFocusState(snapshot));
    });
  }
}

function parseRoomDraftNumber(value) {
  const s = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function setValueByPath(path, value) {
  const project = getCurrentProject();

  if (path === "project.projectName" && project) project.projectName = value;
  else if (path === "project.customerName" && project) project.customerName = value;
  else if (path === "project.customerPhone" && project) project.customerPhone = value;
  else if (path === "project.merchantName" && project) project.merchantName = value;
  else if (path === "project.projectAddress" && project) project.projectAddress = value;
  else if (path.startsWith("roomdraft.") && state.ui.roomEditDraft) {
    const draft = state.ui.roomEditDraft;
    const tail = path.slice("roomdraft.".length);
    if (tail === "hardwarePackageId") draft.hardwarePackageId = value;
    else if (tail.startsWith("basic.")) draft.basic[tail.slice(6)] = parseRoomDraftNumber(value);
    else if (tail.startsWith("details.")) {
      const key = tail.slice(8);
      draft.details[key] = parseRoomDraftNumber(value);
    }
  }
  else if (path === "ui.selectedProjectId") state.ui.selectedProjectId = value;
  else if (path === "ui.userSearchQuery") state.ui.userSearchQuery = value;
  else if (path === "ui.chamberStaffSearchQuery") state.ui.chamberStaffSearchQuery = value;
  else if (path === "ui.catalogTab") state.ui.catalogTab = value;
  else if (path.startsWith("quote.") && project) {
    const parts = path.split(".");
    const quoteId = parts[1];
    const q = project.quotes?.find((item) => item.id === quoteId);
    if (!q) return;
    if (parts[2] === "date") q.date = value;
    else if (parts[2] === "producerDiscountRate") q.producerDiscountRate = Number(value || 0);
    else if (parts[2] === "generalDiscountAmount") q.generalDiscountAmount = Number(value || 0);
    else if (parts[2] === "notes") q.notes = value;
    else if (parts[2] === "room") {
      const roomId = parts[3];
      const room = q.rooms.find((item) => item.id === roomId);
      if (!room) return;
      if (parts[4] === "name") room.name = value;
      else if (parts[4] === "basic") room.basic[parts[5]] = Number(value || 0);
    } else if (parts[2] === "contractService" && parts[3]) {
      const sid = parts[3];
      const qty = Number(value || 0);
      q.contractServiceLines = q.contractServiceLines || [];
      const line = q.contractServiceLines.find((l) => l.id === sid);
      if (qty <= 0) {
        q.contractServiceLines = q.contractServiceLines.filter((l) => l.id !== sid);
      } else if (line) {
        line.quantity = qty;
      } else {
        q.contractServiceLines.push({ id: sid, quantity: qty });
      }
    }
  } else if (path.startsWith("catalog.quality.")) {
    const [, , id, key] = path.split(".");
    const quality = state.remote.qualities.find((item) => item.id === id);
    if (!quality) return;
    quality[key] = key === "name" || key === "note" ? value : Number(value || 0);
  } else if (path.startsWith("catalog.chamber.")) {
    const key = path.replace("catalog.chamber.", "");
    state.remote.chamber[key] = key === "chamberName" || key === "updatedAt" ? value : Number(value || 0);
    if (key === "chamberName") {
      state.remote.chamber.chamberName = normalizeChamberName(state.remote.chamber.chamberName);
      state.remote.users = state.remote.users.map((user) =>
        user.role === "chamber" ? { ...user, company: state.remote.chamber.chamberName } : user
      );
    }
  } else if (path.startsWith("catalog.package.")) {
    const [, , id, key] = path.split(".");
    const pkg = state.remote.hardwarePackages.find((item) => item.id === id);
    if (!pkg) return;
    pkg[key] = key === "name" ? value : Number(value || 0);
  } else if (path.startsWith("catalog.service.")) {
    const [, , id, key] = path.split(".");
    const service = state.remote.servicesCatalog.find((item) => item.id === id);
    if (!service) return;
    service[key] = key === "name" || key === "unit" ? value : Number(value || 0);
  } else if (path.startsWith("user.")) {
    const [, id, key] = path.split(".");
    const user = state.remote.users.find((item) => item.id === id);
    if (!user) return;
    if (["fullName", "username", "password", "company", "status", "licenseStartDate", "licenseEndDate"].includes(key)) {
      user[key] = value;
    }
  } else if (path.startsWith("userdraft.") && state.ui.userEditDraft) {
    const key = path.slice("userdraft.".length);
    if (["fullName", "username", "password", "company", "status", "licenseStartDate", "licenseEndDate"].includes(key)) {
      state.ui.userEditDraft[key] = value;
    }
  } else if (path.startsWith("catalogdraft.") && state.ui.catalogEditDraft) {
    const key = path.slice("catalogdraft.".length);
    const numericKeys = ["officialSqmPrice", "hingePrice", "drawerPrice", "railPrice", "handlePrice", "liftPrice", "glassDoorPremium", "price", "defaultQuantity"];
    state.ui.catalogEditDraft[key] = numericKeys.includes(key) ? Number(value || 0) : value;
  } else if (path.startsWith("chamberdraft.") && state.ui.chamberEditDraft) {
    const key = path.slice("chamberdraft.".length);
    const stringKeys = ["chamberName", "updatedAt"];
    state.ui.chamberEditDraft[key] = stringKeys.includes(key) ? value : Number(value || 0);
  }
}

function addQuality() {
  state.remote.qualities.push({ id: `quality-${Date.now()}`, name: "Yeni Kalite", officialSqmPrice: 6000, note: "Açıklama" });
  scheduleSave();
  render();
}

function addPackage() {
  state.remote.hardwarePackages.push({
    id: `package-${Date.now()}`,
    name: "Yeni Paket",
    hingePrice: 90,
    drawerPrice: 600,
    railPrice: 220,
    handlePrice: 180,
    liftPrice: 900,
    glassDoorPremium: 360
  });
  scheduleSave();
  render();
}

function addService() {
  state.remote.servicesCatalog.push({ id: `service-${Date.now()}`, name: "Yeni Hizmet", unit: "adet", price: 1000, defaultQuantity: 0 });
  scheduleSave();
  render();
}

function addUser() {
  const nextIndex = getProducerUsers().length + 1;
  const userId = `USR-${Date.now()}`;
  state.remote.users.push({
    id: userId,
    fullName: `Yeni Kullanıcı ${nextIndex}`,
    username: `kullanici${nextIndex}`,
    password: "123456",
    role: "producer",
    company: "Yeni Mobilyacı",
    status: "active",
    licenseStartDate: todayIso(),
    licenseEndDate: addOneYear(),
    hiddenFromManagement: false
  });
  state.ui.pendingUserSaveIds = [...(state.ui.pendingUserSaveIds || []), userId];
  render();
}

function openUserEditor(mode, userId = null) {
  state.ui.confirmModal = null;
  if (mode === "edit") {
    const user = getUserById(userId);
    if (!user) return;
    state.ui.userEditMode = "edit";
    state.ui.userEditTargetId = user.id;
    state.ui.userEditDraft = {
      fullName: user.fullName || "",
      username: user.username || "",
      password: user.password || "",
      company: user.company || "",
      status: user.status || "active",
      role: user.role || "producer",
      licenseStartDate: user.licenseStartDate || todayIso(),
      licenseEndDate: user.licenseEndDate || addOneYear()
    };
  } else {
    state.ui.userEditMode = "create";
    state.ui.userEditTargetId = null;
    state.ui.userEditDraft = createUserDraft(getProducerUsers().length + 1);
  }
  state.ui.userEditorOpen = true;
  render();
}

function closeUserEditor() {
  state.ui.userEditorOpen = false;
  state.ui.userEditMode = "edit";
  state.ui.userEditTargetId = null;
  state.ui.userEditDraft = null;
  render();
}

function openLoginDialog() {
  try {
    els.loginDialog.close();
  } catch {
    /* ignore */
  }
  const signedInUser = getSignedInUser();
  els.loginUsername.value = signedInUser?.username || "";
  els.loginPassword.value = signedInUser?.password || "";
  els.demoGrid.innerHTML = getManageableUsers()
    .filter((user) => user.role !== "system_admin")
    .map((user) => {
      const disabled = !canLogin(user);
      return `
        <button type="button" class="demo-card" data-action="fill-login" data-username="${escapeHtml(user.username)}" data-password="${escapeHtml(user.password)}" ${disabled ? "disabled" : ""}>
          <strong>${escapeHtml(ROLE_LABELS[user.role])}</strong>
          <span>${escapeHtml(user.username)} / ${escapeHtml(user.password)}</span>
          <span>${escapeHtml(getLicenseState(user).label)}</span>
        </button>
      `;
    })
    .join("");
  els.loginDialog.showModal();
}

function handleContractServiceCheckbox(el) {
  const project = getCurrentProject();
  const quote = project?.quotes?.find((q) => q.id === el.dataset.quoteId);
  const sid = el.dataset.serviceId;
  const cat = state.remote.servicesCatalog.find((s) => s.id === sid);
  if (!quote || !cat) return;
  quote.contractServiceLines = quote.contractServiceLines || [];
  const idx = quote.contractServiceLines.findIndex((l) => l.id === sid);
  if (el.checked) {
    if (idx < 0) quote.contractServiceLines.push({ id: sid, quantity: Number(cat.defaultQuantity ?? 1) });
  } else if (idx >= 0) quote.contractServiceLines.splice(idx, 1);
  scheduleSave();
  render({ preserveFocus: true });
}

function handleClick(event) {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  if (action === "open-login-from-account") {
    openLoginDialog();
    return;
  }

  if (action === "secure-signout") {
    lockSession("Güvenli çıkış yapıldı. Lütfen yeniden giriş yapın.", "signout");
    return;
  }

  if (action === "open-user-editor") {
    openUserEditor("edit", actionEl.dataset.id);
    return;
  }

  if (action === "close-user-editor") {
    closeUserEditor();
    return;
  }

  if (action === "backdrop-close-user-modal" && actionEl === event.target) {
    closeUserEditor();
    return;
  }

  if (action === "confirm-modal-cancel") {
    closeConfirmModal();
    return;
  }

  if (action === "backdrop-close-confirm-modal" && actionEl === event.target) {
    closeConfirmModal();
    return;
  }

  if (action === "confirm-modal-confirm") {
    executeConfirmModalAction();
    return;
  }

  if (action === "dismiss-session-notice") {
    dismissSessionNoticeAndOpenLogin();
    return;
  }

  if (action === "backdrop-close-session-notice" && actionEl === event.target) {
    dismissSessionNoticeAndOpenLogin();
    return;
  }

  if (action === "save-user-editor") {
    const draft = state.ui.userEditDraft;
    if (!draft) return;
    if (!String(draft.fullName || "").trim() || !String(draft.username || "").trim() || !String(draft.password || "").trim()) {
      window.alert("Ad Soyad, kullanıcı adı ve şifre alanları zorunludur.");
      return;
    }
    if (state.ui.userEditMode === "create") {
      state.remote.users.push({
        id: `USR-${Date.now()}`,
        fullName: draft.fullName.trim(),
        username: draft.username.trim(),
        password: draft.password.trim(),
        role: "producer",
        company: draft.company || "Yeni Mobilyacı",
        status: draft.status || "active",
        licenseStartDate: draft.licenseStartDate || todayIso(),
        licenseEndDate: draft.licenseEndDate || addOneYear(),
        hiddenFromManagement: false
      });
      showToast("Kullanıcı kaydedildi.");
    } else {
      const user = getUserById(state.ui.userEditTargetId);
      if (!user) return;
      user.fullName = draft.fullName.trim();
      user.username = draft.username.trim();
      user.password = draft.password.trim();
      user.company = draft.company || user.company || "";
      user.status = draft.status || "active";
      user.licenseStartDate = draft.licenseStartDate || user.licenseStartDate;
      user.licenseEndDate = draft.licenseEndDate || user.licenseEndDate;
      if (user.role === "chamber") {
        state.remote.chamber.chamberName = normalizeChamberName(String(user.company || "").trim());
        user.company = state.remote.chamber.chamberName;
      }
      showToast("Kullanıcı güncellendi.");
    }
    scheduleSave();
    void flushPendingSave();
    state.ui.userEditorOpen = false;
    state.ui.userEditTargetId = null;
    state.ui.userEditDraft = null;
    render();
    return;
  }

  if (action === "view-users-by-filter") {
    state.ui.userQuickFilter = actionEl.dataset.filter || "";
    state.ui.currentView = "users";
    render();
    return;
  }

  if (action === "clear-user-filter") {
    state.ui.userQuickFilter = "";
    render();
    return;
  }

  if (action === "toggle-user-sort") {
    const col = actionEl.dataset.column || "";
    if (!USER_SORT_COLUMNS.includes(col)) return;
    if (state.ui.userSortColumn === col) {
      state.ui.userSortDir = state.ui.userSortDir === "asc" ? "desc" : "asc";
    } else {
      state.ui.userSortColumn = col;
      state.ui.userSortDir = "asc";
    }
    persistUi();
    render();
    return;
  }

  if (action === "set-catalog-tab") {
    state.ui.catalogTab = actionEl.dataset.tab || "quality";
    render();
    return;
  }

  if (action === "open-catalog-editor") {
    state.ui.confirmModal = null;
    const type = actionEl.dataset.type || state.ui.catalogTab || "quality";
    const mode = actionEl.dataset.mode || "edit";
    let item = null;
    if (mode !== "create") {
      const id = actionEl.dataset.id;
      if (type === "quality") item = state.remote.qualities.find((x) => x.id === id) || null;
      if (type === "package") item = state.remote.hardwarePackages.find((x) => x.id === id) || null;
      if (type === "service") item = state.remote.servicesCatalog.find((x) => x.id === id) || null;
      state.ui.catalogEditTargetId = id || null;
    } else {
      state.ui.catalogEditTargetId = null;
    }
    state.ui.catalogEditType = type;
    state.ui.catalogEditMode = mode === "create" ? "create" : "edit";
    state.ui.catalogEditDraft = createCatalogDraft(type, item);
    state.ui.catalogEditorOpen = true;
    render();
    return;
  }

  if (action === "close-catalog-editor") {
    state.ui.catalogEditorOpen = false;
    state.ui.catalogEditTargetId = null;
    state.ui.catalogEditDraft = null;
    render();
    return;
  }

  if (action === "backdrop-close-catalog-modal" && actionEl === event.target) {
    state.ui.catalogEditorOpen = false;
    state.ui.catalogEditTargetId = null;
    state.ui.catalogEditDraft = null;
    render();
    return;
  }

  if (action === "save-catalog-editor") {
    const type = state.ui.catalogEditType;
    const draft = state.ui.catalogEditDraft;
    if (!draft || !String(draft.name || "").trim()) {
      window.alert("Ad alanı zorunludur.");
      return;
    }
    if (state.ui.catalogEditMode === "create") {
      if (type === "quality") state.remote.qualities.push({ id: `quality-${Date.now()}`, name: draft.name.trim(), officialSqmPrice: Number(draft.officialSqmPrice || 0), note: draft.note || "" });
      if (type === "package") state.remote.hardwarePackages.push({ id: `package-${Date.now()}`, name: draft.name.trim(), hingePrice: Number(draft.hingePrice || 0), drawerPrice: Number(draft.drawerPrice || 0), railPrice: Number(draft.railPrice || 0), handlePrice: Number(draft.handlePrice || 0), liftPrice: Number(draft.liftPrice || 0), glassDoorPremium: Number(draft.glassDoorPremium || 0) });
      if (type === "service") state.remote.servicesCatalog.push({ id: `service-${Date.now()}`, name: draft.name.trim(), unit: draft.unit || "adet", price: Number(draft.price || 0), defaultQuantity: Number(draft.defaultQuantity || 0) });
      showToast("Kayıt eklendi.");
    } else {
      const id = state.ui.catalogEditTargetId;
      if (type === "quality") {
        const item = state.remote.qualities.find((x) => x.id === id);
        if (item) Object.assign(item, { name: draft.name.trim(), officialSqmPrice: Number(draft.officialSqmPrice || 0), note: draft.note || "" });
      }
      if (type === "package") {
        const item = state.remote.hardwarePackages.find((x) => x.id === id);
        if (item) Object.assign(item, { name: draft.name.trim(), hingePrice: Number(draft.hingePrice || 0), drawerPrice: Number(draft.drawerPrice || 0), railPrice: Number(draft.railPrice || 0), handlePrice: Number(draft.handlePrice || 0), liftPrice: Number(draft.liftPrice || 0), glassDoorPremium: Number(draft.glassDoorPremium || 0) });
      }
      if (type === "service") {
        const item = state.remote.servicesCatalog.find((x) => x.id === id);
        if (item) Object.assign(item, { name: draft.name.trim(), unit: draft.unit || "adet", price: Number(draft.price || 0), defaultQuantity: Number(draft.defaultQuantity || 0) });
      }
      showToast("Kayıt güncellendi.");
    }
    scheduleSave();
    state.ui.catalogEditorOpen = false;
    state.ui.catalogEditTargetId = null;
    state.ui.catalogEditDraft = null;
    render();
    return;
  }

  if (action === "open-chamber-editor") {
    state.ui.confirmModal = null;
    state.ui.chamberEditDraft = createChamberEditDraft();
    state.ui.chamberEditorOpen = true;
    render();
    return;
  }

  if (action === "close-chamber-editor") {
    state.ui.chamberEditorOpen = false;
    state.ui.chamberEditDraft = null;
    render();
    return;
  }

  if (action === "backdrop-close-chamber-modal" && actionEl === event.target) {
    state.ui.chamberEditorOpen = false;
    state.ui.chamberEditDraft = null;
    render();
    return;
  }

  if (action === "save-chamber-editor") {
    const draft = state.ui.chamberEditDraft;
    if (!draft) return;
    state.remote.chamber.chamberName = normalizeChamberName(String(draft.chamberName || "").trim());
    state.remote.chamber.updatedAt = String(draft.updatedAt || "").trim();
    state.remote.chamber.laborHourlyRate = Number(draft.laborHourlyRate || 0);
    state.remote.chamber.installationMtPrice = Number(draft.installationMtPrice || 0);
    state.remote.chamber.packagingSqmPrice = Number(draft.packagingSqmPrice || 0);
    state.remote.chamber.overheadRate = Number(draft.overheadRate || 0);
    state.remote.chamber.chamberMarginRate = Number(draft.chamberMarginRate || 0);
    state.remote.chamber.minimumProfitRate = Number(draft.minimumProfitRate || 0);
    state.remote.users = state.remote.users.map((user) =>
      user.role === "chamber" ? { ...user, company: state.remote.chamber.chamberName } : user
    );
    scheduleSave();
    showToast("Hesap ayarları güncellendi.");
    state.ui.chamberEditorOpen = false;
    state.ui.chamberEditDraft = null;
    render();
    return;
  }

  if (action === "set-view") {
    const next = actionEl.dataset.view;
    const user = getCurrentUser();
    state.ui.confirmModal = null;
    state.ui.roomTypeModalOpen = false;
    if (state.ui.currentView === "users" && next !== "users") state.ui.userQuickFilter = "";
    if (state.ui.currentView === "chamber_staff" && next !== "chamber_staff") state.ui.chamberStaffSearchQuery = "";
    if (next === "contracts" && user?.role === "producer") {
      state.ui.producerContractFlow = "list";
    }
    if (next === "projects" && user?.role === "producer") {
      state.ui.producerProjectHub = true;
      state.ui.selectedProjectId = null;
      state.ui.selectedQuoteId = null;
      state.ui.producerFlow = "project";
      state.ui.editingRoomId = null;
      state.ui.roomEditDraft = null;
    }
    state.ui.currentView = next;
    render();
    return;
  }
  if (action === "open-current-contract-detail") {
    const p = getCurrentProject();
    const q = getCurrentQuote();
    if (!p || !q) {
      window.alert("Önce bir teklif seçin.");
      return;
    }
    state.ui.contractQuoteId = q.id;
    state.ui.producerContractFlow = "detail";
    state.ui.currentView = "contracts";
    persistUi();
    render();
    return;
  }
  if (action === "back-contract-list") {
    state.ui.producerContractFlow = "list";
    render();
    return;
  }
  if (action === "open-contract-detail") {
    const pid = actionEl.dataset.projectId;
    const qid = actionEl.dataset.quoteId;
    const p = getVisibleProjects().find((x) => x.id === pid);
    if (!p || !p.quotes?.some((q) => q.id === qid)) return;
    state.ui.selectedProjectId = pid;
    state.ui.selectedQuoteId = qid;
    state.ui.contractQuoteId = qid;
    state.ui.producerContractFlow = "detail";
    state.ui.currentView = "contracts";
    persistUi();
    render();
    return;
  }
  if (action === "open-document-preview") {
    const pid = actionEl.dataset.projectId;
    const qid = actionEl.dataset.quoteId;
    const kind = actionEl.dataset.kind === "quote" ? "quote" : "contract";
    const p = state.remote.projects.find((x) => x.id === pid);
    if (!p || !p.quotes?.some((q) => q.id === qid)) return;
    if (!getVisibleProjects().some((x) => x.id === pid)) return;
    state.ui.documentPreview = { projectId: pid, quoteId: qid, kind };
    render();
    return;
  }

  if (action === "close-document-preview") {
    state.ui.documentPreview = null;
    render();
    return;
  }

  if (action === "backdrop-close-document-preview" && actionEl === event.target) {
    state.ui.documentPreview = null;
    render();
    return;
  }

  if (action === "download-document-pdf") {
    const root = document.getElementById("documentPreviewRoot");
    if (!root) return;
    const prev = state.ui.documentPreview;
    const project = prev ? state.remote.projects.find((p) => p.id === prev.projectId) : null;
    const quote = project?.quotes?.find((q) => q.id === prev?.quoteId);
    const base = (project?.projectName || "teklif").replace(/[^\w\-ğüşıöçĞÜŞİÖÇ]+/gi, "-").slice(0, 36);
    const fn = `${prev?.kind === "contract" ? "Sozlesme" : "Teklif"}-${base}-${quote?.number ?? "x"}.pdf`;
    void (async () => {
      try {
        const mod = await import("html2pdf.js");
        const html2pdf = mod.default || mod;
        await html2pdf()
          .set({
            margin: [10, 10, 10, 10],
            filename: fn,
            image: { type: "jpeg", quality: 0.96 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
          })
          .from(root)
          .save();
      } catch (err) {
        console.error(err);
        window.alert("PDF oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.");
      }
    })();
    return;
  }
  if (action === "delete-quote-from-list") {
    const pid = actionEl.dataset.projectId;
    const qid = actionEl.dataset.quoteId;
    const p = state.remote.projects.find((x) => x.id === pid);
    if (!p || !getVisibleProjects().some((x) => x.id === pid)) return;
    if (!window.confirm("Bu teklifi silmek istiyor musunuz?")) return;
    p.quotes = (p.quotes || []).filter((q) => q.id !== qid);
    renumberQuotesInPlace(p.quotes);
    if (state.ui.selectedQuoteId === qid) state.ui.selectedQuoteId = null;
    if (state.ui.contractQuoteId === qid) state.ui.contractQuoteId = p.quotes[0]?.id || null;
    if (state.ui.producerContractFlow === "detail" && !p.quotes.length) {
      state.ui.producerContractFlow = "list";
    }
    scheduleSave();
    render();
    return;
  }
  if (action === "open-project-workspace") {
    const pid = actionEl.dataset.projectId;
    const p = getVisibleProjects().find((x) => x.id === pid);
    if (!p) return;
    state.ui.selectedProjectId = pid;
    state.ui.producerProjectHub = false;
    state.ui.producerFlow = p.saved ? "quotes" : "project";
    state.ui.selectedQuoteId = null;
    state.ui.contractQuoteId = null;
    persistUi();
    render();
    return;
  }
  if (action === "back-to-project-hub") {
    state.ui.producerProjectHub = true;
    state.ui.selectedProjectId = null;
    state.ui.selectedQuoteId = null;
    state.ui.producerFlow = "project";
    state.ui.roomTypeModalOpen = false;
    state.ui.editingRoomId = null;
    state.ui.roomEditDraft = null;
    persistUi();
    render();
    return;
  }
  if (action === "save-project-meta") {
    const project = getCurrentProject();
    const owner = getCurrentUser();
    if (!project) return;
    if (owner?.role === "producer") {
      project.merchantName = owner.company || owner.fullName || project.merchantName;
    }
    project.saved = true;
    state.ui.producerFlow = "quotes";
    scheduleSave();
    render();
    return;
  }
  if (action === "go-to-quotes") {
    state.ui.producerFlow = "quotes";
    persistUi();
    render();
    return;
  }
  if (action === "go-to-project-meta") {
    state.ui.producerFlow = "project";
    persistUi();
    render();
    return;
  }
  if (action === "add-quote") {
    const project = getCurrentProject();
    if (!project || !project.saved) return;
    const q = pushQuote(project);
    state.ui.selectedQuoteId = q.id;
    state.ui.contractQuoteId = q.id;
    state.ui.producerFlow = "quote";
    state.ui.selectedRoomId = null;
    scheduleSave();
    render();
    return;
  }
  if (action === "open-quote") {
    state.ui.producerProjectHub = false;
    state.ui.selectedQuoteId = actionEl.dataset.quoteId;
    state.ui.contractQuoteId = actionEl.dataset.quoteId;
    state.ui.producerFlow = "quote";
    state.ui.roomCreatorOpen = false;
    const q = getCurrentQuote();
    state.ui.selectedRoomId = q?.rooms[0]?.id || null;
    persistUi();
    render();
    return;
  }
  if (action === "back-to-quotes") {
    state.ui.producerFlow = "quotes";
    state.ui.selectedRoomId = null;
    persistUi();
    render();
    return;
  }
  if (action === "delete-quote") {
    const qid = actionEl.dataset.quoteId;
    if (!window.confirm("Bu teklifi silmek istiyor musunuz?")) return;
    const project = getCurrentProject();
    if (!project) return;
    project.quotes = project.quotes.filter((q) => q.id !== qid);
    renumberQuotesInPlace(project.quotes);
    if (state.ui.selectedQuoteId === qid) {
      state.ui.selectedQuoteId = null;
      state.ui.producerFlow = "quotes";
    }
    if (state.ui.contractQuoteId === qid) {
      state.ui.contractQuoteId = project.quotes[0]?.id || null;
    }
    scheduleSave();
    render();
    return;
  }
  if (action === "delete-project") {
    if (!window.confirm("Projeyi ve tüm tekliflerini silmek istiyor musunuz?")) return;
    const id = state.ui.selectedProjectId;
    state.remote.projects = state.remote.projects.filter((p) => p.id !== id);
    state.ui.selectedProjectId = null;
    state.ui.selectedQuoteId = null;
    state.ui.contractQuoteId = null;
    state.ui.producerFlow = "project";
    state.ui.producerProjectHub = true;
    scheduleSave();
    render();
    return;
  }
  if (action === "select-contract-quote") {
    state.ui.contractQuoteId = actionEl.dataset.quoteId;
    persistUi();
    render();
    return;
  }
  if (action === "open-room-add-editor") {
    if (!getCurrentQuote()) return;
    state.ui.roomTypeModalOpen = true;
    render();
    return;
  }
  if (action === "close-room-type-modal") {
    state.ui.roomTypeModalOpen = false;
    render();
    return;
  }
  if (action === "backdrop-close-room-modal" && actionEl === event.target) {
    state.ui.roomTypeModalOpen = false;
    render();
    return;
  }
  if (action === "pick-room-type-modal") {
    const quote = getCurrentQuote();
    const type = actionEl.dataset.roomType;
    if (!quote || !ROOM_TEMPLATES[type]) return;
    const idx = quote.rooms.length + 1;
    state.ui.roomTypeModalOpen = false;
    state.ui.producerFlow = "room-edit";
    state.ui.editingRoomId = "new";
    state.ui.roomEditDraft = createRoom(type, idx, { empty: true });
    persistUi();
    render();
    return;
  }
  if (action === "open-room-editor") {
    const quote = getCurrentQuote();
    const rid = actionEl.dataset.roomId;
    const room = quote?.rooms.find((r) => r.id === rid);
    if (!quote || !room) return;
    state.ui.producerFlow = "room-edit";
    state.ui.editingRoomId = rid;
    state.ui.roomEditDraft = structuredClone(room);
    persistUi();
    render();
    return;
  }
  if (action === "cancel-room-editor") {
    state.ui.producerFlow = "quote";
    state.ui.editingRoomId = null;
    state.ui.roomEditDraft = null;
    persistUi();
    render();
    return;
  }
  if (action === "save-room-editor") {
    const quote = getCurrentQuote();
    const draft = state.ui.roomEditDraft;
    if (!quote || !draft) return;
    if (!draft.selectedQualityId) {
      window.alert("Kalite seçmeden odayı teklife ekleyemezsiniz.");
      return;
    }
    draft.name = deriveRoomNameFromType(draft, quote, state.ui.editingRoomId);
    if (state.ui.editingRoomId === "new") {
      quote.rooms.push(draft);
    } else {
      const i = quote.rooms.findIndex((r) => r.id === state.ui.editingRoomId);
      if (i >= 0) quote.rooms[i] = draft;
    }
    state.ui.selectedRoomId = draft.id;
    state.ui.producerFlow = "quote";
    state.ui.editingRoomId = null;
    state.ui.roomEditDraft = null;
    scheduleSave();
    persistUi();
    render();
    return;
  }
  if (action === "pick-room-quality") {
    const draft = state.ui.roomEditDraft;
    const qid = actionEl.dataset.qualityId;
    if (!draft || !qid) return;
    draft.selectedQualityId = qid;
    scheduleSave();
    render({ preserveFocus: true });
    return;
  }
  if (action === "new-project-quick") {
    const currentUser = getCurrentUser();
    const nextProject = createProject(currentUser);
    state.remote.projects.unshift(nextProject);
    state.ui.selectedProjectId = nextProject.id;
    state.ui.producerProjectHub = false;
    state.ui.selectedQuoteId = null;
    state.ui.contractQuoteId = null;
    state.ui.producerFlow = "project";
    state.ui.selectedRoomId = null;
    state.ui.roomCreatorOpen = false;
    state.ui.currentView = "projects";
    scheduleSave();
    render();
    return;
  }
  if (action === "stop-impersonation") {
    state.ui.proxyUserId = null;
    state.ui.currentView = ROLE_ACCESS[getSignedInUser().role][0];
    persistUi();
    render();
    return;
  }
  if (action === "impersonate-user") {
    state.ui.proxyUserId = actionEl.dataset.id;
    state.ui.currentView = ROLE_ACCESS[getCurrentUser().role][0];
    persistUi();
    render();
    return;
  }
  if (action === "remove-room") {
    updateCurrentQuote((quote) => {
      quote.rooms = quote.rooms.filter((room) => room.id !== actionEl.dataset.roomId);
      state.ui.selectedRoomId = quote.rooms[0]?.id || null;
    });
    render();
    return;
  }
  if (action === "add-quality") return void addQuality();
  if (action === "remove-quality") {
    if (state.remote.qualities.length <= 1) return;
    openConfirmModal({ kind: "remove-quality", id: actionEl.dataset.id });
    return;
  }
  if (action === "add-package") return void addPackage();
  if (action === "remove-package") {
    if (state.remote.hardwarePackages.length <= 1) return;
    openConfirmModal({ kind: "remove-package", id: actionEl.dataset.id });
    return;
  }
  if (action === "add-service") return void addService();
  if (action === "remove-service") {
    openConfirmModal({ kind: "remove-service", id: actionEl.dataset.id });
    return;
  }
  if (action === "add-user") return void openUserEditor("create");
  if (action === "remove-user") {
    const user = getUserById(actionEl.dataset.id);
    if (!user || user.role !== "producer") return;
    openConfirmModal({ kind: "remove-user", id: actionEl.dataset.id });
    return;
  }
  if (action === "activate-user") {
    const user = getUserById(actionEl.dataset.id);
    if (!user) return;
    user.status = "active";
    if (user.role === "producer" && user.licenseEndDate < todayIso()) {
      user.licenseStartDate = todayIso();
      user.licenseEndDate = addOneYear();
    }
    scheduleSave();
    render();
    return;
  }
  if (action === "deactivate-user") {
    const user = getUserById(actionEl.dataset.id);
    if (!user) return;
    openConfirmModal({ kind: "deactivate-user", id: actionEl.dataset.id });
    return;
  }
  if (action === "renew-license") {
    const user = getUserById(actionEl.dataset.id);
    if (!user || user.role !== "producer") return;
    openConfirmModal({ kind: "renew-license", id: actionEl.dataset.id });
    return;
  }
  if (action === "print") return void window.print();
  if (action === "fill-login") {
    els.loginUsername.value = actionEl.dataset.username;
    els.loginPassword.value = actionEl.dataset.password;
  }
}

function handleFieldChange(event) {
  const field = event.target.closest("[data-bind]");
  if (!field) return;
  const bind = field.dataset.bind || "";
  setValueByPath(bind, field.value);
  if (
    !bind.startsWith("user.") &&
    !bind.startsWith("userdraft.") &&
    !bind.startsWith("catalogdraft.") &&
    !bind.startsWith("chamberdraft.") &&
    !bind.startsWith("ui.")
  ) {
    scheduleSave();
  }
  render({ preserveFocus: true });
}

function bindStaticEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("change", (event) => {
    if (event.target.classList?.contains("roomdraft-include-hw")) {
      if (state.ui.roomEditDraft) {
        state.ui.roomEditDraft.includeHardwarePackage = event.target.checked;
        scheduleSave();
        render({ preserveFocus: true });
      }
      return;
    }
    if (event.target.classList?.contains("contract-service-cb")) {
      handleContractServiceCheckbox(event.target);
      return;
    }
    handleFieldChange(event);
  });
  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-bind]")) handleFieldChange(event);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushPendingSave();
    }
  });
  window.addEventListener("pagehide", () => {
    void flushPendingSave();
  });

  els.openLoginBtn.addEventListener("click", openLoginDialogAfterSessionNoticeIfNeeded);
  if (els.newProjectBtn) {
    els.newProjectBtn.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      const nextProject = createProject(currentUser);
      state.remote.projects.unshift(nextProject);
      state.ui.selectedProjectId = nextProject.id;
      state.ui.producerProjectHub = false;
      state.ui.selectedQuoteId = null;
      state.ui.contractQuoteId = null;
      state.ui.producerFlow = "project";
      state.ui.selectedRoomId = null;
      state.ui.roomCreatorOpen = false;
      state.ui.currentView = "projects";
      scheduleSave();
      render();
    });
  }
  els.printContractBtn.addEventListener("click", () => {
    const p = getCurrentProject();
    if (!p?.quotes?.length) {
      window.alert("Önce bir proje ve teklif seçin.");
      return;
    }
    const qid = state.ui.selectedQuoteId || state.ui.contractQuoteId || p.quotes[0].id;
    state.ui.contractQuoteId = qid;
    state.ui.documentPreview = { projectId: p.id, quoteId: qid, kind: "contract" };
    render();
  });
  els.themeToggleBtn.addEventListener("click", () => {
    state.ui.theme = state.ui.theme === "dark" ? "light" : "dark";
    persistUi();
    render();
  });
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = els.loginUsername.value.trim();
    const password = els.loginPassword.value.trim();
    const result = await loginWithCredentials(username, password);
    if (!result.ok) {
      window.alert(result.error || "Kullanıcı adı veya şifre hatalı.");
      return;
    }
    state.remote = normalizeRemoteState(result.data);
    state.ui.storageMode = result.storageMode;
    state.ui.currentUserId = result.auth.userId;
    state.ui.sessionNoticeModal = null;
    state.ui.proxyUserId = null;
    state.ui.selectedQuoteId = null;
    state.ui.contractQuoteId = null;
    state.ui.producerFlow = "project";
    state.ui.selectedRoomId = null;
    state.ui.roomCreatorOpen = false;
    state.ui.editingRoomId = null;
    state.ui.roomEditDraft = null;
    state.ui.roomTypeModalOpen = false;
    state.ui.producerProjectHub = true;
    state.ui.producerContractFlow = "list";
    state.ui.currentView = ROLE_ACCESS[result.auth.role][0];
    state.ui.saveStatus = "saved";
    persistUi();
    render();
    els.loginDialog.close();
  });
}

async function init() {
  els.viewContainer.innerHTML = renderLoadingState();
  const remoteResult = await loadRemoteState();
  const original = JSON.stringify(remoteResult.data);
  state.remote = normalizeRemoteState(remoteResult.data);
  state.ui.storageMode = remoteResult.storageMode;
  state.ui.currentUserId = remoteResult.auth?.userId || null;
  state.ui.proxyUserId = null;
  state.ui.roomCreatorOpen = false;
  ensureUiSelections();
  bindStaticEvents();
  render();
  if (!isAuthenticated()) openLoginDialog();
  if (remoteResult.auth && JSON.stringify(state.remote) !== original) {
    await saveRemoteState(state.remote);
  }
}

init();

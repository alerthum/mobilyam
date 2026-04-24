export const LOCAL_STORAGE_KEY = "yokus-oda-ui-v3";

export const NAV_ITEMS = [
  { id: "projects", label: "Projeler", short: "Projeler" },
  { id: "room_prices", label: "Oda Fiyatları", short: "Odalar" },
  { id: "chamber_staff", label: "Oda yönetimi", short: "Oda" },
  { id: "users", label: "Kullanıcılar", short: "Kullanıcı" },
  { id: "catalog", label: "Fiyatlar", short: "Fiyat" },
  { id: "contracts", label: "Sözleşmeler", short: "Sözleşme" },
  { id: "dashboard", label: "Özet", short: "Özet" },
  { id: "account", label: "Hesap", short: "Hesap" }
];

export const ROLE_ACCESS = {
  system_admin: ["chamber_staff", "users", "catalog", "dashboard", "account"],
  chamber: ["chamber_staff", "users", "catalog", "dashboard", "account"],
  producer: ["projects", "room_prices", "contracts", "account"]
};

export const ROLE_LABELS = {
  system_admin: "Sistem Admin",
  chamber: "Oda Yönetimi",
  producer: "Mobilyacı"
};

/** Oda ekleme listesinde sıra (mutfak öncelikli). */
export const ROOM_TYPE_ORDER = ["kitchen", "wardrobe", "vestiyer", "bathroom", "bedroom", "office"];

export const ROOM_TEMPLATES = {
  kitchen: {
    label: "Mutfak",
    info: "Ölçüler satış sözleşmesi maliyet raporu (Excel) ile aynı mantıkta hesaplanır.",
    basicFields: [
      { key: "ceilingHeight", label: "Tavan yüksekliği", unit: "cm", default: 260 },
      { key: "wallWidth", label: "Duvar genişliği", unit: "cm", default: 250 },
      { key: "doorWidth", label: "Kapı genişliği", unit: "cm", default: 60 },
      { key: "boyDolapEn", label: "Boy dolap eni", unit: "cm", default: 150 },
      { key: "buzDolapEn", label: "Buzdolabı dolabı eni", unit: "cm", default: 80 },
      { key: "buzYanakAdet", label: "Buzdolabı yanak (adet)", unit: "adet", default: 2, step: 1 },
      { key: "ustKorMesafe", label: "Üst kör mesafesi", unit: "cm", default: 30 },
      { key: "altKorMesafe", label: "Alt kör mesafesi", unit: "cm", default: 30 }
    ]
  },
  wardrobe: {
    label: "Gardırop",
    info: "İlk teklifte toplam genişlik, yükseklik ve derinlik yeterlidir.",
    basicFields: [
      { key: "tallWidth", label: "Toplam genişlik", unit: "cm", default: 280 },
      { key: "tallHeight", label: "Yükseklik", unit: "cm", default: 260 },
      { key: "tallDepth", label: "Derinlik", unit: "cm", default: 60 },
      { key: "panelWidth", label: "Kapak / panel alanı", unit: "cm", default: 280 },
      { key: "panelHeight", label: "Kapak / panel yüksekliği", unit: "cm", default: 250 }
    ]
  },
  bathroom: {
    label: "Banyo",
    info: "Alt modül ve varsa boy dolap ölçüleri girilebilir.",
    basicFields: [
      { key: "lowerWidth", label: "Alt modül uzunluğu", unit: "cm", default: 120 },
      { key: "lowerHeight", label: "Alt modül yüksekliği", unit: "cm", default: 86 },
      { key: "lowerDepth", label: "Alt modül derinliği", unit: "cm", default: 55 },
      { key: "upperWidth", label: "Ayna üstü dolap", unit: "cm", default: 120 },
      { key: "upperHeight", label: "Üst modül yüksekliği", unit: "cm", default: 70 },
      { key: "upperDepth", label: "Üst modül derinliği", unit: "cm", default: 18 },
      { key: "tallWidth", label: "Boy dolap uzunluğu", unit: "cm", default: 40 },
      { key: "tallHeight", label: "Boy dolap yüksekliği", unit: "cm", default: 220 },
      { key: "tallDepth", label: "Boy dolap derinliği", unit: "cm", default: 35 }
    ]
  },
  vestiyer: {
    label: "Vestiyer",
    info: "Boy dolap ve dekor panel ölçüleriyle hızlı teklif çıkar.",
    basicFields: [
      { key: "tallWidth", label: "Boy dolap genişliği", unit: "cm", default: 180 },
      { key: "tallHeight", label: "Boy dolap yüksekliği", unit: "cm", default: 260 },
      { key: "tallDepth", label: "Boy dolap derinliği", unit: "cm", default: 38 },
      { key: "panelWidth", label: "Dekor panel genişliği", unit: "cm", default: 100 },
      { key: "panelHeight", label: "Dekor panel yüksekliği", unit: "cm", default: 220 }
    ]
  },
  bedroom: {
    label: "Yatak Odası",
    info: "Gardırop ve şifonyer ölçüleri ilk fiyat için yeterlidir.",
    basicFields: [
      { key: "tallWidth", label: "Gardırop genişliği", unit: "cm", default: 240 },
      { key: "tallHeight", label: "Gardırop yüksekliği", unit: "cm", default: 250 },
      { key: "tallDepth", label: "Gardırop derinliği", unit: "cm", default: 60 },
      { key: "lowerWidth", label: "Şifonyer uzunluğu", unit: "cm", default: 120 },
      { key: "lowerHeight", label: "Şifonyer yüksekliği", unit: "cm", default: 85 },
      { key: "lowerDepth", label: "Şifonyer derinliği", unit: "cm", default: 45 },
      { key: "panelWidth", label: "Başlık genişliği", unit: "cm", default: 180 },
      { key: "panelHeight", label: "Başlık yüksekliği", unit: "cm", default: 120 }
    ]
  },
  office: {
    label: "Ofis / Çalışma",
    info: "Masa, arşiv ve panel ölçüleri ilk teklif için yeterlidir.",
    basicFields: [
      { key: "lowerWidth", label: "Masa uzunluğu", unit: "cm", default: 220 },
      { key: "lowerHeight", label: "Masa yüksekliği", unit: "cm", default: 75 },
      { key: "lowerDepth", label: "Masa derinliği", unit: "cm", default: 60 },
      { key: "tallWidth", label: "Arşiv dolabı genişliği", unit: "cm", default: 180 },
      { key: "tallHeight", label: "Arşiv dolabı yüksekliği", unit: "cm", default: 240 },
      { key: "tallDepth", label: "Arşiv dolabı derinliği", unit: "cm", default: 38 },
      { key: "panelWidth", label: "Duvar paneli genişliği", unit: "cm", default: 180 },
      { key: "panelHeight", label: "Duvar paneli yüksekliği", unit: "cm", default: 120 }
    ]
  }
};

export const DETAIL_FIELDS = [
  { key: "doorCount", label: "Kapak adedi", unit: "adet", default: 0, step: 1 },
  { key: "drawerCount", label: "Çekmece adedi", unit: "adet", default: 0, step: 1 },
  { key: "shelfCount", label: "Raf adedi", unit: "adet", default: 0, step: 1 },
  { key: "liftCount", label: "Mekanizma adedi", unit: "adet", default: 0, step: 1 },
  { key: "glassDoorCount", label: "Cam kapak adedi", unit: "adet", default: 0, step: 1 },
  { key: "customHardwarePrice", label: "Ek hırdavat bedeli", unit: "₺", default: 0, step: 50 }
];

const DEFAULT_BASIC_VALUES = {
  ceilingHeight: 0,
  wallWidth: 0,
  doorWidth: 0,
  boyDolapEn: 0,
  buzDolapEn: 0,
  buzYanakAdet: 0,
  ustKorMesafe: 0,
  altKorMesafe: 0,
  lowerWidth: 0,
  lowerHeight: 0,
  lowerDepth: 0,
  upperWidth: 0,
  upperHeight: 0,
  upperDepth: 0,
  tallWidth: 0,
  tallHeight: 0,
  tallDepth: 0,
  panelWidth: 0,
  panelHeight: 0,
  countertopWidth: 0,
  countertopDepth: 0
};

const DEFAULT_DETAILS = {
  doorCount: 0,
  drawerCount: 0,
  shelfCount: 0,
  liftCount: 0,
  glassDoorCount: 0,
  customHardwarePrice: 0
};

/**
 * @param {{ empty?: boolean, defaultQualityId?: string | null, hardwarePackageId?: string }} [options]
 */
export function createRoom(type = "kitchen", index = 1, options = {}) {
  const empty = options.empty === true;
  const template = ROOM_TEMPLATES[type];
  const basic = { ...DEFAULT_BASIC_VALUES };
  template.basicFields.forEach((field) => {
    basic[field.key] = empty ? 0 : field.default;
  });

  const tplLabel = template.label;
  return {
    id: `ROOM-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    name: empty ? "" : `${tplLabel} ${index}`,
    type,
    selectedQualityId: empty ? null : options.defaultQualityId ?? "mdflam",
    hardwarePackageId: options.hardwarePackageId || "standard",
    /** Yeni boş odada kapalı; eski kayıtlarda undefined = hırdavat dahil */
    includeHardwarePackage: empty ? false : true,
    basic,
    details: { ...DEFAULT_DETAILS }
  };
}

export function createQuote() {
  return {
    id: `QT-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    number: 0,
    date: new Date().toISOString().slice(0, 10),
    rooms: [],
    services: [],
    contractServiceLines: [],
    producerDiscountRate: 0,
    generalDiscountAmount: 0,
    notes: ""
  };
}

export function renumberQuotesInPlace(quotes) {
  if (!quotes) return;
  quotes.forEach((q, i) => {
    q.number = i + 1;
  });
}

/** Projeye yeni teklif ekler; numaraları 1…n olacak şekilde günceller. */
export function pushQuote(project) {
  project.quotes = project.quotes || [];
  const quote = createQuote();
  project.quotes.push(quote);
  renumberQuotesInPlace(project.quotes);
  return quote;
}

export function createProject(owner = {}) {
  const merchantName = owner.company || owner.fullName || "Yeni Mobilyacı";

  return {
    id: `PRJ-${Date.now()}`,
    ownerUserId: owner.id || null,
    contractCode: `ODA-${new Date().getFullYear().toString().slice(-2)}${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`,
    projectName: "Yeni Proje",
    customerName: "Müşteri Adı",
    customerPhone: "",
    merchantName,
    projectAddress: "",
    saved: false,
    quotes: []
  };
}

export function getVisibleFields(type) {
  return ROOM_TEMPLATES[type]?.basicFields ?? ROOM_TEMPLATES.kitchen.basicFields;
}

export function orderedRoomTemplateEntries() {
  const entries = Object.entries(ROOM_TEMPLATES);
  return ROOM_TYPE_ORDER.map((id) => entries.find(([key]) => key === id)).filter(Boolean);
}

export function getDefaultLocalState() {
  return {
    currentView: "projects",
    selectedProjectId: null,
    selectedQuoteId: null,
    contractQuoteId: null,
    selectedRoomId: null,
    /** project | quotes | quote */
    producerFlow: "project",
    currentUserId: null,
    proxyUserId: null,
    theme: "light",
    expandedRooms: {},
    roomCreatorOpen: false,
    /** quote içinde tam ekran oda formu: null | "new" | room id */
    editingRoomId: null,
    roomEditDraft: null,
    roomTypeModalOpen: false,
    /** Projeler sekmesinde tam liste görünümü */
    producerProjectHub: true,
    /** Sözleşmeler: list | detail */
    producerContractFlow: "list",
    saveStatus: "idle",
    storageMode: "demo",
    /** Kullanıcılar tablosu: fullName | company | role | status | licenseEnd | daysLeft */
    userSortColumn: "fullName",
    userSortDir: "asc",
    confirmModal: null,
    chamberStaffSearchQuery: "",
    /** { projectId, quoteId, kind: "quote" | "contract" } | null — kalıcı kaydedilmez */
    documentPreview: null
  };
}

export function canAccess(view, role) {
  return (ROLE_ACCESS[role] || []).includes(view);
}

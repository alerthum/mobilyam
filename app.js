(function () {
  const STORAGE_KEY = "yokus-oda-sistemi-v1";
  const currency = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  });
  const number = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
  const today = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());

  const NAV_ITEMS = [
    { id: "dashboard", label: "Ana Panel", short: "Panel" },
    { id: "projects", label: "Teklif Merkezi", short: "Teklif" },
    { id: "catalog", label: "Oda Fiyatları", short: "Fiyat" },
    { id: "users", label: "Kullanıcılar", short: "Kullanıcı" },
    { id: "contracts", label: "Sözleşme", short: "Belge" },
    { id: "customer", label: "Müşteri Ekranı", short: "Müşteri" }
  ];
  const ROLE_ACCESS = {
    admin: ["dashboard", "projects", "catalog", "users", "contracts", "customer"],
    producer: ["dashboard", "projects", "contracts", "customer"],
    customer: ["customer"]
  };
  const ROLE_LABELS = {
    admin: "Oda Yönetimi",
    producer: "Mobilyacı",
    customer: "Müşteri"
  };

  const QUALITIES = [
    { id: "suntalam", name: "Suntalam", category: "Ekonomik", chamberSheetPrice: 7200, frontMultiplier: 0.92, laborMultiplier: 0.9, wasteRate: 0.08, note: "Ekonomik seri ve hızlı üretim" },
    { id: "mdflam", name: "MDFLam", category: "Standart", chamberSheetPrice: 9000, frontMultiplier: 1, laborMultiplier: 1, wasteRate: 0.1, note: "Oda baz fiyat referansı" },
    { id: "three-d-panel", name: "3D Panel", category: "Dekoratif", chamberSheetPrice: 10250, frontMultiplier: 1.08, laborMultiplier: 1.08, wasteRate: 0.12, note: "Desenli ve dekoratif yüzeyler" },
    { id: "glassmax", name: "Glassmax", category: "Parlak", chamberSheetPrice: 11850, frontMultiplier: 1.12, laborMultiplier: 1.12, wasteRate: 0.12, note: "Cam efektli premium yüzey" },
    { id: "high-gloss", name: "High Gloss", category: "Premium", chamberSheetPrice: 11000, frontMultiplier: 1.14, laborMultiplier: 1.1, wasteRate: 0.11, note: "Parlak premium seri" },
    { id: "akrilik", name: "Akrilik", category: "Premium", chamberSheetPrice: 12000, frontMultiplier: 1.18, laborMultiplier: 1.12, wasteRate: 0.12, note: "Çizilmeye dayanıklı modern seri" },
    { id: "membran", name: "Membran", category: "Özel Üretim", chamberSheetPrice: 13000, frontMultiplier: 1.24, laborMultiplier: 1.18, wasteRate: 0.13, note: "Kapak kalıplı özel seri" },
    { id: "lake", name: "Lake", category: "Lüks", chamberSheetPrice: 14750, frontMultiplier: 1.32, laborMultiplier: 1.28, wasteRate: 0.14, note: "Yüksek işçilik ve finisaj" }
  ];
  const HARDWARE_PACKAGES = [
    { id: "basic", name: "Temel Hırdavat", hingePrice: 72, drawerPrice: 460, railPrice: 180, handlePrice: 145, liftPrice: 620 },
    { id: "standard", name: "Standart Hırdavat", hingePrice: 96, drawerPrice: 680, railPrice: 240, handlePrice: 220, liftPrice: 920 },
    { id: "premium", name: "Premium Hırdavat", hingePrice: 138, drawerPrice: 1180, railPrice: 390, handlePrice: 365, liftPrice: 1480 }
  ];
  const SERVICES = [
    { id: "olcu-servis", name: "Ölçü Servis Bedeli", unit: "adet", price: 1250, defaultQuantity: 1 },
    { id: "tasarim", name: "Proje Tasarım Bedeli", unit: "adet", price: 3500, defaultQuantity: 1 },
    { id: "sokum", name: "Söküm Bedeli", unit: "adet", price: 4200, defaultQuantity: 0 },
    { id: "asansor", name: "Asansör Bedeli", unit: "adet", price: 2500, defaultQuantity: 0 },
    { id: "led", name: "LED Kanal Uygulaması", unit: "mt", price: 420, defaultQuantity: 0 },
    { id: "tezgah", name: "Porselen Tezgah", unit: "mt", price: 4250, defaultQuantity: 0 }
  ];
  const CHAMBER = {
    chamberName: "Yokuş Mobilyacılar Odası",
    updatedAt: today,
    sheetArea: 5.88,
    carcassUsageRatio: 0.68,
    backPanelSqmPrice: 310,
    edgeBandMtPrice: 34,
    laborHourlyRate: 485,
    installationRate: 280,
    packagingRate: 95,
    chamberMarginRate: 0.18,
    overheadRate: 0.12,
    minimumProfitRate: 0.08
  };
  const ROOM_TEMPLATES = {
    kitchen: {
      label: "Mutfak",
      fields: [
        { key: "baseRun", label: "Alt dolap uzunluğu", unit: "cm", default: 360 },
        { key: "upperRun", label: "Üst dolap uzunluğu", unit: "cm", default: 300 },
        { key: "tallRun", label: "Boy dolap toplamı", unit: "cm", default: 120 },
        { key: "countertopRun", label: "Tezgah uzunluğu", unit: "cm", default: 360 },
        { key: "islandRun", label: "Ada / bar uzunluğu", unit: "cm", default: 0 },
        { key: "ceilingHeight", label: "Tavan yüksekliği", unit: "cm", default: 270 },
        { key: "doorCount", label: "Kapak adedi", unit: "adet", default: 12 },
        { key: "drawerCount", label: "Çekmece adedi", unit: "adet", default: 6 },
        { key: "liftCount", label: "Mekanizma adedi", unit: "adet", default: 2 },
        { key: "openShelfRun", label: "Açık raf toplamı", unit: "cm", default: 60 }
      ]
    },
    wardrobe: {
      label: "Gardırop",
      fields: [
        { key: "width", label: "Toplam genişlik", unit: "cm", default: 280 },
        { key: "height", label: "Yükseklik", unit: "cm", default: 260 },
        { key: "moduleCount", label: "Modül adedi", unit: "adet", default: 4 },
        { key: "doorCount", label: "Kapak adedi", unit: "adet", default: 8 },
        { key: "drawerCount", label: "Çekmece adedi", unit: "adet", default: 4 },
        { key: "shelfCount", label: "Raf adedi", unit: "adet", default: 10 },
        { key: "slidingDoorCount", label: "Sürgü kapak adedi", unit: "adet", default: 0 }
      ]
    },
    bathroom: {
      label: "Banyo",
      fields: [
        { key: "baseRun", label: "Alt modül uzunluğu", unit: "cm", default: 120 },
        { key: "tallRun", label: "Boy dolap toplamı", unit: "cm", default: 40 },
        { key: "mirrorRun", label: "Ayna / üst modül", unit: "cm", default: 120 },
        { key: "doorCount", label: "Kapak adedi", unit: "adet", default: 4 },
        { key: "drawerCount", label: "Çekmece adedi", unit: "adet", default: 2 }
      ]
    },
    vestiyer: {
      label: "Vestiyer",
      fields: [
        { key: "width", label: "Toplam genişlik", unit: "cm", default: 180 },
        { key: "height", label: "Yükseklik", unit: "cm", default: 260 },
        { key: "panelWidth", label: "Dekor panel genişliği", unit: "cm", default: 80 },
        { key: "doorCount", label: "Kapak adedi", unit: "adet", default: 4 },
        { key: "drawerCount", label: "Çekmece adedi", unit: "adet", default: 2 },
        { key: "shelfCount", label: "Raf adedi", unit: "adet", default: 6 }
      ]
    },
    bedroom: {
      label: "Yatak Odası",
      fields: [
        { key: "wardrobeWidth", label: "Gardırop genişliği", unit: "cm", default: 240 },
        { key: "dresserWidth", label: "Şifonyer genişliği", unit: "cm", default: 120 },
        { key: "nightstandCount", label: "Komodin adedi", unit: "adet", default: 2 },
        { key: "headboardWidth", label: "Başlık genişliği", unit: "cm", default: 180 },
        { key: "height", label: "Gardırop yüksekliği", unit: "cm", default: 250 },
        { key: "doorCount", label: "Kapak adedi", unit: "adet", default: 6 },
        { key: "drawerCount", label: "Çekmece adedi", unit: "adet", default: 6 }
      ]
    },
    office: {
      label: "Ofis / Çalışma",
      fields: [
        { key: "deskRun", label: "Masa uzunluğu", unit: "cm", default: 220 },
        { key: "archiveRun", label: "Arşiv dolabı", unit: "cm", default: 180 },
        { key: "panelRun", label: "Duvar paneli", unit: "cm", default: 180 },
        { key: "height", label: "Yükseklik", unit: "cm", default: 240 },
        { key: "doorCount", label: "Kapak adedi", unit: "adet", default: 4 },
        { key: "drawerCount", label: "Çekmece adedi", unit: "adet", default: 4 }
      ]
    }
  };
  const DEMO_USERS = [
    { id: "USR-001", fullName: "Oda Yönetimi", username: "oda", password: "oda2026", role: "admin", company: "Yokuş Mobilyacılar Odası" },
    { id: "USR-002", fullName: "Yokuş Mobilya", username: "mobilyaci", password: "mob2026", role: "producer", company: "Yokuş Mobilya" },
    { id: "USR-003", fullName: "Ziyaretçi Müşteri", username: "musteri", password: "misafir2026", role: "customer", company: "Bireysel" }
  ];

  function clone(data) { return JSON.parse(JSON.stringify(data)); }
  function round(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
  function percent(value) { return round(value * 100); }
  function formatCurrency(value) { return currency.format(Number(value || 0)); }
  function formatNumber(value, suffix) { return number.format(Number(value || 0)) + (suffix || ""); }

  function defaultRoom(type, index) {
    const template = ROOM_TEMPLATES[type];
    const measurements = {};
    template.fields.forEach((field) => { measurements[field.key] = field.default; });
    return {
      id: "ROOM-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6),
      name: template.label + " " + index,
      type: type,
      qualityId: type === "bathroom" ? "membran" : "mdflam",
      hardwarePackageId: "standard",
      discountRate: 0,
      customHardwarePrice: 0,
      measurements: measurements
    };
  }

  function defaultProject() {
    return {
      id: "PRJ-" + Date.now(),
      contractCode: "ODA-" + new Date().getFullYear().toString().slice(-2) + String(new Date().getMonth() + 1).padStart(2, "0") + "-" + Math.floor(Math.random() * 900 + 100),
      projectName: "Yeni Proje",
      customerName: "Müşteri Adı",
      customerPhone: "",
      merchantName: "Yokuş Mobilya",
      projectAddress: "",
      producerDiscountRate: 6,
      generalDiscountAmount: 0,
      notes: "Müşteri ile paylaşılacak taslak sözleşmede oda resmi fiyatı ayrı satırda gösterilecektir.",
      services: SERVICES.map((service) => ({ id: service.id, quantity: service.defaultQuantity })),
      rooms: [defaultRoom("kitchen", 1)]
    };
  }

  const INITIAL_STATE = {
    currentUser: DEMO_USERS[1],
    currentView: "dashboard",
    selectedProjectId: "PRJ-ACAR-001",
    chamber: clone(CHAMBER),
    qualities: clone(QUALITIES),
    hardwarePackages: clone(HARDWARE_PACKAGES),
    servicesCatalog: clone(SERVICES),
    users: clone(DEMO_USERS),
    projects: [{
      id: "PRJ-ACAR-001",
      contractCode: "ODA-2604-214",
      projectName: "Acar Residence 3+1",
      customerName: "Sibel Demir",
      customerPhone: "0532 555 11 22",
      merchantName: "Yokuş Mobilya",
      projectAddress: "Merkez / Uşak",
      producerDiscountRate: 8,
      generalDiscountAmount: 0,
      notes: "Mutfak ve vestiyer premium, yatak odası dengeli seri ile hesaplandı.",
      services: [
        { id: "olcu-servis", quantity: 1 },
        { id: "tasarim", quantity: 1 },
        { id: "sokum", quantity: 1 },
        { id: "asansor", quantity: 1 },
        { id: "led", quantity: 6 },
        { id: "tezgah", quantity: 4.2 }
      ],
      rooms: [
        { id: "ROOM-1", name: "Mutfak", type: "kitchen", qualityId: "high-gloss", hardwarePackageId: "premium", discountRate: 0, customHardwarePrice: 0, measurements: { baseRun: 410, upperRun: 330, tallRun: 120, countertopRun: 410, islandRun: 110, ceilingHeight: 272, doorCount: 14, drawerCount: 7, liftCount: 2, openShelfRun: 40 } },
        { id: "ROOM-2", name: "Vestiyer", type: "vestiyer", qualityId: "akrilik", hardwarePackageId: "standard", discountRate: 2, customHardwarePrice: 0, measurements: { width: 180, height: 262, panelWidth: 100, doorCount: 4, drawerCount: 2, shelfCount: 5 } },
        { id: "ROOM-3", name: "Yatak Odası", type: "bedroom", qualityId: "mdflam", hardwarePackageId: "standard", discountRate: 3, customHardwarePrice: 0, measurements: { wardrobeWidth: 240, dresserWidth: 120, nightstandCount: 2, headboardWidth: 180, height: 250, doorCount: 6, drawerCount: 6 } }
      ]
    }]
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(INITIAL_STATE);
      return Object.assign(clone(INITIAL_STATE), JSON.parse(raw));
    } catch (error) {
      return clone(INITIAL_STATE);
    }
  }

  const state = loadState();
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function getActiveProject() { return state.projects.find((project) => project.id === state.selectedProjectId) || state.projects[0]; }
  function allowedViews() { return ROLE_ACCESS[state.currentUser.role] || ["dashboard"]; }
  function ensureCurrentView() { if (!allowedViews().includes(state.currentView)) state.currentView = allowedViews()[0]; }
  function qualityById(id) { return state.qualities.find((item) => item.id === id) || state.qualities[0]; }
  function hardwareById(id) { return state.hardwarePackages.find((item) => item.id === id) || state.hardwarePackages[0]; }

  function roomMetrics(room) {
    const m = room.measurements || {};
    if (room.type === "kitchen") {
      const base = (m.baseRun || 0) / 100, upper = (m.upperRun || 0) / 100, tall = (m.tallRun || 0) / 100, island = (m.islandRun || 0) / 100, countertop = (m.countertopRun || 0) / 100, shelves = (m.openShelfRun || 0) / 100, doors = m.doorCount || 0, drawers = m.drawerCount || 0, lifts = m.liftCount || 0;
      return { carcassArea: base * 2.18 + upper * 1.36 + tall * 3.28 + island * 2.92 + shelves * 0.46, frontArea: base * 0.86 + upper * 0.72 + tall * 1.08 + island * 0.84, edgeBand: base * 10.2 + upper * 6.4 + tall * 12.2 + doors * 1.72 + drawers * 1.55, backPanelArea: base * 0.92 + tall * 0.84 + upper * 0.54, metretul: base + upper + tall + island, countertopMt: countertop + island, laborHours: base * 3.6 + upper * 2.8 + tall * 4.2 + island * 3.8 + drawers * 0.55 + doors * 0.28, hinges: doors * 2, drawers: drawers, rails: drawers, handles: doors + drawers, lifts: lifts };
    }
    if (room.type === "wardrobe") {
      const width = (m.width || 0) / 100, height = (m.height || 0) / 100, modules = m.moduleCount || 0, shelves = m.shelfCount || 0, doors = m.doorCount || 0, drawers = m.drawerCount || 0, sliding = m.slidingDoorCount || 0;
      return { carcassArea: width * height * 1.14 + modules * 1.42 + shelves * 0.34, frontArea: width * height * 0.78 + sliding * 1.56, edgeBand: width * 8.8 + shelves * 2.2 + doors * 1.2, backPanelArea: width * height * 0.82, metretul: width, countertopMt: 0, laborHours: width * 2.9 + height * 1.6 + modules * 1.1 + drawers * 0.4, hinges: doors * 2, drawers: drawers, rails: drawers, handles: doors + drawers, lifts: 0 };
    }
    if (room.type === "bathroom") {
      const base = (m.baseRun || 0) / 100, tall = (m.tallRun || 0) / 100, mirror = (m.mirrorRun || 0) / 100, doors = m.doorCount || 0, drawers = m.drawerCount || 0;
      return { carcassArea: base * 1.76 + tall * 2.68 + mirror * 0.72, frontArea: base * 0.58 + tall * 0.92 + mirror * 0.48, edgeBand: base * 7.4 + tall * 8.2 + doors * 1.5 + drawers * 1.2, backPanelArea: base * 0.62 + tall * 0.44, metretul: base + tall + mirror, countertopMt: base, laborHours: base * 2.6 + tall * 2.9 + drawers * 0.4 + doors * 0.22, hinges: doors * 2, drawers: drawers, rails: drawers, handles: doors + drawers, lifts: 0 };
    }
    if (room.type === "vestiyer") {
      const width = (m.width || 0) / 100, height = (m.height || 0) / 100, panel = (m.panelWidth || 0) / 100, shelves = m.shelfCount || 0, doors = m.doorCount || 0, drawers = m.drawerCount || 0;
      return { carcassArea: width * height * 0.94 + shelves * 0.24 + panel * height * 0.66, frontArea: width * height * 0.46 + panel * height * 0.26, edgeBand: width * 6.8 + shelves * 1.9 + doors * 1.26, backPanelArea: width * height * 0.42, metretul: width + panel, countertopMt: 0, laborHours: width * 2.3 + height * 1.2 + shelves * 0.16 + drawers * 0.38, hinges: doors * 2, drawers: drawers, rails: drawers, handles: doors + drawers, lifts: 0 };
    }
    if (room.type === "bedroom") {
      const wardrobe = (m.wardrobeWidth || 0) / 100, dresser = (m.dresserWidth || 0) / 100, nightstands = m.nightstandCount || 0, headboard = (m.headboardWidth || 0) / 100, height = (m.height || 0) / 100, doors = m.doorCount || 0, drawers = m.drawerCount || 0;
      return { carcassArea: wardrobe * height * 0.96 + dresser * 1.08 + nightstands * 0.82 + headboard * 0.44, frontArea: wardrobe * height * 0.48 + dresser * 0.36 + nightstands * 0.2 + headboard * 0.16, edgeBand: wardrobe * 7.2 + dresser * 4.2 + drawers * 1.22 + doors * 1.12, backPanelArea: wardrobe * height * 0.4 + headboard * 0.18, metretul: wardrobe + dresser + headboard, countertopMt: 0, laborHours: wardrobe * 2.8 + dresser * 1.4 + nightstands * 0.5 + headboard * 0.6, hinges: doors * 2, drawers: drawers, rails: drawers, handles: doors + drawers, lifts: 0 };
    }
    const desk = (m.deskRun || 0) / 100, archive = (m.archiveRun || 0) / 100, panel = (m.panelRun || 0) / 100, height = (m.height || 0) / 100, doors = m.doorCount || 0, drawers = m.drawerCount || 0;
    return { carcassArea: desk * 1.02 + archive * height * 0.86 + panel * height * 0.44, frontArea: archive * height * 0.4 + panel * 0.24, edgeBand: desk * 5.4 + archive * 6.8 + doors * 1.08, backPanelArea: archive * height * 0.38 + panel * 0.12, metretul: desk + archive + panel, countertopMt: desk, laborHours: desk * 1.7 + archive * 2.2 + panel * 0.6 + drawers * 0.22, hinges: doors * 2, drawers: drawers, rails: drawers, handles: doors + drawers, lifts: 0 };
  }

  function calculateRoom(room) {
    const quality = qualityById(room.qualityId), hardware = hardwareById(room.hardwarePackageId), metrics = roomMetrics(room);
    const carcassAreaWithWaste = metrics.carcassArea * (1 + quality.wasteRate), frontAreaWithWaste = metrics.frontArea * (1 + quality.wasteRate / 2);
    const sheetAreaTotal = carcassAreaWithWaste * state.chamber.carcassUsageRatio + frontAreaWithWaste * quality.frontMultiplier;
    const sheetCount = sheetAreaTotal / state.chamber.sheetArea, rawMaterialCost = sheetCount * quality.chamberSheetPrice, backPanelCost = metrics.backPanelArea * state.chamber.backPanelSqmPrice, edgeBandCost = metrics.edgeBand * state.chamber.edgeBandMtPrice;
    const hardwareCost = metrics.hinges * hardware.hingePrice + metrics.drawers * hardware.drawerPrice + metrics.rails * hardware.railPrice + metrics.handles * hardware.handlePrice + metrics.lifts * hardware.liftPrice + Number(room.customHardwarePrice || 0);
    const laborCost = metrics.laborHours * state.chamber.laborHourlyRate * quality.laborMultiplier, installationCost = (metrics.carcassArea + metrics.frontArea) * state.chamber.installationRate, packagingCost = (metrics.carcassArea + metrics.frontArea) * state.chamber.packagingRate;
    const directCost = rawMaterialCost + backPanelCost + edgeBandCost + hardwareCost + laborCost + installationCost + packagingCost, overhead = directCost * state.chamber.overheadRate, chamberMargin = (directCost + overhead) * state.chamber.chamberMarginRate, officialPrice = directCost + overhead + chamberMargin, roomDiscount = officialPrice * ((Number(room.discountRate || 0) || 0) / 100);
    return {
      quality: quality,
      hardware: hardware,
      metrics: { panelM2: round(metrics.carcassArea + metrics.frontArea), carcassM2: round(metrics.carcassArea), frontM2: round(metrics.frontArea), metretul: round(metrics.metretul), edgeBandMt: round(metrics.edgeBand), backPanelM2: round(metrics.backPanelArea), countertopMt: round(metrics.countertopMt), laborHours: round(metrics.laborHours), sheetCount: round(sheetCount), wasteRatio: percent(quality.wasteRate) },
      costs: { rawMaterialCost: round(rawMaterialCost), backPanelCost: round(backPanelCost), edgeBandCost: round(edgeBandCost), hardwareCost: round(hardwareCost), laborCost: round(laborCost), installationCost: round(installationCost), packagingCost: round(packagingCost), directCost: round(directCost) },
      officialPrice: round(officialPrice),
      roomDiscount: round(roomDiscount),
      dealerPrice: round(officialPrice - roomDiscount)
    };
  }

  function calculateProject(project) {
    const roomResults = project.rooms.map(calculateRoom);
    const serviceTotals = project.services.map((line) => {
      const service = state.servicesCatalog.find((item) => item.id === line.id), quantity = Number(line.quantity || 0);
      return { id: line.id, name: service ? service.name : line.id, unit: service ? service.unit : "adet", quantity: quantity, total: round(quantity * (service ? service.price : 0)) };
    }).filter((item) => item.quantity > 0);
    const officialRoomTotal = roomResults.reduce((sum, room) => sum + room.officialPrice, 0), roomDiscountTotal = roomResults.reduce((sum, room) => sum + room.roomDiscount, 0), servicesTotal = serviceTotals.reduce((sum, service) => sum + service.total, 0), officialGrandTotal = officialRoomTotal + servicesTotal, producerDiscount = officialRoomTotal * ((Number(project.producerDiscountRate || 0) || 0) / 100), generalDiscountAmount = Number(project.generalDiscountAmount || 0), totalDiscount = roomDiscountTotal + producerDiscount + generalDiscountAmount, dealerGrandTotal = officialGrandTotal - totalDiscount, totalPanelM2 = roomResults.reduce((sum, room) => sum + room.metrics.panelM2, 0), totalMt = roomResults.reduce((sum, room) => sum + room.metrics.metretul, 0), totalSheetCount = roomResults.reduce((sum, room) => sum + room.metrics.sheetCount, 0), directCostTotal = roomResults.reduce((sum, room) => sum + room.costs.directCost, 0), minimumRecommendedPrice = directCostTotal * (1 + state.chamber.minimumProfitRate), grossProfit = dealerGrandTotal - directCostTotal - servicesTotal, grossProfitRate = dealerGrandTotal > 0 ? (grossProfit / dealerGrandTotal) * 100 : 0;
    return { roomResults: roomResults, serviceTotals: serviceTotals, totals: { officialRoomTotal: round(officialRoomTotal), servicesTotal: round(servicesTotal), officialGrandTotal: round(officialGrandTotal), roomDiscountTotal: round(roomDiscountTotal), producerDiscount: round(producerDiscount), generalDiscountAmount: round(generalDiscountAmount), totalDiscount: round(totalDiscount), dealerGrandTotal: round(dealerGrandTotal), totalPanelM2: round(totalPanelM2), totalMt: round(totalMt), totalSheetCount: round(totalSheetCount), directCostTotal: round(directCostTotal), minimumRecommendedPrice: round(minimumRecommendedPrice), grossProfit: round(grossProfit), grossProfitRate: round(grossProfitRate) } };
  }

  function buildInsights(project, calculation) {
    const insights = [];
    if (calculation.totals.dealerGrandTotal < calculation.totals.minimumRecommendedPrice) insights.push({ level: "danger", title: "İskonto güvenli eşiğin altına indi", text: "Nihai teklif, minimum sürdürülebilir karlılık sınırının altında görünüyor." });
    else if (calculation.totals.grossProfitRate < state.chamber.minimumProfitRate * 100 + 2) insights.push({ level: "warning", title: "Kar marjı sınırda", text: "Hırdavat paketi veya ücretsiz servis kalemleri tekrar değerlendirilebilir." });
    else insights.push({ level: "success", title: "Teklif dengeli", text: "Resmi oda fiyatı korunurken satış tarafı güvenli marj bandında kaldı." });
    if (calculation.totals.totalSheetCount > 18) insights.push({ level: "warning", title: "Levha tüketimi yüksek", text: "Kesim optimizasyonu ve modül tekrarları planlanırsa ham madde verimi artar." });
    const premiumRoomCount = calculation.roomResults.filter((room) => ["high-gloss", "akrilik", "membran", "lake", "glassmax"].includes(room.quality.id)).length;
    if (premiumRoomCount >= Math.ceil(project.rooms.length / 2)) insights.push({ level: "accent", title: "Premium kalite yoğunluğu yüksek", text: "Çizik koruma, teslimat ambalajı ve yüzey bakım şartları sözleşmede ayrıca belirtilmeli." });
    insights.push({ level: "accent", title: "Akıllı özet", text: project.rooms.length + " oda için resmi oda fiyatı, indirimli mağaza teklifi ve müşteri belgesi ayrı üretildi." });
    return insights;
  }

  function icon(name) {
    const paths = {
      dashboard: '<path d="M5 5h6v6H5zM13 5h6v10h-6zM5 13h6v6H5zM13 17h6v2h-6z"></path>',
      projects: '<path d="M6 4h9l5 5v11H6z"></path><path d="M15 4v5h5"></path><path d="M9 13h8M9 17h5"></path>',
      catalog: '<path d="M5 7h14M7 4h10a2 2 0 0 1 2 2v12H5V6a2 2 0 0 1 2-2z"></path><path d="M8 11h8M8 15h6"></path>',
      users: '<path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"></path><path d="M4 20a8 8 0 0 1 16 0"></path>',
      contracts: '<path d="M7 4h10l3 3v13H7z"></path><path d="M17 4v3h3"></path><path d="M10 12h7M10 16h7"></path>',
      customer: '<path d="M12 4l7 3v5c0 4.5-2.8 7.7-7 9-4.2-1.3-7-4.5-7-9V7z"></path><path d="M9 12l2 2 4-4"></path>',
      spark: '<path d="M12 2l1.7 4.8L18 8.5l-4.3 1.7L12 15l-1.7-4.8L6 8.5l4.3-1.7z"></path>',
      plus: '<path d="M12 5v14M5 12h14"></path>',
      print: '<path d="M7 9V4h10v5"></path><path d="M7 14H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"></path><path d="M7 12h10v8H7z"></path>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.spark) + "</g></svg>";
  }
  function badge(label, variant) { return '<span class="tag ' + (variant || "accent") + '">' + label + "</span>"; }

  const els = {
    pageTitle: document.querySelector("#pageTitle"),
    statusText: document.querySelector("#statusText"),
    heroBadges: document.querySelector("#heroBadges"),
    heroPanel: document.querySelector("#heroPanel"),
    statsGrid: document.querySelector("#statsGrid"),
    viewContainer: document.querySelector("#viewContainer"),
    sidebarNav: document.querySelector("#sidebarNav"),
    bottomNav: document.querySelector("#bottomNav"),
    sessionInfo: document.querySelector("#sessionInfo"),
    loginDialog: document.querySelector("#loginDialog"),
    loginForm: document.querySelector("#loginForm"),
    demoGrid: document.querySelector("#demoGrid"),
    loginUsername: document.querySelector("#loginUsername"),
    loginPassword: document.querySelector("#loginPassword"),
    openLoginBtn: document.querySelector("#openLoginBtn"),
    newProjectBtn: document.querySelector("#newProjectBtn"),
    saveStateBtn: document.querySelector("#saveStateBtn"),
    printContractBtn: document.querySelector("#printContractBtn")
  };

  function navButton(item) {
    const active = item.id === state.currentView ? " active" : "";
    return '<button class="nav-button' + active + '" data-view="' + item.id + '"><span class="nav-left"><span class="nav-icon">' + icon(item.id) + "</span><span>" + item.label + '</span></span><span class="nav-right">Açık</span></button>';
  }

  function bottomButton(item) {
    const active = item.id === state.currentView ? " active" : "";
    return '<button class="bottom-nav-button' + active + '" data-view="' + item.id + '"><span class="nav-icon">' + icon(item.id) + "</span><span>" + item.short + "</span></button>";
  }

  function renderNavigation() {
    const items = NAV_ITEMS.filter((item) => allowedViews().includes(item.id));
    els.sidebarNav.innerHTML = items.map(navButton).join("");
    els.bottomNav.innerHTML = items.map(bottomButton).join("");
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", function () {
        state.currentView = this.dataset.view;
        render();
      });
    });
  }

  function renderSessionInfo() {
    els.sessionInfo.innerHTML = '<div class="session-chip">' + icon("users") + "<strong>" + state.currentUser.fullName + '</strong></div><p class="muted">' + ROLE_LABELS[state.currentUser.role] + " · " + state.currentUser.company + "</p>";
  }

  function renderHero() {
    const project = getActiveProject();
    const calculation = calculateProject(project);
    els.heroBadges.innerHTML = badge("Resmi oda fiyatı görünür", "success") + badge("Akıllı ölçü ve maliyet motoru") + badge("Mobil uygulama hissi", "warning");
    els.heroPanel.innerHTML =
      "<header><div><p class='section-kicker'>Canlı Özet</p><h3>" + project.projectName + "</h3></div>" + badge(project.contractCode, "accent") + "</header>" +
      "<div class='summary-list'>" +
      "<div class='summary-row primary'><div><span class='muted'>Oda resmi toplamı</span><div class='summary-value'>" + formatCurrency(calculation.totals.officialGrandTotal) + "</div></div>" + icon("spark") + "</div>" +
      "<div class='summary-row secondary'><div><span class='muted'>Mobilyacı nihai teklifi</span><div class='summary-value'>" + formatCurrency(calculation.totals.dealerGrandTotal) + "</div></div>" + icon("projects") + "</div>" +
      "<div class='summary-row'><span>Toplam panel alanı</span><strong>" + formatNumber(calculation.totals.totalPanelM2, " m²") + "</strong></div>" +
      "<div class='summary-row'><span>Toplam metretül</span><strong>" + formatNumber(calculation.totals.totalMt, " mt") + "</strong></div>" +
      "<div class='summary-row'><span>Ham madde levha tahmini</span><strong>" + formatNumber(calculation.totals.totalSheetCount, " levha") + "</strong></div></div>";
  }

  function renderStats() {
    const project = getActiveProject();
    const calculation = calculateProject(project);
    const metrics = [
      { title: "Aktif Proje", value: state.projects.length, caption: "Teklif merkezi içindeki kayıt", meta: project.projectName + " seçili" },
      { title: "Toplam Oda", value: project.rooms.length, caption: "Fiyatlanan bağımsız alan", meta: formatNumber(calculation.totals.totalMt, " mt") + " metretül" },
      { title: "İndirim Toplamı", value: formatCurrency(calculation.totals.totalDiscount), caption: "Uygulanan mağaza indirimi", meta: formatNumber(calculation.totals.grossProfitRate, "%") + " brüt karlılık" },
      { title: "Direkt Maliyet", value: formatCurrency(calculation.totals.directCostTotal), caption: "Ham madde + işçilik + hırdavat", meta: formatCurrency(calculation.totals.minimumRecommendedPrice) + " altına inilmemeli" }
    ];
    els.statsGrid.innerHTML = metrics.map((metric) => "<article class='metric-card'><span>" + metric.title + "</span><strong>" + metric.value + "</strong><span>" + metric.caption + "</span><div class='metric-meta'>" + metric.meta + "</div></article>").join("");
  }

  function renderDashboard() {
    const project = getActiveProject();
    const calculation = calculateProject(project);
    const insights = buildInsights(project, calculation);
    return (
      "<div class='grid-two'>" +
      "<article class='surface-card'><header><div><p class='section-kicker'>Teklif Stratejisi</p><h3>Akıllı karar alanı</h3></div>" + badge("AI destekli", "accent") + "</header><div class='panel-list'>" +
      insights.map((insight) => {
        const label = insight.level === "danger" ? "Risk" : insight.level === "warning" ? "Dikkat" : insight.level === "success" ? "Uygun" : "Öneri";
        return "<div class='insight-row'><div class='room-head'><strong>" + insight.title + "</strong>" + badge(label, insight.level) + "</div><p class='muted'>" + insight.text + "</p></div>";
      }).join("") +
      "</div></article>" +
      "<article class='summary-card'><header><div><p class='section-kicker'>Müşteri Güveni</p><h3>Resmi fiyat ayrıştırması</h3></div>" + badge("Şeffaf", "success") + "</header><div class='summary-list'>" +
      "<div class='summary-row'><span>Oda resmi oda toplamı</span><strong>" + formatCurrency(calculation.totals.officialRoomTotal) + "</strong></div>" +
      "<div class='summary-row'><span>Hizmet ve proje kalemleri</span><strong>" + formatCurrency(calculation.totals.servicesTotal) + "</strong></div>" +
      "<div class='summary-row'><span>Mobilyacı indirimi</span><strong>" + formatCurrency(calculation.totals.totalDiscount) + "</strong></div>" +
      "<div class='summary-row primary'><span>Müşteriye gösterilen resmi fiyat</span><strong>" + formatCurrency(calculation.totals.officialGrandTotal) + "</strong></div>" +
      "<div class='summary-row secondary'><span>Mobilyacının verdiği nihai teklif</span><strong>" + formatCurrency(calculation.totals.dealerGrandTotal) + "</strong></div></div></article></div>" +
      "<div class='grid-two'>" +
      "<article class='surface-card'><header><div><p class='section-kicker'>Kalite Dağılımı</p><h3>Oda kırılımı</h3></div></header><div class='panel-list'>" +
      calculation.roomResults.map((result, index) => {
        const room = project.rooms[index];
        return "<div class='price-row'><div><strong>" + room.name + "</strong><div class='muted'>" + result.quality.name + " · " + result.hardware.name + "</div></div><div><strong>" + formatCurrency(result.officialPrice) + "</strong></div></div>";
      }).join("") +
      "</div></article>" +
      "<article class='surface-card'><header><div><p class='section-kicker'>Kullanıcı Zinciri</p><h3>Sistem akışı</h3></div></header><div class='panel-list'>" +
      "<div class='room-card'><strong>1. Oda Yönetimi</strong><p class='muted'>Kalite fiyatlarını, kullanıcıları ve genel kuralları belirler.</p></div>" +
      "<div class='room-card'><strong>2. Mobilyacı</strong><p class='muted'>Ölçü girer, kalite seçer, hırdavat ve iskonto uygular.</p></div>" +
      "<div class='room-card'><strong>3. Müşteri</strong><p class='muted'>Resmi oda fiyatı ile mağaza teklifini aynı belgede görür.</p></div>" +
      "</div></article></div>"
    );
  }

  function renderRoomCard(project, room, result) {
    const template = ROOM_TEMPLATES[room.type];
    return (
      "<article class='room-card'><div class='room-head'><div><div class='room-name'>" + room.name + "</div><div class='muted'>" + template.label + " · " + result.quality.name + " · " + result.hardware.name + "</div></div>" + badge(formatCurrency(result.officialPrice), "success") + "</div>" +
      "<div class='compact-grid three'>" +
      "<label><span>Oda adı</span><input data-room-name='" + room.id + "' value='" + room.name + "' /></label>" +
      "<label><span>Oda tipi</span><select data-room-type='" + room.id + "'>" + Object.keys(ROOM_TEMPLATES).map((key) => "<option value='" + key + "'" + (room.type === key ? " selected" : "") + ">" + ROOM_TEMPLATES[key].label + "</option>").join("") + "</select></label>" +
      "<label><span>Kalite</span><select data-room-quality='" + room.id + "'>" + state.qualities.map((quality) => "<option value='" + quality.id + "'" + (room.qualityId === quality.id ? " selected" : "") + ">" + quality.name + "</option>").join("") + "</select></label></div>" +
      "<div class='compact-grid three'>" +
      "<label><span>Hırdavat paketi</span><select data-room-hardware='" + room.id + "'>" + state.hardwarePackages.map((pkg) => "<option value='" + pkg.id + "'" + (room.hardwarePackageId === pkg.id ? " selected" : "") + ">" + pkg.name + "</option>").join("") + "</select></label>" +
      "<label><span>Oda bazlı iskonto %</span><input data-room-discount='" + room.id + "' type='number' min='0' step='0.1' value='" + room.discountRate + "' /></label>" +
      "<label><span>Ek hırdavat bedeli</span><input data-room-custom-hardware='" + room.id + "' type='number' min='0' step='50' value='" + (room.customHardwarePrice || 0) + "' /></label></div>" +
      "<div class='data-grid'>" + template.fields.map((field) => "<label><span>" + field.label + " (" + field.unit + ")</span><input data-room-measure='" + room.id + "' data-field='" + field.key + "' type='number' min='0' step='0.1' value='" + (room.measurements[field.key] != null ? room.measurements[field.key] : field.default) + "' /></label>").join("") + "</div>" +
      "<div class='mini-grid'>" +
      "<div class='mini-point'><span class='muted'>Toplam panel</span><strong>" + formatNumber(result.metrics.panelM2, " m²") + "</strong></div>" +
      "<div class='mini-point'><span class='muted'>Metretül</span><strong>" + formatNumber(result.metrics.metretul, " mt") + "</strong></div>" +
      "<div class='mini-point'><span class='muted'>Levha tahmini</span><strong>" + formatNumber(result.metrics.sheetCount, " levha") + "</strong></div></div>" +
      "<div class='summary-list'><div class='price-row official'><span>Oda resmi fiyatı</span><strong>" + formatCurrency(result.officialPrice) + "</strong></div><div class='price-row discounted'><span>Mobilyacı oda teklifi</span><strong>" + formatCurrency(result.dealerPrice) + "</strong></div></div>" +
      "<div class='inline-actions'><button class='ghost-button' data-duplicate-room='" + room.id + "'>Odayı Kopyala</button><button class='danger-button' data-remove-room='" + room.id + "'" + (project.rooms.length === 1 ? " disabled" : "") + ">Odayı Sil</button></div></article>"
    );
  }

  function renderProjects() {
    const project = getActiveProject();
    const calculation = calculateProject(project);
    return (
      "<section class='panel-list'><div class='wizard-grid'>" +
      "<article class='summary-card'><header><div><p class='section-kicker'>Teklif Merkezi</p><h3>Proje tanımı ve genel ayarlar</h3></div>" + badge(project.contractCode, "accent") + "</header><div class='form-grid'>" +
      "<label><span>Proje adı</span><input id='projectNameInput' value='" + project.projectName + "' /></label>" +
      "<label><span>Müşteri adı</span><input id='customerNameInput' value='" + project.customerName + "' /></label>" +
      "<label><span>Müşteri telefonu</span><input id='customerPhoneInput' value='" + (project.customerPhone || "") + "' /></label>" +
      "<label><span>Mobilyacı / üretici</span><input id='merchantNameInput' value='" + project.merchantName + "' /></label>" +
      "<label><span>Adres</span><input id='projectAddressInput' value='" + (project.projectAddress || "") + "' /></label>" +
      "<label><span>Genel indirim %</span><input id='producerDiscountInput' type='number' min='0' step='0.1' value='" + project.producerDiscountRate + "' /></label>" +
      "<label><span>Ek manuel indirim</span><input id='generalDiscountAmountInput' type='number' min='0' step='50' value='" + (project.generalDiscountAmount || 0) + "' /></label>" +
      "<label><span>Seçili proje</span><select id='projectSelect'>" + state.projects.map((item) => "<option value='" + item.id + "'" + (item.id === project.id ? " selected" : "") + ">" + item.projectName + "</option>").join("") + "</select></label></div>" +
      "<label><span>Notlar</span><textarea id='projectNotesInput'>" + (project.notes || "") + "</textarea></label>" +
      "<div class='quick-actions'><button class='primary-button' id='addKitchenRoomBtn'>" + icon("plus") + " Mutfak Ekle</button><button class='ghost-button' id='addWardrobeRoomBtn'>Gardırop Ekle</button><button class='ghost-button' id='addBathroomRoomBtn'>Banyo Ekle</button><button class='ghost-button' id='addVestiyerRoomBtn'>Vestiyer Ekle</button></div></article>" +
      "<article class='summary-card'><header><div><p class='section-kicker'>Canlı Finans</p><h3>Teklif özeti</h3></div>" + badge("Anlık", "success") + "</header><div class='summary-list'>" +
      "<div class='summary-row'><span>Oda resmi oda toplamı</span><strong>" + formatCurrency(calculation.totals.officialRoomTotal) + "</strong></div>" +
      "<div class='summary-row'><span>Hizmet ve ekstra kalemler</span><strong>" + formatCurrency(calculation.totals.servicesTotal) + "</strong></div>" +
      "<div class='summary-row'><span>İndirimler toplamı</span><strong>" + formatCurrency(calculation.totals.totalDiscount) + "</strong></div>" +
      "<div class='summary-row primary'><span>Müşteriye gösterilecek resmi fiyat</span><strong>" + formatCurrency(calculation.totals.officialGrandTotal) + "</strong></div>" +
      "<div class='summary-row secondary'><span>Mobilyacının nihai teklifi</span><strong>" + formatCurrency(calculation.totals.dealerGrandTotal) + "</strong></div></div><div class='bar-track'><div class='bar-fill' style='width:" + Math.min(Math.max(calculation.totals.grossProfitRate, 0), 100) + "%'></div></div><p class='form-hint'>Oda resmi fiyatı her zaman görünür kalır. İskonto ikinci toplam olarak izlenir.</p></article></div>" +
      "<article class='summary-card'><header><div><p class='section-kicker'>Hizmet ve Ekstra Kalemler</p><h3>Projeye dahil edilen servisler</h3></div></header><div class='form-grid'>" +
      state.servicesCatalog.map((service) => {
        const line = project.services.find((item) => item.id === service.id) || { quantity: 0 };
        return "<label><span>" + service.name + " (" + service.unit + ")</span><input data-service-quantity='" + service.id + "' type='number' min='0' step='" + (service.unit === "mt" ? "0.1" : "1") + "' value='" + line.quantity + "' /></label>";
      }).join("") +
      "</div></article>" +
      "<article class='table-card'><header><div><p class='section-kicker'>Oda Bazlı Ölçü ve Fiyat</p><h3>Metrekare, metretül ve maliyet motoru</h3></div>" + badge(project.rooms.length + " oda", "accent") + "</header><div class='room-list'>" +
      calculation.roomResults.map((result, index) => renderRoomCard(project, project.rooms[index], result)).join("") +
      "</div></article></section>"
    );
  }

  function renderCatalog() {
    return (
      "<div class='grid-two'><article class='catalog-card'><header><div><p class='section-kicker'>Oda Kalite Kataloğu</p><h3>Resmi kalite fiyatları</h3></div>" + badge("Yönetim Alanı", "accent") + "</header><div class='catalog-list'>" +
      state.qualities.map((quality) => "<div class='catalog-row'><div class='catalog-head'><div><div class='catalog-name'>" + quality.name + "</div><div class='muted'>" + quality.category + " · " + quality.note + "</div></div>" + badge(formatCurrency(quality.chamberSheetPrice), "success") + "</div><div class='compact-grid three'><label><span>Levha fiyatı</span><input data-quality-price='" + quality.id + "' type='number' min='0' step='50' value='" + quality.chamberSheetPrice + "' /></label><label><span>Ön yüz çarpanı</span><input data-quality-front='" + quality.id + "' type='number' min='0.1' step='0.01' value='" + quality.frontMultiplier + "' /></label><label><span>Fire oranı</span><input data-quality-waste='" + quality.id + "' type='number' min='0' step='0.01' value='" + quality.wasteRate + "' /></label></div></div>").join("") +
      "</div></article><div class='panel-list'><article class='catalog-card'><header><div><p class='section-kicker'>Hırdavat Paketleri</p><h3>Paket maliyet şablonu</h3></div></header><div class='catalog-list'>" +
      state.hardwarePackages.map((pkg) => "<div class='catalog-row'><div class='catalog-head'><div class='catalog-name'>" + pkg.name + "</div>" + badge("Canlı", "accent") + "</div><div class='compact-grid three'><label><span>Menteşe</span><input data-hardware-hinge='" + pkg.id + "' type='number' min='0' step='5' value='" + pkg.hingePrice + "' /></label><label><span>Çekmece</span><input data-hardware-drawer='" + pkg.id + "' type='number' min='0' step='10' value='" + pkg.drawerPrice + "' /></label><label><span>Kulp</span><input data-hardware-handle='" + pkg.id + "' type='number' min='0' step='5' value='" + pkg.handlePrice + "' /></label></div></div>").join("") +
      "</div></article><article class='catalog-card'><header><div><p class='section-kicker'>Oda Yönetim Ayarları</p><h3>Genel kurallar</h3></div></header><div class='form-grid'><label><span>Oda adı</span><input id='chamberNameInput' value='" + state.chamber.chamberName + "' /></label><label><span>Marj oranı</span><input id='chamberMarginInput' type='number' min='0' step='0.01' value='" + state.chamber.chamberMarginRate + "' /></label><label><span>Genel gider oranı</span><input id='overheadRateInput' type='number' min='0' step='0.01' value='" + state.chamber.overheadRate + "' /></label><label><span>Saatlik işçilik</span><input id='laborHourlyRateInput' type='number' min='0' step='5' value='" + state.chamber.laborHourlyRate + "' /></label><label><span>Kenar bandı mt fiyatı</span><input id='edgeBandRateInput' type='number' min='0' step='1' value='" + state.chamber.edgeBandMtPrice + "' /></label><label><span>Arkalık m² fiyatı</span><input id='backPanelRateInput' type='number' min='0' step='1' value='" + state.chamber.backPanelSqmPrice + "' /></label></div></article></div></div>"
    );
  }

  function renderUsers() {
    return (
      "<div class='grid-two'><article class='table-card'><header><div><p class='section-kicker'>Kullanıcı Yönetimi</p><h3>Rol, kullanıcı adı ve şifreler</h3></div>" + badge(state.users.length + " kullanıcı", "accent") + "</header><div class='catalog-list'>" +
      state.users.map((user) => "<div class='user-card'><div class='user-head'><div><div class='user-name'>" + user.fullName + "</div><div class='muted'>" + ROLE_LABELS[user.role] + " · " + user.company + "</div></div>" + badge(user.username, "success") + "</div><div class='compact-grid three'><label><span>Ad Soyad</span><input data-user-full-name='" + user.id + "' value='" + user.fullName + "' /></label><label><span>Kullanıcı adı</span><input data-user-username='" + user.id + "' value='" + user.username + "' /></label><label><span>Şifre</span><input data-user-password='" + user.id + "' value='" + user.password + "' /></label></div><div class='compact-grid three'><label><span>Rol</span><select data-user-role='" + user.id + "'>" + Object.keys(ROLE_LABELS).map((roleKey) => "<option value='" + roleKey + "'" + (user.role === roleKey ? " selected" : "") + ">" + ROLE_LABELS[roleKey] + "</option>").join("") + "</select></label><label><span>Firma</span><input data-user-company='" + user.id + "' value='" + user.company + "' /></label><div class='inline-actions'><button class='danger-button' data-user-remove='" + user.id + "'" + (state.users.length <= 1 ? " disabled" : "") + ">Kullanıcıyı Sil</button></div></div></div>").join("") +
      "</div></article><article class='summary-card'><header><div><p class='section-kicker'>Yeni Kullanıcı</p><h3>Hızlı tanım ekranı</h3></div></header><div class='user-grid'><label><span>Ad Soyad</span><input id='newUserName' placeholder='Örn: Ahmet Usta' /></label><label><span>Kullanıcı adı</span><input id='newUsername' placeholder='Örn: ahmetusta' /></label><label><span>Şifre</span><input id='newUserPassword' placeholder='Şifre' /></label><label><span>Rol</span><select id='newUserRole'><option value='producer'>Mobilyacı</option><option value='admin'>Oda Yönetimi</option><option value='customer'>Müşteri</option></select></label><label><span>Firma</span><input id='newUserCompany' placeholder='Firma / Kurum' /></label></div><div class='inline-actions'><button class='primary-button' id='createUserBtn'>Kullanıcı Oluştur</button></div></article></div>"
    );
  }

  function renderContracts() {
    const project = getActiveProject();
    const calculation = calculateProject(project);
    return (
      "<article class='contract-card'><header><div><p class='section-kicker'>Taslak Sözleşme</p><h3>Müşteriye verilecek resmi şeffaf belge</h3></div><div class='contract-actions'>" + badge(project.contractCode, "accent") + "<button class='primary-button' id='printInlineBtn'>" + icon("print") + " Yazdır</button></div></header>" +
      "<section class='contract-banner'><strong>" + state.chamber.chamberName + "</strong><div class='muted'>Bu sözleşmede oda resmi fiyatı ayrı, mobilyacı tarafından uygulanan indirimli teklif ayrı gösterilir.</div></section>" +
      "<div class='contract-grid'><div class='contract-cell'><span class='muted'>Proje</span><strong>" + project.projectName + "</strong></div><div class='contract-cell'><span class='muted'>Müşteri</span><strong>" + project.customerName + "</strong></div><div class='contract-cell'><span class='muted'>Mobilyacı</span><strong>" + project.merchantName + "</strong></div><div class='contract-cell'><span class='muted'>Düzenlenme Tarihi</span><strong>" + state.chamber.updatedAt + "</strong></div></div>" +
      "<div class='table-scroll'><table><thead><tr><th>Oda</th><th>Kalite</th><th>Panel</th><th>Metretül</th><th>Resmi Oda Fiyatı</th><th>Mobilyacı Teklifi</th></tr></thead><tbody>" +
      calculation.roomResults.map((roomResult, index) => {
        const room = project.rooms[index];
        return "<tr><td>" + room.name + "</td><td>" + roomResult.quality.name + "</td><td>" + formatNumber(roomResult.metrics.panelM2, " m²") + "</td><td>" + formatNumber(roomResult.metrics.metretul, " mt") + "</td><td>" + formatCurrency(roomResult.officialPrice) + "</td><td>" + formatCurrency(roomResult.dealerPrice) + "</td></tr>";
      }).join("") +
      "</tbody></table></div><div class='summary-list'><div class='summary-row primary'><span>Oda resmi toplam fiyat</span><strong>" + formatCurrency(calculation.totals.officialGrandTotal) + "</strong></div><div class='summary-row'><span>Mobilyacı indirim toplamı</span><strong>" + formatCurrency(calculation.totals.totalDiscount) + "</strong></div><div class='summary-row secondary'><span>Mobilyacı nihai teklif fiyatı</span><strong>" + formatCurrency(calculation.totals.dealerGrandTotal) + "</strong></div></div><p class='contract-note'>Gerçek üretim çizimi hazırlandığında net hırdavat ve montaj detayları yeniden güncellenebilir.</p><div class='contract-signatures'><div class='contract-sign'>Oda Yetkilisi</div><div class='contract-sign'>Mobilyacı / Üretici</div><div class='contract-sign'>Müşteri</div></div></article>"
    );
  }

  function renderCustomer() {
    const project = getActiveProject();
    const calculation = calculateProject(project);
    return (
      "<div class='grid-two'><article class='customer-card'><header><div><p class='section-kicker'>Müşteri Ekranı</p><h3>Teklif doğrulama ve güven ekranı</h3></div>" + badge("Şeffaf fiyat", "success") + "</header><div class='customer-summary'><div class='room-card'><div class='customer-head'><div><strong>" + project.projectName + "</strong><div class='muted'>" + project.customerName + " · " + project.contractCode + "</div></div>" + badge(project.merchantName, "accent") + "</div><p class='muted'>Oda resmi fiyatı ile mobilyacı teklifinin neden farklı olduğunu açık biçimde göstermek için hazırlanmıştır.</p></div><div class='price-row official'><span>Yokuş Mobilyacılar Odası resmi fiyatı</span><strong>" + formatCurrency(calculation.totals.officialGrandTotal) + "</strong></div><div class='price-row'><span>Mobilyacı toplam indirimi</span><strong>" + formatCurrency(calculation.totals.totalDiscount) + "</strong></div><div class='price-row discounted'><span>Mobilyacının size sunduğu fiyat</span><strong>" + formatCurrency(calculation.totals.dealerGrandTotal) + "</strong></div>" +
      calculation.roomResults.map((roomResult, index) => {
        const room = project.rooms[index];
        return "<div class='room-card'><div class='customer-head'><div><strong>" + room.name + "</strong><div class='muted'>" + roomResult.quality.name + " · " + formatNumber(roomResult.metrics.panelM2, " m²") + " panel</div></div>" + badge(formatCurrency(roomResult.officialPrice), "success") + "</div></div>";
      }).join("") +
      "</div></article><article class='customer-card'><header><div><p class='section-kicker'>Neden Fark Oluşur?</p><h3>Açıklama kutusu</h3></div></header><div class='panel-list'><div class='room-card'><strong>1. Oda resmi fiyatı standarttır</strong><p class='muted'>Bu fiyat, oda yönetiminin belirlediği baz malzeme, işçilik ve genel gider kuralları ile hesaplanır.</p></div><div class='room-card'><strong>2. Mobilyacı indirim uygulayabilir</strong><p class='muted'>Esnaf kendi ticari kararıyla iskonto yapabilir. Sistem bunu resmi fiyattan ayrı satırda gösterir.</p></div><div class='room-card'><strong>3. Güven duygusu korunur</strong><p class='muted'>Müşteri, resmi fiyatı görünce farkın yüksek yazımdan değil indirimden geldiğini net biçimde görür.</p></div></div></article></div>"
    );
  }

  function renderView() {
    ensureCurrentView();
    const titles = { dashboard: "Ana Panel", projects: "Teklif Merkezi", catalog: "Oda Fiyatları", users: "Kullanıcı Yönetimi", contracts: "Taslak Sözleşme", customer: "Müşteri Ekranı" };
    els.pageTitle.textContent = titles[state.currentView] || "Ana Panel";
    if (state.currentView === "dashboard") return renderDashboard();
    if (state.currentView === "projects") return renderProjects();
    if (state.currentView === "catalog") return renderCatalog();
    if (state.currentView === "users") return renderUsers();
    if (state.currentView === "contracts") return renderContracts();
    return renderCustomer();
  }

  function bindProjects() {
    const project = getActiveProject();
    const byId = (selector) => document.querySelector(selector);
    byId("#projectNameInput") && byId("#projectNameInput").addEventListener("input", (event) => { project.projectName = event.target.value; render(); });
    byId("#customerNameInput") && byId("#customerNameInput").addEventListener("input", (event) => { project.customerName = event.target.value; render(); });
    byId("#customerPhoneInput") && byId("#customerPhoneInput").addEventListener("input", (event) => { project.customerPhone = event.target.value; saveState(); });
    byId("#merchantNameInput") && byId("#merchantNameInput").addEventListener("input", (event) => { project.merchantName = event.target.value; render(); });
    byId("#projectAddressInput") && byId("#projectAddressInput").addEventListener("input", (event) => { project.projectAddress = event.target.value; saveState(); });
    byId("#producerDiscountInput") && byId("#producerDiscountInput").addEventListener("input", (event) => { project.producerDiscountRate = Number(event.target.value || 0); render(); });
    byId("#generalDiscountAmountInput") && byId("#generalDiscountAmountInput").addEventListener("input", (event) => { project.generalDiscountAmount = Number(event.target.value || 0); render(); });
    byId("#projectNotesInput") && byId("#projectNotesInput").addEventListener("input", (event) => { project.notes = event.target.value; saveState(); });
    byId("#projectSelect") && byId("#projectSelect").addEventListener("change", (event) => { state.selectedProjectId = event.target.value; render(); });
    const addRoom = (type) => { project.rooms.push(defaultRoom(type, project.rooms.length + 1)); render(); };
    byId("#addKitchenRoomBtn") && byId("#addKitchenRoomBtn").addEventListener("click", () => addRoom("kitchen"));
    byId("#addWardrobeRoomBtn") && byId("#addWardrobeRoomBtn").addEventListener("click", () => addRoom("wardrobe"));
    byId("#addBathroomRoomBtn") && byId("#addBathroomRoomBtn").addEventListener("click", () => addRoom("bathroom"));
    byId("#addVestiyerRoomBtn") && byId("#addVestiyerRoomBtn").addEventListener("click", () => addRoom("vestiyer"));
    document.querySelectorAll("[data-service-quantity]").forEach((input) => input.addEventListener("input", (event) => { const line = project.services.find((item) => item.id === event.target.dataset.serviceQuantity); if (line) line.quantity = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-room-name]").forEach((input) => input.addEventListener("input", (event) => { const room = project.rooms.find((item) => item.id === event.target.dataset.roomName); if (room) room.name = event.target.value; saveState(); }));
    document.querySelectorAll("[data-room-type]").forEach((select) => select.addEventListener("change", (event) => { const room = project.rooms.find((item) => item.id === event.target.dataset.roomType); if (!room) return; room.type = event.target.value; room.name = ROOM_TEMPLATES[event.target.value].label; room.measurements = {}; ROOM_TEMPLATES[event.target.value].fields.forEach((field) => { room.measurements[field.key] = field.default; }); render(); }));
    document.querySelectorAll("[data-room-quality]").forEach((select) => select.addEventListener("change", (event) => { const room = project.rooms.find((item) => item.id === event.target.dataset.roomQuality); if (room) room.qualityId = event.target.value; render(); }));
    document.querySelectorAll("[data-room-hardware]").forEach((select) => select.addEventListener("change", (event) => { const room = project.rooms.find((item) => item.id === event.target.dataset.roomHardware); if (room) room.hardwarePackageId = event.target.value; render(); }));
    document.querySelectorAll("[data-room-discount]").forEach((input) => input.addEventListener("input", (event) => { const room = project.rooms.find((item) => item.id === event.target.dataset.roomDiscount); if (room) room.discountRate = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-room-custom-hardware]").forEach((input) => input.addEventListener("input", (event) => { const room = project.rooms.find((item) => item.id === event.target.dataset.roomCustomHardware); if (room) room.customHardwarePrice = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-room-measure]").forEach((input) => input.addEventListener("input", (event) => { const room = project.rooms.find((item) => item.id === event.target.dataset.roomMeasure); if (!room) return; room.measurements[event.target.dataset.field] = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-remove-room]").forEach((button) => button.addEventListener("click", () => { if (project.rooms.length <= 1) return; project.rooms = project.rooms.filter((room) => room.id !== button.dataset.removeRoom); render(); }));
    document.querySelectorAll("[data-duplicate-room]").forEach((button) => button.addEventListener("click", () => { const room = project.rooms.find((item) => item.id === button.dataset.duplicateRoom); if (!room) return; const copy = clone(room); copy.id = "ROOM-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6); copy.name = room.name + " Kopya"; project.rooms.push(copy); render(); }));
  }

  function bindCatalog() {
    document.querySelectorAll("[data-quality-price]").forEach((input) => input.addEventListener("input", (event) => { qualityById(event.target.dataset.qualityPrice).chamberSheetPrice = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-quality-front]").forEach((input) => input.addEventListener("input", (event) => { qualityById(event.target.dataset.qualityFront).frontMultiplier = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-quality-waste]").forEach((input) => input.addEventListener("input", (event) => { qualityById(event.target.dataset.qualityWaste).wasteRate = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-hardware-hinge]").forEach((input) => input.addEventListener("input", (event) => { hardwareById(event.target.dataset.hardwareHinge).hingePrice = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-hardware-drawer]").forEach((input) => input.addEventListener("input", (event) => { hardwareById(event.target.dataset.hardwareDrawer).drawerPrice = Number(event.target.value || 0); render(); }));
    document.querySelectorAll("[data-hardware-handle]").forEach((input) => input.addEventListener("input", (event) => { hardwareById(event.target.dataset.hardwareHandle).handlePrice = Number(event.target.value || 0); render(); }));
    [["#chamberNameInput", "chamberName"], ["#chamberMarginInput", "chamberMarginRate"], ["#overheadRateInput", "overheadRate"], ["#laborHourlyRateInput", "laborHourlyRate"], ["#edgeBandRateInput", "edgeBandMtPrice"], ["#backPanelRateInput", "backPanelSqmPrice"]].forEach((item) => { const node = document.querySelector(item[0]); if (!node) return; node.addEventListener("input", (event) => { state.chamber[item[1]] = item[1] === "chamberName" ? event.target.value : Number(event.target.value || 0); render(); }); });
  }

  function bindUsers() {
    const updateUser = (id, key, value) => { const user = state.users.find((item) => item.id === id); if (!user) return; user[key] = value; saveState(); };
    document.querySelectorAll("[data-user-full-name]").forEach((input) => input.addEventListener("input", (event) => updateUser(event.target.dataset.userFullName, "fullName", event.target.value)));
    document.querySelectorAll("[data-user-username]").forEach((input) => input.addEventListener("input", (event) => updateUser(event.target.dataset.userUsername, "username", event.target.value)));
    document.querySelectorAll("[data-user-password]").forEach((input) => input.addEventListener("input", (event) => updateUser(event.target.dataset.userPassword, "password", event.target.value)));
    document.querySelectorAll("[data-user-role]").forEach((select) => select.addEventListener("change", (event) => { updateUser(event.target.dataset.userRole, "role", event.target.value); render(); }));
    document.querySelectorAll("[data-user-company]").forEach((input) => input.addEventListener("input", (event) => updateUser(event.target.dataset.userCompany, "company", event.target.value)));
    document.querySelectorAll("[data-user-remove]").forEach((button) => button.addEventListener("click", () => { state.users = state.users.filter((user) => user.id !== button.dataset.userRemove); if (!state.users.some((user) => user.id === state.currentUser.id)) state.currentUser = state.users[0]; render(); }));
    document.querySelector("#createUserBtn") && document.querySelector("#createUserBtn").addEventListener("click", () => { const fullName = document.querySelector("#newUserName").value.trim(), username = document.querySelector("#newUsername").value.trim(), password = document.querySelector("#newUserPassword").value.trim(), role = document.querySelector("#newUserRole").value, company = document.querySelector("#newUserCompany").value.trim() || "Tanımsız"; if (!fullName || !username || !password) return; state.users.push({ id: "USR-" + Date.now(), fullName: fullName, username: username, password: password, role: role, company: company }); render(); });
  }

  function bindContracts() {
    document.querySelector("#printInlineBtn") && document.querySelector("#printInlineBtn").addEventListener("click", () => window.print());
  }

  function bindViewEvents() {
    if (state.currentView === "projects") bindProjects();
    if (state.currentView === "catalog") bindCatalog();
    if (state.currentView === "users") bindUsers();
    if (state.currentView === "contracts") bindContracts();
  }

  function openLoginDialog() {
    els.loginUsername.value = state.currentUser.username;
    els.loginPassword.value = state.currentUser.password;
    els.demoGrid.innerHTML = DEMO_USERS.map((user) => "<button type='button' class='demo-card' data-demo-user='" + user.username + "'><strong>" + ROLE_LABELS[user.role] + "</strong><span>" + user.username + " / " + user.password + "</span></button>").join("");
    document.querySelectorAll("[data-demo-user]").forEach((button) => button.addEventListener("click", () => { const user = DEMO_USERS.find((item) => item.username === button.dataset.demoUser); if (!user) return; els.loginUsername.value = user.username; els.loginPassword.value = user.password; }));
    els.loginDialog.showModal();
  }

  function bindGlobalEvents() {
    els.openLoginBtn.addEventListener("click", openLoginDialog);
    els.newProjectBtn.addEventListener("click", () => { const project = defaultProject(); state.projects.unshift(project); state.selectedProjectId = project.id; state.currentView = "projects"; render(); });
    els.saveStateBtn.addEventListener("click", () => { saveState(); els.statusText.textContent = "Yerel kayıt tamamlandı. Veriler bu tarayıcıda saklandı."; });
    els.printContractBtn.addEventListener("click", () => { state.currentView = "contracts"; render(); setTimeout(() => window.print(), 30); });
    els.loginForm.addEventListener("submit", (event) => { event.preventDefault(); const username = els.loginUsername.value.trim(), password = els.loginPassword.value.trim(); const user = state.users.find((item) => item.username === username && item.password === password); if (!user) { els.statusText.textContent = "Kullanıcı adı veya şifre hatalı."; return; } state.currentUser = user; ensureCurrentView(); render(); els.loginDialog.close(); });
  }

  function render() {
    ensureCurrentView();
    saveState();
    renderSessionInfo();
    renderNavigation();
    renderHero();
    renderStats();
    els.viewContainer.innerHTML = renderView();
    bindViewEvents();
  }

  bindGlobalEvents();
  render();
  // BIND_MARKER
})();

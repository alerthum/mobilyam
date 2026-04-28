/**
 * Tek kiracılı (düz) → çok kiracılı `chambers[]` modeli migrasyonu.
 * Idempotent — her yüklemede güvenli.
 */
const DEFAULT_CHAMBER_ID = "CH-DEFAULT";

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function migrateInboundState(remote) {
  const s = clone(remote);
  if (!s || typeof s !== "object") return remote;

  s.chamber = s.chamber && typeof s.chamber === "object" ? { ...s.chamber } : {};
  if (!Array.isArray(s.chamber.broadcasts)) s.chamber.broadcasts = [];
  if (!Array.isArray(s.projects)) s.projects = [];
  if (!Array.isArray(s.quotes)) s.quotes = [];
  if (!Array.isArray(s.users)) s.users = [];

  /* --- chambers[] oluştur (yoksa) --- */
  if (!Array.isArray(s.chambers) || !s.chambers.length) {
    const chamberName =
      String(s.chamber.chamberName || "").trim() || "Varsayılan oda kaydı";

    const one = {
      id: DEFAULT_CHAMBER_ID,
      chamberName,
      updatedAt: s.chamber.updatedAt || "",
      laborHourlyRate: Number(s.chamber.laborHourlyRate) || 0,
      overheadRate: Number(s.chamber.overheadRate) || 0,
      chamberMarginRate: Number(s.chamber.chamberMarginRate) || 0,
      installationMtPrice: Number(s.chamber.installationMtPrice) || 0,
      packagingSqmPrice: Number(s.chamber.packagingSqmPrice) || 0,
      minimumProfitRate: Number(s.chamber.minimumProfitRate) || 0,
      broadcasts: Array.isArray(s.chamber.broadcasts) ? s.chamber.broadcasts : [],
      qualities: clone(Array.isArray(s.qualities) ? s.qualities : []).length
        ? clone(s.qualities)
        : [],
      hardwarePackages: clone(
        Array.isArray(s.hardwarePackages) ? s.hardwarePackages : []
      ),
      servicesCatalog: clone(
        Array.isArray(s.servicesCatalog) ? s.servicesCatalog : []
      )
    };

    if (!one.qualities.length) {
      one.qualities = [
        {
          id: "std",
          name: "Standart kalite",
          officialSqmPrice: 6000,
          note: "Yeni kayıt için varsayılan"
        }
      ];
    }

    s.chambers = [one];
  }

  /** Oda yönetici hesapları için benzersiz kiracı kimliği — aynı DEFAULT altında iki ayrı kurum gözükmesin. */
  (s.users || []).forEach((u) => {
    if (!u || u.hiddenFromManagement || u.role === "system_admin") return;
    if (u.role === "chamber" && !String(u.chamberId || "").trim()) {
      u.chamberId = `CH-${String(u.id || "")
        .replace(/\W/g, "")
        .slice(-20)}-${Math.random().toString(36).slice(2, 7)}`;
    }
    if (u.role !== "chamber" && !String(u.chamberId || "").trim()) {
      u.chamberId = DEFAULT_CHAMBER_ID;
    }
  });

  {
    const chambers = Array.isArray(s.chambers) ? [...s.chambers] : [];
    const firstAdminByChamberId = new Map();

    (s.users || []).forEach((u) => {
      if (!u || u.hiddenFromManagement || u.role !== "chamber") return;
      const lid = String(u.chamberId || "").trim();
      if (!lid) return;
      if (!firstAdminByChamberId.has(lid)) {
        firstAdminByChamberId.set(lid, u.id);
        return;
      }
      if (firstAdminByChamberId.get(lid) === u.id) return;

      const newId = `CH-${String(u.id || "")
        .replace(/\W/g, "")
        .slice(-14)}-${Math.random().toString(36).slice(2, 6)}`;
      u.chamberId = newId;
      if (!chambers.some((c) => c.id === newId)) {
        chambers.push({
          id: newId,
          chamberName:
            (u.company || "").trim() ||
            (u.fullName || "").trim() ||
            `Oda ${newId.slice(-8)}`,
          updatedAt: "",
          laborHourlyRate: 0,
          overheadRate: 0,
          chamberMarginRate: 0,
          installationMtPrice: 0,
          packagingSqmPrice: 0,
          minimumProfitRate: 0,
          broadcasts: [],
          qualities: [],
          hardwarePackages: [],
          servicesCatalog: []
        });
      }
    });

    (s.users || []).forEach((u) => {
      if (!u || u.hiddenFromManagement || u.role !== "chamber") return;
      const cid = String(u.chamberId || "").trim();
      if (!cid || chambers.some((c) => c.id === cid)) return;
      chambers.push({
        id: cid,
        chamberName:
          (u.company || "").trim() ||
          (u.fullName || "").trim() ||
          `Oda (${cid.slice(-6)})`,
        updatedAt: "",
        laborHourlyRate: 0,
        overheadRate: 0,
        chamberMarginRate: 0,
        installationMtPrice: 0,
        packagingSqmPrice: 0,
        minimumProfitRate: 0,
        broadcasts: [],
        qualities: [],
        hardwarePackages: [],
        servicesCatalog: []
      });
    });

    s.chambers = chambers;
  }

  /* --- projeler chamberId ile scope --- */
  (s.projects || []).forEach((p) => {
    if (!p) return;
    if (!p.chamberId && p.ownerUserId) {
      const owner = (s.users || []).find((x) => x.id === p.ownerUserId);
      if (owner?.chamberId) {
        p.chamberId = owner.chamberId;
        return;
      }
    }
    if (!p.chamberId) p.chamberId = DEFAULT_CHAMBER_ID;
  });

  consolidatePrimaryUshakTenant(s);
  migrateProjectsToStandaloneQuotes(s);

  /** API yanıtta kök shim: filtre sırasında doldurulur; tek kaynak chambers[]. */
  return s;
}

function migrateProjectsToStandaloneQuotes(s) {
  const existingQuotes = Array.isArray(s.quotes) ? s.quotes : [];
  const projects = Array.isArray(s.projects) ? s.projects : [];

  const normalizedExisting = existingQuotes.map((q) => ({ ...clone(q) }));
  if (!projects.length) {
    s.quotes = normalizedExisting;
    s.projects = [];
    return;
  }

  const flattened = [];
  projects.forEach((project) => {
    if (!project) return;
    const nestedQuotes = Array.isArray(project.quotes) ? project.quotes : [];
    nestedQuotes.forEach((quote, index) => {
      if (!quote || typeof quote !== "object") return;
      const quoteId = quote.id || `QT-${Date.now()}-${index}`;
      const projectId = project.id || "PRJ-LEGACY";
      const standaloneId = `Q-${projectId}--${quoteId}`;
      flattened.push({
        ...clone(quote),
        id: standaloneId,
        legacyProjectId: project.id || null,
        legacyQuoteId: quote.id || null,
        ownerUserId: project.ownerUserId || quote.ownerUserId || null,
        chamberId: project.chamberId || quote.chamberId || DEFAULT_CHAMBER_ID,
        projectName: project.projectName || quote.projectName || "Yeni Teklif",
        customerName: project.customerName || quote.customerName || "",
        customerPhone: project.customerPhone || quote.customerPhone || "",
        projectAddress: project.projectAddress || quote.projectAddress || "",
        contractCode: project.contractCode || quote.contractCode || "",
        merchantName: project.merchantName || quote.merchantName || "",
        lifecycleStatus: project.status || quote.lifecycleStatus || "active",
        saved: typeof project.saved === "boolean" ? project.saved : true,
        number: quote.number || index + 1
      });
    });
  });

  const byId = new Map();
  [...normalizedExisting, ...flattened].forEach((quote) => {
    if (!quote?.id) return;
    byId.set(quote.id, quote);
  });

  s.quotes = [...byId.values()];
  s.projects = [];
}

function uniqCatalog(items, key = "id") {
  const m = new Map();
  (items || []).forEach((item) => {
    if (item != null && item[key] != null) {
      const k = String(item[key]);
      if (!m.has(k)) m.set(k, item);
    }
  });
  return [...m.values()];
}

/**
 * Tek canlı kiracı: @oda · Uşak Odası — tüm veriyi CH-DEFAULT altında topla.
 * Idempotent: tekrar çalıştırılsa da tutarlı kalır.
 */
function consolidatePrimaryUshakTenant(s) {
  const PRIMARY_ID = DEFAULT_CHAMBER_ID;
  const LABEL = "UŞAK MARANGOZLAR ESNAF VE SANATKARLAR ODASI";

  const chambers = Array.isArray(s.chambers) ? [...s.chambers] : [];
  if (!chambers.length) return;

  let primary =
    chambers.find((c) => c.id === PRIMARY_ID) ||
    chambers.find((c) => /marangozlar|uşak|usak/i.test(String(c.chamberName || ""))) ||
    chambers[0];

  const rest = chambers.filter((c) => c.id !== primary.id);
  primary = { ...clone(primary) };
  primary.id = PRIMARY_ID;
  primary.chamberName =
    primary.chamberName && String(primary.chamberName).trim().length > 4
      ? primary.chamberName
      : LABEL;

  /** Katalogları birleştir (aynı kimlikli kalite/satır için ilk bulunanı koru). */
  for (const b of rest) {
    primary.qualities = uniqCatalog([
      ...(Array.isArray(primary.qualities) ? primary.qualities : []),
      ...(Array.isArray(b?.qualities) ? b.qualities : [])
    ]);
    primary.hardwarePackages = uniqCatalog([
      ...(Array.isArray(primary.hardwarePackages) ? primary.hardwarePackages : []),
      ...(Array.isArray(b?.hardwarePackages) ? b.hardwarePackages : [])
    ]);
    primary.servicesCatalog = uniqCatalog([
      ...(Array.isArray(primary.servicesCatalog) ? primary.servicesCatalog : []),
      ...(Array.isArray(b?.servicesCatalog) ? b.servicesCatalog : [])
    ]);
    primary.broadcasts = [
      ...(Array.isArray(primary.broadcasts) ? primary.broadcasts : []),
      ...(Array.isArray(b?.broadcasts) ? b.broadcasts : [])
    ];
  }

  primary.qualities = uniqCatalog(primary.qualities || []);
  primary.hardwarePackages = uniqCatalog(primary.hardwarePackages || []);
  primary.servicesCatalog = uniqCatalog(primary.servicesCatalog || []);

  s.chambers = [primary];

  (s.users || []).forEach((u) => {
    if (!u || u.hiddenFromManagement || u.role === "system_admin") return;
    u.chamberId = PRIMARY_ID;
  });
  (s.projects || []).forEach((p) => {
    if (p) p.chamberId = PRIMARY_ID;
  });

  /** Kök özet ile chambers[0] aynı olsun — eski düz yapı uyumu. */
  s.qualities = clone(primary.qualities || []);
  s.hardwarePackages = clone(primary.hardwarePackages || []);
  s.servicesCatalog = clone(primary.servicesCatalog || []);

  s.chamber = s.chamber && typeof s.chamber === "object" ? { ...s.chamber } : {};
  s.chamber.chamberName =
    primary.chamberName || String(s.chamber.chamberName || "").trim() || LABEL;
  s.chamber.updatedAt =
    typeof primary.updatedAt === "string" && primary.updatedAt.length
      ? primary.updatedAt
      : s.chamber.updatedAt;
  s.chamber.broadcasts = Array.isArray(primary.broadcasts) ? [...primary.broadcasts] : s.chamber.broadcasts || [];
  s.chamber.laborHourlyRate = Number(primary.laborHourlyRate) || s.chamber.laborHourlyRate || 0;
  s.chamber.overheadRate = Number(primary.overheadRate) || s.chamber.overheadRate || 0;
  s.chamber.chamberMarginRate = Number(primary.chamberMarginRate) || s.chamber.chamberMarginRate || 0;
  s.chamber.installationMtPrice = Number(primary.installationMtPrice) || s.chamber.installationMtPrice || 0;
  s.chamber.packagingSqmPrice = Number(primary.packagingSqmPrice) || s.chamber.packagingSqmPrice || 0;
  s.chamber.minimumProfitRate = Number(primary.minimumProfitRate) || s.chamber.minimumProfitRate || 0;
}

module.exports = { migrateInboundState, DEFAULT_CHAMBER_ID };

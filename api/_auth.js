const crypto = require("crypto");
const { migrateInboundState } = require("./stateMigration");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addOneYear(dateValue = todayIso()) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "yokus-local-session-secret"
  );
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function createSessionToken(user) {
  const payload = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded));
    if (!payload?.userId || !payload?.role || payload.exp < Date.now()) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function extractBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

function getLicenseState(user) {
  if (user.role === "system_admin") return "active";
  if (user.role === "chamber") {
    if (user.status === "passive") return "passive";
    if (user.licenseEndDate && user.licenseEndDate < todayIso()) return "expired";
    return "active";
  }
  if (user.status === "passive") return "passive";
  if (user.licenseEndDate && user.licenseEndDate < todayIso()) return "expired";
  return "active";
}

function canLogin(user) {
  return getLicenseState(user) === "active";
}

function authenticateRequest(req, remoteState) {
  const payload = verifySessionToken(extractBearerToken(req));
  if (!payload) return null;

  const user = (remoteState.users || []).find((item) => item.id === payload.userId);
  if (!user) return null;
  if (user.role !== payload.role) return null;
  if (!canLogin(user)) return null;
  return user;
}

function createEmptyChamberBlock(cid, chamberName = "") {
  return {
    id: cid || "CH-PENDING",
    chamberName,
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
  };
}

/** cid verilmişken eşleşme yoksa başka kiracının kataloğuna düşme — boş blok şablonu */
function pickChamberBlock(remoteState, cid) {
  const list = Array.isArray(remoteState.chambers) ? remoteState.chambers : [];
  if (!list.length) return null;
  if (!cid) return list[0];
  const found = list.find((c) => c.id === cid);
  if (found) return found;
  return createEmptyChamberBlock(cid, "");
}

function sanitizeManagedUser(user, chamberContext) {
  const cidResolved = chamberContext?.chamberId || chamberContext?.fallbackChamberId;
  const role = user.role === "chamber" ? "chamber" : "producer";
  /** Oda yönetimi güncelleme isteği: üretici her zaman bu odaya bağlanır — istemciden başka kiracı id gelmesini yok say. */
  const chamberScopeId =
    role === "chamber" ? cidResolved || user.chamberId || null : cidResolved || user.chamberId || null;
  const nextUser = {
    id: user.id || `USR-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    fullName: user.fullName || (role === "chamber" ? chamberContext?.chamberName : "Yeni Kullanıcı"),
    username: user.username || `kullanici${Math.floor(Math.random() * 900 + 100)}`,
    password: user.password || "123456",
    role,
    chamberId: chamberScopeId,
    company:
      role === "chamber"
        ? user.company || chamberContext?.chamberName || "Oda"
        : user.company || user.fullName || "Yeni Firma",
    phone: user.phone ?? "",
    addressLine: user.addressLine ?? "",
    cityProvince: user.cityProvince ?? "",
    district: user.district ?? "",
    taxOffice: user.taxOffice ?? "",
    taxNumber: user.taxNumber ?? "",
    nationalIdMasked: user.nationalIdMasked ?? "",
    status: user.status === "passive" ? "passive" : "active",
    hiddenFromManagement: false,
    dismissedBroadcastIds: Array.isArray(user.dismissedBroadcastIds) ? [...user.dismissedBroadcastIds] : [],
    broadcastViews: Array.isArray(user.broadcastViews) ? clone(user.broadcastViews) : []
  };

  if (role === "producer") {
    nextUser.licenseStartDate = user.licenseStartDate || todayIso();
    nextUser.licenseEndDate = user.licenseEndDate || addOneYear(nextUser.licenseStartDate);
  } else if (role === "chamber") {
    if (user.licenseStartDate) nextUser.licenseStartDate = user.licenseStartDate;
    if (user.licenseEndDate) nextUser.licenseEndDate = user.licenseEndDate;
  }

  return nextUser;
}

function mergeManagedUsers(existingUsers, incomingUsers, chamberContext) {
  const cid = chamberContext?.chamberId || chamberContext?.fallbackChamberId;
  if (!cid) {
    return Array.isArray(existingUsers) ? [...existingUsers] : [];
  }

  const hiddenUsers = (existingUsers || []).filter((user) => user.hiddenFromManagement || user.role === "system_admin");

  /** Diğer oda kullanıcıları — yanlışlıkla silinmesin (oda yönetimi kısmi liste gönderir) */
  const otherTenantUsers = (existingUsers || []).filter(
    (user) =>
      !user.hiddenFromManagement &&
      user.role !== "system_admin" &&
      cid &&
      user.chamberId &&
      user.chamberId !== cid
  );

  const managedUsers = Array.isArray(incomingUsers) ? incomingUsers : [];
  const sanitized = managedUsers
    .filter((user) => user.role === "chamber" || user.role === "producer")
    .map((user) => sanitizeManagedUser(user, chamberContext));

  let chamberUser = sanitized.find((user) => user.role === "chamber" && user.chamberId === cid);
  if (!chamberUser) {
    const currentChamber = (existingUsers || []).find((user) => user.role === "chamber" && user.chamberId === cid);
    chamberUser = sanitizeManagedUser(
      currentChamber || {
        role: "chamber",
        fullName: chamberContext?.chamberName,
        username: "oda",
        password: "oda2026",
        chamberId: cid
      },
      chamberContext
    );
  }

  const producerUsers = sanitized.filter((user) => user.role === "producer" && user.chamberId === cid);
  return [...hiddenUsers, chamberUser, ...producerUsers, ...otherTenantUsers];
}

function sanitizeProducerQuotes(quotes, userId) {
  return (Array.isArray(quotes) ? quotes : []).map((quote) => ({
    ...clone(quote),
    ownerUserId: userId
  }));
}

/** Oda yöneticisi görünümünde teklif listesi: doğrudan chamberId veya eski kayıtta üretici üzerinden kapsam. */
function quoteBelongsToChamberScope(quote, cid, users) {
  if (!quote || !cid) return false;
  if (quote.chamberId === cid) return true;
  const missing =
    quote.chamberId == null || String(quote.chamberId).trim() === "";
  if (!missing) return false;
  const owner = (users || []).find((u) => u && u.id === quote.ownerUserId);
  return Boolean(
    owner &&
      !owner.hiddenFromManagement &&
      owner.role === "producer" &&
      owner.chamberId === cid
  );
}

/** Çok kiracılı odadan gelen katalog güncellenir; oda satırı yoksa oluşturur. */
function patchChamberInState(nextState, chamberId, patch) {
  if (!chamberId) return nextState;
  const list = Array.isArray(nextState.chambers) ? [...nextState.chambers] : [];
  const idx = list.findIndex((c) => c.id === chamberId);
  if (idx < 0) {
    const base = createEmptyChamberBlock(chamberId, patch.chamberName || "");
    list.push({ ...base, ...patch });
  } else {
    list[idx] = { ...list[idx], ...patch };
  }
  nextState.chambers = list;
  return nextState;
}

function filterStateForUser(remoteState, user) {
  const migrated = migrateInboundState(clone(remoteState));
  const baseState = clone(migrated);

  if (user.role === "system_admin") {
    const sysadmins = (baseState.users || []).filter(
      (u) => u.hiddenFromManagement && u.role === "system_admin"
    );
    const managedChambers = (baseState.users || []).filter(
      (u) => !u.hiddenFromManagement && u.role === "chamber"
    );
    return {
      chamber: clone(baseState.chamber || {}),
      chambers: clone(Array.isArray(baseState.chambers) ? baseState.chambers : []),
      users: [...clone(sysadmins), ...clone(managedChambers)],
      quotes: [],
      qualities: [],
      hardwarePackages: [],
      servicesCatalog: [],
      chamberId: undefined
    };
  }

  const cid = user.chamberId || pickChamberBlock(baseState, null)?.id;
  const block = pickChamberBlock(baseState, cid);
  const qualities = clone(block?.qualities || []);
  const servicesCatalog = clone(block?.servicesCatalog || []);
  const hardwarePackages = clone(block?.hardwarePackages || []);

  const mergedChamberBanner = {
    ...(baseState.chamber || {}),
    chamberName: block?.chamberName || baseState.chamber?.chamberName,
    broadcasts: Array.isArray(block?.broadcasts) ? [...block.broadcasts] : []
  };

  if (user.role === "chamber") {
    return {
      chambers: [], // sızdırmayı engelle — yalnızca kendi oda blokları yüzey olarak
      chamber: mergedChamberBanner,
      chamberId: cid,
      qualities,
      hardwarePackages,
      servicesCatalog,
      users: (baseState.users || []).filter(
        (item) =>
          !item.hiddenFromManagement &&
          item.role !== "system_admin" &&
          item.chamberId === cid
      ),
      quotes: (baseState.quotes || []).filter((quote) =>
        quoteBelongsToChamberScope(quote, cid, baseState.users)
      )
    };
  }

  return {
    chamber: mergedChamberBanner,
    chamberId: cid,
    qualities,
    hardwarePackages,
    servicesCatalog,
    users: (baseState.users || []).filter((item) => item.id === user.id),
    quotes: (baseState.quotes || []).filter(
      (quote) => quote.ownerUserId === user.id && quote.chamberId === cid
    )
  };
}

function mergeStateForUser(existingState, incomingState, user) {
  const nextState = clone(migrateInboundState(existingState));
  const inc = clone(incomingState || {});
  migrateInboundState(inc);

  if (user.role === "system_admin") {
    const prev = migrateInboundState(clone(existingState));
    const mergedInc = migrateInboundState(clone(incomingState || {}));

    const nextState = clone(prev);
    nextState.quotes = prev.quotes || [];

    const sysadmins = (prev.users || []).filter((u) => u.role === "system_admin");
    const producers = (prev.users || []).filter((u) => u.role === "producer");
    const chamberFromIncoming = (mergedInc.users || []).filter((u) => u.role === "chamber");
    const chambersFinal =
      chamberFromIncoming.length > 0
        ? chamberFromIncoming
        : (prev.users || []).filter((u) => u.role === "chamber");

    nextState.users = [...sysadmins, ...producers, ...chambersFinal];

    if (Array.isArray(mergedInc.chambers) && mergedInc.chambers.length > 0) {
      nextState.chambers = clone(mergedInc.chambers);
      nextState.chambers = nextState.chambers.map((block, idx) => {
        if (idx !== 0) return block;
        return {
          ...block,
          qualities: Array.isArray(mergedInc.qualities)
            ? clone(mergedInc.qualities)
            : block.qualities || [],
          servicesCatalog: Array.isArray(mergedInc.servicesCatalog)
            ? clone(mergedInc.servicesCatalog)
            : block.servicesCatalog || [],
          hardwarePackages: Array.isArray(mergedInc.hardwarePackages)
            ? clone(mergedInc.hardwarePackages)
            : block.hardwarePackages || []
        };
      });
    }

    if (mergedInc.chamber && typeof mergedInc.chamber === "object") {
      nextState.chamber = { ...(prev.chamber || {}), ...mergedInc.chamber };
    }

    const first = pickChamberBlock(nextState, nextState.chambers?.[0]?.id);
    if (first) {
      nextState.qualities = clone(first.qualities || []);
      nextState.servicesCatalog = clone(first.servicesCatalog || []);
      nextState.hardwarePackages = clone(first.hardwarePackages || []);
    }

    return migrateInboundState(nextState);
  }

  const cid = user.chamberId || pickChamberBlock(nextState, null)?.id;

  if (user.role === "chamber") {
    const chamberName =
      inc.chamber?.chamberName || pickChamberBlock(nextState, cid)?.chamberName || "";

    patchChamberInState(nextState, cid, {
      chamberName,
      ...(typeof inc.chamber?.updatedAt !== "undefined" ? { updatedAt: inc.chamber.updatedAt } : {}),
      ...(Array.isArray(inc.chamber?.broadcasts) ? { broadcasts: [...inc.chamber.broadcasts] } : {}),
      laborHourlyRate: inc.chamber?.laborHourlyRate ?? pickChamberBlock(nextState, cid)?.laborHourlyRate,
      overheadRate: inc.chamber?.overheadRate ?? pickChamberBlock(nextState, cid)?.overheadRate,
      chamberMarginRate: inc.chamber?.chamberMarginRate ?? pickChamberBlock(nextState, cid)?.chamberMarginRate,
      installationMtPrice: inc.chamber?.installationMtPrice ?? pickChamberBlock(nextState, cid)?.installationMtPrice,
      packagingSqmPrice: inc.chamber?.packagingSqmPrice ?? pickChamberBlock(nextState, cid)?.packagingSqmPrice,
      minimumProfitRate: inc.chamber?.minimumProfitRate ?? pickChamberBlock(nextState, cid)?.minimumProfitRate
    });

    if (Array.isArray(inc.qualities)) {
      patchChamberInState(nextState, cid, { qualities: clone(inc.qualities) });
    }
    if (Array.isArray(inc.hardwarePackages)) {
      patchChamberInState(nextState, cid, { hardwarePackages: clone(inc.hardwarePackages) });
    }
    if (Array.isArray(inc.servicesCatalog)) {
      patchChamberInState(nextState, cid, { servicesCatalog: clone(inc.servicesCatalog) });
    }

    nextState.chamber = {
      ...(nextState.chamber || {}),
      ...(pickChamberBlock(nextState, cid) || {})
    };

    nextState.users = mergeManagedUsers(nextState.users, inc.users, {
      chamberId: cid,
      chamberName,
      fallbackChamberId: cid
    });

    migrateInboundState(nextState);
    return nextState;
  }

  /** producer */
  const existingQuotes = Array.isArray(nextState.quotes) ? nextState.quotes : [];
  const otherOwnersQuotes = existingQuotes.filter((quote) => quote.ownerUserId !== user.id);
  const currentOwnerQuotes = existingQuotes.filter((quote) => quote.ownerUserId === user.id);
  const incomingOwnerQuotes = sanitizeProducerQuotes(inc.quotes, user.id).map((q) =>
    cid ? { ...q, chamberId: q.chamberId || cid } : q
  );

  /**
   * Güvenlik kuralı:
   * - Gelen payload'da quotes boşsa (ör. stale/bozuk istemci state), mevcut owner tekliflerini silme.
   * - Böylece teklifler "bir anda sıfırlandı" vakasını engelleriz.
   */
  const nextOwnerQuotes =
    incomingOwnerQuotes.length === 0 && currentOwnerQuotes.length > 0
      ? currentOwnerQuotes
      : incomingOwnerQuotes;

  nextState.quotes = [...otherOwnersQuotes, ...nextOwnerQuotes];

  const selfPatch = inc.users?.find((u) => u.id === user.id);
  if (
    selfPatch &&
    Array.isArray(selfPatch.dismissedBroadcastIds) &&
    Array.isArray(nextState.users)
  ) {
    nextState.users = nextState.users.map((u) =>
      u.id === user.id
        ? { ...u, dismissedBroadcastIds: [...selfPatch.dismissedBroadcastIds] }
        : u
    );
  }
  if (
    selfPatch &&
    Array.isArray(selfPatch.broadcastViews) &&
    Array.isArray(nextState.users)
  ) {
    nextState.users = nextState.users.map((u) =>
      u.id === user.id
        ? { ...u, broadcastViews: clone(selfPatch.broadcastViews) }
        : u
    );
  }

  return migrateInboundState(nextState);
}

module.exports = {
  authenticateRequest,
  canLogin,
  createSessionToken,
  filterStateForUser,
  mergeStateForUser
};

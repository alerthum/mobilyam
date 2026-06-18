const crypto = require("crypto");
const { migrateInboundState } = require("./stateMigration");
const { sanitizeQuotesCutListsForClient, stripCutListsFromQuotes } = require("./_cutlist");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

/**
 * İstemci gövdesinde alan yoksa undefined dön — sunucudaki mevcut katalog ezilmesin.
 * migrateInboundState(inc) eksik alanlarda varsayılan üretir; bu yüzden ham gövdeye bakılır.
 */
function catalogPatchFromIncoming(incomingState, key) {
  const raw = incomingState && typeof incomingState === "object" ? incomingState : {};
  if (!Object.prototype.hasOwnProperty.call(raw, key)) return undefined;
  const v = raw[key];
  if (!Array.isArray(v)) return [];
  return clone(v);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createVerifyToken() {
  return `VT-${crypto.randomBytes(16).toString("hex")}`;
}

function ensureVerifyToken(user) {
  if (user.verifyToken && String(user.verifyToken).trim()) return user.verifyToken;
  return createVerifyToken();
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
  const { defaultSmtpSettings } = require("./_smtpPresets");
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
    servicesCatalog: [],
    countertopCatalog: [],
    agreedPartners: [],
    smtpSettings: defaultSmtpSettings()
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
    broadcastViews: Array.isArray(user.broadcastViews) ? clone(user.broadcastViews) : [],
    lastLoginAt: typeof user.lastLoginAt === "string" ? user.lastLoginAt : "",
    verifyToken: ensureVerifyToken(user)
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
    .map((user) => sanitizeManagedUser(user, chamberContext))
    .map((clean) => {
      const prev = (existingUsers || []).find((u) => u.id === clean.id);
      if (
        prev &&
        typeof prev.lastLoginAt === "string" &&
        prev.lastLoginAt.trim() &&
        (!clean.lastLoginAt || !String(clean.lastLoginAt).trim())
      ) {
        return { ...clean, lastLoginAt: prev.lastLoginAt };
      }
      return clean;
    });

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
      countertopCatalog: [],
      chamberId: undefined
    };
  }

  const cid = user.chamberId || pickChamberBlock(baseState, null)?.id;
  const block = pickChamberBlock(baseState, cid);
  const qualities = clone(block?.qualities || []);
  const servicesCatalog = clone(block?.servicesCatalog || []);
  const countertopCatalog = clone(block?.countertopCatalog || []);
  const hardwarePackages = clone(block?.hardwarePackages || []);

  const mergedChamberBanner = {
    ...(baseState.chamber || {}),
    chamberName: block?.chamberName || baseState.chamber?.chamberName,
    broadcasts: Array.isArray(block?.broadcasts) ? [...block.broadcasts] : []
  };

  const agreedPartners = clone(block?.agreedPartners || []);
  const smtpSettings =
    user.role === "chamber" ? clone(block?.smtpSettings || require("./_smtpPresets").defaultSmtpSettings()) : undefined;
  const partnerMailOutbox = (baseState.partnerMailOutbox || []).filter((item) => {
    if (user.role === "chamber") return item.chamberId === cid;
    return item.producerUserId === user.id;
  });

  if (user.role === "chamber") {
    return {
      chambers: [],
      chamber: mergedChamberBanner,
      chamberId: cid,
      qualities,
      hardwarePackages,
      servicesCatalog,
      countertopCatalog,
      agreedPartners,
      smtpSettings,
      partnerMailOutbox,
      users: (baseState.users || []).filter(
        (item) =>
          !item.hiddenFromManagement &&
          item.role !== "system_admin" &&
          item.chamberId === cid
      ),
      quotes: (baseState.quotes || [])
        .filter((quote) => quoteBelongsToChamberScope(quote, cid, baseState.users))
        .map((quote) => {
          const next = { ...quote };
          delete next.cutLists;
          return next;
        })
    };
  }

  return {
    chamber: mergedChamberBanner,
    chamberId: cid,
    qualities,
    hardwarePackages,
    servicesCatalog,
    countertopCatalog,
    agreedPartners,
    partnerMailOutbox,
    users: (baseState.users || []).filter((item) => item.id === user.id),
    quotes: sanitizeQuotesCutListsForClient(
      (baseState.quotes || []).filter(
        (quote) => quote.ownerUserId === user.id && quote.chamberId === cid
      )
    )
  };
}

function mergeStateForUser(existingState, incomingState, user) {
  const nextState = clone(migrateInboundState(existingState));
  const rawQualities = catalogPatchFromIncoming(incomingState, "qualities");
  const rawHardware = catalogPatchFromIncoming(incomingState, "hardwarePackages");
  const rawServices = catalogPatchFromIncoming(incomingState, "servicesCatalog");
  const rawCountertops = catalogPatchFromIncoming(incomingState, "countertopCatalog");
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
          countertopCatalog: Array.isArray(mergedInc.countertopCatalog)
            ? clone(mergedInc.countertopCatalog)
            : block.countertopCatalog || [],
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
      nextState.countertopCatalog = clone(first.countertopCatalog || []);
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

    if (rawQualities !== undefined) {
      patchChamberInState(nextState, cid, { qualities: rawQualities });
    }
    if (rawHardware !== undefined) {
      patchChamberInState(nextState, cid, { hardwarePackages: rawHardware });
    }
    if (rawServices !== undefined) {
      patchChamberInState(nextState, cid, { servicesCatalog: rawServices });
    }
    if (rawCountertops !== undefined) {
      patchChamberInState(nextState, cid, { countertopCatalog: rawCountertops });
    }
    if (Array.isArray(inc.agreedPartners)) {
      patchChamberInState(nextState, cid, { agreedPartners: clone(inc.agreedPartners) });
    }
    if (inc.smtpSettings && typeof inc.smtpSettings === "object") {
      patchChamberInState(nextState, cid, { smtpSettings: clone(inc.smtpSettings) });
    } else if (inc.chamber?.smtpSettings && typeof inc.chamber.smtpSettings === "object") {
      patchChamberInState(nextState, cid, { smtpSettings: clone(inc.chamber.smtpSettings) });
    }

    const blk = pickChamberBlock(nextState, cid);
    if (blk) {
      nextState.countertopCatalog = clone(blk.countertopCatalog || []);
      nextState.qualities = clone(blk.qualities || []);
      nextState.servicesCatalog = clone(blk.servicesCatalog || []);
      nextState.hardwarePackages = clone(blk.hardwarePackages || []);
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
  const nextOwnerQuotesRaw =
    incomingOwnerQuotes.length === 0 && currentOwnerQuotes.length > 0
      ? currentOwnerQuotes
      : incomingOwnerQuotes;

  const nextOwnerQuotes = nextOwnerQuotesRaw.map((incoming) => {
    const existing = currentOwnerQuotes.find((q) => q.id === incoming.id);
    if (!existing) return incoming;
    return {
      ...incoming,
      cutLists: Array.isArray(existing.cutLists) ? existing.cutLists : incoming.cutLists || []
    };
  });

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

  const existingOutbox = Array.isArray(nextState.partnerMailOutbox) ? nextState.partnerMailOutbox : [];
  const otherOutbox = existingOutbox.filter((o) => o.producerUserId !== user.id);
  const incomingOutbox = Array.isArray(inc.partnerMailOutbox)
    ? inc.partnerMailOutbox.filter((o) => o && o.producerUserId === user.id)
    : [];
  const keptMine = existingOutbox.filter((o) => o.producerUserId === user.id);
  nextState.partnerMailOutbox =
    incomingOutbox.length > 0 ? [...otherOutbox, ...incomingOutbox] : [...otherOutbox, ...keptMine];

  return migrateInboundState(nextState);
}

module.exports = {
  authenticateRequest,
  canLogin,
  createSessionToken,
  createVerifyToken,
  ensureVerifyToken,
  getLicenseState,
  filterStateForUser,
  mergeStateForUser,
  pickChamberBlock
};

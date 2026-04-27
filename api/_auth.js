const crypto = require("crypto");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
  if (user.role === "chamber") return user.status === "passive" ? "passive" : "active";
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

function sanitizeManagedUser(user, chamberName) {
  const role = user.role === "chamber" ? "chamber" : "producer";
  const nextUser = {
    id: user.id || `USR-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    fullName: user.fullName || (role === "chamber" ? chamberName : "Yeni Kullanıcı"),
    username: user.username || `kullanici${Math.floor(Math.random() * 900 + 100)}`,
    password: user.password || "123456",
    role,
    company: role === "chamber" ? chamberName : user.company || user.fullName || "Yeni Firma",
    status: role === "chamber" ? "active" : user.status === "passive" ? "passive" : "active",
    hiddenFromManagement: false
  };

  if (role === "producer") {
    nextUser.licenseStartDate = user.licenseStartDate || todayIso();
    nextUser.licenseEndDate = user.licenseEndDate || addOneYear(nextUser.licenseStartDate);
  }

  return nextUser;
}

function mergeManagedUsers(existingUsers, incomingUsers, chamberName) {
  const hiddenUsers = (existingUsers || []).filter((user) => user.hiddenFromManagement || user.role === "system_admin");
  const managedUsers = Array.isArray(incomingUsers) ? incomingUsers : [];
  const sanitized = managedUsers
    .filter((user) => user.role === "chamber" || user.role === "producer")
    .map((user) => sanitizeManagedUser(user, chamberName));

  let chamberUser = sanitized.find((user) => user.role === "chamber");
  if (!chamberUser) {
    const currentChamber = (existingUsers || []).find((user) => user.role === "chamber");
    chamberUser = sanitizeManagedUser(currentChamber || { role: "chamber", fullName: chamberName, username: "oda", password: "oda2026" }, chamberName);
  }

  const producerUsers = sanitized.filter((user) => user.role === "producer");
  return [...hiddenUsers, chamberUser, ...producerUsers];
}

function sanitizeProducerProjects(projects, userId) {
  return (Array.isArray(projects) ? projects : []).map((project) => ({
    ...clone(project),
    ownerUserId: userId
  }));
}

function filterStateForUser(remoteState, user) {
  const baseState = clone(remoteState);

  if (user.role === "system_admin") {
    return baseState;
  }

  if (user.role === "chamber") {
    return {
      chamber: baseState.chamber,
      qualities: baseState.qualities,
      hardwarePackages: baseState.hardwarePackages,
      servicesCatalog: baseState.servicesCatalog,
      users: (baseState.users || []).filter((item) => !item.hiddenFromManagement),
      // Oda yönetimi tüm üreticilerin tekliflerini READ-ONLY görür.
      // mergeStateForUser chamber dalı projects'e dokunmadığı için yazılamaz.
      projects: baseState.projects || []
    };
  }

  return {
    chamber: baseState.chamber,
    qualities: baseState.qualities,
    hardwarePackages: baseState.hardwarePackages,
    servicesCatalog: baseState.servicesCatalog,
    users: (baseState.users || []).filter((item) => item.id === user.id),
    projects: (baseState.projects || []).filter((project) => project.ownerUserId === user.id)
  };
}

function mergeStateForUser(existingState, incomingState, user) {
  const nextState = clone(existingState);

  if (user.role === "system_admin") {
    return clone(incomingState);
  }

  if (user.role === "chamber") {
    const chamberName = incomingState?.chamber?.chamberName || nextState.chamber?.chamberName;

    nextState.chamber = { ...nextState.chamber, ...(incomingState?.chamber || {}), chamberName };
    nextState.qualities = Array.isArray(incomingState?.qualities) ? clone(incomingState.qualities) : nextState.qualities;
    nextState.hardwarePackages = Array.isArray(incomingState?.hardwarePackages)
      ? clone(incomingState.hardwarePackages)
      : nextState.hardwarePackages;
    nextState.servicesCatalog = Array.isArray(incomingState?.servicesCatalog)
      ? clone(incomingState.servicesCatalog)
      : nextState.servicesCatalog;
    nextState.users = mergeManagedUsers(nextState.users, incomingState?.users, chamberName);

    return nextState;
  }

  nextState.projects = [
    ...(nextState.projects || []).filter((project) => project.ownerUserId !== user.id),
    ...sanitizeProducerProjects(incomingState?.projects, user.id)
  ];

  return nextState;
}

module.exports = {
  authenticateRequest,
  canLogin,
  createSessionToken,
  filterStateForUser,
  mergeStateForUser
};

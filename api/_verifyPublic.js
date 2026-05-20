const { getLicenseState } = require("./_auth");

function publicMemberDto(user, chamberName) {
  const licenseState = getLicenseState(user);
  const statusLabel =
    licenseState === "active"
      ? "Aktif üye"
      : licenseState === "expired"
        ? "Süresi dolmuş"
        : "Pasif üye";

  return {
    chamberName: chamberName || "Oda",
    fullName: user.fullName || "",
    company: user.company || "",
    status: licenseState,
    statusLabel,
    licenseEndDate: user.licenseEndDate || "",
    role: user.role === "chamber" ? "Oda yönetimi" : "Mobilyacı"
  };
}

module.exports = { publicMemberDto };

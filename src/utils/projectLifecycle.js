/** Proje işletme durumu: varsayılan aktif (alan yoksa). */
export function isProjectActive(project) {
  const status = project?.lifecycleStatus || project?.status || "active";
  return status !== "inactive";
}

export function projectStatusLabel(project) {
  return isProjectActive(project) ? "Aktif" : "Pasif";
}

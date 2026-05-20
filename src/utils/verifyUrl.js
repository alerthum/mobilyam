export function memberVerifyUrl(verifyToken) {
  if (!verifyToken) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify/${encodeURIComponent(verifyToken)}`;
}

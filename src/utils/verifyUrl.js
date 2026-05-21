const DEFAULT_PUBLIC_ORIGIN = "https://mobilyam.vercel.app";

/** QR ve paylaşım linkleri — localhost’ta da canlı site adresi kullanılır. */
export function getPublicAppOrigin() {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    const o = window.location.origin;
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o)) {
      return o.replace(/\/$/, "");
    }
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

export function memberVerifyUrl(verifyToken) {
  if (!verifyToken) return "";
  return `${getPublicAppOrigin()}/verify/${encodeURIComponent(verifyToken)}`;
}

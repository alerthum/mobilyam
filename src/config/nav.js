import {
  Home,
  Tags,
  FileSignature,
  User,
  PlusCircle,
  Users as UsersIcon,
  LayoutDashboard,
  Settings
} from "lucide-react";

/**
 * Mobil tab bar — Coffy minimal stil. Role bazlı filtrelenir.
 *  - chamber (oda yönetimi) için: Anasayfa, Kullanıcılar, Hesabım
 *  - producer / system_admin için: Anasayfa, Fiyatlar, Yeni, Sözleşme, Hesabım
 */
export const BOTTOM_TABS = [
  {
    id: "home",
    label: "Anasayfa",
    icon: Home,
    roles: ["producer", "chamber", "system_admin"]
  },
  {
    id: "prices",
    label: "Fiyatlar",
    icon: Tags,
    roles: ["producer", "system_admin"]
  },
  {
    id: "users",
    label: "Üyeler",
    icon: UsersIcon,
    roles: ["chamber"]
  },
  {
    id: "create",
    label: "Yeni",
    icon: PlusCircle,
    roles: ["producer", "system_admin"]
  },
  {
    id: "contracts",
    label: "Sözleşme",
    icon: FileSignature,
    roles: ["producer", "system_admin"]
  },
  {
    id: "profile",
    label: "Hesabım",
    icon: User,
    roles: ["producer", "chamber", "system_admin"]
  }
];

export function bottomTabsForRole(role) {
  return BOTTOM_TABS.filter((tab) =>
    tab.roles.includes(role || "producer")
  );
}

/** Masaüstü kenar çubuğu — role bazlı erişim */
export const SIDEBAR_NAV = [
  { id: "home", label: "Ana Sayfa", icon: Home, roles: ["producer", "chamber", "system_admin"] },
  { id: "prices", label: "Fiyatlar", icon: Tags, roles: ["producer", "system_admin"] },
  { id: "contracts", label: "Sözleşmeler", icon: FileSignature, roles: ["producer", "system_admin"] },
  { id: "users", label: "Kullanıcılar", icon: UsersIcon, roles: ["chamber", "system_admin"] },
  { id: "dashboard", label: "Özet", icon: LayoutDashboard, roles: ["chamber", "system_admin"] },
  { id: "profile", label: "Profil", icon: User, roles: ["producer", "chamber", "system_admin"] },
  { id: "settings", label: "Ayarlar", icon: Settings, roles: ["chamber", "system_admin"] }
];

export function navItemsForRole(role) {
  return SIDEBAR_NAV.filter((item) => item.roles.includes(role || "producer"));
}

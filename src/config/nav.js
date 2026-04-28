import {
  Home,
  Tags,
  FileSignature,
  User,
  Users as UsersIcon,
  LayoutDashboard,
  Settings,
  BarChart3
} from "lucide-react";

/**
 * Mobil tab bar — role bazlı izolasyon.
 * system_admin: kayıtlar + profil | chamber: kayıtlar + duyuru + katalog + profil | producer: tam operasyon
 */
export const BOTTOM_TABS = [
  {
    id: "users",
    label: "Kayıtlar",
    icon: UsersIcon,
    roles: ["system_admin", "chamber"]
  },
  { id: "dashboard", label: "Duyurular", icon: LayoutDashboard, roles: ["chamber"] },
  { id: "settings", label: "Katalog", icon: Settings, roles: ["chamber"] },
  { id: "home", label: "Anasayfa", icon: Home, roles: ["producer"] },
  { id: "prices", label: "Fiyatlar", icon: Tags, roles: ["producer"] },
  { id: "contracts", label: "Teklifler", icon: FileSignature, roles: ["producer"] },
  {
    id: "producerInsights",
    label: "Özet",
    icon: BarChart3,
    roles: ["producer"]
  },
  {
    id: "profile",
    label: "Hesabım",
    icon: User,
    roles: ["producer", "chamber", "system_admin"]
  }
];

export function bottomTabsForRole(role) {
  return BOTTOM_TABS.filter((tab) => tab.roles.includes(role || "producer"));
}

export const SIDEBAR_NAV = [
  {
    id: "users",
    label: "Kayıtlar",
    icon: UsersIcon,
    roles: ["system_admin", "chamber"]
  },
  { id: "home", label: "Ana Sayfa", icon: Home, roles: ["producer"] },
  { id: "prices", label: "Fiyatlar", icon: Tags, roles: ["producer"] },
  { id: "contracts", label: "Teklifler", icon: FileSignature, roles: ["producer"] },
  {
    id: "producerInsights",
    label: "Özet",
    icon: BarChart3,
    roles: ["producer"]
  },
  { id: "dashboard", label: "Duyurular", icon: LayoutDashboard, roles: ["chamber"] },
  { id: "settings", label: "Malzeme ve hizmet", icon: Settings, roles: ["chamber"] },
  { id: "profile", label: "Profil", icon: User, roles: ["producer", "chamber", "system_admin"] }
];

export function navItemsForRole(role) {
  return SIDEBAR_NAV.filter((item) => item.roles.includes(role || "producer"));
}

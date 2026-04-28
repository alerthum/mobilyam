import {
  House,
  Wallet,
  ClipboardList,
  LineChart,
  UserRound,
  UsersRound,
  PanelsTopLeft,
  SlidersHorizontal
} from "lucide-react";

/**
 * Mobil tab bar — role bazlı izolasyon.
 * system_admin: kayıtlar + profil | chamber: kayıtlar + duyuru + katalog + profil | producer: tam operasyon
 */
export const BOTTOM_TABS = [
  {
    id: "users",
    label: "Kayıtlar",
    icon: UsersRound,
    roles: ["system_admin", "chamber"]
  },
  { id: "dashboard", label: "Duyurular", icon: PanelsTopLeft, roles: ["chamber"] },
  { id: "settings", label: "Katalog", icon: SlidersHorizontal, roles: ["chamber"] },
  { id: "home", label: "Anasayfa", icon: House, roles: ["producer"] },
  { id: "contracts", label: "Teklifler", icon: ClipboardList, roles: ["producer"] },
  {
    id: "producerInsights",
    label: "Özet",
    icon: LineChart,
    roles: ["producer"]
  },
  { id: "prices", label: "Oda Fiyat Listesi", icon: Wallet, roles: ["producer"] },
  {
    id: "profile",
    label: "Profil",
    icon: UserRound,
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
    icon: UsersRound,
    roles: ["system_admin", "chamber"]
  },
  { id: "home", label: "Ana sayfa", icon: House, roles: ["producer"] },
  { id: "contracts", label: "Teklifler", icon: ClipboardList, roles: ["producer"] },
  {
    id: "producerInsights",
    label: "Özet",
    icon: LineChart,
    roles: ["producer"]
  },
  { id: "prices", label: "Oda Fiyat Listesi", icon: Wallet, roles: ["producer"] },
  { id: "dashboard", label: "Duyurular", icon: PanelsTopLeft, roles: ["chamber"] },
  { id: "settings", label: "Malzeme ve hizmet", icon: SlidersHorizontal, roles: ["chamber"] },
  { id: "profile", label: "Profil", icon: UserRound, roles: ["producer", "chamber", "system_admin"] }
];

export function navItemsForRole(role) {
  return SIDEBAR_NAV.filter((item) => item.roles.includes(role || "producer"));
}

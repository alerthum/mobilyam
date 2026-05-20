import {
  Sofa,
  Armchair,
  Bath,
  ChefHat,
  Briefcase,
  Shirt,
  Home
} from "lucide-react";

/**
 * 2026 mimarisi: tek tip oda yapısı.
 * Her oda kendine has alanları "basic" altında, ortak alanları kökte tutar.
 *
 * Türler:
 *  - gardirop   : en/boy ×1.17 (+ kapaklı ×1.30) + komidin/karyola/şifonyer + cam
 *  - balkon     : kombi (en×boy) + balkon dolabı (en×boy, derinlik ≥60 ise +%30)
 *  - mutfak     : tavan/duvar/boy/buz vs.
 *  - banyo      : alt/üst/boy modülleri (derinlik kullanılmaz)
 *  - vestiyer   : tek boy dolap + derinlik kuralı
 *  - ofis       : masa + arşiv dolabı
 */

export const ROOM_DEFINITIONS = [
  {
    id: "gardirop",
    label: "Gardırop & Yatak Odası",
    short: "Gardırop",
    description: "Gardırop, komidin, karyola ve şifonyer tek modülde",
    accent: "from-brand-500 to-brand-700",
    icon: Sofa
  },
  {
    id: "balkon",
    label: "Balkon",
    short: "Balkon",
    description: "Kombi dolabı ve balkon dolabı",
    accent: "from-sky-500 to-sky-700",
    icon: Home
  },
  {
    id: "mutfak",
    label: "Mutfak",
    short: "Mutfak",
    description: "Üst/alt dolap, tezgâh ve boy dolap hesabı",
    accent: "from-accent-500 to-accent-700",
    icon: ChefHat
  },
  {
    id: "banyo",
    label: "Banyo",
    short: "Banyo",
    description: "Alt modül, üst dolap ve boy dolap",
    accent: "from-cyan-500 to-cyan-700",
    icon: Bath
  },
  {
    id: "vestiyer",
    label: "Vestiyer",
    short: "Vestiyer",
    description: "Hızlı boy dolap teklifi",
    accent: "from-purple-500 to-purple-700",
    icon: Shirt
  },
  {
    id: "ofis",
    label: "Ofis / Çalışma",
    short: "Ofis",
    description: "Masa ve arşiv dolabı",
    accent: "from-emerald-500 to-emerald-700",
    icon: Briefcase
  }
];

export function getRoomDefinition(type) {
  return ROOM_DEFINITIONS.find((r) => r.id === type) || ROOM_DEFINITIONS[0];
}

export function createRoom(type, options = {}) {
  const def = getRoomDefinition(type);
  const id = `ROOM-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  const base = {
    id,
    type,
    name: options.name || def.label,
    selectedQualityId: options.defaultQualityId || null,
    customHardwarePrice: 0
  };

  switch (type) {
    case "gardirop":
      return {
        ...base,
        kapakli: false,
        width: 0,
        height: 0,
        depth: 0,
        komidinler: [],
        karyolalar: [],
        sifonyerler: [],
        camlar: []
      };
    case "mutfak":
      return {
        ...base,
        basic: {
          ceilingHeight: 0,
          wallWidth: 0,
          doorWidth: 0,
          boyDolapEn: 0,
          buzDolapEn: 0,
          buzYanakAdet: 0,
          kademeliMutfak: false,
          tezgahM2: 0,
          countertopCatalogId: "",
          countertopLabel: "",
          countertopMtul: 0,
          countertopUnitPrice: 0
        }
      };
    case "banyo":
      return {
        ...base,
        basic: {
          lowerWidth: 0,
          lowerHeight: 0,
          upperWidth: 0,
          upperHeight: 0,
          tallWidth: 0,
          tallHeight: 0
        }
      };
    case "vestiyer":
      return {
        ...base,
        basic: {
          width: 0,
          height: 0,
          depth: 0
        }
      };
    case "ofis":
      return {
        ...base,
        basic: {
          masaWidth: 0,
          masaHeight: 0,
          arsivWidth: 0,
          arsivHeight: 0
        }
      };
    case "balkon":
      return {
        ...base,
        kombiWidth: 0,
        kombiHeight: 0,
        balkonWidth: 0,
        balkonHeight: 0,
        balkonDepth: 0
      };
    default:
      return base;
  }
}

export function createKomidin() {
  return {
    id: `KMD-${Math.random().toString(16).slice(2, 8)}`,
    adet: 0,
    cekmece: 2,
    width: 0,
    height: 0
  };
}

export function createKaryola() {
  return {
    id: `KRY-${Math.random().toString(16).slice(2, 8)}`,
    width: 0,
    height: 0
  };
}

export function createSifonyer() {
  return {
    id: `SFY-${Math.random().toString(16).slice(2, 8)}`,
    adet: 0,
    cekmece: 4,
    width: 0,
    height: 0,
    depth: 0
  };
}

export function createCam() {
  return {
    id: `CAM-${Math.random().toString(16).slice(2, 8)}`,
    name: "",
    price: 0
  };
}

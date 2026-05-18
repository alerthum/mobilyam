/**
 * Yokus Mobilya — merkezi hesaplama motoru.
 *
 * Tüm kurallar tek dosyada toplanmıştır. Tüm modüller (gardirop, banyo,
 * vestiyer, mutfak, ofis, balkon) buradaki yardımcılarla çalışır.
 *
 * NOT: Cm cinsinden gelen ölçüler m²'ye çevrilirken /10000'e bölünür.
 */

const num = (...candidates) => {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
};

const round = (value, digits = 2) => {
  const m = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * m) / m;
};

const cmCmToM2 = (a, b) => (Number(a || 0) * Number(b || 0)) / 10000;

/* -------------------------------------------------------------------------- */
/*                           İŞ KURALLARI: VESTİYER                            */
/* -------------------------------------------------------------------------- */

/**
 * Vestiyer / Boy Dolap derinlik kuralı:
 *  - depth ≤ 45  : en × boy
 *  - 45 < depth ≤ 60 : en × boy × 1.30
 *  - depth > 60  : en × boy × 1.45
 *
 * Eski "Dekor panel yüksekliği" alanı KALDIRILMIŞTIR.
 */
export function calcVestiyer(basic) {
  const w = num(basic.width);
  const h = num(basic.height);
  const d = num(basic.depth);
  let m2 = cmCmToM2(w, h);
  let factor = 1;
  if (d > 60) factor = 1.45;
  else if (d > 45) factor = 1.3;
  m2 *= factor;
  return {
    type: "vestiyer",
    panelEquivalentM2: round(m2, 3),
    factor,
    breakdown: [
      {
        label: "Boy dolap",
        m2: round(m2, 3),
        formula:
          d > 60
            ? "en × boy × 1.45"
            : d > 45
              ? "en × boy × 1.30"
              : "en × boy"
      }
    ]
  };
}

/* -------------------------------------------------------------------------- */
/*                       İŞ KURALLARI: GARDIROP (+ YATAK)                      */
/* -------------------------------------------------------------------------- */

/**
 * Gardırop:
 *  - "Kapak/panel alanı" ve "Kapak/panel yüksekliği" KALDIRILDI.
 *  - Toggle: kapaklı / kapaksız
 *      kapaklı  → en × boy × 1.3
 *      kapaksız → en × boy
 *  - Ana gardırop derinliği (boy dolap kuralı ile aynı):
 *      depth ≤ 45  → ilave yok
 *      45 < depth ≤ 60 → × 1.30 (%30)
 *      depth > 60  → × 1.45 (%45)
 *  - Cam çeşitleri: kullanıcı manuel ad + fiyat girer; doğrudan toplama eklenir.
 *
 * Yatak Odası ARTIK Gardırop modülünün İÇİNDEDİR:
 *  - Komidin: 2 çekmece → 1 m² × adet; diğer → en × boy × adet
 *  - Karyola: en, boy                          (alan = en × boy × 1.3)
 *  - Şifonyer: 4 çekmece → 2 m² × adet; diğer → en × boy × adet × derinlik (>45 → ×1.3)
 */

/** Komidin panel eşdeğeri (tek satır). */
function komidinPanelM2(k) {
  const adet = Math.max(0, num(k.adet));
  if (adet <= 0) return { m2: 0, formula: "", meta: "" };
  const cekmece = num(k.cekmece);
  if (cekmece === 2) {
    return {
      m2: adet * 1,
      formula: "2 çekmece: 1 m² × adet",
      meta: "Sabit panel (2 çekmece)"
    };
  }
  const cw = num(k.width);
  const ch = num(k.height);
  if (cw > 0 && ch > 0) {
    return {
      m2: cmCmToM2(cw, ch) * adet,
      formula: "en × boy × adet",
      meta: cekmece > 0 ? `Çekmece: ${cekmece} adet` : undefined
    };
  }
  return { m2: 0, formula: "", meta: "" };
}

/** Şifonyer panel eşdeğeri (tek satır). */
function sifonyerPanelM2(s) {
  const adet = Math.max(0, num(s.adet));
  if (adet <= 0) return { m2: 0, formula: "", meta: "" };
  const cekmece = num(s.cekmece);
  if (cekmece === 4) {
    return {
      m2: adet * 2,
      formula: "4 çekmece: 2 m² × adet",
      meta: "Sabit panel (4 çekmece)"
    };
  }
  const cw = num(s.width);
  const ch = num(s.height);
  const cd = num(s.depth);
  if (cw > 0 && ch > 0) {
    const depthFactor = cd > 45 ? 1.3 : 1;
    const formula =
      cd > 45 ? "en × boy × adet × 1.30 (derinlik > 45)" : "en × boy × adet";
    return {
      m2: cmCmToM2(cw, ch) * adet * depthFactor,
      formula,
      meta: `Çekmece: ${cekmece} adet · Derinlik: ${cd} cm`
    };
  }
  return { m2: 0, formula: "", meta: "" };
}

/** Karyola panel eşdeğeri (tek satır). */
function karyolaPanelM2(k) {
  const cw = num(k.width);
  const ch = num(k.height);
  if (cw > 0 && ch > 0) {
    return {
      m2: cmCmToM2(cw, ch) * 1.3,
      formula: "en × boy × 1.30"
    };
  }
  return { m2: 0, formula: "" };
}

export function previewKomidinM2(k) {
  const { m2, formula } = komidinPanelM2(k);
  return { m2: round(m2, 3), formula: formula || "—" };
}

export function previewSifonyerM2(s) {
  const { m2, formula } = sifonyerPanelM2(s);
  return { m2: round(m2, 3), formula: formula || "—" };
}

export function previewKaryolaM2(k) {
  const { m2, formula } = karyolaPanelM2(k);
  return { m2: round(m2, 3), formula: formula || "—" };
}

export function calcGardirop(room) {
  const w = num(room.width);
  const h = num(room.height);
  const d = num(room.depth);
  const wardrobeFactor = room.kapakli ? 1.3 : 1;
  let depthFactor = 1;
  if (d > 60) depthFactor = 1.45;
  else if (d > 45) depthFactor = 1.3;

  const wardrobeM2 = cmCmToM2(w, h) * wardrobeFactor * depthFactor;

  const breakdown = [];
  if (w > 0 && h > 0) {
    const kapakPart = room.kapakli ? " × 1.30 (kapak)" : "";
    const depthPart =
      d > 60 ? " × 1.45 (derinlik > 60)" : d > 45 ? " × 1.30 (derinlik 46–60)" : "";
    breakdown.push({
      label: room.kapakli ? "Gardırop (Kapaklı)" : "Gardırop (Kapaksız)",
      m2: round(wardrobeM2, 3),
      formula: `en × boy${kapakPart}${depthPart}`.trim() || "en × boy"
    });
  }

  // Komidin
  const komidinList = Array.isArray(room.komidinler) ? room.komidinler : [];
  let komidinM2 = 0;
  komidinList.forEach((k, idx) => {
    const { m2, formula, meta } = komidinPanelM2(k);
    if (m2 > 0) {
      const adet = Math.max(0, num(k.adet));
      komidinM2 += m2;
      breakdown.push({
        label: `Komidin #${idx + 1} × ${adet}`,
        m2: round(m2, 3),
        formula,
        ...(meta ? { meta } : {})
      });
    }
  });

  // Karyola
  const karyolaList = Array.isArray(room.karyolalar) ? room.karyolalar : [];
  let karyolaM2 = 0;
  karyolaList.forEach((k, idx) => {
    const { m2, formula } = karyolaPanelM2(k);
    if (m2 > 0) {
      karyolaM2 += m2;
      breakdown.push({
        label: `Karyola #${idx + 1}`,
        m2: round(m2, 3),
        formula
      });
    }
  });

  // Şifonyer
  const sifonyerList = Array.isArray(room.sifonyerler) ? room.sifonyerler : [];
  let sifonyerM2 = 0;
  sifonyerList.forEach((s, idx) => {
    const { m2, formula, meta } = sifonyerPanelM2(s);
    if (m2 > 0) {
      const adet = Math.max(0, num(s.adet));
      sifonyerM2 += m2;
      breakdown.push({
        label: `Şifonyer #${idx + 1} × ${adet}`,
        m2: round(m2, 3),
        formula,
        ...(meta ? { meta } : {})
      });
    }
  });

  // Cam çeşitleri (m² etkisi YOK; doğrudan TL eklenir)
  const camlar = Array.isArray(room.camlar) ? room.camlar : [];
  const glassExtra = camlar.reduce(
    (acc, g) => acc + Math.max(0, num(g.price)),
    0
  );

  const panelEquivalentM2 = wardrobeM2 + komidinM2 + karyolaM2 + sifonyerM2;

  return {
    type: "gardirop",
    panelEquivalentM2: round(panelEquivalentM2, 3),
    glassExtra: round(glassExtra, 2),
    breakdown,
    glassLines: camlar.map((g) => ({
      name: g.name || "Cam",
      price: round(num(g.price), 2)
    }))
  };
}

/* -------------------------------------------------------------------------- */
/*                              İŞ KURALLARI: BANYO                            */
/* -------------------------------------------------------------------------- */

/**
 * Banyo:
 *  - "Üst modül derinliği" KALDIRILDI.
 *  - Alt modül   → en × boy × 1.30
 *  - Boy dolap   → en × boy × 1.30
 *  - Üst modül   → en × boy            (derinlik kullanılmıyor)
 *  - Derinlik HİÇBİR yerde hesaba katılmaz.
 */
export function calcBanyo(basic) {
  const lowerW = num(basic.lowerWidth);
  const lowerH = num(basic.lowerHeight);
  const upperW = num(basic.upperWidth);
  const upperH = num(basic.upperHeight);
  const tallW = num(basic.tallWidth);
  const tallH = num(basic.tallHeight);

  const lowerM2 = cmCmToM2(lowerW, lowerH) * 1.3;
  const upperM2 = cmCmToM2(upperW, upperH);
  const tallM2 = cmCmToM2(tallW, tallH) * 1.3;

  const breakdown = [];
  if (lowerW > 0 && lowerH > 0)
    breakdown.push({
      label: "Alt modül",
      m2: round(lowerM2, 3),
      formula: "en × boy × 1.30"
    });
  if (upperW > 0 && upperH > 0)
    breakdown.push({
      label: "Üst modül",
      m2: round(upperM2, 3),
      formula: "en × boy"
    });
  if (tallW > 0 && tallH > 0)
    breakdown.push({
      label: "Boy dolap",
      m2: round(tallM2, 3),
      formula: "en × boy × 1.30"
    });

  return {
    type: "banyo",
    panelEquivalentM2: round(lowerM2 + upperM2 + tallM2, 3),
    breakdown
  };
}

/* -------------------------------------------------------------------------- */
/*                              İŞ KURALLARI: MUTFAK                           */
/* -------------------------------------------------------------------------- */

/** Ortak cm² bileşenleri — calcMutfak ve UI özeti aynı kaynaktan beslenir. */
function mutfakComponentCm2(basic) {
  const kademeliMutfak = Boolean(basic.kademeliMutfak);
  const C5 = num(basic.ceilingHeight);
  const C6 = num(basic.wallWidth);
  const C7 = num(basic.doorWidth);
  const C8 = num(basic.boyDolapEn);
  const C9 = num(basic.buzDolapEn);
  const C10 = num(basic.buzYanakAdet);

  const ustRawBase = (C5 - 140) * (C6 - C8 - C9);
  const ustDolapCm2 = kademeliMutfak
    ? Math.max(0, ustRawBase) * 1.3
    : Math.max(0, ustRawBase);
  const altDolapRaw = C6 - C7 - C8 - C9;
  const altRaw = altDolapRaw * 100 * 1.3;
  const buzRaw = (C5 - 195) * C9 * 1.3;
  const yanakRaw = C5 * 70 * C10;
  const boyRaw = C5 * C8 * 1.3;

  return {
    kademeliMutfak,
    C5,
    C6,
    C7,
    C8,
    C9,
    C10,
    altDolapRaw,
    ustDolapCm2,
    altDolapCm2: Math.max(0, altRaw),
    buzDolapCm2: Math.max(0, buzRaw),
    buzYanakCm2: Math.max(0, yanakRaw),
    boyDolapCm2: Math.max(0, boyRaw)
  };
}

/**
 * Mutfak m² özeti satırları (cm cinsinden ölçüler → cm² → m²).
 * Toplam, fiyatlamada kullanılan panel eşdeğeri ile aynıdır.
 */
export function getMutfakM2Breakdown(basic) {
  const r = mutfakComponentCm2(basic);
  const fmt = (n) =>
    Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

  const ustWide = `${fmt(r.C6)} − ${fmt(r.C8)} − ${fmt(r.C9)}`;
  const ustDetail = r.kademeliMutfak
    ? `(${fmt(r.C5)} − 140) × (${ustWide}) × 1,30 (kademeli üst dolap %30) = ${fmt(r.ustDolapCm2)} cm²`
    : `(${fmt(r.C5)} − 140) × (${ustWide}) = ${fmt(r.ustDolapCm2)} cm²`;

  const altWide = `${fmt(r.C6)} − ${fmt(r.C7)} − ${fmt(r.C8)} − ${fmt(r.C9)}`;
  const altDetail = `(${altWide}) × 100 × 1,3 = ${fmt(r.altDolapCm2)} cm²`;

  const rows = [
    {
      key: "ust",
      label: "Üst dolap",
      cm2: r.ustDolapCm2,
      m2: r.ustDolapCm2 / 10000,
      detail: ustDetail
    },
    {
      key: "alt",
      label: "Alt dolap",
      cm2: r.altDolapCm2,
      m2: r.altDolapCm2 / 10000,
      detail: altDetail
    },
    {
      key: "buz",
      label: "Buz dolap",
      cm2: r.buzDolapCm2,
      m2: r.buzDolapCm2 / 10000,
      detail: `(${fmt(r.C5)} − 195) × ${fmt(r.C9)} × 1,3 = ${fmt(r.buzDolapCm2)} cm²`
    },
    {
      key: "yanak",
      label: "Buz dolap yanak",
      cm2: r.buzYanakCm2,
      m2: r.buzYanakCm2 / 10000,
      detail: `${fmt(r.C5)} × 70 × ${fmt(r.C10)} = ${fmt(r.buzYanakCm2)} cm²`
    },
    {
      key: "boy",
      label: "Boy dolap",
      cm2: r.boyDolapCm2,
      m2: r.boyDolapCm2 / 10000,
      detail: `${fmt(r.C5)} × ${fmt(r.C8)} × 1,3 = ${fmt(r.boyDolapCm2)} cm²`
    }
  ];

  const totalCm2 = rows.reduce((s, row) => s + row.cm2, 0);
  /** Excel satırı: tezgah “uzunluk” (m); alan toplamına dahil edilmez */
  const tezgahLinearM = Math.max(0, r.altDolapRaw / 100);

  return {
    rows,
    totalCm2,
    totalM2: totalCm2 / 10000,
    tezgahLinearM,
    tezgahLinearDetail: `(Duvar − kapı − boy dolap − buz dolap) ÷ 100 = ${fmt(tezgahLinearM)} m (uzunluk, m² değil)`
  };
}

/**
 * Mutfak — Excel maliyet raporu mantığıyla uyumlu (özet):
 *  - Üst dolap   = (tavan-140) × (duvar - boyDolapEn - buzDolapEn); kademeli mutfakta sonuç ×1,30
 *  - Alt dolap raw = (duvar - kapı - boyDolap - buzDolap)
 *  - Alt dolap   = altRaw × 100 × 1.3
 *  - Tezgah mt   = altRaw / 100  (metre cinsinden uzunluk; m² toplamına girmez)
 *  - Buz dolap   = (tavan-195) × buzDolap × 1.3
 *  - Buz yanak   = tavan × 70 × yanakAdet (cm derinlik sabiti)
 *  - Boy dolap   = tavan × boyDolapEn × 1.3
 */
export function calcMutfak(basic) {
  const r = mutfakComponentCm2(basic);
  const totalCm2 =
    r.ustDolapCm2 + r.altDolapCm2 + r.buzDolapCm2 + r.buzYanakCm2 + r.boyDolapCm2;
  const tezgahMt = Math.max(0, r.altDolapRaw / 100);

  const panelEquivalentM2 = totalCm2 / 10000;

  return {
    type: "mutfak",
    panelEquivalentM2: round(panelEquivalentM2, 3),
    tezgahMt: round(tezgahMt, 2),
    breakdown: [
      {
        label: "Üst dolap",
        m2: round(r.ustDolapCm2 / 10000, 3),
        formula: r.kademeliMutfak
          ? "(tavan-140)×(duvar-boy-buz)×1,30 (kademeli)"
          : "(tavan-140) × (duvar-boy-buz)"
      },
      {
        label: "Alt dolap",
        m2: round(r.altDolapCm2 / 10000, 3),
        formula: "alt × 1.30"
      },
      {
        label: "Buz dolap",
        m2: round(r.buzDolapCm2 / 10000, 3),
        formula: "(tavan-195) × buz × 1.30"
      },
      {
        label: "Buz yanak",
        m2: round(r.buzYanakCm2 / 10000, 3),
        formula: "tavan × 70 × adet"
      },
      {
        label: "Boy dolap",
        m2: round(r.boyDolapCm2 / 10000, 3),
        formula: "tavan × boy × 1.30"
      }
    ]
  };
}

/* -------------------------------------------------------------------------- */
/*                           İŞ KURALLARI: OFİS / ÇALIŞMA                      */
/* -------------------------------------------------------------------------- */

/**
 * Ofis: Masa ve arşiv. Her ikisi de en × boy. (Detay yok.)
 */
export function calcOfis(basic) {
  const masaM2 = cmCmToM2(basic.masaWidth, basic.masaHeight);
  const arsivM2 = cmCmToM2(basic.arsivWidth, basic.arsivHeight);
  const breakdown = [];
  if (masaM2 > 0)
    breakdown.push({ label: "Masa", m2: round(masaM2, 3), formula: "en × boy" });
  if (arsivM2 > 0)
    breakdown.push({ label: "Arşiv dolabı", m2: round(arsivM2, 3), formula: "en × boy" });
  return {
    type: "ofis",
    panelEquivalentM2: round(masaM2 + arsivM2, 3),
    breakdown
  };
}

/* -------------------------------------------------------------------------- */
/*                           İŞ KURALLARI: BALKON                              */
/* -------------------------------------------------------------------------- */

/**
 * Balkon modülü:
 *  - Kombi dolabı: en × boy → m²
 *  - Balkon dolabı: ölçüler en, boy, derinlik; panel eşdeğeri en×boy m² üzerinden.
 *    Derinlik ≥ 60 cm ise +%30 (×1.30). 60 cm altında ilave yok.
 */
export function calcBalkon(room) {
  const kw = num(room.kombiWidth);
  const kh = num(room.kombiHeight);
  const bw = num(room.balkonWidth);
  const bh = num(room.balkonHeight);
  const bd = num(room.balkonDepth);

  const kombiM2 = kw > 0 && kh > 0 ? cmCmToM2(kw, kh) : 0;
  const balkonBase = bw > 0 && bh > 0 ? cmCmToM2(bw, bh) : 0;
  const depthFactor = bd >= 60 ? 1.3 : 1;
  const balkonM2 = balkonBase * depthFactor;

  const breakdown = [];
  if (kombiM2 > 0) {
    breakdown.push({
      label: "Kombi dolabı",
      m2: round(kombiM2, 3),
      formula: "en × boy"
    });
  }
  if (balkonBase > 0) {
    const depthPart = bd >= 60 ? " × 1.30 (derinlik ≥ 60 cm)" : "";
    breakdown.push({
      label: "Balkon dolabı",
      m2: round(balkonM2, 3),
      formula: `en × boy${depthPart}`.trim() || "en × boy",
      meta: bd > 0 ? `Derinlik: ${bd} cm` : undefined
    });
  }

  return {
    type: "balkon",
    panelEquivalentM2: round(kombiM2 + balkonM2, 3),
    breakdown
  };
}

/* -------------------------------------------------------------------------- */
/*                       Oda ↦ m² eşdeğeri (dispatcher)                        */
/* -------------------------------------------------------------------------- */

export function calculateRoomMetrics(room) {
  switch (room.type) {
    case "gardirop":
    case "wardrobe":
    case "bedroom":
      return calcGardirop(room);
    case "balkon":
      return calcBalkon(room);
    case "banyo":
    case "bathroom":
      return calcBanyo(room.basic || room);
    case "vestiyer":
      return calcVestiyer(room.basic || room);
    case "mutfak":
    case "kitchen":
      return calcMutfak(room.basic || room);
    case "ofis":
    case "office":
      return calcOfis(room.basic || room);
    default:
      return {
        type: room.type,
        panelEquivalentM2: 0,
        breakdown: []
      };
  }
}

/* -------------------------------------------------------------------------- */
/*                       Oda fiyatlama (kalite × m²)                           */
/* -------------------------------------------------------------------------- */

/**
 * Bir oda için fiyat kalemleri:
 *
 * - Baz (resmi oda kalemi): yalnızca m² × kalite birim fiyatı (`officialPrice` =
 *   `baseOfficial`). Cam, ek hırdavat ile aynı mantıkta ayrı kalem; ek hırdavat
 *   ve cam bu tutarı değiştirmez (teklif toplamında ayrı satırlar).
 *
 * - Mutfak tezgahı: `countertopTotal` = mtül × birim fiyat (katalog adı `countertopName`);
 *   teklif brüt toplamına `calculateQuoteTotals` içinde eklenir.
 *
 * - `customHardware`: manuel ek hırdavat; tekli oda özeti bileşen olarak döner,
 *   teklifte `hardwareExtrasTotal` altında toplanır.
 *
 * @param {Array} [countertopCatalog=[]]  Tezgah tipi adı çözümlemesi (mutfak)
 */
export function calculateRoomPrice(room, quality, countertopCatalog = []) {
  const metrics = calculateRoomMetrics(room);
  const sqmPrice = num(quality?.officialSqmPrice);
  const baseOfficial = metrics.panelEquivalentM2 * sqmPrice;
  const customHardware = Math.max(0, num(room.customHardwarePrice));
  const glassExtra = num(metrics.glassExtra);

  const officialPrice = round(baseOfficial, 2);

  let countertopTotal = 0;
  let countertopName = "";
  let countertopMtul = 0;
  let countertopUnitPrice = 0;
  if (room.type === "mutfak" || room.type === "kitchen") {
    const b = room.basic || {};
    countertopMtul = num(b.countertopMtul);
    countertopUnitPrice = Math.max(0, num(b.countertopUnitPrice));
    countertopTotal = round(countertopMtul * countertopUnitPrice, 2);
    const cid = b.countertopCatalogId;
    const item = (countertopCatalog || []).find((x) => x.id === cid);
    countertopName = String(item?.name || b.countertopLabel || "").trim();
  }

  return {
    qualityId: quality?.id ?? null,
    qualityName: quality?.name ?? "—",
    officialSqmPrice: sqmPrice,
    panelEquivalentM2: metrics.panelEquivalentM2,
    baseOfficial: round(baseOfficial, 2),
    customHardware: round(customHardware, 2),
    glassExtra: round(glassExtra, 2),
    officialPrice,
    countertopTotal,
    countertopName,
    countertopMtul,
    countertopUnitPrice,
    metrics
  };
}

/* -------------------------------------------------------------------------- */
/*                              Teklif toplamı                                 */
/* -------------------------------------------------------------------------- */

export function calculateQuoteTotals(quote, qualities, countertopCatalog = []) {
  const qualityById = new Map((qualities || []).map((q) => [q.id, q]));
  const rooms = (quote.rooms || []).map((room) => {
    const quality =
      (room.selectedQualityId && qualityById.get(room.selectedQualityId)) ||
      (qualities || [])[0];
    const price = calculateRoomPrice(room, quality, countertopCatalog);
    return { room, price };
  });

  /** Sadece m² × kalite (cam ve ek hırdavat hariç) */
  const officialRoomTotal = rooms.reduce((acc, r) => acc + r.price.baseOfficial, 0);

  const glassExtrasTotal = rooms.reduce((acc, r) => acc + r.price.glassExtra, 0);

  const hardwareExtrasTotal = rooms.reduce(
    (acc, r) => acc + r.price.customHardware,
    0
  );

  const countertopExtrasTotal = rooms.reduce(
    (acc, r) => acc + num(r.price.countertopTotal),
    0
  );

  const services = (quote.services || []).map((line) => ({
    ...line,
    total: round(num(line.quantity) * num(line.price), 2)
  }));
  const servicesTotal = services.reduce((acc, s) => acc + s.total, 0);

  /* Brüt: m²×kalite + tezgah + cam + ek hırdavat + ek hizmetler */
  const officialGrandTotal =
    officialRoomTotal +
    countertopExtrasTotal +
    glassExtrasTotal +
    hardwareExtrasTotal +
    servicesTotal;
  const rate = Math.min(100, Math.max(0, num(quote.producerDiscountRate)));
  const producerDiscount = officialGrandTotal * (rate / 100);
  const manualDiscount = Math.max(
    0,
    Math.min(officialGrandTotal, num(quote.generalDiscountAmount))
  );
  /** Oran ve tutar alanları senkron kullanılabildiği için tek etkin indirim uygulanır. */
  const totalDiscount = Math.max(producerDiscount, manualDiscount);
  const dealerGrandTotal = officialGrandTotal - totalDiscount;

  /** KDV: net (indirim sonrası) tutar üzerinden; teklif/sözleşme Genel = net + KDV. */
  const vatIncluded = quote.vatIncluded === true;
  const vatRate = Math.min(100, Math.max(0, num(quote.vatRate ?? 20)));
  const vatAmount = vatIncluded ? round(dealerGrandTotal * (vatRate / 100), 2) : 0;
  const grandTotalWithVat = round(dealerGrandTotal + vatAmount, 2);

  return {
    rooms,
    services,
    totals: {
      officialRoomTotal: round(officialRoomTotal, 2),
      glassExtrasTotal: round(glassExtrasTotal, 2),
      hardwareExtrasTotal: round(hardwareExtrasTotal, 2),
      countertopExtrasTotal: round(countertopExtrasTotal, 2),
      servicesTotal: round(servicesTotal, 2),
      officialGrandTotal: round(officialGrandTotal, 2),
      producerDiscount: round(producerDiscount, 2),
      generalDiscount: round(manualDiscount, 2),
      totalDiscount: round(totalDiscount, 2),
      dealerGrandTotal: round(dealerGrandTotal, 2),
      vatIncluded,
      vatRate,
      vatAmount,
      grandTotalWithVat
    }
  };
}

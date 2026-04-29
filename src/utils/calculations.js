/**
 * Yokus Mobilya — merkezi hesaplama motoru.
 *
 * Tüm kurallar tek dosyada toplanmıştır. Tüm modüller (gardirop, banyo,
 * vestiyer, mutfak, ofis) buradaki yardımcılarla çalışır.
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
 *  - Derinliğin hesaba ETKİSİ YOKTUR.
 *  - Cam çeşitleri: kullanıcı manuel ad + fiyat girer; doğrudan toplama eklenir.
 *
 * Yatak Odası ARTIK Gardırop modülünün İÇİNDEDİR:
 *  - Komidin: adet, çekmece sayısı, en, boy   (alan = en × boy × adet)
 *  - Karyola: en, boy                          (alan = en × boy × 1.3)
 *  - Şifonyer: en, boy, derinlik, adet, çekmece
 *      derinlik > 45 → ×1.3
 *      alan = en × boy × adet × derinlikFaktörü
 */
export function calcGardirop(room) {
  const w = num(room.width);
  const h = num(room.height);
  const wardrobeFactor = room.kapakli ? 1.3 : 1;
  const wardrobeM2 = cmCmToM2(w, h) * wardrobeFactor;

  const breakdown = [];
  if (w > 0 && h > 0) {
    breakdown.push({
      label: room.kapakli ? "Gardırop (Kapaklı)" : "Gardırop (Kapaksız)",
      m2: round(wardrobeM2, 3),
      formula: room.kapakli ? "en × boy × 1.30" : "en × boy"
    });
  }

  // Komidin
  const komidinList = Array.isArray(room.komidinler) ? room.komidinler : [];
  let komidinM2 = 0;
  komidinList.forEach((k, idx) => {
    const adet = Math.max(0, num(k.adet));
    const cw = num(k.width);
    const ch = num(k.height);
    if (adet > 0 && cw > 0 && ch > 0) {
      const m2 = cmCmToM2(cw, ch) * adet;
      komidinM2 += m2;
      breakdown.push({
        label: `Komidin #${idx + 1} × ${adet}`,
        m2: round(m2, 3),
        formula: "en × boy × adet",
        meta: `Çekmece: ${num(k.cekmece)} adet`
      });
    }
  });

  // Karyola
  const karyolaList = Array.isArray(room.karyolalar) ? room.karyolalar : [];
  let karyolaM2 = 0;
  karyolaList.forEach((k, idx) => {
    const cw = num(k.width);
    const ch = num(k.height);
    if (cw > 0 && ch > 0) {
      const m2 = cmCmToM2(cw, ch) * 1.3;
      karyolaM2 += m2;
      breakdown.push({
        label: `Karyola #${idx + 1}`,
        m2: round(m2, 3),
        formula: "en × boy × 1.30"
      });
    }
  });

  // Şifonyer
  const sifonyerList = Array.isArray(room.sifonyerler) ? room.sifonyerler : [];
  let sifonyerM2 = 0;
  sifonyerList.forEach((s, idx) => {
    const adet = Math.max(0, num(s.adet));
    const cw = num(s.width);
    const ch = num(s.height);
    const cd = num(s.depth);
    if (adet > 0 && cw > 0 && ch > 0) {
      const depthFactor = cd > 45 ? 1.3 : 1;
      const m2 = cmCmToM2(cw, ch) * adet * depthFactor;
      sifonyerM2 += m2;
      breakdown.push({
        label: `Şifonyer #${idx + 1} × ${adet}`,
        m2: round(m2, 3),
        formula:
          cd > 45 ? "en × boy × adet × 1.30 (derinlik > 45)" : "en × boy × adet",
        meta: `Çekmece: ${num(s.cekmece)} adet · Derinlik: ${cd} cm`
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
  const C5 = num(basic.ceilingHeight);
  const C6 = num(basic.wallWidth);
  const C7 = num(basic.doorWidth);
  const C8 = num(basic.boyDolapEn);
  const C9 = num(basic.buzDolapEn);
  const C10 = num(basic.buzYanakAdet);
  const C11 = num(basic.ustKorMesafe);
  const C12 = num(basic.altKorMesafe);

  const ustRaw = (C5 - 140) * (C6 - C8 - C9 - C11);
  const altDolapRaw = C6 - C7 - C8 - C9 - C12;
  const altRaw = altDolapRaw * 100 * 1.3;
  const buzRaw = (C5 - 195) * C9 * 1.3;
  const yanakRaw = C5 * 30 * C10;
  const boyRaw = C5 * C8 * 1.3;

  return {
    C5,
    C6,
    C7,
    C8,
    C9,
    C10,
    C11,
    C12,
    altDolapRaw,
    ustDolapCm2: Math.max(0, ustRaw),
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

  const rows = [
    {
      key: "ust",
      label: "Üst dolap",
      cm2: r.ustDolapCm2,
      m2: r.ustDolapCm2 / 10000,
      detail: `(${fmt(r.C5)} − 140) × (${fmt(r.C6)} − ${fmt(r.C8)} − ${fmt(r.C9)} − ${fmt(r.C11)}) = ${fmt(r.ustDolapCm2)} cm²`
    },
    {
      key: "alt",
      label: "Alt dolap",
      cm2: r.altDolapCm2,
      m2: r.altDolapCm2 / 10000,
      detail: `(${fmt(r.C6)} − ${fmt(r.C7)} − ${fmt(r.C8)} − ${fmt(r.C9)} − ${fmt(r.C12)}) × 100 × 1,3 = ${fmt(r.altDolapCm2)} cm²`
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
      detail: `${fmt(r.C5)} × 30 × ${fmt(r.C10)} = ${fmt(r.buzYanakCm2)} cm²`
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
    tezgahLinearDetail: `(Duvar − kapı − boy dolap − buz dolap − alt kör) ÷ 100 = ${fmt(tezgahLinearM)} m (uzunluk, m² değil)`
  };
}

/**
 * Mutfak — Excel maliyet raporu mantığıyla uyumlu (özet):
 *  - Üst dolap   = (tavan-140) × (duvar - boyDolapEn - buzDolapEn - üstKör)
 *  - Alt dolap raw = (duvar - kapı - boyDolap - buzDolap - altKör)
 *  - Alt dolap   = altRaw × 100 × 1.3
 *  - Tezgah mt   = altRaw / 100  (metre cinsinden uzunluk; m² toplamına girmez)
 *  - Buz dolap   = (tavan-195) × buzDolap × 1.3
 *  - Buz yanak   = tavan × 30 × yanakAdet
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
        formula: "(tavan-140) × (duvar-boy-buz-üstKör)"
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
        formula: "tavan × 30 × adet"
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
/*                       Oda ↦ m² eşdeğeri (dispatcher)                        */
/* -------------------------------------------------------------------------- */

export function calculateRoomMetrics(room) {
  switch (room.type) {
    case "gardirop":
    case "wardrobe":
    case "bedroom":
      return calcGardirop(room);
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
 * - `customHardware`: manuel ek hırdavat; tekli oda özeti bileşen olarak döner,
 *   teklifte `hardwareExtrasTotal` altında toplanır.
 */
export function calculateRoomPrice(room, quality) {
  const metrics = calculateRoomMetrics(room);
  const sqmPrice = num(quality?.officialSqmPrice);
  const baseOfficial = metrics.panelEquivalentM2 * sqmPrice;
  const customHardware = Math.max(0, num(room.customHardwarePrice));
  const glassExtra = num(metrics.glassExtra);

  const officialPrice = round(baseOfficial, 2);

  return {
    qualityId: quality?.id ?? null,
    qualityName: quality?.name ?? "—",
    officialSqmPrice: sqmPrice,
    panelEquivalentM2: metrics.panelEquivalentM2,
    baseOfficial: round(baseOfficial, 2),
    customHardware: round(customHardware, 2),
    glassExtra: round(glassExtra, 2),
    officialPrice,
    metrics
  };
}

/* -------------------------------------------------------------------------- */
/*                              Teklif toplamı                                 */
/* -------------------------------------------------------------------------- */

export function calculateQuoteTotals(quote, qualities) {
  const qualityById = new Map((qualities || []).map((q) => [q.id, q]));
  const rooms = (quote.rooms || []).map((room) => {
    const quality =
      (room.selectedQualityId && qualityById.get(room.selectedQualityId)) ||
      (qualities || [])[0];
    const price = calculateRoomPrice(room, quality);
    return { room, price };
  });

  /** Sadece m² × kalite (cam ve ek hırdavat hariç) */
  const officialRoomTotal = rooms.reduce((acc, r) => acc + r.price.baseOfficial, 0);

  const glassExtrasTotal = rooms.reduce((acc, r) => acc + r.price.glassExtra, 0);

  const hardwareExtrasTotal = rooms.reduce(
    (acc, r) => acc + r.price.customHardware,
    0
  );

  const services = (quote.services || []).map((line) => ({
    ...line,
    total: round(num(line.quantity) * num(line.price), 2)
  }));
  const servicesTotal = services.reduce((acc, s) => acc + s.total, 0);

  /* Brüt: m²×kalite + cam + ek hırdavat + ek hizmetler */
  const officialGrandTotal =
    officialRoomTotal + glassExtrasTotal + hardwareExtrasTotal + servicesTotal;
  const rate = Math.min(100, Math.max(0, num(quote.producerDiscountRate)));
  const producerDiscount = officialGrandTotal * (rate / 100);
  const manualDiscount = Math.max(
    0,
    Math.min(officialGrandTotal, num(quote.generalDiscountAmount))
  );
  /** Oran ve tutar alanları senkron kullanılabildiği için tek etkin indirim uygulanır. */
  const totalDiscount = Math.max(producerDiscount, manualDiscount);
  const dealerGrandTotal = officialGrandTotal - totalDiscount;

  return {
    rooms,
    services,
    totals: {
      officialRoomTotal: round(officialRoomTotal, 2),
      glassExtrasTotal: round(glassExtrasTotal, 2),
      hardwareExtrasTotal: round(hardwareExtrasTotal, 2),
      servicesTotal: round(servicesTotal, 2),
      officialGrandTotal: round(officialGrandTotal, 2),
      producerDiscount: round(producerDiscount, 2),
      generalDiscount: round(manualDiscount, 2),
      totalDiscount: round(totalDiscount, 2),
      dealerGrandTotal: round(dealerGrandTotal, 2)
    }
  };
}

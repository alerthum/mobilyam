const toMeter = (cm) => Number(cm || 0) / 100;
const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const num = (...candidates) => {
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
};

/**
 * Mutfak m² — satis_sozlesmesi4558.xlsm maliyet raporu (C5–C12) ile uyumlu.
 * Eski projelerdeki alan adları için geriye dönük kabuller kullanılır.
 */
export function calculateKitchenExcelMetrics(basic = {}) {
  const C5 = num(basic.ceilingHeight, basic.tallHeight, 0);
  const C6 = num(basic.wallWidth, basic.countertopWidth, basic.lowerWidth, 0);
  const C7 = num(basic.doorWidth, 0);
  const C8 = num(basic.boyDolapEn, basic.tallWidth, 0);
  const C9 = num(basic.buzDolapEn, 0);
  const C10 = num(basic.buzYanakAdet, 0);
  const C11 = num(basic.ustKorMesafe, 0);
  const C12 = num(basic.altKorMesafe, 0);

  const ustDolap = (C5 - 140) * (C6 - C8 - C9 - C11);
  const altDolapRaw = C6 - C7 - C8 - C9 - C12;
  const altDolap = altDolapRaw * 100 * 1.3;
  const tezgah = altDolapRaw / 100;
  const buzDolap = (C5 - 195) * C9 * 1.3;
  const buzYanak = C5 * 30 * C10;
  const boyDolap = C5 * C8 * 1.3;

  const toplamM2 = (ustDolap + altDolap + tezgah + buzDolap + buzYanak + boyDolap) / 10000;

  return {
    lines: {
      ustDolap: round(ustDolap),
      altDolap: round(altDolap),
      tezgah: round(tezgah),
      buzDolap: round(buzDolap),
      buzYanak: round(buzYanak),
      boyDolap: round(boyDolap)
    },
    toplamM2: round(toplamM2),
    tezgahMt: round(tezgah),
    netTezgahCm: round(altDolapRaw)
  };
}

const TYPE_FACTORS = {
  kitchen: { area: 1, labor: 1, install: 1.08 },
  wardrobe: { area: 0.96, labor: 1.04, install: 0.92 },
  bathroom: { area: 0.86, labor: 0.92, install: 0.88 },
  vestiyer: { area: 0.9, labor: 0.96, install: 0.9 },
  bedroom: { area: 0.94, labor: 1, install: 0.92 },
  office: { area: 0.88, labor: 0.92, install: 0.9 }
};

function getTypeFactor(type) {
  return TYPE_FACTORS[type] || TYPE_FACTORS.kitchen;
}

export function calculateRoomBase(room) {
  const factor = getTypeFactor(room.type);
  const basic = room.basic || {};
  const details = room.details || {};

  if (room.type === "kitchen") {
    const k = calculateKitchenExcelMetrics(basic);
    const wallM = toMeter(num(basic.wallWidth, basic.countertopWidth, basic.lowerWidth, 0));
    const panelEquivalentM2 = k.toplamM2;
    const edgeBandMt = round(Math.max(0, wallM) * 6);
    const laborHours = round(Math.max(2, panelEquivalentM2 * 6 + num(details.doorCount) * 0.18 + num(details.drawerCount) * 0.34));
    const installMt = round(Math.max(0, wallM * 2.2));

    return {
      panelEquivalentM2,
      bodyAreaM2: round(panelEquivalentM2 * 0.85),
      frontAreaM2: round(panelEquivalentM2 * 0.12),
      edgeBandMt,
      laborHours,
      installMt,
      countertopMt: k.tezgahMt,
      detailFactor: round(
        1 +
          num(details.doorCount) * 0.012 +
          num(details.drawerCount) * 0.018 +
          num(details.shelfCount) * 0.009 +
          num(details.liftCount) * 0.026 +
          num(details.glassDoorCount) * 0.03
      ),
      detailCounts: {
        doorCount: Number(details.doorCount || 0),
        drawerCount: Number(details.drawerCount || 0),
        shelfCount: Number(details.shelfCount || 0),
        liftCount: Number(details.liftCount || 0),
        glassDoorCount: Number(details.glassDoorCount || 0)
      },
      kitchenExcel: k
    };
  }

  const lowerWidth = toMeter(basic.lowerWidth);
  const lowerHeight = toMeter(basic.lowerHeight);
  const lowerDepth = toMeter(basic.lowerDepth);
  const upperWidth = toMeter(basic.upperWidth);
  const upperHeight = toMeter(basic.upperHeight);
  const upperDepth = toMeter(basic.upperDepth);
  const tallWidth = toMeter(basic.tallWidth);
  const tallHeight = toMeter(basic.tallHeight);
  const tallDepth = toMeter(basic.tallDepth);
  const panelWidth = toMeter(basic.panelWidth);
  const panelHeight = toMeter(basic.panelHeight);
  const countertopWidth = toMeter(basic.countertopWidth);
  const countertopDepth = toMeter(basic.countertopDepth);

  const lowerBodyArea = lowerWidth * (lowerHeight * 1.46 + lowerDepth * 1.82);
  const upperBodyArea = upperWidth * (upperHeight * 1.32 + upperDepth * 1.55);
  const tallBodyArea = tallWidth * (tallHeight * 1.58 + tallDepth * 1.96);
  const panelArea = panelWidth * panelHeight * 0.7;
  const countertopArea = countertopWidth * countertopDepth;

  const frontArea =
    lowerWidth * lowerHeight * 0.62 +
    upperWidth * upperHeight * 0.68 +
    tallWidth * tallHeight * 0.78 +
    panelArea * 0.16;

  const totalBaseArea = (lowerBodyArea + upperBodyArea + tallBodyArea + panelArea + frontArea) * factor.area;
  const detailFactor =
    1 +
    Number(details.doorCount || 0) * 0.012 +
    Number(details.drawerCount || 0) * 0.018 +
    Number(details.shelfCount || 0) * 0.009 +
    Number(details.liftCount || 0) * 0.026 +
    Number(details.glassDoorCount || 0) * 0.03;

  const panelEquivalentM2 = totalBaseArea * detailFactor + countertopArea * 0.18;
  const edgeBandMt =
    lowerWidth * 7.4 +
    upperWidth * 6.1 +
    tallWidth * 8.4 +
    Number(details.doorCount || 0) * 1.24 +
    Number(details.drawerCount || 0) * 1.12 +
    Number(details.shelfCount || 0) * 0.88;

  const laborHours =
    (lowerWidth * 2.2 +
      upperWidth * 1.7 +
      tallWidth * 2.6 +
      panelWidth * 0.6 +
      countertopWidth * 0.4 +
      Number(details.drawerCount || 0) * 0.34 +
      Number(details.doorCount || 0) * 0.18 +
      Number(details.liftCount || 0) * 0.32) *
    factor.labor;

  const installMt = (lowerWidth + upperWidth + tallWidth + countertopWidth) * factor.install;

  return {
    panelEquivalentM2: round(panelEquivalentM2),
    bodyAreaM2: round(lowerBodyArea + upperBodyArea + tallBodyArea + panelArea),
    frontAreaM2: round(frontArea),
    edgeBandMt: round(edgeBandMt),
    laborHours: round(laborHours),
    installMt: round(installMt),
    countertopMt: round(countertopWidth),
    detailFactor: round(detailFactor),
    detailCounts: {
      doorCount: Number(details.doorCount || 0),
      drawerCount: Number(details.drawerCount || 0),
      shelfCount: Number(details.shelfCount || 0),
      liftCount: Number(details.liftCount || 0),
      glassDoorCount: Number(details.glassDoorCount || 0)
    }
  };
}

export function calculateRoomForQuality(room, quality, chamber, hardwarePackage) {
  const base = calculateRoomBase(room);
  const pkg = hardwarePackage || {
    hingePrice: 0,
    drawerPrice: 0,
    railPrice: 0,
    handlePrice: 0,
    liftPrice: 0,
    glassDoorPremium: 0
  };
  const useHardware = room.includeHardwarePackage !== false;
  const hardwareCost = useHardware
    ? base.detailCounts.doorCount * pkg.hingePrice +
      base.detailCounts.drawerCount * pkg.drawerPrice +
      base.detailCounts.drawerCount * pkg.railPrice +
      (base.detailCounts.doorCount + base.detailCounts.drawerCount) * pkg.handlePrice +
      base.detailCounts.liftCount * pkg.liftPrice +
      base.detailCounts.glassDoorCount * pkg.glassDoorPremium +
      Number(room.details?.customHardwarePrice || 0)
    : Number(room.details?.customHardwarePrice || 0);

  const materialCost = base.panelEquivalentM2 * quality.officialSqmPrice;
  const laborCost = base.laborHours * chamber.laborHourlyRate;
  const installationCost = base.installMt * chamber.installationMtPrice;
  const packagingCost = base.panelEquivalentM2 * chamber.packagingSqmPrice;
  const directCost = materialCost + laborCost + installationCost + packagingCost + hardwareCost;
  const sqmOfficialTotal = base.panelEquivalentM2 * quality.officialSqmPrice;
  const overheadCost = directCost * chamber.overheadRate;
  const chamberMargin = (directCost + overheadCost) * chamber.chamberMarginRate;
  const referencePrice = directCost + overheadCost + chamberMargin;

  return {
    qualityId: quality.id,
    qualityName: quality.name,
    officialSqmPrice: quality.officialSqmPrice,
    officialPrice: round(sqmOfficialTotal),
    sqmOfficialTotal: round(sqmOfficialTotal),
    referencePrice: round(referencePrice),
    directCost: round(directCost),
    hardwareCost: round(hardwareCost),
    materialCost: round(materialCost),
    laborCost: round(laborCost),
    installationCost: round(installationCost),
    packagingCost: round(packagingCost),
    metrics: base
  };
}

function mergeServiceLines(primary, contractExtras) {
  const map = new Map();
  for (const line of [...(primary || []), ...(contractExtras || [])]) {
    if (!line?.id) continue;
    const q = Number(line.quantity || 0);
    if (q <= 0) continue;
    map.set(line.id, (map.get(line.id) || 0) + q);
  }
  return [...map.entries()].map(([id, quantity]) => ({ id, quantity }));
}

/** Teklif satırı: odalar + teklif içi hizmetler + indirimler. */
export function calculateQuote(quote, remoteState) {
  return calculateProject(
    {
      rooms: quote.rooms || [],
      services: quote.services || [],
      producerDiscountRate: quote.producerDiscountRate,
      generalDiscountAmount: quote.generalDiscountAmount
    },
    remoteState
  );
}

/** Sözleşme: teklif + sözleşmede işaretlenen ek hizmetler. */
export function calculateContractDocument(quote, remoteState) {
  const services = mergeServiceLines(quote.services, quote.contractServiceLines);
  return calculateProject(
    {
      rooms: quote.rooms || [],
      services,
      producerDiscountRate: quote.producerDiscountRate,
      generalDiscountAmount: quote.generalDiscountAmount
    },
    remoteState
  );
}

function emptyQualitySelection(base) {
  return {
    qualityId: null,
    qualityName: "—",
    officialSqmPrice: 0,
    officialPrice: 0,
    sqmOfficialTotal: 0,
    referencePrice: 0,
    directCost: 0,
    hardwareCost: 0,
    materialCost: 0,
    laborCost: 0,
    installationCost: 0,
    packagingCost: 0,
    metrics: base
  };
}

export function calculateProject(project, remoteState) {
  const roomResults = project.rooms.map((room) => {
    const hardwarePackage =
      remoteState.hardwarePackages.find((item) => item.id === room.hardwarePackageId) ||
      remoteState.hardwarePackages[0];

    const qualityOptions = remoteState.qualities.map((quality) =>
      calculateRoomForQuality(room, quality, remoteState.chamber, hardwarePackage)
    );

    const base = calculateRoomBase(room);
    const selected = room.selectedQualityId
      ? qualityOptions.find((option) => option.qualityId === room.selectedQualityId) || qualityOptions[0]
      : emptyQualitySelection(base);

    return {
      roomId: room.id,
      roomName: room.name,
      hardwarePackageName: hardwarePackage?.name || "—",
      qualityOptions,
      selected
    };
  });

  const services = (project.services || [])
    .map((line) => {
      const catalog = remoteState.servicesCatalog.find((item) => item.id === line.id);
      const quantity = Number(line.quantity || 0);
      const total = quantity * Number(catalog?.price || 0);
      return {
        id: line.id,
        name: catalog?.name || line.id,
        unit: catalog?.unit || "adet",
        quantity,
        total: round(total)
      };
    })
    .filter((line) => line.quantity > 0);

  const officialRoomTotal = roomResults.reduce((sum, room) => sum + room.selected.officialPrice, 0);
  const servicesTotal = services.reduce((sum, line) => sum + line.total, 0);
  const officialGrandTotal = officialRoomTotal + servicesTotal;
  const producerDiscount = officialRoomTotal * ((Number(project.producerDiscountRate || 0) || 0) / 100);
  const generalDiscountAmount = Number(project.generalDiscountAmount || 0);
  const dealerGrandTotal = officialGrandTotal - producerDiscount - generalDiscountAmount;
  const panelTotal = roomResults.reduce((sum, room) => sum + room.selected.metrics.panelEquivalentM2, 0);
  const directCostTotal = roomResults.reduce((sum, room) => sum + room.selected.directCost, 0);
  const grossProfit = dealerGrandTotal - directCostTotal - servicesTotal;
  const grossProfitRate = dealerGrandTotal > 0 ? (grossProfit / dealerGrandTotal) * 100 : 0;
  const minimumRecommendedPrice = directCostTotal * (1 + remoteState.chamber.minimumProfitRate);

  return {
    roomResults,
    services,
    totals: {
      officialRoomTotal: round(officialRoomTotal),
      servicesTotal: round(servicesTotal),
      officialGrandTotal: round(officialGrandTotal),
      producerDiscount: round(producerDiscount),
      generalDiscountAmount: round(generalDiscountAmount),
      totalDiscount: round(producerDiscount + generalDiscountAmount),
      dealerGrandTotal: round(dealerGrandTotal),
      netGrandTotal: round(dealerGrandTotal),
      panelTotal: round(panelTotal),
      directCostTotal: round(directCostTotal),
      grossProfit: round(grossProfit),
      grossProfitRate: round(grossProfitRate),
      minimumRecommendedPrice: round(minimumRecommendedPrice)
    }
  };
}

export function buildInsight(projectCalc, chamberName, storageMode) {
  if (storageMode === "live") {
    return `${chamberName} verileri canlı veritabanından geliyor. Toplam teklif her değişiklikte senkron tutuluyor.`;
  }

  if (projectCalc.totals.dealerGrandTotal < projectCalc.totals.minimumRecommendedPrice) {
    return "İndirim seviyesi çok yüksek. Nihai teklif oda karlılık eşiğinin altına indi.";
  }

  if (projectCalc.totals.grossProfitRate < 8) {
    return "Kar marjı düşük. Hırdavat paketi veya genel indirim oranı tekrar gözden geçirilebilir.";
  }

  return "İlk teklif için temel ölçüler yeterli. Detay eklendikçe fiyat daha hassas hale gelir.";
}

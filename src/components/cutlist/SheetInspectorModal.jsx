import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Scan,
  Layers,
  Scissors,
  Square,
  Percent,
  Sparkles,
  Info
} from "lucide-react";
import clsx from "clsx";
import { SheetSvg } from "./SheetVisualizer.jsx";
import { formatStatNumber, formatPercent } from "../../lib/cutlist/sheetStats.js";

/**
 * @typedef {import('../../lib/cutlist/types.js').CutSheet} CutSheet
 */

/**
 * @param {number} n
 */
function pctRound(n) {
  return Math.round(n);
}

/**
 * @param {number} n
 */
function fmtDim(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  return v.toFixed(1).replace(".", ",");
}

/**
 * Premium CAD & Tomografi Stili Levha İnceleme Modalı
 * - 90° Döndürme (Yatar daire / ebatlama makinesi eksenine göre)
 * - Yakınlaştırma (Zoom in / out / reset)
 * - Tıklayıp sürükleme (Pan & drag)
 * - Parça teşhisi ve canlı HUD bilgi penceresi
 * - "Oda Ekle" modalı premium tasarım diliyle uyumlu kartlar ve mikro-etkileşimler
 */
export default function SheetInspectorModal({
  open,
  onClose,
  sheet,
  sheetIndex = 0,
  totalSheets = 1,
  onPrevSheet,
  onNextSheet
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(90);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredPart, setHoveredPart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  // Modal veya levha değiştiğinde görünümü 90° yatay olarak başlat
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(90);
      setPan({ x: 0, y: 0 });
      setHoveredPart(null);
    }
  }, [open, sheetIndex]);

  // Klavye kısayolları (Esc kapatır, sol/sağ ok levha değiştirir, R döndürür)
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === "ArrowLeft" && onPrevSheet && sheetIndex > 0) {
        onPrevSheet();
      } else if (e.key === "ArrowRight" && onNextSheet && sheetIndex < totalSheets - 1) {
        onNextSheet();
      } else if (e.key.toLowerCase() === "r") {
        setRotation((r) => (r + 90) % 360);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, sheetIndex, totalSheets, onClose, onPrevSheet, onNextSheet]);

  // Mouse ile sürükleme (Pan)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Sadece sol tık
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Dokunmatik ekranla sürükleme (Mobil / Tablet atölye kullanımı)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom kontrolleri
  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)));
  const handleRotateCw = () => setRotation((r) => (r + 90) % 360);
  const handleRotateCcw = () => setRotation((r) => (r + 270) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(90);
    setPan({ x: 0, y: 0 });
  };

  const sheetAspect = sheet ? sheet.width / sheet.height : 1;
  const isRotatedSideways = rotation === 90 || rotation === 270;

  // Yatay veya dikey çevrildiğinde boşlukları doldurmak için akıllı ölçekleme
  const orientationMultiplier = useMemo(() => {
    if (!isRotatedSideways) return 1;
    if (sheetAspect < 0.75) {
      return Math.min(2.1, +(1 / sheetAspect * 0.78).toFixed(2));
    }
    if (sheetAspect > 1.3) {
      return Math.min(1.8, +(sheetAspect * 0.75).toFixed(2));
    }
    return 1.35;
  }, [isRotatedSideways, sheetAspect]);

  const currentScale = +(zoom * orientationMultiplier).toFixed(2);

  if (!open || !sheet) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-1 sm:p-2.5 md:p-3.5">
      {/* Arka plan backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-md yk-animate-fade"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Ana Modal Kartı */}
      <div
        className={clsx(
          "relative w-full max-w-[98vw] 2xl:max-w-[1520px] h-[96vh] max-h-[98vh] flex flex-col",
          "bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden",
          "yk-pop yk-animate-pop border border-ink-100/80"
        )}
      >
        {/* Üst Başlık & Kontrol Çubuğu */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-ink-100 bg-surface-50/80 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-brand-50 text-brand-600 border border-brand-200">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                CAD & Ebatlama Diagnostiği
              </span>
              <span className="hidden sm:inline-block text-xs text-ink-400 font-medium">
                {rotation !== 0 ? `· ${rotation}° Açılı Görünüm` : "· Normal Yön"}
              </span>
            </div>
            <h3 className="yk-display text-lg sm:text-2xl text-ink-900 mt-1">
              Levha {sheetIndex + 1}{" "}
              <span className="text-brand-500">
                · {sheet.label || "Plaka"} İnceleme
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sayfalar Arası Geçiş */}
            <div className="flex items-center gap-1 bg-white border border-ink-200 rounded-xl px-1.5 py-1 shadow-sm">
              <button
                type="button"
                onClick={onPrevSheet}
                disabled={sheetIndex <= 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Önceki levha"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs sm:text-sm font-bold text-ink-800 px-1.5 tabular-nums">
                {sheetIndex + 1} / {totalSheets}
              </span>
              <button
                type="button"
                onClick={onNextSheet}
                disabled={sheetIndex >= totalSheets - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Sonraki levha"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Kapat Butonu */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-400 hover:text-ink-800 hover:bg-ink-100 transition-colors"
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Orta Alan: İnteraktif Tomografi / CAD Çizim Alanı */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={clsx(
            "relative flex-1 min-h-[380px] overflow-hidden select-none",
            "bg-[#f8fafc] flex items-center justify-center",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        >
          {/* Yüzen CAD / Tomografi Kontrol Paneli */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-2xl bg-ink-900/90 text-white backdrop-blur-md shadow-xl border border-white/10">
            {/* Döndürme Butonları */}
            <button
              type="button"
              onClick={handleRotateCcw}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition"
              title="90° Sola Döndür"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={handleRotateCw}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 text-brand-300 hover:text-brand-200 transition font-semibold text-xs"
              title="90° Sağa Döndür"
            >
              <RotateCw size={16} />
              <span className="hidden sm:inline">Döndür</span>
              <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded text-white font-mono">
                {rotation}°
              </span>
            </button>

            <div className="w-px h-4 bg-white/20 mx-0.5" />

            {/* Yakınlaştırma Butonları */}
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition"
              title="Uzaklaştır"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-medium text-slate-200 min-w-[3rem] text-center">
              %{Math.round(zoom * 100)}
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition"
              title="Yakınlaştır"
            >
              <ZoomIn size={16} />
            </button>

            <div className="w-px h-4 bg-white/20 mx-0.5" />

            {/* Sıfırla & Odakla */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition"
              title="Görünümü Sıfırla"
            >
              <Maximize2 size={16} />
            </button>

            {/* Ölçüleri Aç / Kapa */}
            <button
              type="button"
              onClick={() => setShowLabels((v) => !v)}
              className={clsx(
                "p-1.5 rounded-lg transition",
                showLabels
                  ? "bg-brand-500/30 text-brand-300"
                  : "hover:bg-white/15 text-slate-400"
              )}
              title={showLabels ? "Ölçüleri Gizle" : "Ölçüleri Göster"}
            >
              <Layers size={16} />
            </button>
          </div>

          {/* Sol Üst Canlı Parça Teşhisi HUD Kartı (Hover yapıldığında çıkar) */}
          {hoveredPart ? (
            <div className="absolute bottom-3 left-3 sm:top-3 sm:bottom-auto z-20 max-w-xs bg-ink-900/90 text-white backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/15 yk-pop text-xs space-y-1">
              <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-1">
                <span className="font-bold text-brand-400 text-[11px] uppercase tracking-wide flex items-center gap-1">
                  <Scan size={12} /> Parça Teşhisi
                </span>
                <span className="text-[10px] text-slate-400">ID: {hoveredPart.id}</span>
              </div>
              <p className="font-semibold text-sm text-white pt-0.5 truncate">
                {hoveredPart.label || "İsimsiz Parça"}
              </p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-slate-300 pt-1">
                <div>
                  Boy × En:{" "}
                  <span className="font-bold text-white">
                    {fmtDim(hoveredPart.height)} × {fmtDim(hoveredPart.width)} cm
                  </span>
                </div>
                <div>
                  Alan:{" "}
                  <span className="font-bold text-white">
                    {formatStatNumber(hoveredPart.width * hoveredPart.height)} cm²
                  </span>
                </div>
              </div>
              {hoveredPart.edgeBanding && (
                <div className="pt-1 border-t border-white/10 text-[10px] text-slate-300">
                  <span className="text-slate-400">PVC Bant: </span>
                  {[
                    hoveredPart.edgeBanding.top && "Üst",
                    hoveredPart.edgeBanding.bottom && "Alt",
                    hoveredPart.edgeBanding.left && "Sol",
                    hoveredPart.edgeBanding.right && "Sağ"
                  ]
                    .filter(Boolean)
                    .join(", ") || "Yok"}
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex absolute bottom-3 left-3 z-10 items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-ink-100 text-[11px] text-ink-500 shadow-sm">
              <Info size={13} className="text-brand-500" />
              <span>Parçaların üzerine gelerek teşhis bilgilerini görebilirsiniz</span>
            </div>
          )}

          {/* Dönen ve Yakınlaşan Vektörel SVG Çizimi */}
          <div
            className="transition-transform duration-200 ease-out origin-center flex items-center justify-center pointer-events-auto"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${currentScale}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            <SheetSvg
              sheet={sheet}
              showLabels={showLabels}
              hoveredPartId={hoveredPart?.id}
              onPartHover={setHoveredPart}
              className="block drop-shadow-lg select-none bg-white rounded-xl"
              style={{
                width: "auto",
                height: "auto",
                maxHeight: "min(58vh, 620px)",
                maxWidth: "min(92vw, 1150px)"
              }}
            />
          </div>
        </div>

        {/* Alt Bilgi & Atölye Kartları — "Oda Ekle" modalı premium tasarım dili */}
        <div className="p-2.5 sm:p-4 border-t border-ink-100 bg-white shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Kart 1: Plaka Ebadı */}
            <div className="yk-card !p-2.5 sm:!p-3 text-left bg-surface-50 border border-ink-100 flex items-start gap-2.5 sm:gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Square size={17} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">
                  Plaka Ebadı
                </p>
                <p className="text-xs sm:text-sm font-bold text-ink-900 truncate">
                  {fmtDim(sheet.width)} × {fmtDim(sheet.height)} cm
                </p>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">
                  {formatStatNumber(sheet.totalArea || sheet.width * sheet.height)} cm² alan
                </p>
              </div>
            </div>

            {/* Kart 2: Verimlilik & Fire */}
            <div className="yk-card !p-3 text-left bg-surface-50 border border-ink-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Percent size={17} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">
                  Verimlilik
                </p>
                <p className="text-xs sm:text-sm font-bold text-emerald-600 truncate">
                  %{pctRound(sheet.efficiencyPercent)} Kullanım
                </p>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">
                  %{pctRound(sheet.wastePercent ?? 100 - sheet.efficiencyPercent)} Boş / Fire
                </p>
              </div>
            </div>

            {/* Kart 3: Parça & Kesim */}
            <div className="yk-card !p-3 text-left bg-surface-50 border border-ink-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Scissors size={17} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">
                  Kesim Adımı
                </p>
                <p className="text-xs sm:text-sm font-bold text-ink-900 truncate">
                  {sheet.cutSteps?.length || sheet.cutCount || 0} Adım Bıçak
                </p>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">
                  {formatStatNumber(sheet.cutLength || 0)} cm Toplam Yol
                </p>
              </div>
            </div>

            {/* Kart 4: Parça Sayısı & Bant */}
            <div className="yk-card !p-3 text-left bg-surface-50 border border-ink-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={17} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">
                  Yerleşen Parça
                </p>
                <p className="text-xs sm:text-sm font-bold text-ink-900 truncate">
                  {sheet.placedParts.length} Adet Parça
                </p>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">
                  {(sheet.edgeBandingLength ?? 0) > 0
                    ? `${formatStatNumber(sheet.edgeBandingLength)} cm PVC`
                    : "Bantsız Kesim"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import clsx from "clsx";
import logoUrl from "../../assets/mobar-logo.png";

/**
 * MOBAR 2026 — proje genelinde kullanılan reusable logo bileşeni.
 *
 * Props:
 *  - size: number (px) — logo görselinin kenar uzunluğu (default 40)
 *  - variant: "plain" | "tile" | "tile-dark" — kart biçimi
 *      plain: arka plansız sade görsel
 *      tile: beyaz kart + ince border + soft shadow (light tema)
 *      tile-dark: koyu kart, beyaz görsel için (hero ve dark sidebar üstünde)
 *  - withWordmark: boolean — yanına "MOBAR 2026" yazı ekler
 *  - className: ek stiller
 */
export default function Logo({
  size = 40,
  variant = "plain",
  withWordmark = false,
  className,
  imgClassName,
  ...rest
}) {
  const tileClass =
    variant === "tile"
      ? "bg-white border border-ink-100 yk-soft p-1.5"
      : variant === "tile-dark"
        ? "bg-white p-1.5"
        : "";

  return (
    <span
      className={clsx("inline-flex items-center gap-2", className)}
      {...rest}
    >
      <span
        className={clsx(
          "shrink-0 inline-flex items-center justify-center rounded-xl overflow-hidden",
          tileClass
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl}
          alt="MOBAR 2026"
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          className={clsx(
            "w-full h-full object-contain select-none pointer-events-none",
            imgClassName
          )}
          draggable={false}
        />
      </span>
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="yk-display text-base text-current tracking-tight">
            MOBAR
          </span>
          <span className="text-[10px] font-bold text-brand-500 tracking-[0.2em] mt-0.5">
            2026
          </span>
        </span>
      )}
    </span>
  );
}

import React from "react";
import clsx from "clsx";

const VARIANTS = {
  primary: "yk-btn-primary",
  dark: "yk-btn-dark",
  ghost: "yk-btn-ghost",
  soft: "yk-btn-soft",
  outline: "yk-btn-outline",
  danger: "yk-btn-danger"
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base"
};

export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className,
  fullWidth = false,
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      className={clsx(
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {Icon && <Icon size={16} strokeWidth={2.4} />}
      {children}
      {IconRight && <IconRight size={16} strokeWidth={2.4} />}
    </button>
  );
}

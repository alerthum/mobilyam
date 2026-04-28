import React from "react";
import clsx from "clsx";

export default function Card({
  className,
  children,
  padded = true,
  interactive = false,
  ...rest
}) {
  return (
    <div
      className={clsx(
        "yk-card",
        padded && "p-5",
        interactive && "transition hover:border-ink-200 hover:-translate-y-0.5 hover:yk-pop",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, eyebrow, icon: Icon, accent }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div
            className={clsx(
              "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
              accent || "bg-brand-50 text-brand-600"
            )}
          >
            <Icon size={18} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="yk-eyebrow mb-1">{eyebrow}</p>}
          {title && (
            <h3 className="text-base font-bold text-ink-900 leading-tight truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-ink-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

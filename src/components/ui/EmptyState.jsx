import React from "react";
import clsx from "clsx";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}) {
  return (
    <div
      className={clsx(
        "yk-card p-8 sm:p-10 text-center flex flex-col items-center gap-4",
        className
      )}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <Icon size={26} strokeWidth={2.2} />
        </div>
      )}
      <div className="space-y-1.5 max-w-md">
        {title && <h3 className="text-lg font-bold text-ink-900">{title}</h3>}
        {description && (
          <p className="text-sm text-ink-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

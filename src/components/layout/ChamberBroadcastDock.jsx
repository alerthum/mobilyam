import React, { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X
} from "lucide-react";
import { useApp, useCurrentUser } from "../../context/AppContext.jsx";

function variantTone(v) {
  switch (v) {
    case "success":
      return {
        Icon: CheckCircle2,
        bar: "border-l-success-500 bg-white",
        iconWrap: "text-success-600",
        accent: "text-success-800"
      };
    case "warning":
      return {
        Icon: AlertTriangle,
        bar: "border-l-warning-500 bg-white",
        iconWrap: "text-warning-600",
        accent: "text-warning-900"
      };
    case "danger":
      return {
        Icon: AlertCircle,
        bar: "border-l-danger-500 bg-white",
        iconWrap: "text-danger-600",
        accent: "text-danger-900"
      };
    case "info":
    default:
      return {
        Icon: Info,
        bar: "border-l-brand-500 bg-white",
        iconWrap: "text-brand-600",
        accent: "text-ink-900"
      };
  }
}

/** Oda bildirimleri — yalnızca mobilyacı (producer) görür; sağ üstte sabit yığın. */
export default function ChamberBroadcastDock() {
  const user = useCurrentUser();
  const { remote, commit } = useApp();
  const seenInSessionRef = useRef(new Set());

  const items = useMemo(() => {
    if (user?.role !== "producer" || !remote) return [];
    const list = remote.chamber?.broadcasts || [];
    const dismissed = new Set(user.dismissedBroadcastIds || []);
    const now = Date.now();
    return [...list].filter((b) => {
      if (!b?.id || dismissed.has(b.id)) return false;
      if (b.endAt && new Date(b.endAt).getTime() <= now) return false;
      return true;
    });
  }, [remote?.chamber?.broadcasts, user?.role, user?.id, user?.dismissedBroadcastIds]);

  if (!items.length) return null;

  useEffect(() => {
    if (!user?.id || !items.length) return;
    const openIds = new Set(items.map((b) => b.id));
    const toMark = [...openIds].filter(
      (id) => !seenInSessionRef.current.has(id)
    );
    if (!toMark.length) return;
    commit((d) => {
      d.users ??= [];
      const me = d.users.find((x) => x.id === user.id);
      const baseViews = Array.isArray(me?.broadcastViews) ? [...me.broadcastViews] : [];
      const now = new Date().toISOString();
      toMark.forEach((id) => {
        const existingIdx = baseViews.findIndex((v) => v?.broadcastId === id);
        if (existingIdx >= 0) baseViews[existingIdx] = { ...baseViews[existingIdx], seenAt: now };
        else baseViews.push({ broadcastId: id, seenAt: now });
      });
      const updated = me
        ? { ...me, broadcastViews: baseViews }
        : { ...(user || {}), id: user.id, broadcastViews: baseViews };
      d.users = (d.users || []).map((x) => (x.id === user.id ? updated : x));
      if (!d.users.some((x) => x.id === user.id)) d.users.push(updated);
    });
    toMark.forEach((id) => seenInSessionRef.current.add(id));
  }, [commit, items, user]);

  async function dismiss(id) {
    await commit((d) => {
      d.users ??= [];
      const me = d.users.find((x) => x.id === user.id);
      const nextDismiss = [...new Set([...(me?.dismissedBroadcastIds || []), id])];
      const updated = me
        ? { ...me, dismissedBroadcastIds: nextDismiss }
        : { ...(user || {}), id: user.id, dismissedBroadcastIds: nextDismiss };
      const rest = (d.users || []).filter((x) => x.id !== user.id);
      d.users = [...rest, updated];
    });
  }

  return (
    <div
      className={clsx(
        "fixed z-[60] pointer-events-none",
        "left-3 right-3 top-16 sm:top-[4.5rem] lg:top-[4.75rem]",
        "sm:left-auto sm:right-6 sm:w-full sm:max-w-md"
      )}
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 pointer-events-auto">
        {items.map((b) => {
          const v = variantTone(b.variant || "info");
          const Ico = v.Icon;
          return (
            <div
              key={b.id}
              role="status"
              className={clsx(
                "relative rounded-xl shadow-lg border border-ink-100/80 border-l-[4px] overflow-hidden yk-soft",
                v.bar
              )}
            >
              <button
                type="button"
                onClick={() => dismiss(b.id)}
                className="absolute top-2.5 right-2 p-1 rounded-lg hover:bg-surface-100 text-ink-400 hover:text-ink-700 transition"
                aria-label="Mesajı gizle"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
              <div className="pr-10 pl-4 py-3.5 sm:py-4">
                <div className="flex gap-3">
                  <div
                    className={clsx(
                      "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-surface-100",
                      v.iconWrap
                    )}
                  >
                    <Ico size={18} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={clsx(
                        "text-sm font-extrabold leading-snug",
                        v.accent
                      )}
                    >
                      {b.title || "Oda duyurusu"}
                    </p>
                    {b.body && (
                      <p className="mt-1 text-xs sm:text-sm text-ink-600 leading-relaxed whitespace-pre-wrap">
                        {b.body}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

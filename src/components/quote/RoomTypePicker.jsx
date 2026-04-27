import React from "react";
import { ROOM_DEFINITIONS } from "../../config/rooms.js";

export default function RoomTypePicker({ onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ROOM_DEFINITIONS.map((def) => {
        const Icon = def.icon;
        return (
          <button
            key={def.id}
            type="button"
            onClick={() => onSelect(def.id)}
            className="yk-card !p-4 text-left transition hover:-translate-y-0.5 hover:yk-pop"
          >
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${def.accent} text-white flex items-center justify-center mb-3`}
            >
              <Icon size={20} strokeWidth={2.2} />
            </div>
            <p className="text-sm font-bold text-ink-900 leading-tight">
              {def.label}
            </p>
            <p className="text-xs text-ink-500 mt-1 leading-snug">
              {def.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

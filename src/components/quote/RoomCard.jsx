import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import Card from "../ui/Card.jsx";
import IconButton from "../ui/IconButton.jsx";
import Badge from "../ui/Badge.jsx";
import { getRoomDefinition } from "../../config/rooms.js";
import { calculateRoomPrice } from "../../utils/calculations.js";
import { formatCurrency, formatNumber } from "../../utils/format.js";

export default function RoomCard({ room, qualities, onEdit, onDelete }) {
  const def = getRoomDefinition(room.type);
  const Icon = def.icon;
  const quality =
    qualities.find((q) => q.id === room.selectedQualityId) || qualities[0];
  const price = calculateRoomPrice(room, quality);

  return (
    <div className="yk-card p-4 sm:p-5 flex items-start gap-3">
      <div
        className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${def.accent} text-white flex items-center justify-center yk-soft`}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-ink-900 truncate">
            {room.name || def.label}
          </h3>
          <div className="flex items-center gap-1">
            <IconButton icon={Pencil} variant="ghost" size={32} ariaLabel="Düzenle" onClick={onEdit} />
            <IconButton icon={Trash2} variant="danger" size={32} ariaLabel="Sil" onClick={onDelete} />
          </div>
        </div>
        <p className="text-xs text-ink-500 mt-0.5 truncate">{def.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            {formatNumber(price.panelEquivalentM2, " m²")}
          </Badge>
          {quality && <Badge variant="dark">{quality.name}</Badge>}
          {room.kapakli !== undefined && (
            <Badge variant={room.kapakli ? "accent" : "default"}>
              {room.kapakli ? "Kapaklı" : "Kapaksız"}
            </Badge>
          )}
          {price.glassExtra > 0 && (
            <Badge variant="accent">
              + Cam {formatCurrency(price.glassExtra)}
            </Badge>
          )}
          {price.customHardware > 0 && (
            <Badge variant="warning">
              + Hırdavat {formatCurrency(price.customHardware)}
            </Badge>
          )}
        </div>
        <p className="mt-3 yk-display text-2xl text-ink-900 tabular-nums">
          {formatCurrency(price.officialPrice)}
        </p>
      </div>
    </div>
  );
}

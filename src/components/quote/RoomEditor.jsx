import React, { useState } from "react";
import { ArrowLeft, Save, Wallet } from "lucide-react";
import GardiropModule from "../../modules/GardiropModule.jsx";
import BanyoModule from "../../modules/BanyoModule.jsx";
import VestiyerModule from "../../modules/VestiyerModule.jsx";
import MutfakModule from "../../modules/MutfakModule.jsx";
import OfisModule from "../../modules/OfisModule.jsx";
import QualityPicker from "./QualityPicker.jsx";
import Card, { CardHeader } from "../ui/Card.jsx";
import KpiCard from "../ui/KpiCard.jsx";
import Field from "../inputs/Field.jsx";
import TextInput from "../inputs/TextInput.jsx";
import MoneyInput from "../inputs/MoneyInput.jsx";
import Button from "../ui/Button.jsx";
import { calculateRoomPrice } from "../../utils/calculations.js";
import { formatCurrency, formatNumber } from "../../utils/format.js";
import { getRoomDefinition } from "../../config/rooms.js";

/**
 * RoomEditor — odanın tamamı yerel state'te düzenlenir.
 *
 * Kayıt akışı:
 *  1) Oda adı
 *  2) Modül ölçüleri (gardırop / mutfak / banyo / vestiyer / ofis)
 *  3) Kalite seçimi
 *  4) Ek hırdavat bedeli
 *  5) "Odayı Kaydet" → onSave(room) ile commit
 *
 * Kullanıcı butona basana dek HİÇBİR şey sunucuya gitmez.
 */
export default function RoomEditor({ initialRoom, qualities, onSave, onCancel }) {
  const [room, setRoom] = useState(initialRoom);
  const def = getRoomDefinition(room.type);
  const Icon = def.icon;
  const quality =
    qualities.find((q) => q.id === room.selectedQualityId) || qualities[0];
  const price = calculateRoomPrice(room, quality);

  function ModuleByType() {
    switch (room.type) {
      case "gardirop":
        return <GardiropModule room={room} onChange={setRoom} />;
      case "banyo":
        return <BanyoModule room={room} onChange={setRoom} />;
      case "vestiyer":
        return <VestiyerModule room={room} onChange={setRoom} />;
      case "mutfak":
        return <MutfakModule room={room} onChange={setRoom} />;
      case "ofis":
        return <OfisModule room={room} onChange={setRoom} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onCancel}>
          Geri
        </Button>
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${def.accent} text-white flex items-center justify-center`}
        >
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <h2 className="yk-display text-xl text-ink-900 truncate">
          {def.label}
        </h2>
      </div>

      {/* Anlık özet KPI'lar */}
      <div className="grid sm:grid-cols-3 gap-3">
        <KpiCard
          label="Toplam m²"
          value={formatNumber(price.panelEquivalentM2, " m²")}
          icon={Icon}
        />
        <KpiCard
          label="Resmi fiyat"
          value={formatCurrency(price.officialPrice)}
          accent="success"
          icon={Wallet}
        />
        <KpiCard
          label="m² fiyatı"
          value={quality ? formatCurrency(quality.officialSqmPrice) : "—"}
          accent="ink"
          hint={quality?.name}
        />
      </div>

      {/* 1) Oda adı */}
      <Card>
        <CardHeader
          title="Oda Adı"
          subtitle="Bu oda teklif çıktısında bu isimle görünür"
        />
        <div className="mt-4">
          <Field label="Oda adı">
            <TextInput
              value={room.name}
              onChange={(v) => setRoom({ ...room, name: v })}
              placeholder={def.label}
            />
          </Field>
        </div>
      </Card>

      {/* 2) Modül ölçüleri */}
      <ModuleByType />

      {/* 3) Kalite seçimi */}
      <Card>
        <CardHeader
          title="Kalite Seçimi"
          subtitle="Ölçüleri girdikçe her kalite için tutar otomatik güncellenir"
        />
        <div className="mt-4">
          <QualityPicker
            value={room.selectedQualityId || quality?.id}
            qualities={qualities}
            calcRoomPrice={(q) => calculateRoomPrice(room, q)}
            onChange={(id) => setRoom({ ...room, selectedQualityId: id })}
          />
        </div>
      </Card>

      {/* 4) Ek hırdavat */}
      <Card>
        <CardHeader
          title="Ek Hırdavat Bedeli"
          subtitle="Doğrudan toplama eklenir, isteğe bağlıdır"
        />
        <div className="mt-4 max-w-xs">
          <Field label="Ek hırdavat bedeli" hint="Boş bırakılabilir">
            <MoneyInput
              value={room.customHardwarePrice}
              onValueChange={(v) => setRoom({ ...room, customHardwarePrice: v })}
            />
          </Field>
        </div>
      </Card>

      {/* 5) Aksiyon */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/90 backdrop-blur border-t border-ink-100 flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button variant="ghost" size="lg" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button variant="primary" size="lg" icon={Save} onClick={() => onSave(room)}>
          Odayı Kaydet
        </Button>
      </div>
    </div>
  );
}

'use client'

import React from 'react'
import { Field, Label } from '@/components/manage/ManageFormField'
import Input from '@/shared/Input'
import {
  Car,
  Plane,
  Clock,
  ShieldCheck,
  Users,
  Briefcase,
  Wifi,
  Sparkles,
  CheckCircle2,
  MapPin,
  Baby,
  FileCheck,
} from 'lucide-react'

export interface TransferAgencyBasicsState {
  transfer_type?: string
  vehicle_class?: string
  passenger_capacity?: string
  luggage_capacity?: string
  free_waiting_time_minutes?: string
  flight_tracking?: boolean
  meet_and_greet?: boolean
  free_baby_seat?: boolean
  in_vehicle_amenities?: string[]
  pickup_zone?: string
  dropoff_zone?: string
  cancellation_rules?: string
  confirmation_type?: 'instant' | 'on_request'
  prepayment_percent?: string
}

export const TRANSFER_TYPES = [
  { value: 'private_vip', label: 'Özel VIP Havalimanı Transferi', desc: 'Size ve ailenize özel şoförlü lüks araçla kapıdan kapıya transfer' },
  { value: 'shared_shuttle', label: 'Ekonomik Paylaşımlı Shuttle', desc: 'Havalimanı ve otel arası ekonomik yolcu servisi' },
  { value: 'intercity_vip', label: 'Şehirler Arası VIP Transfer', desc: 'İller ve tatil beldeleri arası konforlu özel ulaşım' },
  { value: 'hourly_chauffeur', label: 'Şoförlü Saatlik / Günlük Araç', desc: 'İş toplantısı, alışveriş veya gezi için özel şoför tahsisi' },
]

export const TRANSFER_VEHICLE_CLASSES = [
  { value: 'mercedes_vito_vip', label: 'Mercedes Vito VIP (1-6 Kişi)', desc: 'Deri koltuklar, TV/Multimedya, maybach tavan ve buzdolabı' },
  { value: 'mercedes_sprinter_vip', label: 'Mercedes Sprinter VIP (1-16 Kişi)', desc: 'Geniş gruplar için yüksek tavan ultra lüks minibüs' },
  { value: 'vip_sedan', label: 'VIP Sedan (1-3 Kişi)', desc: 'Mercedes E-Class, BMW 5 Serisi veya Passat konforu' },
  { value: 'standard_van', label: 'Standart Minibüs (1-8 Kişi)', desc: 'Konforlu, temiz ve ekonomik grup transfer aracı' },
]

export const TRANSFER_AMENITIES = [
  'Uçuş Takibi (Rötarlarda Ek Ücret Alınmaz)',
  'Havalimanı Çıkışında İsim Levhasıyla Karşılama',
  '60 Dakika Ücretsiz Havalimanı Bekleme Süresi',
  'Ücretsiz Bebek / Çocuk Güvenlik Koltuğu',
  'Araç İçi Ücretsiz Yüksek Hızlı Wi-Fi',
  'Ücretsiz Soğuk Su ve Meşrubat İkramı',
  'Telefon Şarj İstasyonu & USB Bağlantıları',
  'Otel Kapısına Kadar Bagaj Taşıma Desteği',
]

/** Step 1: Transfer Modeli, Araç Tipi & Kapasite */
export function TransferBasicsStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: TransferAgencyBasicsState
  onChange: (next: TransferAgencyBasicsState) => void
  disabled?: boolean
}) {
  const selectedType = value.transfer_type || 'private_vip'
  const selectedVehicle = value.vehicle_class || 'mercedes_vito_vip'
  const amenities = value.in_vehicle_amenities || TRANSFER_AMENITIES.slice(0, 5)

  function toggleAmenity(item: string) {
    if (disabled) return
    const next = amenities.includes(item)
      ? amenities.filter((x) => x !== item)
      : [...amenities, item]
    onChange({ ...value, in_vehicle_amenities: next })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Car className="size-5 text-primary-600" />
          Transfer Modeli, VIP Araç Sınıfı & Kapasite
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Havalimanı ve otel transfer standartlarını, araç tipini ve yolcu/bagaj kapasitesini belirleyin.
        </p>
      </div>

      {/* Transfer Modeli */}
      <div>
        <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
          Transfer Hizmet Türü
        </Label>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {TRANSFER_TYPES.map((t) => {
            const active = selectedType === t.value
            return (
              <button
                key={t.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, transfer_type: t.value })}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 dark:bg-primary-950/40 dark:border-primary-500'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/60'
                }`}
              >
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{t.label}</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">{t.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Araç Sınıfı */}
      <div>
        <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
          Tahsis Edilen VIP Araç Tipi
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRANSFER_VEHICLE_CLASSES.map((vc) => {
            const active = selectedVehicle === vc.value
            return (
              <button
                key={vc.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, vehicle_class: vc.value })}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-900 font-bold dark:bg-primary-950/40 dark:text-primary-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                <div className="text-xs font-semibold">{vc.label}</div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{vc.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Kapasite & Bekleme Süresi */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Field className="block">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Users className="size-3.5 text-neutral-500" /> Maksimum Yolcu
          </Label>
          <Input
            type="number"
            min="1"
            value={value.passenger_capacity ?? '6'}
            onChange={(e) => onChange({ ...value, passenger_capacity: e.target.value })}
            placeholder="ör: 6"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Briefcase className="size-3.5 text-neutral-500" /> Valiz / Bagaj Kapasitesi
          </Label>
          <Input
            type="number"
            min="1"
            value={value.luggage_capacity ?? '6'}
            onChange={(e) => onChange({ ...value, luggage_capacity: e.target.value })}
            placeholder="ör: 6"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Clock className="size-3.5 text-neutral-500" /> Ücretsiz Bekleme (Dk)
          </Label>
          <Input
            type="number"
            min="0"
            value={value.free_waiting_time_minutes ?? '60'}
            onChange={(e) => onChange({ ...value, free_waiting_time_minutes: e.target.value })}
            placeholder="ör: 60"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
      </div>

      {/* Dahil Standartlar & İkramlar */}
      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-emerald-600" />
          Transfer Standartları & Araç İçi İkramlar
        </Label>
        <div className="flex flex-wrap gap-2">
          {TRANSFER_AMENITIES.map((item) => {
            const active = amenities.includes(item)
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => toggleAmenity(item)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 font-semibold dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'
                }`}
              >
                {active ? '✓ ' : '+ '} {item}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

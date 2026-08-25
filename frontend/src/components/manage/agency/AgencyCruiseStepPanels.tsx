'use client'

import React from 'react'
import { Field, Label } from '@/components/manage/ManageFormField'
import Input from '@/shared/Input'
import {
  Ship,
  Anchor,
  Compass,
  MapPin,
  Utensils,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  CreditCard,
  Building,
} from 'lucide-react'

export interface CruiseAgencyBasicsState {
  cruise_line?: string
  ship_name?: string
  departure_port?: string
  route_summary?: string
  total_nights?: string
  total_days?: string
  board_basis?: string
  cabin_types?: string[]
  included_services?: string[]
  excluded_services?: string[]
  port_tax_amount?: string
  port_tax_currency?: string
  service_charge_daily?: string
  visa_type?: 'no_visa_greek_islands' | 'schengen' | 'no_visa' | 'passport_only'
  cancellation_rules?: string
  confirmation_type?: 'instant' | 'on_request'
  prepayment_percent?: string
}

export const CRUISE_LINES = [
  { value: 'celestyal', label: 'Celestyal Cruises', desc: 'Vizesiz & Kapıda Vizeli Yunan Adaları Turları' },
  { value: 'msc', label: 'MSC Cruises', desc: 'Akdeniz, Kuzey Avrupa & Karayipler Lüks Gemileri' },
  { value: 'costa', label: 'Costa Cruises', desc: 'İtalyan tarzı eğlence, aile dostu büyük gemiler' },
  { value: 'royal_caribbean', label: 'Royal Caribbean', desc: 'Dünyanın en büyük yenilikçi mega yolcu gemileri' },
  { value: 'norwegian', label: 'Norwegian Cruise Line (NCL)', desc: 'Freestyle Cruising serbest konsept' },
  { value: 'celebrity', label: 'Celebrity Cruises', desc: 'Premium modern lüks ve gurme mutfak' },
]

export const CRUISE_CABIN_PRESETS = [
  { id: 'inside', label: 'İç Kabin (Standart)', desc: 'Ekonomik, klimalı ve konforlu iç alan' },
  { id: 'oceanview', label: 'Dış Kabin (Pencereli/Lomboz)', desc: 'Deniz manzaralı pencere veya lomboz' },
  { id: 'balcony', label: 'Balkonlu Kabin', desc: 'Özel açık deniz manzaralı ferah balkon' },
  { id: 'suite', label: 'Süit & VIP Kabin', desc: 'Özel teras, jakuzi ve uşak (butler) servisi' },
]

export const CRUISE_INCLUDED_PRESETS = [
  'Gemide Sabah, Öğle, Akşam Açık Büfe & Ana Restoran Yemekleri',
  'Gece Yarısı Büfeleri ve Gün Boyu İkramlar',
  'Kaptan Karşılama Kokteyli & Gala Gecesi',
  'Broadway & Las Vegas Tarzı Tiyatro Şovları',
  'Açık / Kapalı Yüzme Havuzları & Jakuziler',
  'Fitness Salonu & Spor Sahaları Kullanımı',
  'Çocuk ve Gençler İçin Animasyon & Mini Club',
  'Limanlarda Gemiden İniş ve Biniş Hizmetleri',
]

export const CRUISE_EXCLUDED_PRESETS = [
  'Liman Vergileri ve Güvenlik Harçları',
  'Gemide Günlük Servis Ücreti / Bahşişler',
  'Rehberli Liman & Kara Turları',
  'Alkollü ve Alkolsüz Pakete Dahil Olmayan İçecekler',
  'Güzellik Merkezi, Masaj ve Spa Hizmetleri',
  'Gemi İçi Casino, İnternet (Wi-Fi) ve Kuru Temizleme',
  'Vize Ücretleri ve Yurt Dışı Çıkış Harcı',
]

/** Step 1: Gemi, Şirket, Rota & Limanlar */
export function CruiseBasicsStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: CruiseAgencyBasicsState
  onChange: (next: CruiseAgencyBasicsState) => void
  disabled?: boolean
}) {
  const selectedLine = value.cruise_line || 'celestyal'
  const cabinTypes = value.cabin_types || ['inside', 'oceanview', 'balcony']

  function toggleCabin(id: string) {
    if (disabled) return
    const next = cabinTypes.includes(id)
      ? cabinTypes.filter((x) => x !== id)
      : [...cabinTypes, id]
    onChange({ ...value, cabin_types: next })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Ship className="size-5 text-primary-600" />
          Kruvaziyer Şirketi, Gemi & Rota Bilgisi
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Donatan kruvaziyer hattını, gemi adını, kalkış limanını ve seyahat rotasını belirleyin.
        </p>
      </div>

      {/* Kruvaziyer Şirketi */}
      <div>
        <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
          Kruvaziyer Şirketi (Cruise Line)
        </Label>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CRUISE_LINES.map((cl) => {
            const active = selectedLine === cl.value
            return (
              <button
                key={cl.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, cruise_line: cl.value })}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 dark:bg-primary-950/40 dark:border-primary-500'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/60'
                }`}
              >
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{cl.label}</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">{cl.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Gemi Adı & Kalkış Limanı */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Field className="block">
          <Label className="text-xs font-semibold">Gemi Adı</Label>
          <Input
            value={value.ship_name ?? ''}
            onChange={(e) => onChange({ ...value, ship_name: e.target.value })}
            placeholder="ör: Celestyal Journey / MSC Euribia"
            disabled={disabled}
            className="mt-1 font-semibold"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">Kalkış Limanı (Embarkation Port)</Label>
          <Input
            value={value.departure_port ?? 'Kuşadası / İstanbul'}
            onChange={(e) => onChange({ ...value, departure_port: e.target.value })}
            placeholder="ör: Kuşadası Limanı, İstanbul Galataport"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">Vize Durumu</Label>
          <select
            value={value.visa_type ?? 'no_visa_greek_islands'}
            onChange={(e) => onChange({ ...value, visa_type: e.target.value as any })}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-800 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <option value="no_visa_greek_islands">Vizesiz / Kolaylaştırılmış Kapıda Vize</option>
            <option value="schengen">Çok Girişli Schengen Vizesi Gerekli</option>
            <option value="no_visa">Tamamen Vizesiz Rota</option>
            <option value="passport_only">Sadece Geçerli Pasaport</option>
          </select>
        </Field>
      </div>

      {/* Rota Özeti */}
      <Field className="block pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Label className="text-xs font-semibold">Uğrak Limanları & Rota Özeti</Label>
        <Input
          value={value.route_summary ?? ''}
          onChange={(e) => onChange({ ...value, route_summary: e.target.value })}
          placeholder="ör: Kuşadası - Patmos - Rodos - Girit (Kandiye) - Santorini - Mikonos - Atina"
          disabled={disabled}
          className="mt-1"
        />
      </Field>

      {/* Kabin Kategorileri */}
      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          Mevcut Kabin Kategorileri
        </Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CRUISE_CABIN_PRESETS.map((c) => {
            const active = cabinTypes.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleCabin(c.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-900 font-bold dark:bg-primary-950/40 dark:text-primary-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                <div className="text-xs font-semibold">{c.label}</div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{c.desc}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Step 2: Dahil / Hariç Hizmetler & Liman Vergisi / Bahşiş */
export function CruiseServicesAndFeesStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: CruiseAgencyBasicsState
  onChange: (next: CruiseAgencyBasicsState) => void
  disabled?: boolean
}) {
  const included = value.included_services || CRUISE_INCLUDED_PRESETS.slice(0, 5)
  const excluded = value.excluded_services || CRUISE_EXCLUDED_PRESETS.slice(0, 4)

  function toggleInc(item: string) {
    if (disabled) return
    const next = included.includes(item)
      ? included.filter((x) => x !== item)
      : [...included, item]
    onChange({ ...value, included_services: next })
  }

  function toggleExc(item: string) {
    if (disabled) return
    const next = excluded.includes(item)
      ? excluded.filter((x) => x !== item)
      : [...excluded, item]
    onChange({ ...value, excluded_services: next })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary-600" />
          Gemi Hizmetleri, Liman Vergileri & Bahşiş Standartları
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Kruvaziyer yolcuları için fiyata dahil tam pansiyon yemekleri, vergi ve servis bedellerini belirleyin.
        </p>
      </div>

      {/* Liman Vergisi & Bahşiş */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field className="block">
          <Label className="text-xs font-semibold">Liman Vergisi Tutarı (Kişi Başı)</Label>
          <Input
            type="number"
            min="0"
            value={value.port_tax_amount ?? '150'}
            onChange={(e) => onChange({ ...value, port_tax_amount: e.target.value })}
            placeholder="ör: 150"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">Vergi Para Birimi</Label>
          <select
            value={value.port_tax_currency ?? 'EUR'}
            onChange={(e) => onChange({ ...value, port_tax_currency: e.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-800 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="TRY">TRY (₺)</option>
          </select>
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">Günlük Bahşiş / Servis Bedeli</Label>
          <Input
            value={value.service_charge_daily ?? '12 € / Günlük'}
            onChange={(e) => onChange({ ...value, service_charge_daily: e.target.value })}
            placeholder="ör: 12 € / Günlük (Gemide Ödenir)"
            disabled={disabled}
            className="mt-1 text-xs"
          />
        </Field>
      </div>

      {/* Dahil Olanlar */}
      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
          <CheckCircle2 className="size-4" />
          Fiyata Dahil Olan Gemi Hizmetleri
        </div>
        <div className="flex flex-wrap gap-2">
          {CRUISE_INCLUDED_PRESETS.map((item) => {
            const active = included.includes(item)
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => toggleInc(item)}
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

      {/* Hariç Olanlar */}
      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
          <XCircle className="size-4" />
          Fiyata Hariç Olan Ekstralar
        </div>
        <div className="flex flex-wrap gap-2">
          {CRUISE_EXCLUDED_PRESETS.map((item) => {
            const active = excluded.includes(item)
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => toggleExc(item)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'bg-rose-50 text-rose-800 border-rose-500 font-semibold dark:bg-rose-950/40 dark:text-rose-300'
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

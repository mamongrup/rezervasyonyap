'use client'

import React from 'react'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import {
  Building2,
  Compass,
  MapPin,
  Clock,
  Calendar,
  Utensils,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Footprints,
  Plane,
} from 'lucide-react'

export interface HajjAgencyBasicsState {
  program_type?: string
  mecca_hotel_name?: string
  mecca_distance_meters?: string
  mecca_hotel_stars?: string
  mecca_nights?: string
  medina_hotel_name?: string
  medina_distance_meters?: string
  medina_hotel_stars?: string
  medina_nights?: string
  meal_type?: string
  airline_name?: string
  included_services?: string[]
  guidance_details?: string
  confirmation_type?: 'instant' | 'on_request'
  prepayment_percent?: string
}

export const HAJJ_PROGRAM_TYPES = [
  { value: 'luxury_walking', label: '5* Lüks Yürüme Mesafeli', desc: 'Mekke ve Medine Harem sınırında 5 yıldızlı otellerde konaklama' },
  { value: 'standard_comfort', label: 'Standart / Servisli Program', desc: '24 saat kesintisiz Harem servisli modern otellerde konforlu ibadet' },
  { value: 'economic', label: 'Ekonomik Umre Programı', desc: 'Uygun bütçeli, temiz ve güvenilir konaklama standartları' },
  { value: 'ramadan_special', label: 'Ramazan-ı Şerif Özel Programı', desc: 'Ramazan ayı iftar ve sahur organizasyonlu özel dönem' },
]

export const HAJJ_MEAL_TYPES = [
  { value: 'open_buffet_half_board', label: 'Açık Büfe Sabah & Akşam (Türk Damak Tadı)' },
  { value: 'table_dhote', label: 'Tabldot 3 Öğün Türk Aşçılı Yemekler' },
  { value: 'open_buffet_full_board', label: 'Tam Pansiyon Açık Büfe (Sabah, Öğle, Akşam)' },
  { value: 'ramadan_iftar_sahur', label: 'Ramazan Özel İftar & Sahur Açık Büfesi' },
]

export const HAJJ_INCLUDED_PRESETS = [
  'Suudi Arabistan Hac/Umre Vizesi ve Takip İşlemleri',
  'Gidiş - Dönüş Uçak Biletleri (THY / Saudia Airlines)',
  'Mekke ve Medine Belirtilen Otellerde Konaklama',
  'Sabah ve Akşam Türk Aşçılı Açık Büfe Yemekler',
  'Cidde - Mekke - Medine Lüks Otobüslerle Klimalı Transferler',
  'Mekke ve Medine Kutsal Mekanlar ve İbadet Ziyaretleri',
  'Tecrübeli Din Görevlileri ve İlahiyatçı Rehberlik Hizmeti',
  'Kişi Başı 5 Litre Orijinal Zemzem Suyu Hediyesi',
  'Özel Hac/Umre Seyahat Çantası, Terlik Torbası & Rehber Kitapçığı',
  'Suudi Arabistan Zorunlu Sağlık ve Seyahat Sigortası',
]

/** Step 1: Mekke & Medine Otelleri, Mesafeler & Program */
export function HajjBasicsStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: HajjAgencyBasicsState
  onChange: (next: HajjAgencyBasicsState) => void
  disabled?: boolean
}) {
  const selectedType = value.program_type || 'luxury_walking'
  const selectedMeal = value.meal_type || 'open_buffet_half_board'
  const included = value.included_services || HAJJ_INCLUDED_PRESETS.slice(0, 6)

  function toggleInc(item: string) {
    if (disabled) return
    const next = included.includes(item)
      ? included.filter((x) => x !== item)
      : [...included, item]
    onChange({ ...value, included_services: next })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Building2 className="size-5 text-primary-600" />
          Hac & Umre Program Türü, Mekke ve Medine Otelleri
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Kutsal topraklardaki otel standartlarını, Kabe/Ravza mesafelerini ve yemek konseptini belirleyin.
        </p>
      </div>

      {/* Program Türü */}
      <div>
        <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
          Program Konsepti
        </Label>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {HAJJ_PROGRAM_TYPES.map((pt) => {
            const active = selectedType === pt.value
            return (
              <button
                key={pt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, program_type: pt.value })}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 dark:bg-primary-950/40 dark:border-primary-500'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/60'
                }`}
              >
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{pt.label}</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">{pt.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mekke-i Mükerreme Otel Detayları */}
      <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs text-amber-900 dark:text-amber-300">
          <MapPin className="size-4 text-amber-600" />
          Mekke-i Mükerreme Konaklaması
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field className="block">
            <Label className="text-xs font-medium">Mekke Oteli Adı</Label>
            <Input
              value={value.mecca_hotel_name ?? ''}
              onChange={(e) => onChange({ ...value, mecca_hotel_name: e.target.value })}
              placeholder="ör: Hilton Convention / Swissotel Makkah"
              disabled={disabled}
              className="mt-1 bg-white dark:bg-neutral-900"
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Footprints className="size-3.5 text-amber-600" /> Harem-i Şerif Mesafesi (Metre)
            </Label>
            <Input
              value={value.mecca_distance_meters ?? '50 m (Yürüme Mesafeli)'}
              onChange={(e) => onChange({ ...value, mecca_distance_meters: e.target.value })}
              placeholder="ör: 50 m veya 24 Saat Servisli"
              disabled={disabled}
              className="mt-1 bg-white dark:bg-neutral-900"
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="size-3.5 text-amber-600" /> Mekke Gece Sayısı
            </Label>
            <Input
              type="number"
              min="1"
              value={value.mecca_nights ?? '10'}
              onChange={(e) => onChange({ ...value, mecca_nights: e.target.value })}
              placeholder="ör: 10"
              disabled={disabled}
              className="mt-1 bg-white dark:bg-neutral-900"
            />
          </Field>
        </div>
      </div>

      {/* Medine-i Münevvere Otel Detayları */}
      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs text-emerald-900 dark:text-emerald-300">
          <MapPin className="size-4 text-emerald-600" />
          Medine-i Münevvere Konaklaması
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field className="block">
            <Label className="text-xs font-medium">Medine Oteli Adı</Label>
            <Input
              value={value.medina_hotel_name ?? ''}
              onChange={(e) => onChange({ ...value, medina_hotel_name: e.target.value })}
              placeholder="ör: Pullman Zamzam / Oberoi Madina"
              disabled={disabled}
              className="mt-1 bg-white dark:bg-neutral-900"
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Footprints className="size-3.5 text-emerald-600" /> Mescid-i Nebevi / Ravza Mesafesi
            </Label>
            <Input
              value={value.medina_distance_meters ?? '100 m (Ön Avlu)'}
              onChange={(e) => onChange({ ...value, medina_distance_meters: e.target.value })}
              placeholder="ör: 100 m (Ön Avlu)"
              disabled={disabled}
              className="mt-1 bg-white dark:bg-neutral-900"
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="size-3.5 text-emerald-600" /> Medine Gece Sayısı
            </Label>
            <Input
              type="number"
              min="1"
              value={value.medina_nights ?? '4'}
              onChange={(e) => onChange({ ...value, medina_nights: e.target.value })}
              placeholder="ör: 4"
              disabled={disabled}
              className="mt-1 bg-white dark:bg-neutral-900"
            />
          </Field>
        </div>
      </div>

      {/* Yemek Konsepti */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">Yemek & Beslenme Düzeni</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {HAJJ_MEAL_TYPES.map((m) => {
            const active = selectedMeal === m.value
            return (
              <button
                key={m.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, meal_type: m.value })}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-900 font-bold dark:bg-primary-950/40 dark:text-primary-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dahil Olan Hizmetler */}
      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-emerald-600" />
          Fiyata Dahil Olan Hizmet ve İkramlar
        </Label>
        <div className="flex flex-wrap gap-2">
          {HAJJ_INCLUDED_PRESETS.map((item) => {
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
    </div>
  )
}

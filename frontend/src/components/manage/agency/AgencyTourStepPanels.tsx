'use client'

import React, { useState } from 'react'
import { Field, Label } from '@/components/manage/ManageFormField'
import Input from '@/shared/Input'
import {
  Compass,
  Bus,
  Plane,
  Train,
  Ship,
  MapPin,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Languages,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react'

export interface TourItineraryDay {
  day_number: number
  title: string
  description: string
  meals?: string
  accommodation?: string
  included_activities?: string[]
}

export interface TourAgencyBasicsState {
  tour_type?: string
  transport_type?: string
  duration_days?: string
  duration_nights?: string
  departure_points?: string[]
  departure_time?: string
  guide_languages?: string[]
  group_size_min?: string
  group_size_max?: string
  included_services?: string[]
  excluded_services?: string[]
  itinerary?: TourItineraryDay[]
  cancellation_rules?: string
  important_notes?: string
  visa_required?: boolean
  confirmation_type?: 'instant' | 'on_request'
  prepayment_percent?: string
}

export const TOUR_TYPES = [
  { value: 'culture', label: 'Kültür & Tarih Turu', desc: 'Rehber eşliğinde tarihi ören yerleri, müzeler ve şehir turları' },
  { value: 'abroad', label: 'Yurt Dışı Turu', desc: 'Vize, uçak, transfer ve Türkçe rehberlik dahil uluslararası turlar' },
  { value: 'daily', label: 'Günübirlik Gezi & Tur', desc: 'Sabah gidiş akşam dönüş konaklamasız pratik çevre gezileri' },
  { value: 'nature_adventure', label: 'Doğa, Macera & Trekking', desc: 'Kanyonlar, yaylalar, rafting ve yürüyüş rotaları' },
  { value: 'blue_cruise', label: 'Mavi Yolculuk / Tekne Turu', desc: 'Koylar ve adalar arası deniz tatili ve yüzme molaları' },
  { value: 'gastronomy', label: 'Gurme & Gastronomi Turu', desc: 'Yöresel lezzetler, bağ rotaları ve şef tadımları' },
  { value: 'festival_event', label: 'Festival & Özel Etkinlik', desc: 'Kültür festivalleri, hasat günleri ve mevsimsel etkinlikler' },
]

export const TOUR_TRANSPORT_TYPES = [
  { value: 'bus_vip', label: 'Lüks Turizm Otobüsü', icon: Bus, desc: 'Konforlu koltuklar, ikram ve Wi-Fi donanımlı' },
  { value: 'flight', label: 'Uçaklı Tur', icon: Plane, desc: 'Tarifeli veya charter uçak biletleri dahil' },
  { value: 'train', label: 'Turistik Tren / YHT', icon: Train, desc: 'Doğu Ekspresi, Karaelmas veya YHT bağlantılı' },
  { value: 'boat', label: 'Gemi / Tekne Ulaşımı', icon: Ship, desc: 'Deniz transferleri ve özel tekne seferleri' },
  { value: 'self_drive', label: 'Kendi Aracıyla Katılım', icon: Compass, desc: 'Buluşma noktasından itibaren rehberlik ve program' },
]

export const TOUR_INCLUDED_PRESETS = [
  'Lüks Otobüs / Uçak ile Ulaşım',
  'Belirtilen Otellerde Konaklama',
  'Sabah Kahvaltıları',
  'Akşam Yemekleri',
  'Profesyonel Kokartlı Rehberlik Hizmeti',
  'Müze ve Ören Yeri Giriş Biletleri',
  'Zorunlu Seyahat Sağlık Sigortası',
  'Araç İçi Sıcak & Soğuk İkramlar',
  'Milli Park Giriş Ücretleri',
  'Şehir Vergileri (City Tax)',
]

export const TOUR_EXCLUDED_PRESETS = [
  'Öğle Yemekleri ve İçecekler',
  'Ekstra Düzenlenen Çevre Turları',
  'Müze Kartı ve Kişisel Girişler',
  'Yurt Dışı Çıkış Harcı',
  'Vize Ücreti ve Takip Hizmeti',
  'Kişisel Harcamalar ve Bahşişler',
  'Otel Ekstraları (Minibar, Oda Servisi)',
]

export const TOUR_LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'İngilizce' },
  { code: 'de', label: 'Almanca' },
  { code: 'ru', label: 'Rusça' },
  { code: 'ar', label: 'Arapça' },
  { code: 'fr', label: 'Fransızca' },
]

/** Step 1: Tur Temel Özellikleri & Ulaşım */
export function TourBasicsStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: TourAgencyBasicsState
  onChange: (next: TourAgencyBasicsState) => void
  disabled?: boolean
}) {
  const selectedType = value.tour_type || 'culture'
  const selectedTransport = value.transport_type || 'bus_vip'
  const guideLangs = value.guide_languages || ['tr']

  function toggleLang(code: string) {
    if (disabled) return
    const next = guideLangs.includes(code)
      ? guideLangs.filter((l) => l !== code)
      : [...guideLangs, code]
    onChange({ ...value, guide_languages: next })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Compass className="size-5 text-primary-600" />
          Tur Türü & Ulaşım Standardı
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Seyahat acentesi tur operasyon modelini, ulaşım aracını ve süre detaylarını belirleyin.
        </p>
      </div>

      {/* Tur Tipi Seçimi */}
      <div>
        <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
          Tur Kategorisi
        </Label>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {TOUR_TYPES.map((t) => {
            const active = selectedType === t.value
            return (
              <button
                key={t.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, tour_type: t.value })}
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

      {/* Ulaşım Şekli */}
      <div>
        <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
          Ana Ulaşım Aracı
        </Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOUR_TRANSPORT_TYPES.map((tr) => {
            const active = selectedTransport === tr.value
            const Icon = tr.icon
            return (
              <button
                key={tr.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, transport_type: tr.value })}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 dark:bg-primary-950/40 dark:border-primary-500'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/60'
                }`}
              >
                <Icon className={`size-5 mt-0.5 shrink-0 ${active ? 'text-primary-600' : 'text-neutral-400'}`} />
                <div>
                  <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">{tr.label}</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{tr.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Süre & Grup Kapasitesi */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Field className="block">
          <Label className="text-xs font-medium">Tur Süresi (Gün)</Label>
          <Input
            type="number"
            min="1"
            value={value.duration_days ?? '2'}
            onChange={(e) => onChange({ ...value, duration_days: e.target.value })}
            placeholder="ör: 3"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium">Konaklama (Gece)</Label>
          <Input
            type="number"
            min="0"
            value={value.duration_nights ?? '1'}
            onChange={(e) => onChange({ ...value, duration_nights: e.target.value })}
            placeholder="ör: 2"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium">Min. Grup Sayısı</Label>
          <Input
            type="number"
            min="1"
            value={value.group_size_min ?? '15'}
            onChange={(e) => onChange({ ...value, group_size_min: e.target.value })}
            placeholder="ör: 15"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium">Maks. Kontenjan</Label>
          <Input
            type="number"
            min="1"
            value={value.group_size_max ?? '46'}
            onChange={(e) => onChange({ ...value, group_size_max: e.target.value })}
            placeholder="ör: 46"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
      </div>

      {/* Rehber Dilleri */}
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Label className="text-xs font-medium mb-2 flex items-center gap-1.5">
          <Languages className="size-4 text-primary-600" />
          Rehberlik Dilleri
        </Label>
        <div className="flex flex-wrap gap-2">
          {TOUR_LANGUAGES.map((lang) => {
            const active = guideLangs.includes(lang.code)
            return (
              <button
                key={lang.code}
                type="button"
                disabled={disabled}
                onClick={() => toggleLang(lang.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300'
                }`}
              >
                {lang.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Step 2: Gün Gün Tur Programı (Itinerary) */
export function TourItineraryStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: TourAgencyBasicsState
  onChange: (next: TourAgencyBasicsState) => void
  disabled?: boolean
}) {
  const itinerary = value.itinerary || [
    {
      day_number: 1,
      title: 'Buluşma, Hareket & İlk Keşifler',
      description: 'Belirtilen kalkış noktalarından misafirlerimizi alarak konforlu yolculuğumuza başlıyoruz. Varışımızın ardından rehberimiz eşliğinde panoramik şehir turu ve ilk ziyaret noktaları.',
      meals: 'Sabah İkramı, Akşam Yemeği',
      accommodation: '4* / 5* Şehir Oteli',
    },
  ]

  function addDay() {
    if (disabled) return
    const nextDayNum = itinerary.length + 1
    const newDay: TourItineraryDay = {
      day_number: nextDayNum,
      title: `${nextDayNum}. Gün: Keşif & Gezi`,
      description: 'Otelde alınan sabah kahvaltısının ardından bölgenin tarihi ve doğal güzelliklerini ziyaret ediyoruz. Fotoğraf molaları ve serbest zaman.',
      meals: 'Kahvaltı, Akşam Yemeği',
      accommodation: 'Otel Konaklaması',
    }
    onChange({ ...value, itinerary: [...itinerary, newDay] })
  }

  function removeDay(index: number) {
    if (disabled) return
    const filtered = itinerary.filter((_, i) => i !== index).map((day, idx) => ({
      ...day,
      day_number: idx + 1,
    }))
    onChange({ ...value, itinerary: filtered })
  }

  function updateDay(index: number, patch: Partial<TourItineraryDay>) {
    if (disabled) return
    const updated = itinerary.map((day, i) => (i === index ? { ...day, ...patch } : day))
    onChange({ ...value, itinerary: updated })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Calendar className="size-5 text-primary-600" />
            Gün Gün Tur Programı (İtinerary)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Misafirlerin gün bazında göreceği yerleri, yemek düzenini ve konaklama detaylarını yapılandırın.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={addDay}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 text-white font-semibold text-xs hover:bg-primary-700 transition shadow-xs"
        >
          <Plus className="size-4" />
          Yeni Gün Ekle
        </button>
      </div>

      <div className="space-y-4">
        {itinerary.map((day, index) => (
          <div
            key={index}
            className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/40"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-100 text-primary-800 font-bold text-xs dark:bg-primary-950 dark:text-primary-300">
                <Clock className="size-3.5" />
                {day.day_number}. GÜN
              </span>
              {itinerary.length > 1 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeDay(index)}
                  className="p-1 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                  title="Günü Sil"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <Field className="block">
                <Label className="text-xs font-semibold">Gün Başlığı</Label>
                <Input
                  value={day.title}
                  onChange={(e) => updateDay(index, { title: e.target.value })}
                  placeholder="ör: Kapadokya Vadileri & Çömlek Atölyeleri"
                  disabled={disabled}
                  className="mt-1 font-semibold"
                />
              </Field>

              <Field className="block">
                <Label className="text-xs font-medium">Günlük Detaylı Açıklama & Rota</Label>
                <textarea
                  value={day.description}
                  onChange={(e) => updateDay(index, { description: e.target.value })}
                  placeholder="Sabah otelde alınan kahvaltının ardından..."
                  disabled={disabled}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field className="block">
                  <Label className="text-xs font-medium">Günün Yemekleri</Label>
                  <Input
                    value={day.meals ?? ''}
                    onChange={(e) => updateDay(index, { meals: e.target.value })}
                    placeholder="ör: Sabah Kahvaltısı, Akşam Yemeği"
                    disabled={disabled}
                    className="mt-1 text-xs"
                  />
                </Field>
                <Field className="block">
                  <Label className="text-xs font-medium">Günün Konaklaması</Label>
                  <Input
                    value={day.accommodation ?? ''}
                    onChange={(e) => updateDay(index, { accommodation: e.target.value })}
                    placeholder="ör: 5* Cave Resort Otel"
                    disabled={disabled}
                    className="mt-1 text-xs"
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Step 3: Dahil & Hariç Hizmetler, Kalkış Durakları ve Tur Kuralları */
export function TourServicesAndTermsStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: TourAgencyBasicsState
  onChange: (next: TourAgencyBasicsState) => void
  disabled?: boolean
}) {
  const included = value.included_services || TOUR_INCLUDED_PRESETS.slice(0, 5)
  const excluded = value.excluded_services || TOUR_EXCLUDED_PRESETS.slice(0, 4)
  const [newIncText, setNewIncText] = useState('')
  const [newExcText, setNewExcText] = useState('')

  function togglePresetInc(item: string) {
    if (disabled) return
    const next = included.includes(item)
      ? included.filter((x) => x !== item)
      : [...included, item]
    onChange({ ...value, included_services: next })
  }

  function togglePresetExc(item: string) {
    if (disabled) return
    const next = excluded.includes(item)
      ? excluded.filter((x) => x !== item)
      : [...excluded, item]
    onChange({ ...value, excluded_services: next })
  }

  function addCustomInc() {
    if (!newIncText.trim() || disabled) return
    onChange({ ...value, included_services: [...included, newIncText.trim()] })
    setNewIncText('')
  }

  function addCustomExc() {
    if (!newExcText.trim() || disabled) return
    onChange({ ...value, excluded_services: [...excluded, newExcText.trim()] })
    setNewExcText('')
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary-600" />
          Fiyata Dahil / Hariç Hizmetler & Rezervasyon Şartları
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Tüketici hakları ve acente standartları gereği fiyata dahil ve hariç hizmetleri net listeleyin.
        </p>
      </div>

      {/* Fiyata Dahil Hizmetler */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
          <CheckCircle2 className="size-4" />
          Fiyata Dahil Olan Hizmetler ({included.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {TOUR_INCLUDED_PRESETS.map((item) => {
            const active = included.includes(item)
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => togglePresetInc(item)}
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
        <div className="flex gap-2">
          <Input
            value={newIncText}
            onChange={(e) => setNewIncText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInc())}
            placeholder="Özel dahil hizmet ekle (ör: 1 Gece Gala Yemeği)"
            disabled={disabled}
            className="text-xs"
          />
          <button
            type="button"
            disabled={disabled || !newIncText.trim()}
            onClick={addCustomInc}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
          >
            Ekle
          </button>
        </div>
      </div>

      {/* Fiyata Hariç Olanlar */}
      <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
          <XCircle className="size-4" />
          Fiyata Hariç Olan Hizmetler ({excluded.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {TOUR_EXCLUDED_PRESETS.map((item) => {
            const active = excluded.includes(item)
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => togglePresetExc(item)}
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
        <div className="flex gap-2">
          <Input
            value={newExcText}
            onChange={(e) => setNewExcText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomExc())}
            placeholder="Özel hariç hizmet ekle (ör: Balon Turu Katılımı)"
            disabled={disabled}
            className="text-xs"
          />
          <button
            type="button"
            disabled={disabled || !newExcText.trim()}
            onClick={addCustomExc}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
          >
            Ekle
          </button>
        </div>
      </div>

      {/* Kalkış & İptal Politikası */}
      <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <Field className="block">
          <Label className="text-xs font-semibold">Tur Kalkış Saati & Buluşma</Label>
          <Input
            value={value.departure_time ?? '07:00'}
            onChange={(e) => onChange({ ...value, departure_time: e.target.value })}
            placeholder="ör: 07:00 Kadıköy Evlendirme / 07:30 Mecidiyeköy"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">İptal & İade Koşulları</Label>
          <Input
            value={value.cancellation_rules ?? 'Tura 15 gün kalaya kadar kesintisiz %100 iade garantisi'}
            onChange={(e) => onChange({ ...value, cancellation_rules: e.target.value })}
            placeholder="ör: Tura 7 gün kalaya kadar ücretsiz iptal"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
      </div>
    </div>
  )
}

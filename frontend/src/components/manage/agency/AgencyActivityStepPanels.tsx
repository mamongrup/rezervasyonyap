'use client'

import React from 'react'
import { Field, Label } from '@/components/manage/ManageFormField'
import Input from '@/shared/Input'
import {
  Compass,
  Activity,
  Clock,
  Users,
  MapPin,
  Car,
  ShieldCheck,
  Award,
  AlertTriangle,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Sparkles,
  Zap,
  Ticket,
  Luggage,
} from 'lucide-react'

export interface ActivityAgencyBasicsState {
  activity_category?: string
  duration_net?: string
  duration_total?: string
  difficulty_level?: string
  guided_languages?: string[]
  meeting_point_name?: string
  transfer_option?: 'included' | 'optional_fee' | 'optional_extra' | 'none' | string
  transfer_regions?: string
  parking_info?: string
  itinerary_flow?: Array<{ step: number; title: string; description: string; duration?: string }>
  equipment_included?: string[]
  equipment_excluded?: string[]
  bring_items?: string[]
  min_age?: string
  max_age?: string
  min_weight_kg?: string
  max_weight_kg?: string
  min_height_cm?: string
  health_restrictions?: string[]
  sessions?: Array<{ time: string; capacity: string; adult_price: string; child_price?: string }>
  operator_license_no?: string
  tursab_no?: string
  weather_guarantee?: string
  cancellation_policy?: string
}

export const ACTIVITY_CATEGORIES = [
  { value: 'paragliding', label: 'Yamaç Paraşütü (Tandem)', desc: 'Babadağ veya Kaş tepelerinden gökyüzü süzülüşü' },
  { value: 'scuba_diving', label: 'Scuba Diving / Dalış', desc: 'Batıklar, resifler ve su altı keşif turları' },
  { value: 'rafting', label: 'Rafting & Kanyon Geçişi', desc: 'Köprülü Kanyon ve Dalaman Çayı azgın suları' },
  { value: 'safari_quad', label: 'ATV & Buggy Safari', desc: 'Tozlu dağ parkurları ve çamurlu macera' },
  { value: 'jeep_safari', label: 'Jeep Safari & Köy Turu', desc: 'Üstü açık ciplerle şelale ve kanyon keşfi' },
  { value: 'watersports', label: 'Su Sporları & Jet Ski', desc: 'Parasailing, Flyboard, Ringo ve Jet Ski' },
  { value: 'boat_tour', label: 'Günübirlik Tekne Turu', desc: 'Özel veya paylaşımlı yüzme ve koy molaları' },
  { value: 'horse_riding', label: 'At Safari & Binicilik', desc: 'Plajda veya orman patikalarında gün batımı sürüşü' },
  { value: 'trekking', label: 'Trekking & Doğa Yürüyüşü', desc: 'Likya Yolu ve kanyon yürüyüş rotaları' },
  { value: 'culture_workshop', label: 'Kültür & Gastronomi Atölyesi', desc: 'Şarap tadımı, seramik veya yerel yemek dersi' },
]

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Kolay (Herkes İçin)', desc: 'Fiziksel kondisyon gerektirmez, aile ve çocuklara uygun' },
  { value: 'moderate', label: 'Orta (Hafif Efor)', desc: 'Temel hareket kabiliyeti ve hafif fiziksel güç gerekir' },
  { value: 'challenging', label: 'Zor (Adrenalin Dolu)', desc: 'Yüksek adrenalin, iyi kondisyon ve cesaret ister' },
  { value: 'expert', label: 'İleri Seviye (Sertifikalı)', desc: 'Dalış brövesi veya özel tecrübe gerektirir' },
]

export const DEFAULT_BRING_ITEMS = [
  'Spor ayakkabı (kaymaz taban)',
  'Rahat spor kıyafet veya şort',
  'Güneş gözlüğü & Güneş kremi',
  'Mayo & Plaj havlusu',
  'Yedek tişört / kıyafet',
  'Su geçirmez telefon kılıfı',
  'Küçük sırt çantası',
]

export const HEALTH_RESTRICTIONS_CATALOG = [
  'Hamile misafirler için uygun değildir',
  'Kalp rahatsızlığı veya yüksek tansiyonu olanlara uygun değildir',
  'Epilepsi veya nörolojik rahatsızlığı olanlara uygun değildir',
  'Panik atak veya ileri derecede yükseklik korkusu olanlara uygun değildir',
  'Son 6 ay içinde cerrahi operasyon geçirenlere uygun değildir',
  'Bel/boyun fıtığı veya omurga rahatsızlığı olanlara uygun değildir',
]

export function ActivityBasicsStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: ActivityAgencyBasicsState
  value?: ActivityAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<ActivityAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Hızlı ilan girişi</h3>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
              Kategori, toplam süre ve zorluk derecesini seçmeniz başlangıç için yeterlidir. Diğer ayrıntıları daha sonra da tamamlayabilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* Aktivite Kategorisi */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Activity className="h-4 w-4 text-primary-600" />
          Aktivite & Deneyim Kategorisi
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Acentenizde sunduğunuz aktivitenin ana türünü seçin.
        </p>

        <select
          disabled={disabled}
          className="mt-4 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
          value={values.activity_category || 'paragliding'}
          onChange={(e) => emitChange({ activity_category: e.target.value })}
        >
          {ACTIVITY_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <details className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-900/30">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Kategorileri açıklamalarıyla göster
          </summary>
          <div className="grid gap-3 border-t border-neutral-200 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-neutral-700">
            {ACTIVITY_CATEGORIES.map((cat) => {
              const isSelected = (values.activity_category || 'paragliding') === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => emitChange({ activity_category: cat.value })}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 dark:border-primary-500 dark:bg-primary-950/30'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                >
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{cat.label}</span>
                  <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{cat.desc}</span>
                </button>
              )
            })}
          </div>
        </details>
      </div>

      {/* Süre ve Zorluk Seviyesi */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Clock className="h-4 w-4 text-primary-600" />
          Süre, Zorluk & Diller
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field className="block">
            <Label className="text-xs font-medium">Net Aktivite Süresi</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. 45 Dakika Uçuş veya 2 Saat"
              value={values.duration_net || ''}
              onChange={(e) => emitChange({ duration_net: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Toplam Operasyon Süresi</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. 2.5 Saat (Transfer + Brifing dahil)"
              value={values.duration_total || ''}
              onChange={(e) => emitChange({ duration_total: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Rehberlik / Eğitmen Dilleri</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. Türkçe, İngilizce, Rusça"
              value={values.guided_languages ? values.guided_languages.join(', ') : 'Türkçe, İngilizce'}
              onChange={(e) => emitChange({ guided_languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
        </div>

        <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <Label className="mb-2 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Zorluk Derecesi
          </Label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DIFFICULTY_LEVELS.map((lvl) => {
              const isSelected = (values.difficulty_level || 'easy') === lvl.value
              return (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => emitChange({ difficulty_level: lvl.value })}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/30'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                >
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">{lvl.label}</span>
                  <span className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{lvl.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActivityMeetingTransferStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: ActivityAgencyBasicsState
  value?: ActivityAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<ActivityAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Car className="h-4 w-4 text-primary-600" />
          Buluşma Noktası & Otel Transfer Durumu
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field className="block sm:col-span-2">
            <Label className="text-xs font-medium">Buluşma / Toplanma İstasyonu Adı</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. Ölüdeniz Ofisimiz veya Otel Lobisi"
              value={values.meeting_point_name || ''}
              onChange={(e) => emitChange({ meeting_point_name: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Otelden Transfer Durumu</Label>
            <select
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              value={values.transfer_option || 'included'}
              onChange={(e) => emitChange({ transfer_option: e.target.value as 'included' | 'optional_fee' | 'none' })}
            >
              <option value="included">Otelden Alma & Bırakma Fiyata Dahil</option>
              <option value="optional_fee">Bölgesel Transfer İmkanı (+Ek Ücret)</option>
              <option value="none">Buluşma Noktasında Toplanma (Transfer Yok)</option>
            </select>
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Transfer Kapsamındaki Bölgeler</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. Ölüdeniz, Hisarönü, Ovacık, Fethiye Merkez"
              value={values.transfer_regions || ''}
              onChange={(e) => emitChange({ transfer_regions: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

export function ActivityProgramRulesStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: ActivityAgencyBasicsState
  value?: ActivityAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<ActivityAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  const itinerary = values.itinerary_flow ?? [
    { step: 1, title: 'Otelden Alma & Buluşma', description: 'Misafirlerin otellerinden veya ofisten karşılanması.' },
    { step: 2, title: 'Güvenlik Brifingi & Kuşanma', description: 'Uzman eğitmen eşliğinde ekipmanların giyilmesi ve kuralların anlatılması.' },
    { step: 3, title: 'Aktivite Deneyimi', description: 'Uçuş, dalış veya parkur sürüşü başlangıcı.' },
    { step: 4, title: 'Varış & Fotoğraf İncelemesi', description: 'İniş noktasına varış, fotoğraf/video seçimi ve otele dönüş transferi.' },
  ]

  const addFlowStep = () => {
    const next = [...itinerary, { step: itinerary.length + 1, title: '', description: '' }]
    emitChange({ itinerary_flow: next })
  }

  const removeFlowStep = (idx: number) => {
    const next = itinerary.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }))
    emitChange({ itinerary_flow: next })
  }

  const updateFlowStep = (idx: number, patch: Partial<{ title: string; description: string }>) => {
    const next = itinerary.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    emitChange({ itinerary_flow: next })
  }

  return (
    <div className="space-y-6">
      {/* Deneyim Akışı Timeline */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Zap className="h-4 w-4 text-primary-600" />
          Adım Adım Aktivite Akışı (Timeline)
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Gezginlerin aktivite gününde ne yaşayacağını adım adım listeleyin.
        </p>

        <div className="mt-4 space-y-3">
          {itinerary.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                {step.step}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Adım başlığı (ör. Zirveye Transfer)"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  value={step.title}
                  onChange={(e) => updateFlowStep(idx, { title: e.target.value })}
                />
                <textarea
                  rows={2}
                  placeholder="Detaylı açıklama..."
                  className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                  value={step.description}
                  onChange={(e) => updateFlowStep(idx, { description: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeFlowStep(idx)}
                className="text-neutral-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addFlowStep}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            <PlusCircle className="h-4 w-4" /> Yeni Akış Adımı Ekle
          </button>
        </div>
      </div>

      {/* Katılım Koşulları & Kısıtlamalar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Katılım Kriterleri & Sağlık Kısıtlamaları
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field className="block">
            <Label className="text-xs font-medium">Min. Yaş Sınırı</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="ör. 5"
              value={values.min_age || '5'}
              onChange={(e) => emitChange({ min_age: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Maks. Yaş Sınırı</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="ör. 65"
              value={values.max_age || '65'}
              onChange={(e) => emitChange({ max_age: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Min. Kilo (kg)</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="ör. 30"
              value={values.min_weight_kg || '30'}
              onChange={(e) => emitChange({ min_weight_kg: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Maks. Kilo (kg)</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="ör. 105"
              value={values.max_weight_kg || '105'}
              onChange={(e) => emitChange({ max_weight_kg: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

export function ActivityOperationsSafetyStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: ActivityAgencyBasicsState
  value?: ActivityAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<ActivityAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Award className="h-4 w-4 text-primary-600" />
          Lisans, Güvenlik & İade Güvencesi
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field className="block">
            <Label className="text-xs font-medium">TÜRSAB Belge Numarası</Label>
            <Input
              type="text"
              className="mt-1 font-mono"
              placeholder="ör. TÜRSAB 12345"
              value={values.tursab_no || ''}
              onChange={(e) => emitChange({ tursab_no: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Spor / Federasyon Lisans No</Label>
            <Input
              type="text"
              className="mt-1 font-mono"
              placeholder="ör. THK-P-98432"
              value={values.operator_license_no || ''}
              onChange={(e) => emitChange({ operator_license_no: e.target.value })}
            />
          </Field>
          <Field className="block sm:col-span-2">
            <Label className="text-xs font-medium">Hava Koşulları İade / Erteleme Garantisi</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="Hava şartları nedeniyle yapılamayan uçuşlarda ücretsiz tarih değişikliği veya %100 kesintisiz para iadesi."
              value={values.weather_guarantee || 'Hava muhalefeti durumunda %100 kesintisiz iade veya ücretsiz erteleme.'}
              onChange={(e) => emitChange({ weather_guarantee: e.target.value })}
            />
          </Field>
          <Field className="block sm:col-span-2">
            <Label className="text-xs font-medium">İptal Politikası</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="Aktivite saatine 24 saat kalaya kadar koşulsuz şartsız %100 ücretsiz iptal."
              value={values.cancellation_policy || 'Aktivite saatine 24 saat kalaya kadar koşulsuz %100 iade.'}
              onChange={(e) => emitChange({ cancellation_policy: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Aktivite Seansları (Farklı Ad, Süre, Fiyat & Kontenjan) ─────────────────
export interface ActivitySessionItem {
  id?: string
  session_name: string
  start_time: string
  end_time?: string
  duration_minutes: string
  capacity: string
  adult_price: string
  child_price?: string
  currency_code: string
  valid_from: string
  valid_to: string
  is_active: boolean
  description?: string
}

export function emptyActivitySessionItem(currency = 'TRY'): ActivitySessionItem {
  const today = new Date().toISOString().slice(0, 10)
  const endOfYear = `${new Date().getFullYear()}-11-30`
  return {
    session_name: 'Sabah Uçuş Seansı',
    start_time: '08:30',
    end_time: '10:30',
    duration_minutes: '120',
    capacity: '8',
    adult_price: '3500',
    child_price: '2500',
    currency_code: currency,
    valid_from: today,
    valid_to: endOfYear,
    is_active: true,
    description: 'Sabah sakin rüzgarı eşliğinde keyifli uçuş',
  }
}

export function ActivitySessionsStepPanel({
  sessions,
  onChange,
  currency = 'TRY',
  disabled = false,
}: {
  sessions: ActivitySessionItem[]
  onChange: (sessions: ActivitySessionItem[]) => void
  currency?: string
  disabled?: boolean
}) {
  const activeSessions = sessions.filter((s) => s.is_active)
  const lowestPrice = activeSessions.reduce((min, s) => {
    const p = parseFloat(s.adult_price || '0')
    return p > 0 && (min === 0 || p < min) ? p : min
  }, 0)
  const totalDailyCapacity = activeSessions.reduce((sum, s) => {
    return sum + (parseInt(s.capacity || '0', 10) || 0)
  }, 0)

  const handleUpdate = (index: number, patch: Partial<ActivitySessionItem>) => {
    const updated = [...sessions]
    updated[index] = { ...updated[index], ...patch }
    onChange(updated)
  }

  const handleRemove = (index: number) => {
    if (sessions.length <= 1) {
      onChange([emptyActivitySessionItem(currency)])
      return
    }
    onChange(sessions.filter((_, i) => i !== index))
  }

  const handleClone = (index: number) => {
    const target = sessions[index]
    const [h, m] = (target.start_time || '10:00').split(':').map((x) => parseInt(x, 10) || 0)
    const newHour = Math.min(20, h + 3)
    const newStartTime = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    const cloned: ActivitySessionItem = {
      ...target,
      id: undefined,
      session_name: `${newStartTime} Seansı`,
      start_time: newStartTime,
    }
    onChange([...sessions, cloned])
  }

  const handleAddSession = () => {
    const nextHour = 8 + sessions.length * 2.5
    const clampedH = Math.min(19, Math.floor(nextHour))
    const clampedM = Math.round((nextHour - clampedH) * 60)
    const timeStr = `${String(clampedH).padStart(2, '0')}:${String(clampedM).padStart(2, '0')}`

    const newSession: ActivitySessionItem = {
      ...emptyActivitySessionItem(currency),
      session_name: `${timeStr} Seansı`,
      start_time: timeStr,
    }
    onChange([...sessions, newSession])
  }

  const applyPreset = (presetType: 'paragliding_4' | 'safari_2' | 'sunset_special' | 'fullday_single') => {
    const today = new Date().toISOString().slice(0, 10)
    const endOfYear = `${new Date().getFullYear()}-11-30`

    if (presetType === 'paragliding_4') {
      onChange([
        {
          session_name: '08:30 - Sabah Gün Doğumu Uçuşu',
          start_time: '08:30',
          duration_minutes: '120',
          capacity: '6',
          adult_price: '3250',
          child_price: '2250',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'Sakin sabah termiğinde yumuşak ve keyifli süzülüş.',
        },
        {
          session_name: '11:00 - Öğlen Termik & Yüksek İrtifa',
          start_time: '11:00',
          duration_minutes: '120',
          capacity: '8',
          adult_price: '3500',
          child_price: '2500',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'En yüksek irtifa ve dinamik hava hareketleri.',
        },
        {
          session_name: '14:30 - Öğleden Sonra Panoramik Seansı',
          start_time: '14:30',
          duration_minutes: '120',
          capacity: '8',
          adult_price: '3500',
          child_price: '2500',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'Berrak gökyüzü ve masmavi lagün manzarası.',
        },
        {
          session_name: '17:30 - Gün Batımı (Sunset) Özel Seansı',
          start_time: '17:30',
          duration_minutes: '120',
          capacity: '6',
          adult_price: '4000',
          child_price: '3000',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'Büyüleyici gün batımı kızıllığında romantik uçuş.',
        },
      ])
    } else if (presetType === 'safari_2') {
      onChange([
        {
          session_name: 'Sabah Grubu Safari (09:30)',
          start_time: '09:30',
          duration_minutes: '180',
          capacity: '16',
          adult_price: '1800',
          child_price: '1200',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'Günün erken saatlerinde serin orman ve nehir parkuru.',
        },
        {
          session_name: 'Öğleden Sonra & Gün Batımı Safari (15:30)',
          start_time: '15:30',
          duration_minutes: '180',
          capacity: '16',
          adult_price: '2100',
          child_price: '1400',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'Fotoğraf molalı ve gün batımı manzaralı akşamüstü parkuru.',
        },
      ])
    } else if (presetType === 'sunset_special') {
      onChange([
        {
          session_name: 'Akşam Sunset & Romantik Seans',
          start_time: '18:00',
          duration_minutes: '150',
          capacity: '10',
          adult_price: '2750',
          child_price: '2000',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'İçecek ikramlı ve gün batımı manzaralı özel seans.',
        },
      ])
    } else if (presetType === 'fullday_single') {
      onChange([
        {
          session_name: 'Tam Günlük Paket Tur (10:00 - 17:00)',
          start_time: '10:00',
          duration_minutes: '420',
          capacity: '30',
          adult_price: '2200',
          child_price: '1500',
          currency_code: currency,
          valid_from: today,
          valid_to: endOfYear,
          is_active: true,
          description: 'Öğle yemeği ve yüzme molaları dahil tam gün tur.',
        },
      ])
    }
  }

  return (
    <div className="space-y-6">
      {/* İstatistik & Özet Başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary-200 bg-primary-50/70 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Aktivite Seansları ve Fiyat Tarifesi
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Her seansın adı, kalkış saati, operasyon süresi, kişi başı fiyatı ve kontenjanı birbirinden bağımsızdır.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            Aktif Seans: <strong className="text-primary-600">{activeSessions.length}</strong> / {sessions.length}
          </span>
          {lowestPrice > 0 && (
            <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Başlangıç Vitrin Fiyatı:{' '}
              <strong className="text-emerald-600">
                {lowestPrice.toLocaleString('tr-TR')} {currency}
              </strong>
            </span>
          )}
          {totalDailyCapacity > 0 && (
            <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Günlük Kapasite: <strong className="text-neutral-900 dark:text-white">{totalDailyCapacity} kişi</strong>
            </span>
          )}
        </div>
      </div>

      {/* Hızlı Şablon Butonları */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          ⚡ Hızlı Acente Seans Şablonları (Tek Tıkla Yükle):
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('paragliding_4')}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            4 Seanslı Günlük Akış (08:30 / 11:00 / 14:30 / 17:30)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('safari_2')}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Compass className="h-3.5 w-3.5 text-emerald-500" />
            2 Seanslı Sabah & Öğleden Sonra (Safari / Dalış)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('sunset_special')}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            Sunset & Akşamüstü Seansı (18:00)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('fullday_single')}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Ticket className="h-3.5 w-3.5 text-blue-500" />
            Tam Günlük Tur (10:00 - 17:00)
          </button>
        </div>
      </div>

      {/* Seans Kartları */}
      <div className="space-y-4">
        {sessions.map((session, idx) => (
          <div
            key={idx}
            className={`relative rounded-2xl border transition-all duration-200 ${
              session.is_active
                ? 'border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800'
                : 'border-dashed border-neutral-300 bg-neutral-50/70 opacity-60 dark:border-neutral-700 dark:bg-neutral-900/50'
            } p-5`}
          >
            {/* Üst Bar: Seans Sırası, Başlığı ve Aksiyonlar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-700/60">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {session.session_name || `Seans #${idx + 1}`}
                </span>
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                  ⏰ {session.start_time || '00:00'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Aktif/Pasif */}
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={session.is_active}
                    onChange={(e) => handleUpdate(idx, { is_active: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                  {session.is_active ? 'Satışta' : 'Pasif'}
                </label>

                {/* Klonla */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleClone(idx)}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                  title="Aynı ayarlarla yeni seans çoğalt"
                >
                  Çoğalt
                </button>

                {/* Sil */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRemove(idx)}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  title="Seansı kaldır"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sık kullanılan seans alanları */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field className="block sm:col-span-2">
                <Label className="text-xs font-medium">Seans Adı / Tanımı</Label>
                <Input
                  type="text"
                  disabled={disabled}
                  className="mt-1"
                  placeholder="ör. 08:30 - Sabah Gün Doğumu Seansı"
                  value={session.session_name}
                  onChange={(e) => handleUpdate(idx, { session_name: e.target.value })}
                />
              </Field>

              <Field className="block">
                <Label className="text-xs font-medium">Başlangıç Saati</Label>
                <Input
                  type="time"
                  disabled={disabled}
                  className="mt-1 font-mono font-bold"
                  value={session.start_time}
                  onChange={(e) => handleUpdate(idx, { start_time: e.target.value })}
                />
              </Field>

              <Field className="block">
                <Label className="text-xs font-medium">Süre (Dakika)</Label>
                <Input
                  type="number"
                  min="1"
                  disabled={disabled}
                  className="mt-1"
                  placeholder="120"
                  value={session.duration_minutes}
                  onChange={(e) => handleUpdate(idx, { duration_minutes: e.target.value })}
                />
              </Field>

              <Field className="block">
                <Label className="text-xs font-medium">
                  Yetişkin Fiyatı ({session.currency_code || currency})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  disabled={disabled}
                  className="mt-1 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  placeholder="3500"
                  value={session.adult_price}
                  onChange={(e) => handleUpdate(idx, { adult_price: e.target.value })}
                />
              </Field>

              <Field className="block">
                <Label className="text-xs font-medium">Kontenjan (Kişi Kapasitesi)</Label>
                <Input
                  type="number"
                  min="1"
                  disabled={disabled}
                  className="mt-1 font-mono"
                  placeholder="8"
                  value={session.capacity}
                  onChange={(e) => handleUpdate(idx, { capacity: e.target.value })}
                />
              </Field>

            </div>

            <details className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/70 dark:border-neutral-700 dark:bg-neutral-900/40">
              <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Gelişmiş seans ayarları: çocuk fiyatı, sezon, para birimi ve not
              </summary>
              <div className="grid gap-4 border-t border-neutral-200 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-neutral-700">
                <Field className="block">
                  <Label className="text-xs font-medium">Çocuk Fiyatı ({session.currency_code || currency})</Label>
                  <Input type="number" min="0" step="1" disabled={disabled} className="mt-1 font-mono"
                    placeholder="Boşsa çocuk fiyatı kullanılmaz" value={session.child_price || ''}
                    onChange={(e) => handleUpdate(idx, { child_price: e.target.value })} />
                </Field>
                <Field className="block">
                  <Label className="text-xs font-medium">Para Birimi</Label>
                  <select disabled={disabled}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                    value={session.currency_code || currency}
                    onChange={(e) => handleUpdate(idx, { currency_code: e.target.value })}>
                    <option value="TRY">TRY (₺)</option><option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
                  </select>
                </Field>
                <Field className="block">
                  <Label className="text-xs font-medium">Sezon Başlangıç Tarihi</Label>
                  <Input type="date" disabled={disabled} className="mt-1" value={session.valid_from}
                    onChange={(e) => handleUpdate(idx, { valid_from: e.target.value })} />
                </Field>
                <Field className="block">
                  <Label className="text-xs font-medium">Sezon Bitiş Tarihi</Label>
                  <Input type="date" disabled={disabled} className="mt-1" value={session.valid_to}
                    onChange={(e) => handleUpdate(idx, { valid_to: e.target.value })} />
                </Field>
                <Field className="block sm:col-span-2 lg:col-span-4">
                  <Label className="text-xs font-medium">Seans Notu / Ekstra Dahil Olanlar</Label>
                  <Input type="text" disabled={disabled} className="mt-1"
                    placeholder="ör. GoPro çekimi veya ikram fiyata dahil" value={session.description || ''}
                    onChange={(e) => handleUpdate(idx, { description: e.target.value })} />
                </Field>
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Yeni Seans Ekle Butonu */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleAddSession}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/50 py-4 text-sm font-bold text-primary-700 transition hover:border-primary-500 hover:bg-primary-50 dark:border-primary-800 dark:bg-primary-950/20 dark:text-primary-300"
      >
        <PlusCircle className="h-5 w-5" />
        + Yeni Seans Ekle (Farklı Saat & Fiyat)
      </button>
    </div>
  )
}

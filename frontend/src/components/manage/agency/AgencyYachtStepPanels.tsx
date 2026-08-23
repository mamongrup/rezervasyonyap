'use client'

import React from 'react'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import {
  Anchor,
  Sailboat,
  Compass,
  Users,
  ShieldCheck,
  Fuel,
  Ship,
  Sparkles,
  Waves,
  MapPin,
  Clock,
  PlusCircle,
  MinusCircle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react'

export interface YachtAgencyBasicsState {
  yacht_type?: string
  length_meters?: string
  beam_meters?: string
  draft_meters?: string
  hull_material?: string
  build_year?: string
  refit_year?: string
  cruising_speed_knots?: string
  max_speed_knots?: string
  engine_hp?: string
  flag?: string
  port_name?: string
  routes?: string[]
  passenger_count_day?: string
  passenger_count_night?: string
  cabin_count?: string
  master_cabins?: string
  vip_cabins?: string
  double_cabins?: string
  twin_cabins?: string
  bathroom_count?: string
  crew_count?: string
  crew_members?: string[]
  captain_included?: 'yes' | 'no' | 'optional' | string
  fuel_policy?: string
  water_sports?: string[]
  equipment?: string[]
  includes?: string[]
  excludes?: string[]
  min_charter_days?: string
  checkin_day_time?: string
  checkout_day_time?: string
  security_deposit?: string
  apa_percent?: string
  cancellation_policy?: string
  low_season_price?: string
  mid_season_price?: string
  high_season_price?: string
}

export const YACHT_TYPES = [
  { value: 'Gulet', label: 'Gulet (Geleneksel Ahşap)', desc: 'Geniş güverte, klasik konfor ve mavi tur klasiği' },
  { value: 'Deluxe Gulet', label: 'Delüks / Lüks Gulet', desc: 'Yüksek konfor, klima, jakuzi ve özel servis' },
  { value: 'Motor Yacht', label: 'Motor Yat', desc: 'Yüksek hız, modern lüks ve üst düzey prestij' },
  { value: 'Mega Yacht', label: 'Mega Yat / Süperyat', desc: '50m+ devasa yaşam alanları ve VIP olanaklar' },
  { value: 'Catamaran', label: 'Katamaran', desc: 'Çift gövde, sığ koylara erişim ve yüksek denge' },
  { value: 'Sailing Yacht', label: 'Yelkenli', desc: 'Gerçek denizcilik keyfi ve rüzgarla seyir' },
  { value: 'Trawler', label: 'Trawler', desc: 'Geniş iç hacim, düşük yakıt tüketimi ve uzun menzil' },
  { value: 'Speedboat', label: 'Sürat Teknesi / Günlük', desc: 'Günübirlik transfer ve hızlı koy turları' },
]

export const YACHT_MARINAS = [
  'Göcek D-Marin / Belediye Marinası',
  'Bodrum Milta Marina / Turgutreis',
  'Marmaris Netsel Marina / Yat Limanı',
  'Fethiye Ece Marina / Yat Limanı',
  'Kaş Marina',
  'Kemer Türkiz Marina',
  'Bozburun Balıkçı Barınağı & İskele',
  'Antalya Çelebi Marina',
  'Çeşme Marina',
]

export const YACHT_POPULAR_ROUTES = [
  'Göcek Koyları & 12 Adalar (Yassıca, Bedri Rahmi, Sarsala)',
  'Gökova Körfezi & Sedir Adası (Kleopatra Plajı)',
  'Hisarönü Körfezi, Datça, Selimiye & Bozburun',
  'Fethiye - Ölüdeniz - Kelebekler Vadisi - Gemiler Adası',
  'Kaş - Kalkan - Kekova Batık Şehir - Simena Kalesi',
  'Kuzey On İki Adalar (Kos, Leros, Patmos)',
  'Güney On İki Adalar (Rodos, Simi, Tilos)',
]

export const YACHT_WATER_SPORTS_CATALOG = [
  { id: 'tender_bot', label: 'Servis Botu / Tender (Motorlu)' },
  { id: 'canoe', label: 'Deniz Kanosu (Kano)' },
  { id: 'paddleboard', label: 'Stand-Up Paddleboard (SUP)' },
  { id: 'seabob', label: 'Seabob / Deniz Altı Scooter' },
  { id: 'water_ski', label: 'Su Kayağı (Water Ski)' },
  { id: 'wakeboard', label: 'Wakeboard & Mono Kayak' },
  { id: 'ringo_banana', label: 'Ringo / Banana (Çekilebilir)' },
  { id: 'snorkel_gear', label: 'Şnorkel, Maske ve Palet Takımları' },
  { id: 'fishing_gear', label: 'Amatör Balık Avlama Takımları' },
  { id: 'sea_scooter', label: 'Elektrikli Su Jeti / E-Foil' },
]

export const YACHT_EQUIPMENT_CATALOG = [
  { id: 'generator', label: 'Güçlü Jeneratör (220V)' },
  { id: 'watermaker', label: 'Su Yapıcı (Watermaker)' },
  { id: 'ac_all_cabins', label: 'Tüm Kamaralarda Klima' },
  { id: 'ice_maker', label: 'Buz Makinesi & Derin Dondurucu' },
  { id: 'coffee_machine', label: 'Espresso / Filtre Kahve Makinesi' },
  { id: 'deck_jacuzzi', label: 'Güverte Jakuzisi' },
  { id: 'flybridge', label: 'Flybridge (Üst Güverte)' },
  { id: 'swim_platform', label: 'Geniş Yüzme Platformu & Merdiven' },
  { id: 'sound_system', label: 'Bluetooth / Hi-Fi Ses Sistemi' },
  { id: 'satellite_tv', label: 'Uydu TV & Wi-Fi İnternet' },
  { id: 'deck_shower', label: 'Sıcak Su Güverte Duşu' },
  { id: 'sunbed_cushions', label: 'Geniş Güneşlenme Minderleri' },
]

export function YachtBasicsStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: YachtAgencyBasicsState
  value?: YachtAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<YachtAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  return (
    <div className="space-y-6">
      {/* Tekne Türü */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Sailboat className="h-4 w-4 text-primary-600" />
          Yat & Tekne Türü
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Kiralama listenizdeki teknenin sınıfını seçin.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {YACHT_TYPES.map((type) => {
            const isSelected = (values.yacht_type || 'Gulet') === type.value
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => emitChange({ yacht_type: type.value })}
                className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 dark:border-primary-500 dark:bg-primary-950/30'
                    : 'border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900/30'
                }`}
              >
                <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                  {type.label}
                </span>
                <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {type.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Teknik Özellikler ve Boyutlar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Ship className="h-4 w-4 text-primary-600" />
          Teknik Boyutlar & Seyir Donanımı
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field className="block">
            <Label className="text-xs font-medium">Tam Boy (LOA - metre)</Label>
            <Input
              type="number"
              step="0.1"
              min="5"
              className="mt-1"
              placeholder="ör. 28.5"
              value={values.length_meters || ''}
              onChange={(e) => emitChange({ length_meters: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Genişlik / En (metre)</Label>
            <Input
              type="number"
              step="0.1"
              min="2"
              className="mt-1"
              placeholder="ör. 7.2"
              value={values.beam_meters || ''}
              onChange={(e) => emitChange({ beam_meters: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Draft / Su Çekimi (metre)</Label>
            <Input
              type="number"
              step="0.1"
              min="0.5"
              className="mt-1"
              placeholder="ör. 2.8"
              value={values.draft_meters || ''}
              onChange={(e) => emitChange({ draft_meters: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Gövde Malzemesi</Label>
            <select
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              value={values.hull_material || 'Ahşap / Epoksi Lamine'}
              onChange={(e) => emitChange({ hull_material: e.target.value })}
            >
              <option value="Ahşap / Epoksi Lamine">Ahşap / Epoksi Lamine</option>
              <option value="Fiberglas (GRP)">Fiberglas (GRP)</option>
              <option value="Çelik Sac">Çelik Sac</option>
              <option value="Alüminyum">Alüminyum</option>
              <option value="Karbon Kompozit">Karbon Kompozit</option>
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <Field className="block">
            <Label className="text-xs font-medium">Yapım Yılı</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="ör. 2018"
              value={values.build_year || ''}
              onChange={(e) => emitChange({ build_year: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Son Yenileme (Refit) Yılı</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="ör. 2024"
              value={values.refit_year || ''}
              onChange={(e) => emitChange({ refit_year: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Seyir Hızı (Knot / Deniz Mili)</Label>
            <Input
              type="number"
              step="0.5"
              className="mt-1"
              placeholder="ör. 10"
              value={values.cruising_speed_knots || ''}
              onChange={(e) => emitChange({ cruising_speed_knots: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Bayrak</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. Türk Bayrağı (TR)"
              value={values.flag || 'Türk Bayrağı'}
              onChange={(e) => emitChange({ flag: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

export function YachtLocationRoutesStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: YachtAgencyBasicsState
  value?: YachtAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<YachtAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  const selectedRoutes = new Set(values.routes ?? [])

  const toggleRoute = (route: string) => {
    const next = new Set(selectedRoutes)
    if (next.has(route)) next.delete(route)
    else next.add(route)
    emitChange({ routes: Array.from(next) })
  }

  return (
    <div className="space-y-6">
      {/* Ana Liman / Marina */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Anchor className="h-4 w-4 text-primary-600" />
          Ana Bağlama Limanı / Marina
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Yatın standart biniş ve iniş yaptığı ana marina veya limanı seçin.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {YACHT_MARINAS.map((marina) => {
            const isSelected = (values.port_name || '') === marina
            return (
              <button
                key={marina}
                type="button"
                onClick={() => emitChange({ port_name: marina })}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50/70 text-primary-950 font-semibold ring-2 ring-primary-500/20 dark:border-primary-500 dark:bg-primary-950/30 dark:text-white'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900'
                }`}
              >
                <MapPin className="h-4 w-4 text-primary-600 shrink-0" />
                <span className="text-xs">{marina}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Popüler Seyir Rotaları */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Compass className="h-4 w-4 text-primary-600" />
          Hizmet Verilen Seyir Rotaları & Koylar
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Bu yatla yapılan mavi tur programlarını ve gidilen popüler koyları işaretleyin.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {YACHT_POPULAR_ROUTES.map((route) => {
            const isChecked = selectedRoutes.has(route)
            return (
              <label
                key={route}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  isChecked
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-950/30'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleRoute(route)}
                  className="h-4 w-4 rounded accent-emerald-600"
                />
                <span className="text-xs font-medium text-neutral-900 dark:text-white">
                  {route}
                </span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function YachtCabinsAndEquipmentStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: YachtAgencyBasicsState
  value?: YachtAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<YachtAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  const selectedWaterSports = new Set(values.water_sports ?? [])
  const selectedEquipment = new Set(values.equipment ?? [])

  const toggleWaterSport = (id: string) => {
    const next = new Set(selectedWaterSports)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    emitChange({ water_sports: Array.from(next) })
  }

  const toggleEquipment = (id: string) => {
    const next = new Set(selectedEquipment)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    emitChange({ equipment: Array.from(next) })
  }

  return (
    <div className="space-y-6">
      {/* Kapasite & Kamaralar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Users className="h-4 w-4 text-primary-600" />
          Kapasite, Kamara & Banyo Dağılımı
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field className="block">
            <Label className="text-xs font-medium">Gündüz Yolcu Kapasitesi</Label>
            <Input
              type="number"
              min="1"
              className="mt-1"
              placeholder="ör. 12"
              value={values.passenger_count_day || ''}
              onChange={(e) => emitChange({ passenger_count_day: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Geceleme / Yatak Kapasitesi</Label>
            <Input
              type="number"
              min="1"
              className="mt-1"
              placeholder="ör. 8"
              value={values.passenger_count_night || ''}
              onChange={(e) => emitChange({ passenger_count_night: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Toplam Kamara Sayısı</Label>
            <Input
              type="number"
              min="1"
              className="mt-1"
              placeholder="ör. 4"
              value={values.cabin_count || ''}
              onChange={(e) => emitChange({ cabin_count: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Banyo / WC Sayısı</Label>
            <Input
              type="number"
              min="1"
              className="mt-1"
              placeholder="ör. 4"
              value={values.bathroom_count || ''}
              onChange={(e) => emitChange({ bathroom_count: e.target.value })}
            />
          </Field>
        </div>

        {/* Kamara Detayları */}
        <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Kamara Tipleri Adetleri
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field className="block">
              <Label className="text-[11px]">Master Kamara Adedi</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                placeholder="1"
                value={values.master_cabins || ''}
                onChange={(e) => emitChange({ master_cabins: e.target.value })}
              />
            </Field>
            <Field className="block">
              <Label className="text-[11px]">VIP Kamara Adedi</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                placeholder="1"
                value={values.vip_cabins || ''}
                onChange={(e) => emitChange({ vip_cabins: e.target.value })}
              />
            </Field>
            <Field className="block">
              <Label className="text-[11px]">Double (Çift Kişilik) Kamara</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                placeholder="2"
                value={values.double_cabins || ''}
                onChange={(e) => emitChange({ double_cabins: e.target.value })}
              />
            </Field>
            <Field className="block">
              <Label className="text-[11px]">Twin (2 Tek Yataklı) Kamara</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                placeholder="0"
                value={values.twin_cabins || ''}
                onChange={(e) => emitChange({ twin_cabins: e.target.value })}
              />
            </Field>
          </div>
        </div>

        {/* Mürettebat */}
        <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field className="block">
              <Label className="text-xs font-medium">Toplam Mürettebat Sayısı</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                placeholder="ör. 4 (Kaptan, Aşçı, 2 Gemici)"
                value={values.crew_count || ''}
                onChange={(e) => emitChange({ crew_count: e.target.value })}
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label className="text-xs font-medium">Kaptanlık Durumu</Label>
              <select
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                value={values.captain_included || 'yes'}
                onChange={(e) => emitChange({ captain_included: e.target.value as 'yes' | 'no' | 'optional' })}
              >
                <option value="yes">Kaptan ve Mürettebat Fiyata Dahil</option>
                <option value="optional">Kaptan İsteğe Bağlı (+Ek Ücretli)</option>
                <option value="no">Kaptansız Kiralama (Bareboat - Lisans Gerekir)</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Su Sporları & Donanım */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Su Sporları */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            <Waves className="h-4 w-4 text-primary-600" />
            Su Sporları & Oyuncaklar
          </h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {YACHT_WATER_SPORTS_CATALOG.map((item) => {
              const isChecked = selectedWaterSports.has(item.id)
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                    isChecked
                      ? 'border-primary-500 bg-primary-50/60 text-primary-900 dark:border-primary-600 dark:bg-primary-950/40 dark:text-primary-200'
                      : 'border-neutral-200 bg-neutral-50/40 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleWaterSport(item.id)}
                    className="h-4 w-4 rounded accent-primary-600"
                  />
                  <span className="text-xs font-medium">{item.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Konfor ve Donanım */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            <Sparkles className="h-4 w-4 text-primary-600" />
            Konfor & Seyir Donanımları
          </h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {YACHT_EQUIPMENT_CATALOG.map((item) => {
              const isChecked = selectedEquipment.has(item.id)
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                    isChecked
                      ? 'border-primary-500 bg-primary-50/60 text-primary-900 dark:border-primary-600 dark:bg-primary-950/40 dark:text-primary-200'
                      : 'border-neutral-200 bg-neutral-50/40 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEquipment(item.id)}
                    className="h-4 w-4 rounded accent-primary-600"
                  />
                  <span className="text-xs font-medium">{item.label}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function YachtCharterTermsStepPanel({
  values: propValues,
  value: propValue,
  onChange,
  disabled,
}: {
  values?: YachtAgencyBasicsState
  value?: YachtAgencyBasicsState
  onChange?: (patch: any) => void
  disabled?: boolean
}) {
  const values = propValue || propValues || {}
  const emitChange = (patch: Partial<YachtAgencyBasicsState>) => {
    if (!onChange) return
    onChange((prev: any) => (typeof prev === 'object' && prev !== null ? { ...prev, ...patch } : patch))
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <ShieldCheck className="h-4 w-4 text-primary-600" />
          Kiralama Kuralları & APA Şartları
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field className="block">
            <Label className="text-xs font-medium">Min. Kiralama Süresi (Gün)</Label>
            <Input
              type="number"
              min="1"
              className="mt-1"
              placeholder="ör. 7 (Cumartesi-Cumartesi)"
              value={values.min_charter_days || '7'}
              onChange={(e) => emitChange({ min_charter_days: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Giriş / Biniş Saati</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="Cumartesi 16:00"
              value={values.checkin_day_time || 'Cumartesi 16:00'}
              onChange={(e) => emitChange({ checkin_day_time: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Çıkış / İniş Saati</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="Cumartesi 09:30"
              value={values.checkout_day_time || 'Cumartesi 09:30'}
              onChange={(e) => emitChange({ checkout_day_time: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">APA (Kumanya Avansı) %</Label>
            <Input
              type="number"
              min="0"
              max="50"
              className="mt-1"
              placeholder="ör. 30"
              value={values.apa_percent || '30'}
              onChange={(e) => emitChange({ apa_percent: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <Field className="block">
            <Label className="text-xs font-medium">Hasar Depozitosu Tutarı</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. 2.500 EUR veya Depozitosuz"
              value={values.security_deposit || ''}
              onChange={(e) => emitChange({ security_deposit: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">İptal & İade Politikası</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="Tura 60 gün kalaya kadar %10 kesintiyle iade"
              value={values.cancellation_policy || ''}
              onChange={(e) => emitChange({ cancellation_policy: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

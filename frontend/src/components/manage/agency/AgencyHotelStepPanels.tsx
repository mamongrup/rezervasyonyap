'use client'

import React from 'react'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import {
  Hotel,
  Star,
  Coffee,
  Waves,
  Sparkles,
  Utensils,
  Baby,
  ShieldCheck,
  Clock,
  Car,
  Wifi,
  MapPin,
  Compass,
  CheckCircle2,
  AlertCircle,
  Footprints,
  Plane,
  Building,
} from 'lucide-react'

export interface HotelAgencyBasicsState {
  hotel_type?: string
  star_rating?: string
  board_types?: string[]
  checkin_time?: string
  checkout_time?: string
  child_policy?: string
  dist_beach?: string
  beach_type?: string
  dist_airport?: string
  dist_city_center?: string
  dist_bus_station?: string
  amenities?: string[]
  confirmation_type?: 'instant' | 'on_request'
  prepayment_percent?: string
  cancellation_policy?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
}

export const HOTEL_PROPERTY_TYPES = [
  { value: 'resort', label: 'Resort Otel (Tatil Köyü)', desc: 'Geniş arazide kapsamlı tesis, havuzlar ve plaj' },
  { value: 'boutique', label: 'Butik Otel', desc: 'Özgün mimari, kişiye özel servis ve şık tasarım' },
  { value: 'city_business', label: 'Şehir & İş Oteli', desc: 'Merkezi konum, toplantı salonu ve ulaşım kolaylığı' },
  { value: 'thermal_spa', label: 'Termal & Spa Oteli', desc: 'Şifalı su kaynakları, wellness ve masaj merkezleri' },
  { value: 'bungalow_mountain', label: 'Dağ & Bungalov Oteli', desc: 'Doğa içinde ahşap yapılar ve sakin atmosfer' },
  { value: 'apart_hotel', label: 'Apart Otel', desc: 'Mutfaklı süitler ve aile boyu bağımsız konaklama' },
  { value: 'pension', label: 'Pansiyon & Oda Kahvaltı', desc: 'Samimi, ekonomik ve yerel konaklama' },
]

export const HOTEL_STAR_RATINGS = [
  { value: '5', label: '5 Yıldızlı', badge: '★★★★★', desc: 'Lüks konaklama ve kusursuz servis' },
  { value: '4', label: '4 Yıldızlı', badge: '★★★★', desc: 'Yüksek kalite standartları ve konfor' },
  { value: '3', label: '3 Yıldızlı', badge: '★★★', desc: 'Konforlu ve ekonomik tatil' },
  { value: 'boutique_class', label: 'Özel Kategori / Butik', badge: 'Özel', desc: 'Kültür ve Turizm Bakanlığı belgeli' },
  { value: 'apart_class', label: 'Apart / Tesis', badge: 'Apart', desc: 'Bağımsız üniteli aile tesisi' },
]

export const HOTEL_BOARD_TYPES = [
  { code: 'UAI', label: 'Ultra Her Şey Dahil (UAI)', desc: '24 saat yerli/yabancı içecekler, ara öğünler ve a la carte' },
  { code: 'AI', label: 'Her Şey Dahil (AI)', desc: 'Sabah, öğle, akşam açık büfe ve gün boyu içecekler' },
  { code: 'FB', label: 'Tam Pansiyon (FB)', desc: 'Sabah kahvaltısı, öğle yemeği ve akşam yemeği' },
  { code: 'HB', label: 'Yarım Pansiyon (HB)', desc: 'Sabah kahvaltısı ve akşam yemeği dahil' },
  { code: 'BB', label: 'Oda Kahvaltı (BB)', desc: 'Yalnızca zengin sabah kahvaltısı dahil' },
  { code: 'RO', label: 'Sadece Oda (RO)', desc: 'Yemek hizmeti hariç, sadece konaklama' },
]

export const HOTEL_BEACH_TYPES = [
  { value: 'private_sand', label: 'Özel İnce Kum Plaj' },
  { value: 'mixed_sand_pebble', label: 'Kum & İnce Çakıl Karışık' },
  { value: 'pier_platform', label: 'Özel Ahşap İskele / Güneşlenme Platformu' },
  { value: 'blue_flag', label: 'Mavi Bayraklı Özel Plaj' },
  { value: 'public_nearby', label: 'Halk Plajına Yürüme Mesafesinde' },
]

export const HOTEL_AMENITIES_CATALOG = [
  {
    category: 'Havuz & Plaj',
    icon: Waves,
    items: [
      { id: 'pool_outdoor', label: 'Açık Yüzme Havuzu' },
      { id: 'pool_indoor_heated', label: 'Kapalı Isıtmalı Havuz' },
      { id: 'pool_kids', label: 'Çocuk Havuzu' },
      { id: 'aquapark', label: 'Kaydıraklı Aquapark' },
      { id: 'infinity_pool', label: 'Sonsuzluk Havuzu (Infinity Pool)' },
      { id: 'beach_sunbeds', label: 'Ücretsiz Şezlong & Şemsiye' },
      { id: 'beach_cabana', label: 'Özel Pavilyon / Gazebo' },
      { id: 'beach_towels', label: 'Ücretsiz Plaj Havlusu' },
    ],
  },
  {
    category: 'Spa, Wellness & Sağlık',
    icon: Sparkles,
    items: [
      { id: 'spa_center', label: 'Spa & Sağlık Merkezi' },
      { id: 'turkish_hammam', label: 'Geleneksel Türk Hamamı' },
      { id: 'sauna_steam', label: 'Sauna & Buhar Odası' },
      { id: 'massage_rooms', label: 'Masaj & Bakım Odaları' },
      { id: 'jacuzzi', label: 'Termal / Masajlı Jakuzi' },
      { id: 'fitness_gym', label: 'Modern Fitness Merkezi' },
    ],
  },
  {
    category: 'Yeme & İçme',
    icon: Utensils,
    items: [
      { id: 'main_buffet_restaurant', label: 'Ana Restoran (Açık Büfe)' },
      { id: 'alacarte_restaurants', label: 'A la Carte Restoranlar' },
      { id: 'pool_bar', label: 'Havuz Bar' },
      { id: 'beach_bar', label: 'Sahil Bar' },
      { id: 'patisserie', label: 'Pastane & Kafe' },
      { id: 'room_service_24h', label: '24 Saat Oda Servisi' },
    ],
  },
  {
    category: 'Çocuk & Aile',
    icon: Baby,
    items: [
      { id: 'kids_club', label: 'Mini Club / Çocuk Kulübü (4-12 yaş)' },
      { id: 'kids_playground', label: 'Çocuk Oyun Parkı' },
      { id: 'kids_animation', label: 'Çocuk Animasyonu & Mini Disko' },
      { id: 'baby_sitting', label: 'Bebek Bakıcısı (Talep Üzerine)' },
      { id: 'baby_highchair', label: 'Restoranda Mama Sandalyesi' },
      { id: 'baby_cot', label: 'Ücretsiz Bebek Yatağı' },
    ],
  },
  {
    category: 'Genel Tesis Olanakları',
    icon: Building,
    items: [
      { id: 'reception_24h', label: '24 Saat Resepsiyon' },
      { id: 'free_wifi_all', label: 'Tüm Alanlarda Ücretsiz Yüksek Hızlı Wi-Fi' },
      { id: 'free_parking_valet', label: 'Ücretsiz Otopark & Vale Hizmeti' },
      { id: 'airport_transfer', label: 'Havalimanı VIP Transfer Hizmeti' },
      { id: 'disabled_access', label: 'Engelli Dostu Odalar & Rampa' },
      { id: 'pet_friendly', label: 'Evcil Hayvan Dostu (Pet Friendly)' },
      { id: 'meeting_rooms', label: 'Toplantı & Kongre Salonu' },
      { id: 'laundry_dry_clean', label: 'Çamaşırhane & Kuru Temizleme' },
    ],
  },
]

export function HotelBasicsStepPanel({
  values,
  onChange,
}: {
  values: HotelAgencyBasicsState
  onChange: (patch: Partial<HotelAgencyBasicsState>) => void
}) {
  const selectedBoards = new Set(values.board_types ?? [])

  const toggleBoard = (code: string) => {
    const next = new Set(selectedBoards)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange({ board_types: Array.from(next) })
  }

  return (
    <div className="space-y-6">
      {/* Tesis Türü ve Yıldız Derecesi */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Hotel className="h-4 w-4 text-primary-600" />
          Tesis Türü ve Yıldız Sınıfı
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Otelinizin segmentini ve resmi sınıflandırmasını belirleyin.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOTEL_PROPERTY_TYPES.map((type) => {
            const isSelected = (values.hotel_type || 'resort') === type.value
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange({ hotel_type: type.value })}
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

        {/* Yıldız Sınıfı */}
        <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <Label className="mb-2 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Yıldız Derecesi / Resmi Sınıflandırma
          </Label>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {HOTEL_STAR_RATINGS.map((star) => {
              const isSelected = (values.star_rating || '5') === star.value
              return (
                <button
                  key={star.value}
                  type="button"
                  onClick={() => onChange({ star_rating: star.value })}
                  className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-400/30 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-200'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                >
                  <span className="text-sm font-bold text-amber-500">{star.badge}</span>
                  <span className="mt-0.5 text-xs font-medium">{star.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pansiyon Konseptleri */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Coffee className="h-4 w-4 text-primary-600" />
          Pansiyon & Hizmet Konseptleri
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Tesisinizde misafirlere sunulan tüm pansiyon tiplerini seçin (birden fazla seçilebilir).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOTEL_BOARD_TYPES.map((board) => {
            const checked = selectedBoards.has(board.code)
            return (
              <label
                key={board.code}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                  checked
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-950/30'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBoard(board.code)}
                  className="mt-0.5 h-4 w-4 rounded accent-emerald-600"
                />
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                    {board.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {board.desc}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Giriş-Çıkış Saatleri ve Çocuk Politikası */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          <Clock className="h-4 w-4 text-primary-600" />
          Giriş - Çıkış Saatleri & Misafir Kuralları
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field className="block">
            <Label className="text-xs font-medium">Giriş Saati (Check-in)</Label>
            <Input
              type="time"
              className="mt-1"
              value={values.checkin_time || '14:00'}
              onChange={(e) => onChange({ checkin_time: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Çıkış Saati (Check-out)</Label>
            <Input
              type="time"
              className="mt-1"
              value={values.checkout_time || '12:00'}
              onChange={(e) => onChange({ checkout_time: e.target.value })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs font-medium">Çocuk / Bebek Politikası</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="ör. 0-6 yaş 1 çocuk ücretsiz"
              value={values.child_policy || ''}
              onChange={(e) => onChange({ child_policy: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

export function HotelLocationDistancesStepPanel({
  values,
  onChange,
}: {
  values: HotelAgencyBasicsState
  onChange: (patch: Partial<HotelAgencyBasicsState>) => void
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
        <Compass className="h-4 w-4 text-primary-600" />
        Plaj & Önemli Noktalara Mesafeler
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Seyahat acentesi vitrininde misafirlere gösterilen kritik mesafe ve konum bilgileri.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field className="block">
          <Label className="text-xs font-medium">Denize / Plaja Mesafe</Label>
          <Input
            type="text"
            className="mt-1"
            placeholder="ör. Denize Sıfır veya 150 m"
            value={values.dist_beach || ''}
            onChange={(e) => onChange({ dist_beach: e.target.value })}
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium">Plaj Türü</Label>
          <select
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            value={values.beach_type || ''}
            onChange={(e) => onChange({ beach_type: e.target.value })}
          >
            <option value="">— Seçin —</option>
            {HOTEL_BEACH_TYPES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium">Havalimanına Mesafe</Label>
          <Input
            type="text"
            className="mt-1"
            placeholder="ör. 35 km (Antalya AYT)"
            value={values.dist_airport || ''}
            onChange={(e) => onChange({ dist_airport: e.target.value })}
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium">Şehir Merkezine Mesafe</Label>
          <Input
            type="text"
            className="mt-1"
            placeholder="ör. 2 km"
            value={values.dist_city_center || ''}
            onChange={(e) => onChange({ dist_city_center: e.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}

export function HotelFacilitiesStepPanel({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const selectedSet = new Set(selectedIds)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
        <p className="text-xs font-semibold text-primary-900 dark:text-primary-200">
          🏨 Seyahat Acentesi Tesis Standartları
        </p>
        <p className="mt-1 text-xs text-primary-800/80 dark:text-primary-300/80">
          Misafirlerin otel arama filtrelerinde tesisinizi bulabilmesi için sunduğunuz tüm imkanları eksiksiz işaretleyin.
        </p>
      </div>

      <div className="grid gap-6">
        {HOTEL_AMENITIES_CATALOG.map((group) => {
          const Icon = group.icon
          return (
            <div
              key={group.category}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                <Icon className="h-4 w-4 text-primary-600" />
                {group.category}
              </h4>
              <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {group.items.map((item) => {
                  const isChecked = selectedSet.has(item.id)
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
                        onChange={() => onToggle(item.id)}
                        className="h-4 w-4 rounded accent-primary-600"
                      />
                      <span className="text-xs font-medium">{item.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

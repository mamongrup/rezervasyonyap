'use client'

import React from 'react'
import { Field, Label } from '@/components/manage/ManageFormField'
import Input from '@/shared/Input'
import {
  Car,
  Fuel,
  Gauge,
  ShieldCheck,
  Users,
  Briefcase,
  KeyRound,
  CreditCard,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  AlertCircle,
  Award,
} from 'lucide-react'

export interface CarRentalAgencyBasicsState {
  car_segment?: string
  transmission?: 'automatic' | 'manual'
  fuel_type?: 'gasoline' | 'diesel' | 'hybrid' | 'electric'
  seat_count?: string
  luggage_large?: string
  luggage_small?: string
  door_count?: string
  min_driver_age?: string
  min_license_years?: string
  deposit_amount?: string
  deposit_currency?: string
  km_limit_type?: 'unlimited' | 'daily_limited'
  km_daily_limit?: string
  included_insurances?: string[]
  pickup_drop_options?: string[]
  cancellation_rules?: string
  engine_capacity?: string
  air_conditioning?: boolean
  confirmation_type?: 'instant' | 'on_request'
  prepayment_percent?: string
}

export const CAR_SEGMENTS = [
  { value: 'economy', label: 'Ekonomik Sınıf', desc: 'Renault Clio, Hyundai i20 vb. — Şehir içi düşük yakıt' },
  { value: 'compact', label: 'Kompakt / Konfor', desc: 'Fiat Egea, VW Golf, Toyota Corolla — Aile için ideal' },
  { value: 'suv', label: 'SUV & Crossover', desc: 'Dacia Duster, Peugeot 3008, Nissan Qashqai — Yüksek sürüş' },
  { value: 'premium', label: 'Premium & Sedan', desc: 'BMW 3 Serisi, Mercedes C-Serisi, Audi A4 — Şık & Konfor' },
  { value: 'luxury', label: 'Lüks & Prestij', desc: 'Mercedes E/S Serisi, Range Rover, Porsche — En üst segment' },
  { value: 'minivan_vip', label: 'VIP Minibüs / Van', desc: 'Mercedes Vito VIP, VW Transporter (8+1 / 9+1)' },
  { value: 'caravan', label: 'Karavan & Camper', desc: 'Gezici tatil ve bağımsız seyahat aracı' },
]

export const CAR_INSURANCE_PRESETS = [
  'Muafiyetsiz Tam Kasko (Super CDW)',
  'Hırsızlık Güvencesi (TP)',
  'Üçüncü Şahıs Mali Mesuliyet Sigortası (TPL)',
  'Cam, Far, Lastik Sigortası (LCF)',
  'Mini Hasar Güvencesi (Beyansız Onarım)',
  '7/24 Kesintisiz Yol Yardımı & İkame Araç',
  'Ücretsiz 2. Ek Sürücü Hakkı',
  'Havalimanı Karşılama ve Hızlı Teslimat',
]

export const CAR_PICKUP_OPTIONS = [
  'Havalimanı Terminal İçi Ofis Teslimi',
  'Havalimanı Ücretsiz Otopark / Valet Teslimi',
  'Şehir Merkezi Ofis Teslimi',
  'Otele / Adrese Ücretsiz Teslimat',
  'Farklı Lokasyonda İade İmkanı (One-Way)',
]

/** Step 1: Araç Özellikleri, Vites, Yakıt & Kapasite */
export function CarRentalBasicsStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: CarRentalAgencyBasicsState
  onChange: (next: CarRentalAgencyBasicsState) => void
  disabled?: boolean
}) {
  const selectedSegment = value.car_segment || 'economy'
  const selectedTrans = value.transmission || 'automatic'
  const selectedFuel = value.fuel_type || 'gasoline'

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Car className="size-5 text-primary-600" />
          Araç Segmenti, Şanzıman & Kapasite
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Acente filo standartlarına göre aracın sınıfını, vites/yakıt türünü ve yolcu/bagaj kapasitesini belirleyin.
        </p>
      </div>

      {/* Araç Segmenti */}
      <div>
        <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
          Araç Sınıfı / Segmenti
        </Label>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CAR_SEGMENTS.map((seg) => {
            const active = selectedSegment === seg.value
            return (
              <button
                key={seg.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, car_segment: seg.value })}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 dark:bg-primary-950/40 dark:border-primary-500'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/60'
                }`}
              >
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{seg.label}</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">{seg.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Vites & Yakıt Tipi */}
      <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <div>
          <Label className="text-xs font-semibold mb-2 block">Şanzıman / Vites Tipi</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'automatic', label: 'Otomatik Vites' },
              { id: 'manual', label: 'Manuel Vites' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, transmission: item.id as 'automatic' | 'manual' })}
                className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition ${
                  selectedTrans === item.id
                    ? 'border-primary-600 bg-primary-50 text-primary-900 font-bold dark:bg-primary-950/40 dark:text-primary-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold mb-2 block">Yakıt Türü</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: 'gasoline', label: 'Benzin' },
              { id: 'diesel', label: 'Dizel' },
              { id: 'hybrid', label: 'Hibrit' },
              { id: 'electric', label: 'Elektrik' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, fuel_type: f.id as any })}
                className={`p-2 rounded-xl border text-center text-xs font-medium transition ${
                  selectedFuel === f.id
                    ? 'border-primary-600 bg-primary-50 text-primary-900 font-bold dark:bg-primary-950/40 dark:text-primary-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kapasite Bilgileri */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Field className="block">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Users className="size-3.5 text-neutral-500" /> Koltuk Sayısı
          </Label>
          <Input
            type="number"
            min="2"
            value={value.seat_count ?? '5'}
            onChange={(e) => onChange({ ...value, seat_count: e.target.value })}
            placeholder="ör: 5"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Briefcase className="size-3.5 text-neutral-500" /> Büyük Bagaj (Valiz)
          </Label>
          <Input
            type="number"
            min="0"
            value={value.luggage_large ?? '2'}
            onChange={(e) => onChange({ ...value, luggage_large: e.target.value })}
            placeholder="ör: 2"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Briefcase className="size-3.5 text-neutral-500" /> Küçük Çanta (Kabin)
          </Label>
          <Input
            type="number"
            min="0"
            value={value.luggage_small ?? '2'}
            onChange={(e) => onChange({ ...value, luggage_small: e.target.value })}
            placeholder="ör: 2"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-medium flex items-center gap-1">
            <DoorOpen className="size-3.5 text-neutral-500" /> Kapı Sayısı
          </Label>
          <Input
            type="number"
            min="2"
            value={value.door_count ?? '5'}
            onChange={(e) => onChange({ ...value, door_count: e.target.value })}
            placeholder="ör: 5"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
      </div>
    </div>
  )
}

/** Step 2: Kiralama Şartları, Ehliyet/Yaş, Depozito & Kilometre */
export function CarRentalTermsStepPanel({
  value,
  onChange,
  disabled,
}: {
  value: CarRentalAgencyBasicsState
  onChange: (next: CarRentalAgencyBasicsState) => void
  disabled?: boolean
}) {
  const kmType = value.km_limit_type || 'unlimited'
  const insurances = value.included_insurances || CAR_INSURANCE_PRESETS.slice(0, 4)
  const pickupOpts = value.pickup_drop_options || CAR_PICKUP_OPTIONS.slice(0, 3)

  function toggleInsurance(item: string) {
    if (disabled) return
    const next = insurances.includes(item)
      ? insurances.filter((x) => x !== item)
      : [...insurances, item]
    onChange({ ...value, included_insurances: next })
  }

  function togglePickup(item: string) {
    if (disabled) return
    const next = pickupOpts.includes(item)
      ? pickupOpts.filter((x) => x !== item)
      : [...pickupOpts, item]
    onChange({ ...value, pickup_drop_options: next })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <KeyRound className="size-5 text-primary-600" />
          Kiralama Koşulları, Ehliyet & Teminat Şartları
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Sürücü yaş sınırı, ehliyet yılı, kredi kartı provizyon/depozito ve kilometre sınırlarını tanımlayın.
        </p>
      </div>

      {/* Sürücü Yaşı & Ehliyet Şartı */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field className="block">
          <Label className="text-xs font-semibold">Min. Sürücü Yaşı</Label>
          <Input
            type="number"
            min="18"
            value={value.min_driver_age ?? '21'}
            onChange={(e) => onChange({ ...value, min_driver_age: e.target.value })}
            placeholder="ör: 21"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">Min. Ehliyet Yılı</Label>
          <Input
            type="number"
            min="1"
            value={value.min_license_years ?? '2'}
            onChange={(e) => onChange({ ...value, min_license_years: e.target.value })}
            placeholder="ör: 2"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">Kredi Kartı Provizyon / Depozito</Label>
          <Input
            type="number"
            min="0"
            value={value.deposit_amount ?? '2500'}
            onChange={(e) => onChange({ ...value, deposit_amount: e.target.value })}
            placeholder="ör: 2500"
            disabled={disabled}
            className="mt-1"
          />
        </Field>
        <Field className="block">
          <Label className="text-xs font-semibold">Depozito Para Birimi</Label>
          <select
            value={value.deposit_currency ?? 'TRY'}
            onChange={(e) => onChange({ ...value, deposit_currency: e.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-800 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <option value="TRY">TRY (₺)</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </Field>
      </div>

      {/* Kilometre Limiti */}
      <div className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200 dark:bg-neutral-800/40 dark:border-neutral-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-neutral-100">
          <Gauge className="size-4 text-primary-600" />
          Kilometre Kullanım Limiti
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="radio"
              name="km_limit"
              checked={kmType === 'unlimited'}
              onChange={() => onChange({ ...value, km_limit_type: 'unlimited' })}
              disabled={disabled}
              className="text-primary-600 focus:ring-primary-500"
            />
            Sınırsız Kilometre (Limitsiz)
          </label>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="radio"
              name="km_limit"
              checked={kmType === 'daily_limited'}
              onChange={() => onChange({ ...value, km_limit_type: 'daily_limited' })}
              disabled={disabled}
              className="text-primary-600 focus:ring-primary-500"
            />
            Günlük KM Sınırlı
          </label>
        </div>
        {kmType === 'daily_limited' && (
          <div className="max-w-xs pt-2">
            <Label className="text-xs font-medium">Günlük İzin Verilen KM</Label>
            <Input
              type="number"
              min="50"
              value={value.km_daily_limit ?? '300'}
              onChange={(e) => onChange({ ...value, km_daily_limit: e.target.value })}
              placeholder="ör: 300"
              disabled={disabled}
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* Dahil Olan Güvenceler */}
      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-emerald-600" />
          Fiyata Dahil Sigorta & Güvenceler
        </Label>
        <div className="flex flex-wrap gap-2">
          {CAR_INSURANCE_PRESETS.map((item) => {
            const active = insurances.includes(item)
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => toggleInsurance(item)}
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

      {/* Teslimat & İade Seçenekleri */}
      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <MapPin className="size-4 text-primary-600" />
          Teslimat & İade Noktaları
        </Label>
        <div className="flex flex-wrap gap-2">
          {CAR_PICKUP_OPTIONS.map((item) => {
            const active = pickupOpts.includes(item)
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => togglePickup(item)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'bg-primary-50 text-primary-800 border-primary-500 font-semibold dark:bg-primary-950/40 dark:text-primary-300'
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

function DoorOpen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 4h3a2 2 0 0 1 2 2v14" />
      <path d="M2 20h20" />
      <path d="M13 20V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16" />
      <path d="M9 12v.01" />
    </svg>
  )
}

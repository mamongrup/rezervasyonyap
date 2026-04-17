'use client'

/**
 * Her kategori (vertical) için özel alan formu.
 * CatalogListingDetailClient içinde "Kategori Özellikleri" sekmesinde kullanılır.
 *
 * Kapsanan kategoriler (cruise/transfer/ferry hariç):
 *   holiday_home · yacht_charter · tour · activity · car_rental
 *   event · beach_lounger · restaurant_table · visa · hajj · cinema_ticket
 */

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  getListingMeta,
  getVerticalHolidayHome,
  getVerticalMeta,
  getVerticalYacht,
  patchVerticalHolidayHome,
  patchVerticalYacht,
  putListingMeta,
  putVerticalMeta,
  type ListingMeta,
} from '@/lib/travel-api'
import { HOLIDAY_PROPERTY_TYPE_OPTIONS } from '@/lib/holiday-property-type-options'
import MapPicker from '@/components/editor/MapPicker'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { MinusCircle, PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SELECT_CLS =
  'mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-800'

function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <div
      className={`rounded-xl border px-4 py-2.5 text-sm ${
        msg.ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
      }`}
    >
      {msg.text}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {children}
    </h3>
  )
}

function ChipToggle({
  label, active, color = 'primary', onClick,
}: { label: string; active: boolean; color?: 'primary' | 'red'; onClick: () => void }) {
  const base = 'rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer'
  const on =
    color === 'red'
      ? 'border-red-400 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400'
      : 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-950/40 dark:text-primary-300'
  const off = 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
  return (
    <button type="button" className={`${base} ${active ? on : off}`} onClick={onClick}>
      {active ? '✓ ' : ''}{label}
    </button>
  )
}

function useSave(category: string, listingId: string) {
  return async (data: Record<string, unknown>) => {
    const token = getStoredAuthToken()
    if (!token) throw new Error('Oturum bulunamadı')
    await putVerticalMeta(token, listingId, category, data)
  }
}

function useLoadMeta<T>(
  listingId: string,
  category: string,
  onLoad: (d: T) => void,
) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getVerticalMeta<T>(listingId, category)
      .then(onLoad)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listingId, category]) // eslint-disable-line react-hooks/exhaustive-deps
  return loading
}

// ─── Villa (holiday_home) ──────────────────────────────────────────────────────
const VILLA_THEMES = [
  { code: 'pool', label: 'Özel Havuz' },
  { code: 'sea_view', label: 'Deniz Manzarası' },
  { code: 'mountain_view', label: 'Dağ Manzarası' },
  { code: 'beachfront', label: 'Sahilde / denize sıfır' },
  { code: 'conservative', label: 'Muhafazakar' },
  { code: 'garden', label: 'Bahçeli' },
  { code: 'jacuzzi', label: 'Jakuzi' },
  { code: 'sauna', label: 'Sauna' },
  { code: 'bbq', label: 'Barbekü' },
  { code: 'fireplace', label: 'Şömine' },
  { code: 'pet_friendly', label: 'Evcil Hayvan Kabul' },
  { code: 'child_friendly', label: 'Çocuk Dostu' },
  { code: 'wheelchair', label: 'Engelli Erişim' },
  { code: 'wifi', label: 'Wi-Fi' },
  { code: 'ac', label: 'Klima' },
  { code: 'parking', label: 'Ücretsiz Otopark' },
  { code: 'dishwasher', label: 'Bulaşık Makinesi' },
  { code: 'washing_machine', label: 'Çamaşır Makinesi' },
  { code: 'tv', label: 'TV' },
  { code: 'gym', label: 'Fitness Salonu' },
  { code: 'tennis', label: 'Tenis Kortu' },
]
const VILLA_RULES = [
  { code: 'no_smoking', label: 'Sigara İçme' },
  { code: 'no_pets', label: 'Evcil Hayvan Yok' },
  { code: 'no_parties', label: 'Parti/Eğlence Yok' },
  { code: 'quiet_hours', label: 'Gece Sessizliği' },
  { code: 'checkin_15', label: 'Giriş 15:00 sonrası' },
  { code: 'checkout_12', label: 'Çıkış 12:00 öncesi' },
  { code: 'no_children', label: 'Çocuk Kabul Yok' },
  { code: 'id_required', label: 'Kimlik Zorunlu' },
]

function VillaSection({ listingId }: { listingId: string }) {
  const [themes, setThemes] = useState<string[]>([])
  const [rules, setRules] = useState<string[]>([])
  const [icalManaged, setIcalManaged] = useState(false)
  const [propertyType, setPropertyType] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('holiday_home', listingId)

  const loading = useLoadMeta<{ theme_codes?: string; rule_codes?: string; ical_managed?: boolean }>(
    listingId, 'holiday_home', () => {},
  )

  useEffect(() => {
    void getVerticalHolidayHome(listingId)
      .then((d) => {
        setThemes(d.theme_codes ? d.theme_codes.split(',').filter(Boolean) : [])
        setRules(d.rule_codes ? d.rule_codes.split(',').filter(Boolean) : [])
        setIcalManaged(Boolean(d.ical_managed))
      })
      .catch(() => {})
    const token = getStoredAuthToken()
    if (token) {
      void getListingMeta(token, listingId)
        .then((m) => {
          if (m.property_type?.trim()) setPropertyType(m.property_type.trim())
        })
        .catch(() => {})
    }
  }, [listingId])

  function toggle(list: string[], setList: (v: string[]) => void, code: string) {
    setList(list.includes(code) ? list.filter((c) => c !== code) : [...list, code])
  }

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      const token = getStoredAuthToken()
      if (!token) throw new Error('Oturum bulunamadı')
      const prev = await getListingMeta(token, listingId)
      const next: ListingMeta = { ...prev }
      if (propertyType.trim()) next.property_type = propertyType.trim()
      else delete next.property_type
      await putListingMeta(token, listingId, next)
      await patchVerticalHolidayHome(listingId, { theme_codes: themes, rule_codes: rules, ical_managed: icalManaged })
      setMsg({ ok: true, text: 'Villa özellikleri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>İlan tipi</SectionTitle>
        <Field className="block max-w-md">
          <Label>Listelerde görünen tip</Label>
          <select
            className={SELECT_CLS}
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="">— Seçin —</option>
            {HOLIDAY_PROPERTY_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div>
        <SectionTitle>Özellikler / Temalar</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {VILLA_THEMES.map(({ code, label }) => (
            <ChipToggle key={code} label={label} active={themes.includes(code)} onClick={() => toggle(themes, setThemes, code)} />
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Ev Kuralları</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {VILLA_RULES.map(({ code, label }) => (
            <ChipToggle key={code} label={label} active={rules.includes(code)} color="red" onClick={() => toggle(rules, setRules, code)} />
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={icalManaged} onChange={(e) => setIcalManaged(e.target.checked)} />
        <span className="text-sm text-neutral-700 dark:text-neutral-300">iCal ile yönetiliyor (dış takvim kaynağı aktif)</span>
      </label>
      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Villa Özelliklerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Yat (yacht_charter) ──────────────────────────────────────────────────────
const YACHT_TYPES = ['Motorlu', 'Yelkenli', 'Katamaran', 'Gület', 'Süperyat', 'RIB', 'Karavela', 'Tekne']

function YachtSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    length_meters: '', cabin_count: '', bathroom_count: '', passenger_count: '',
    port_lat: '', port_lng: '', yacht_type: '', captain_included: '',
    fuel_policy: '', speed_knots: '',
  })
  const [includes, setIncludes] = useState<string[]>([''])
  const [excludes, setExcludes] = useState<string[]>([''])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    void getVerticalYacht(listingId)
      .then((d) => {
        setForm({
          length_meters: d.length_meters ?? '',
          cabin_count: d.cabin_count ?? '',
          bathroom_count: (d as Record<string, string>).bathroom_count ?? '',
          passenger_count: (d as Record<string, string>).passenger_count ?? '',
          port_lat: d.port_lat ?? '',
          port_lng: d.port_lng ?? '',
          yacht_type: d.yacht_type ?? '',
          captain_included: d.captain_included ?? '',
          fuel_policy: d.fuel_policy ?? '',
          speed_knots: (d as Record<string, string>).speed_knots ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listingId])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await patchVerticalYacht(listingId, {
        length_meters: form.length_meters || undefined,
        cabin_count: form.cabin_count || undefined,
        port_lat: form.port_lat || undefined,
        port_lng: form.port_lng || undefined,
      })
      const token = getStoredAuthToken()
      if (token) {
        await putVerticalMeta(token, listingId, 'yacht_extra', {
          bathroom_count: form.bathroom_count, passenger_count: form.passenger_count,
          yacht_type: form.yacht_type, captain_included: form.captain_included,
          fuel_policy: form.fuel_policy, speed_knots: form.speed_knots,
          includes: includes.filter(Boolean), excludes: excludes.filter(Boolean),
        })
      }
      setMsg({ ok: true, text: 'Yat özellikleri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field className="block">
          <Label>Yat Tipi</Label>
          <select className={SELECT_CLS} value={form.yacht_type} onChange={set('yacht_type')}>
            <option value="">— Seçin —</option>
            {YACHT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Boy (metre)</Label>
          <Input type="number" step="0.1" className="mt-1" value={form.length_meters} onChange={set('length_meters')} placeholder="18" />
        </Field>
        <Field className="block">
          <Label>Hız (deniz mili)</Label>
          <Input type="number" step="0.1" className="mt-1" value={form.speed_knots} onChange={set('speed_knots')} placeholder="12" />
        </Field>
        <Field className="block">
          <Label>Kabin Sayısı</Label>
          <Input type="number" min="1" className="mt-1" value={form.cabin_count} onChange={set('cabin_count')} placeholder="4" />
        </Field>
        <Field className="block">
          <Label>Banyo Sayısı</Label>
          <Input type="number" min="1" className="mt-1" value={form.bathroom_count} onChange={set('bathroom_count')} placeholder="3" />
        </Field>
        <Field className="block">
          <Label>Maks. Yolcu</Label>
          <Input type="number" min="1" className="mt-1" value={form.passenger_count} onChange={set('passenger_count')} placeholder="8" />
        </Field>
        <Field className="block">
          <Label>Kaptan Dahil mi?</Label>
          <select className={SELECT_CLS} value={form.captain_included} onChange={set('captain_included')}>
            <option value="">— Seçin —</option>
            <option value="yes">Evet, kaptan dahil</option>
            <option value="no">Hayır (bare boat)</option>
            <option value="optional">İsteğe bağlı (+ücret)</option>
          </select>
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Yakıt Politikası</Label>
          <Input className="mt-1" value={form.fuel_policy} onChange={set('fuel_policy')} placeholder="Giriş dolu, çıkış dolu" />
        </Field>
      </div>

      <IncludeExclude
        includes={includes} excludes={excludes}
        onIncludes={setIncludes} onExcludes={setExcludes}
      />

      <div>
        <SectionTitle>Liman / Kalkış Noktası</SectionTitle>
        <MapPicker
          lat={form.port_lat} lng={form.port_lng}
          onChange={(lat, lng) => setForm((p) => ({ ...p, port_lat: lat, port_lng: lng }))}
        />
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field className="block">
            <Label>Enlem</Label>
            <Input type="text" className="mt-1 font-mono text-xs" value={form.port_lat} onChange={set('port_lat')} placeholder="36.850000" />
          </Field>
          <Field className="block">
            <Label>Boylam</Label>
            <Input type="text" className="mt-1 font-mono text-xs" value={form.port_lng} onChange={set('port_lng')} placeholder="28.230000" />
          </Field>
        </div>
      </div>

      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Yat Özelliklerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Shared: Include / Exclude list ───────────────────────────────────────────
function IncludeExclude({
  includes, excludes, onIncludes, onExcludes,
}: {
  includes: string[]
  excludes: string[]
  onIncludes: (v: string[]) => void
  onExcludes: (v: string[]) => void
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <SectionTitle>Dahil Olanlar</SectionTitle>
        <div className="space-y-2">
          {includes.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text" value={item} placeholder="Ör: Kahvaltı dahil"
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => onIncludes(includes.map((v, j) => j === i ? e.target.value : v))}
              />
              <button type="button" onClick={() => onIncludes(includes.filter((_, j) => j !== i))}
                className="text-neutral-400 hover:text-red-500">
                <MinusCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onIncludes([...includes, ''])}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
            <PlusCircle className="h-3.5 w-3.5" /> Ekle
          </button>
        </div>
      </div>
      <div>
        <SectionTitle>Dahil Olmayanlar</SectionTitle>
        <div className="space-y-2">
          {excludes.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text" value={item} placeholder="Ör: Vize ücreti"
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => onExcludes(excludes.map((v, j) => j === i ? e.target.value : v))}
              />
              <button type="button" onClick={() => onExcludes(excludes.filter((_, j) => j !== i))}
                className="text-neutral-400 hover:text-red-500">
                <MinusCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onExcludes([...excludes, ''])}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
            <PlusCircle className="h-3.5 w-3.5" /> Ekle
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tur (tour) ───────────────────────────────────────────────────────────────
interface ItineraryDay { day: number; title: string; description: string }

function TourSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    duration_days: '', min_people: '', max_people: '',
    visa_required: false, travel_type: '', is_guided: false,
    accommodation_type: '', languages: '', min_day_before_booking: '',
    wtatil_package_ref: '',
  })
  const [includes, setIncludes] = useState<string[]>([''])
  const [excludes, setExcludes] = useState<string[]>([''])
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([{ day: 1, title: '', description: '' }])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('tour', listingId)

  interface TourMeta {
    duration_days?: string; min_people?: string; max_people?: string
    visa_required?: boolean; travel_type?: string; is_guided?: boolean
    accommodation_type?: string; languages?: string
    min_day_before_booking?: string; wtatil_package_ref?: string
    includes?: string[]; excludes?: string[]; itinerary?: ItineraryDay[]
  }

  const loading = useLoadMeta<TourMeta>(listingId, 'tour', (d) => {
    setForm({
      duration_days: d.duration_days ?? '',
      min_people: d.min_people ?? '',
      max_people: d.max_people ?? '',
      visa_required: Boolean(d.visa_required),
      travel_type: d.travel_type ?? '',
      is_guided: Boolean(d.is_guided),
      accommodation_type: d.accommodation_type ?? '',
      languages: d.languages ?? '',
      min_day_before_booking: d.min_day_before_booking ?? '',
      wtatil_package_ref: d.wtatil_package_ref ?? '',
    })
    if (d.includes?.length) setIncludes(d.includes)
    if (d.excludes?.length) setExcludes(d.excludes)
    if (d.itinerary?.length) setItinerary(d.itinerary)
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  function addDay() {
    setItinerary((prev) => [...prev, { day: prev.length + 1, title: '', description: '' }])
  }
  function removeDay(i: number) {
    setItinerary((prev) => prev.filter((_, j) => j !== i).map((d, j) => ({ ...d, day: j + 1 })))
  }
  function setDay(i: number, k: keyof ItineraryDay, val: string | number) {
    setItinerary((prev) => prev.map((d, j) => j === i ? { ...d, [k]: val } : d))
  }

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save({ ...form, includes: includes.filter(Boolean), excludes: excludes.filter(Boolean), itinerary })
      setMsg({ ok: true, text: 'Tur bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-6">
      {/* Temel bilgiler */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field className="block">
          <Label>Süre (gün)</Label>
          <Input type="number" min="1" className="mt-1" value={form.duration_days} onChange={set('duration_days')} placeholder="7" />
        </Field>
        <Field className="block">
          <Label>Min. Kişi</Label>
          <Input type="number" min="1" className="mt-1" value={form.min_people} onChange={set('min_people')} placeholder="2" />
        </Field>
        <Field className="block">
          <Label>Maks. Grup</Label>
          <Input type="number" min="1" className="mt-1" value={form.max_people} onChange={set('max_people')} placeholder="20" />
        </Field>
        <Field className="block">
          <Label>Ulaşım Türü</Label>
          <select className={SELECT_CLS} value={form.travel_type} onChange={set('travel_type')}>
            <option value="">— Seçin —</option>
            <option value="plane">Uçakla</option>
            <option value="bus">Otobüsle</option>
            <option value="both">Uçak + Otobüs</option>
            <option value="own">Kendi Aracıyla</option>
          </select>
        </Field>
        <Field className="block">
          <Label>Konaklama Tipi</Label>
          <select className={SELECT_CLS} value={form.accommodation_type} onChange={set('accommodation_type')}>
            <option value="">— Seçin —</option>
            <option value="hotel">Otel</option>
            <option value="hostel">Hostel</option>
            <option value="villa">Villa</option>
            <option value="camping">Kamp</option>
            <option value="none">Gecekonaklama Yok</option>
          </select>
        </Field>
        <Field className="block">
          <Label>Min. Önceden Rezervasyon (gün)</Label>
          <Input type="number" min="0" className="mt-1" value={form.min_day_before_booking} onChange={set('min_day_before_booking')} placeholder="1" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Tur Dilleri</Label>
          <Input className="mt-1" value={form.languages} onChange={set('languages')} placeholder="Türkçe, İngilizce, Almanca" />
        </Field>
        <Field className="block">
          <Label>Wtatil Paket Ref.</Label>
          <Input className="mt-1 font-mono text-xs" value={form.wtatil_package_ref} onChange={set('wtatil_package_ref')} placeholder="PKG-12345" />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary-600"
            checked={form.visa_required}
            onChange={(e) => setForm((p) => ({ ...p, visa_required: e.target.checked }))} />
          <span className="text-sm">Vize Gerektirir</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary-600"
            checked={form.is_guided}
            onChange={(e) => setForm((p) => ({ ...p, is_guided: e.target.checked }))} />
          <span className="text-sm">Rehberli Tur</span>
        </label>
      </div>

      <IncludeExclude includes={includes} excludes={excludes} onIncludes={setIncludes} onExcludes={setExcludes} />

      {/* Gün bazlı program */}
      <div>
        <SectionTitle>Gün Gün Program (İtinerary)</SectionTitle>
        <div className="space-y-3">
          {itinerary.map((day, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
              <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                {day.day}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text" placeholder="Günlük başlık (ör: Varış & Otel Check-in)"
                  value={day.title}
                  onChange={(e) => setDay(i, 'title', e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <textarea
                  placeholder="Günlük aktiviteler, notlar…"
                  rows={2}
                  value={day.description}
                  onChange={(e) => setDay(i, 'description', e.target.value)}
                  className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
              <button type="button" onClick={() => removeDay(i)}
                className="mt-2 text-neutral-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addDay}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
            <PlusCircle className="h-4 w-4" /> Gün Ekle
          </button>
        </div>
      </div>

      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Tur Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Aktivite (activity) ──────────────────────────────────────────────────────
function ActivitySection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    session_based: false, full_day: false,
    duration_hours: '', min_age: '', max_participants: '',
    meeting_point: '', equipment_included: '', language: '', preview_url: '',
  })
  const [includes, setIncludes] = useState<string[]>([''])
  const [excludes, setExcludes] = useState<string[]>([''])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('activity', listingId)

  interface ActivityMeta {
    session_based?: boolean; full_day?: boolean; duration_hours?: string
    min_age?: string; max_participants?: string; meeting_point?: string
    equipment_included?: string; language?: string; preview_url?: string
    includes?: string[]; excludes?: string[]
  }
  const loading = useLoadMeta<ActivityMeta>(listingId, 'activity', (d) => {
    setForm({
      session_based: Boolean(d.session_based), full_day: Boolean(d.full_day),
      duration_hours: d.duration_hours ?? '', min_age: d.min_age ?? '',
      max_participants: d.max_participants ?? '', meeting_point: d.meeting_point ?? '',
      equipment_included: d.equipment_included ?? '',
      language: d.language ?? '', preview_url: d.preview_url ?? '',
    })
    if (d.includes?.length) setIncludes(d.includes)
    if (d.excludes?.length) setExcludes(d.excludes)
  })

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save({ ...form, includes: includes.filter(Boolean), excludes: excludes.filter(Boolean) })
      setMsg({ ok: true, text: 'Aktivite bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.session_based}
            onChange={(e) => setForm((p) => ({ ...p, session_based: e.target.checked }))} />
          <span className="text-sm">Seans bazlı (belirli saatler)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.full_day}
            onChange={(e) => setForm((p) => ({ ...p, full_day: e.target.checked }))} />
          <span className="text-sm">Tam gün aktivite</span>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="block">
          <Label>Süre (saat)</Label>
          <Input type="number" step="0.5" min="0.5" className="mt-1" value={form.duration_hours}
            onChange={(e) => setForm((p) => ({ ...p, duration_hours: e.target.value }))} placeholder="3" />
        </Field>
        <Field className="block">
          <Label>Minimum Yaş</Label>
          <Input type="number" min="0" className="mt-1" value={form.min_age}
            onChange={(e) => setForm((p) => ({ ...p, min_age: e.target.value }))} placeholder="12" />
        </Field>
        <Field className="block">
          <Label>Maks. Katılımcı</Label>
          <Input type="number" min="1" className="mt-1" value={form.max_participants}
            onChange={(e) => setForm((p) => ({ ...p, max_participants: e.target.value }))} placeholder="15" />
        </Field>
        <Field className="block">
          <Label>Dil</Label>
          <Input className="mt-1" value={form.language}
            onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))} placeholder="Türkçe, İngilizce" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Buluşma Noktası</Label>
          <Input className="mt-1" value={form.meeting_point}
            onChange={(e) => setForm((p) => ({ ...p, meeting_point: e.target.value }))} placeholder="Liman girişi, Marmaris" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Dahil Ekipman / Malzeme</Label>
          <Input className="mt-1" value={form.equipment_included}
            onChange={(e) => setForm((p) => ({ ...p, equipment_included: e.target.value }))} placeholder="Maske, şnorkel, yüzme yeleği" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Tanıtım Video URL</Label>
          <Input type="url" className="mt-1" value={form.preview_url}
            onChange={(e) => setForm((p) => ({ ...p, preview_url: e.target.value }))} placeholder="https://youtube.com/..." />
        </Field>
      </div>
      <IncludeExclude includes={includes} excludes={excludes} onIncludes={setIncludes} onExcludes={setExcludes} />
      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Aktivite Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Araç Kiralama (car_rental) ───────────────────────────────────────────────
const TRANSMISSION_TYPES = ['Otomatik', 'Manuel', 'Yarı Otomatik']
const FUEL_TYPES = ['Benzin', 'Dizel', 'Elektrik', 'Hibrit', 'LPG']
const VEHICLE_CLASSES_RENTAL = ['Economy', 'Compact', 'Mid-size', 'Full-size', 'SUV', 'Van', 'Lüks', 'Minibus']

function CarRentalSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    vehicle_class: '', transmission: '', fuel_type: '',
    passenger_count: '', baggage_count: '', door_count: '',
    min_driver_age: '', deposit_amount: '', fleet_quantity: '1',
    yolcu360_product_ref: '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('car_rental', listingId)

  const loading = useLoadMeta<typeof form>(listingId, 'car_rental', (d) => setForm((p) => ({ ...p, ...d })))
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save(form)
      setMsg({ ok: true, text: 'Araç bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field className="block">
          <Label>Araç Sınıfı</Label>
          <select className={SELECT_CLS} value={form.vehicle_class} onChange={set('vehicle_class')}>
            <option value="">— Seçin —</option>
            {VEHICLE_CLASSES_RENTAL.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Vites Tipi</Label>
          <select className={SELECT_CLS} value={form.transmission} onChange={set('transmission')}>
            <option value="">— Seçin —</option>
            {TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Yakıt Tipi</Label>
          <select className={SELECT_CLS} value={form.fuel_type} onChange={set('fuel_type')}>
            <option value="">— Seçin —</option>
            {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Yolcu Kapasitesi</Label>
          <Input type="number" min="1" className="mt-1" value={form.passenger_count} onChange={set('passenger_count')} placeholder="5" />
        </Field>
        <Field className="block">
          <Label>Bagaj Sayısı</Label>
          <Input type="number" min="0" className="mt-1" value={form.baggage_count} onChange={set('baggage_count')} placeholder="3" />
        </Field>
        <Field className="block">
          <Label>Kapı Sayısı</Label>
          <Input type="number" min="2" className="mt-1" value={form.door_count} onChange={set('door_count')} placeholder="4" />
        </Field>
        <Field className="block">
          <Label>Min. Sürücü Yaşı</Label>
          <Input type="number" min="18" className="mt-1" value={form.min_driver_age} onChange={set('min_driver_age')} placeholder="21" />
        </Field>
        <Field className="block">
          <Label>Depozito Tutarı (₺)</Label>
          <Input type="number" className="mt-1" value={form.deposit_amount} onChange={set('deposit_amount')} placeholder="5000" />
        </Field>
        <Field className="block">
          <Label>Filo Adedi</Label>
          <Input type="number" min="1" className="mt-1" value={form.fleet_quantity} onChange={set('fleet_quantity')} placeholder="1" />
        </Field>
        <Field className="block sm:col-span-3">
          <Label>Yolcu360 Ürün Ref.</Label>
          <Input className="mt-1 font-mono text-xs" value={form.yolcu360_product_ref} onChange={set('yolcu360_product_ref')} placeholder="Y360-12345" />
        </Field>
      </div>
      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Araç Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Etkinlik (event) ──────────────────────────────────────────────────────────
interface TicketTier { name: string; price: string; capacity: string }

function EventSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    venue_name: '', venue_address: '',
    starts_at: '', ends_at: '',
    booking_type: '', duration: '', duration_unit: 'hour',
  })
  const [tickets, setTickets] = useState<TicketTier[]>([{ name: 'Standart', price: '', capacity: '' }])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('event', listingId)

  interface EventMeta {
    venue_name?: string; venue_address?: string; starts_at?: string; ends_at?: string
    booking_type?: string; duration?: string; duration_unit?: string; tickets?: TicketTier[]
  }
  const loading = useLoadMeta<EventMeta>(listingId, 'event', (d) => {
    setForm({
      venue_name: d.venue_name ?? '', venue_address: d.venue_address ?? '',
      starts_at: d.starts_at ?? '', ends_at: d.ends_at ?? '',
      booking_type: d.booking_type ?? '', duration: d.duration ?? '',
      duration_unit: d.duration_unit ?? 'hour',
    })
    if (d.tickets?.length) setTickets(d.tickets)
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  function addTicket() { setTickets((p) => [...p, { name: '', price: '', capacity: '' }]) }
  function removeTicket(i: number) { setTickets((p) => p.filter((_, j) => j !== i)) }
  function setTicket(i: number, k: keyof TicketTier, val: string) {
    setTickets((p) => p.map((t, j) => j === i ? { ...t, [k]: val } : t))
  }

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save({ ...form, tickets })
      setMsg({ ok: true, text: 'Etkinlik bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="block sm:col-span-2">
          <Label>Mekan Adı</Label>
          <Input className="mt-1" value={form.venue_name} onChange={set('venue_name')} placeholder="Zorlu PSM, İstanbul" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Mekan Adresi</Label>
          <Input className="mt-1" value={form.venue_address} onChange={set('venue_address')} placeholder="Beşiktaş, İstanbul" />
        </Field>
        <Field className="block">
          <Label>Başlangıç Tarihi/Saati</Label>
          <Input type="datetime-local" className="mt-1" value={form.starts_at} onChange={set('starts_at')} />
        </Field>
        <Field className="block">
          <Label>Bitiş Tarihi/Saati</Label>
          <Input type="datetime-local" className="mt-1" value={form.ends_at} onChange={set('ends_at')} />
        </Field>
        <Field className="block">
          <Label>Rezervasyon Tipi</Label>
          <select className={SELECT_CLS} value={form.booking_type} onChange={set('booking_type')}>
            <option value="">— Seçin —</option>
            <option value="ticket">Biletli (ticket)</option>
            <option value="time_slot">Zaman dilimi</option>
            <option value="session">Seans</option>
            <option value="free">Ücretsiz</option>
          </select>
        </Field>
        <div className="flex gap-2">
          <Field className="block flex-1">
            <Label>Süre</Label>
            <Input type="number" min="1" className="mt-1" value={form.duration} onChange={set('duration')} placeholder="90" />
          </Field>
          <Field className="block w-32">
            <Label>Birim</Label>
            <select className={SELECT_CLS} value={form.duration_unit} onChange={set('duration_unit')}>
              <option value="minute">Dakika</option>
              <option value="hour">Saat</option>
              <option value="day">Gün</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Bilet kademeleri */}
      <div>
        <SectionTitle>Bilet Kademeleri</SectionTitle>
        <div className="space-y-2">
          {tickets.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" value={t.name} placeholder="Kademe adı (Standart, VIP…)"
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => setTicket(i, 'name', e.target.value)} />
              <input type="number" value={t.price} placeholder="Fiyat"
                className="w-28 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => setTicket(i, 'price', e.target.value)} />
              <input type="number" value={t.capacity} placeholder="Kapasite"
                className="w-28 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => setTicket(i, 'capacity', e.target.value)} />
              <button type="button" onClick={() => removeTicket(i)} className="text-neutral-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addTicket}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
            <PlusCircle className="h-4 w-4" /> Kademe Ekle
          </button>
        </div>
      </div>

      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Etkinlik Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Plaj / Alan (beach_lounger) ──────────────────────────────────────────────
interface PoolInfo { enabled: boolean; width: string; length: string; depth: string; description: string; heating_fee_per_day: string }

const defaultPool = (): PoolInfo => ({ enabled: false, width: '', length: '', depth: '', description: '', heating_fee_per_day: '' })

function BeachLoungerSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    beach_name: '', bed_count: '', bathroom_count: '', square_meters: '',
    check_in_time: '16:00', check_out_time: '10:00',
    short_stay_min_nights: '', short_stay_fee: '',
    max_guests: '', damage_deposit: '', deposit_percent: '',
    min_day_before_booking: '', min_day_stays: '1',
    ical_import_url: '',
  })
  const [pools, setPools] = useState<{ open_pool: PoolInfo; heated_pool: PoolInfo; children_pool: PoolInfo }>({
    open_pool: defaultPool(), heated_pool: defaultPool(), children_pool: defaultPool(),
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('beach_lounger', listingId)

  interface BeachMeta {
    beach_name?: string; bed_count?: string; bathroom_count?: string; square_meters?: string
    check_in_time?: string; check_out_time?: string; short_stay_min_nights?: string
    short_stay_fee?: string; max_guests?: string; damage_deposit?: string
    deposit_percent?: string; min_day_before_booking?: string; min_day_stays?: string
    ical_import_url?: string
    pools?: { open_pool?: PoolInfo; heated_pool?: PoolInfo; children_pool?: PoolInfo }
  }
  const loading = useLoadMeta<BeachMeta>(listingId, 'beach_lounger', (d) => {
    setForm((p) => ({ ...p, ...d, pools: undefined } as typeof p))
    if (d.pools) {
      setPools((p) => ({
        open_pool: d.pools?.open_pool ?? p.open_pool,
        heated_pool: d.pools?.heated_pool ?? p.heated_pool,
        children_pool: d.pools?.children_pool ?? p.children_pool,
      }))
    }
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  function setPool(key: keyof typeof pools, field: keyof PoolInfo, val: string | boolean) {
    setPools((p) => ({ ...p, [key]: { ...p[key], [field]: val } }))
  }

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save({ ...form, pools })
      setMsg({ ok: true, text: 'Alan bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-6">
      {/* Temel */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field className="block sm:col-span-3">
          <Label>Alan / Plaj Adı</Label>
          <Input className="mt-1" value={form.beach_name} onChange={set('beach_name')} placeholder="İztuzu Plajı Villa" />
        </Field>
        <Field className="block">
          <Label>Yatak Sayısı</Label>
          <Input type="number" min="1" className="mt-1" value={form.bed_count} onChange={set('bed_count')} placeholder="4" />
        </Field>
        <Field className="block">
          <Label>Banyo Sayısı</Label>
          <Input type="number" min="1" className="mt-1" value={form.bathroom_count} onChange={set('bathroom_count')} placeholder="2" />
        </Field>
        <Field className="block">
          <Label>Alan (m²)</Label>
          <Input type="number" className="mt-1" value={form.square_meters} onChange={set('square_meters')} placeholder="250" />
        </Field>
        <Field className="block">
          <Label>Giriş Saati</Label>
          <Input type="time" className="mt-1" value={form.check_in_time} onChange={set('check_in_time')} />
        </Field>
        <Field className="block">
          <Label>Çıkış Saati</Label>
          <Input type="time" className="mt-1" value={form.check_out_time} onChange={set('check_out_time')} />
        </Field>
        <Field className="block">
          <Label>Maks. Misafir</Label>
          <Input type="number" min="1" className="mt-1" value={form.max_guests} onChange={set('max_guests')} placeholder="10" />
        </Field>
        <Field className="block">
          <Label>Kısa Konaklama Min. Gece</Label>
          <Input type="number" min="1" className="mt-1" value={form.short_stay_min_nights} onChange={set('short_stay_min_nights')} placeholder="2" />
        </Field>
        <Field className="block">
          <Label>Kısa Konaklama Ücreti (₺)</Label>
          <Input type="number" className="mt-1" value={form.short_stay_fee} onChange={set('short_stay_fee')} placeholder="500" />
        </Field>
        <Field className="block">
          <Label>Hasar Depozit (₺)</Label>
          <Input type="number" className="mt-1" value={form.damage_deposit} onChange={set('damage_deposit')} placeholder="5000" />
        </Field>
        <Field className="block">
          <Label>Depozit Yüzdesi (%)</Label>
          <Input type="number" min="0" max="100" className="mt-1" value={form.deposit_percent} onChange={set('deposit_percent')} placeholder="20" />
        </Field>
        <Field className="block">
          <Label>Min. Önceden Rezervasyon (gün)</Label>
          <Input type="number" min="0" className="mt-1" value={form.min_day_before_booking} onChange={set('min_day_before_booking')} placeholder="1" />
        </Field>
        <Field className="block">
          <Label>Min. Konaklama (gece)</Label>
          <Input type="number" min="1" className="mt-1" value={form.min_day_stays} onChange={set('min_day_stays')} placeholder="2" />
        </Field>
        <Field className="block sm:col-span-3">
          <Label>iCal Import URL</Label>
          <Input type="url" className="mt-1 font-mono text-xs" value={form.ical_import_url} onChange={set('ical_import_url')} placeholder="https://…" />
        </Field>
      </div>

      {/* Havuz bilgileri */}
      <div>
        <SectionTitle>Havuz Bilgileri</SectionTitle>
        <div className="space-y-4">
          {(
            [
              ['open_pool', 'Açık Havuz'],
              ['heated_pool', 'Isıtmalı Havuz'],
              ['children_pool', 'Çocuk Havuzu'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-primary-600"
                  checked={pools[key].enabled}
                  onChange={(e) => setPool(key, 'enabled', e.target.checked)} />
                <span className="text-sm font-medium">{label}</span>
              </label>
              {pools[key].enabled && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field className="block">
                    <Label>Genişlik (m)</Label>
                    <Input type="number" className="mt-1" value={pools[key].width} onChange={(e) => setPool(key, 'width', e.target.value)} placeholder="8" />
                  </Field>
                  <Field className="block">
                    <Label>Uzunluk (m)</Label>
                    <Input type="number" className="mt-1" value={pools[key].length} onChange={(e) => setPool(key, 'length', e.target.value)} placeholder="16" />
                  </Field>
                  <Field className="block">
                    <Label>Derinlik (m)</Label>
                    <Input type="number" step="0.1" className="mt-1" value={pools[key].depth} onChange={(e) => setPool(key, 'depth', e.target.value)} placeholder="1.8" />
                  </Field>
                  {key === 'heated_pool' && (
                    <Field className="block">
                      <Label>Isıtma Ücreti (₺/gece)</Label>
                      <Input type="number" className="mt-1" value={pools[key].heating_fee_per_day} onChange={(e) => setPool(key, 'heating_fee_per_day', e.target.value)} placeholder="250" />
                    </Field>
                  )}
                  <Field className="block sm:col-span-3">
                    <Label>Açıklama / Not</Label>
                    <Input className="mt-1" value={pools[key].description} onChange={(e) => setPool(key, 'description', e.target.value)} placeholder="Deniz suyu, tuzlu…" />
                  </Field>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Alan Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Restoran (restaurant_table) ──────────────────────────────────────────────
const CUISINE_TYPES = ['Türk', 'İtalyan', 'Japon', 'Çin', 'Meksika', 'Fransız', 'Hint', 'Deniz Ürünleri', 'Steak', 'Vegan', 'Fast Food']

function RestaurantSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    restaurant_name: '', cuisine_type: '',
    party_size_min: '1', party_size_max: '10',
    slot_duration_minutes: '90', reservation_fee: '',
    open_hours: '', external_pos_venue_ref: '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('restaurant_table', listingId)

  const loading = useLoadMeta<typeof form>(listingId, 'restaurant_table', (d) => setForm((p) => ({ ...p, ...d })))
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save(form)
      setMsg({ ok: true, text: 'Restoran bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="block sm:col-span-2">
          <Label>Restoran Adı</Label>
          <Input className="mt-1" value={form.restaurant_name} onChange={set('restaurant_name')} placeholder="Nusr-Et Steakhouse" />
        </Field>
        <Field className="block">
          <Label>Mutfak Türü</Label>
          <select className={SELECT_CLS} value={form.cuisine_type} onChange={set('cuisine_type')}>
            <option value="">— Seçin —</option>
            {CUISINE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Rezervasyon Ücreti (₺)</Label>
          <Input type="number" className="mt-1" value={form.reservation_fee} onChange={set('reservation_fee')} placeholder="0" />
        </Field>
        <Field className="block">
          <Label>Min. Kişi Sayısı</Label>
          <Input type="number" min="1" className="mt-1" value={form.party_size_min} onChange={set('party_size_min')} />
        </Field>
        <Field className="block">
          <Label>Maks. Kişi Sayısı</Label>
          <Input type="number" min="1" className="mt-1" value={form.party_size_max} onChange={set('party_size_max')} />
        </Field>
        <Field className="block">
          <Label>Seans Süresi (dakika)</Label>
          <Input type="number" min="30" step="15" className="mt-1" value={form.slot_duration_minutes} onChange={set('slot_duration_minutes')} />
        </Field>
        <Field className="block">
          <Label>Çalışma Saatleri</Label>
          <Input className="mt-1" value={form.open_hours} onChange={set('open_hours')} placeholder="12:00–23:00" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>POS / Dış Sistem Ref.</Label>
          <Input className="mt-1 font-mono text-xs" value={form.external_pos_venue_ref} onChange={set('external_pos_venue_ref')} />
        </Field>
      </div>
      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Restoran Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Vize (visa) ─────────────────────────────────────────────────────────────
const COUNTRIES = [
  ['DE', 'Almanya'], ['AT', 'Avusturya'], ['BE', 'Belçika'], ['BG', 'Bulgaristan'],
  ['CZ', 'Çekya'], ['DK', 'Danimarka'], ['EE', 'Estonya'], ['FI', 'Finlandiya'],
  ['FR', 'Fransa'], ['NL', 'Hollanda'], ['HR', 'Hırvatistan'], ['IE', 'İrlanda'],
  ['ES', 'İspanya'], ['SE', 'İsveç'], ['CH', 'İsviçre'], ['IT', 'İtalya'],
  ['GB', 'İngiltere'], ['JP', 'Japonya'], ['CA', 'Kanada'], ['CY', 'Kıbrıs'],
  ['MT', 'Malta'], ['NO', 'Norveç'], ['PL', 'Polonya'], ['PT', 'Portekiz'],
  ['RO', 'Romanya'], ['SK', 'Slovakya'], ['SI', 'Slovenya'], ['US', 'ABD'],
  ['AE', 'BAE'], ['SA', 'Suudi Arabistan'],
]

function VisaSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    destination_country: '', visa_type: '',
    processing_days: '', max_stay_days: '', multiple_entry: false,
    fee_amount: '', original_price: '',
    document_list: '', unique_code: '', notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('visa', listingId)

  interface VisaMeta {
    destination_country?: string; visa_type?: string; processing_days?: string
    max_stay_days?: string; multiple_entry?: boolean; fee_amount?: string
    original_price?: string; document_list?: string; unique_code?: string; notes?: string
  }
  const loading = useLoadMeta<VisaMeta>(listingId, 'visa', (d) => setForm((p) => ({
    ...p,
    destination_country: d.destination_country ?? '',
    visa_type: d.visa_type ?? '',
    processing_days: d.processing_days ?? '',
    max_stay_days: d.max_stay_days ?? '',
    multiple_entry: Boolean(d.multiple_entry),
    fee_amount: d.fee_amount ?? '',
    original_price: d.original_price ?? '',
    document_list: d.document_list ?? '',
    unique_code: d.unique_code ?? '',
    notes: d.notes ?? '',
  })))

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save(form)
      setMsg({ ok: true, text: 'Vize bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="block">
          <Label>Hedef Ülke</Label>
          <select className={SELECT_CLS} value={form.destination_country} onChange={set('destination_country')}>
            <option value="">— Seçin —</option>
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Vize Türü</Label>
          <select className={SELECT_CLS} value={form.visa_type} onChange={set('visa_type')}>
            <option value="">— Seçin —</option>
            {['Turist', 'İş', 'Öğrenci', 'Aile', 'Schengen', 'e-Vize', 'Kapıda Vize'].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>İşlem Süresi (gün)</Label>
          <Input type="number" min="1" className="mt-1" value={form.processing_days} onChange={set('processing_days')} placeholder="5" />
        </Field>
        <Field className="block">
          <Label>Maks. Kalış Süresi (gün)</Label>
          <Input type="number" min="1" className="mt-1" value={form.max_stay_days} onChange={set('max_stay_days')} placeholder="90" />
        </Field>
        <Field className="block">
          <Label>Konsolosluk / Hizmet Ücreti (₺)</Label>
          <Input type="number" className="mt-1" value={form.fee_amount} onChange={set('fee_amount')} placeholder="1500" />
        </Field>
        <Field className="block">
          <Label>Piyasa Fiyatı (₺) — indirim baz</Label>
          <Input type="number" className="mt-1" value={form.original_price} onChange={set('original_price')} placeholder="2000" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Benzersiz Kod / SKU</Label>
          <Input className="mt-1 font-mono text-xs" value={form.unique_code} onChange={set('unique_code')} placeholder="VISA-DE-TOURIST-2025" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Gerekli Belgeler</Label>
          <Input className="mt-1" value={form.document_list} onChange={set('document_list')}
            placeholder="Pasaport, banka ekstresi, seyahat sigortası, fotoğraf" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Önemli Notlar</Label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={3}
            className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Özel koşullar, uyarılar, güncel bilgiler…"
          />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.multiple_entry}
          onChange={(e) => setForm((p) => ({ ...p, multiple_entry: e.target.checked }))} />
        <span className="text-sm">Çoklu Giriş Hakkı (Multiple Entry)</span>
      </label>
      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Vize Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Hac (hajj) ───────────────────────────────────────────────────────────────
function HajjSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    package_type: '', departure_city: '', duration_days: '',
    accommodation_category: '', airline: '',
    includes_visa: false, includes_health_insurance: false,
    group_leader: '', notes: '',
  })
  const [includes, setIncludes] = useState<string[]>([''])
  const [excludes, setExcludes] = useState<string[]>([''])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('hajj', listingId)

  interface HajjMeta {
    package_type?: string; departure_city?: string; duration_days?: string
    accommodation_category?: string; airline?: string; includes_visa?: boolean
    includes_health_insurance?: boolean; group_leader?: string; notes?: string
    includes?: string[]; excludes?: string[]
  }
  const loading = useLoadMeta<HajjMeta>(listingId, 'hajj', (d) => {
    setForm({
      package_type: d.package_type ?? '', departure_city: d.departure_city ?? '',
      duration_days: d.duration_days ?? '', accommodation_category: d.accommodation_category ?? '',
      airline: d.airline ?? '', includes_visa: Boolean(d.includes_visa),
      includes_health_insurance: Boolean(d.includes_health_insurance),
      group_leader: d.group_leader ?? '', notes: d.notes ?? '',
    })
    if (d.includes?.length) setIncludes(d.includes)
    if (d.excludes?.length) setExcludes(d.excludes)
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save({ ...form, includes: includes.filter(Boolean), excludes: excludes.filter(Boolean) })
      setMsg({ ok: true, text: 'Hac/Umre bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="block">
          <Label>Paket Tipi</Label>
          <select className={SELECT_CLS} value={form.package_type} onChange={set('package_type')}>
            <option value="">— Seçin —</option>
            {['Hac', 'Umre', 'Ramazan Umresi', 'Özel Umre'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Kalkış Şehri</Label>
          <Input className="mt-1" value={form.departure_city} onChange={set('departure_city')} placeholder="İstanbul, Ankara, İzmir" />
        </Field>
        <Field className="block">
          <Label>Süre (gün)</Label>
          <Input type="number" min="1" className="mt-1" value={form.duration_days} onChange={set('duration_days')} placeholder="21" />
        </Field>
        <Field className="block">
          <Label>Konaklama Kategorisi</Label>
          <select className={SELECT_CLS} value={form.accommodation_category} onChange={set('accommodation_category')}>
            <option value="">— Seçin —</option>
            {['Ekonomi', 'Standart', 'Konfor', 'Lüks', 'VIP'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Havayolu</Label>
          <Input className="mt-1" value={form.airline} onChange={set('airline')} placeholder="Turkish Airlines, SaudiAir" />
        </Field>
        <Field className="block">
          <Label>Grup Lideri / Rehber</Label>
          <Input className="mt-1" value={form.group_leader} onChange={set('group_leader')} placeholder="Hoca adı, iletişim" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Önemli Notlar</Label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={3}
            className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.includes_visa}
            onChange={(e) => setForm((p) => ({ ...p, includes_visa: e.target.checked }))} />
          <span className="text-sm">Vize Dahil</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.includes_health_insurance}
            onChange={(e) => setForm((p) => ({ ...p, includes_health_insurance: e.target.checked }))} />
          <span className="text-sm">Sağlık Sigortası Dahil</span>
        </label>
      </div>
      <IncludeExclude includes={includes} excludes={excludes} onIncludes={setIncludes} onExcludes={setExcludes} />
      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Hac/Umre Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Sinema (cinema_ticket) ───────────────────────────────────────────────────
interface Showtime { time: string; format: string; lang: string; hall: string }

function CinemaSection({ listingId }: { listingId: string }) {
  const [form, setForm] = useState({
    cinema_chain: '', cinema_name: '', address: '',
    seat_capacity: '', hall_count: '',
    rating: '', genre: '', director: '', duration_minutes: '',
  })
  const [showtimes, setShowtimes] = useState<Showtime[]>([{ time: '', format: '2D', lang: 'TR', hall: '' }])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSave('cinema_ticket', listingId)

  interface CinemaMeta {
    cinema_chain?: string; cinema_name?: string; address?: string; seat_capacity?: string
    hall_count?: string; rating?: string; genre?: string; director?: string
    duration_minutes?: string; showtimes?: Showtime[]
  }
  const loading = useLoadMeta<CinemaMeta>(listingId, 'cinema_ticket', (d) => {
    setForm({
      cinema_chain: d.cinema_chain ?? '', cinema_name: d.cinema_name ?? '',
      address: d.address ?? '', seat_capacity: d.seat_capacity ?? '',
      hall_count: d.hall_count ?? '', rating: d.rating ?? '',
      genre: d.genre ?? '', director: d.director ?? '',
      duration_minutes: d.duration_minutes ?? '',
    })
    if (d.showtimes?.length) setShowtimes(d.showtimes)
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  function addShowtime() { setShowtimes((p) => [...p, { time: '', format: '2D', lang: 'TR', hall: '' }]) }
  function removeShowtime(i: number) { setShowtimes((p) => p.filter((_, j) => j !== i)) }
  function setShowtime(i: number, k: keyof Showtime, val: string) {
    setShowtimes((p) => p.map((s, j) => j === i ? { ...s, [k]: val } : s))
  }

  async function handleSave() {
    setBusy(true); setMsg(null)
    try {
      await save({ ...form, showtimes })
      setMsg({ ok: true, text: 'Sinema bilgileri kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yükleniyor…</p>

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="block">
          <Label>Sinema Zinciri</Label>
          <select className={SELECT_CLS} value={form.cinema_chain} onChange={set('cinema_chain')}>
            <option value="">— Seçin —</option>
            {['Cinemaximum', 'CGV Mars', 'AFM', 'Cineplex', 'Diğer'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field className="block">
          <Label>Sinema Adı</Label>
          <Input className="mt-1" value={form.cinema_name} onChange={set('cinema_name')} placeholder="Forum İstanbul Cinemaximum" />
        </Field>
        <Field className="block sm:col-span-2">
          <Label>Adres</Label>
          <Input className="mt-1" value={form.address} onChange={set('address')} placeholder="AVM adı, şehir" />
        </Field>
        <Field className="block">
          <Label>Salon Adedi</Label>
          <Input type="number" min="1" className="mt-1" value={form.hall_count} onChange={set('hall_count')} placeholder="8" />
        </Field>
        <Field className="block">
          <Label>Toplam Koltuk Kapasitesi</Label>
          <Input type="number" min="1" className="mt-1" value={form.seat_capacity} onChange={set('seat_capacity')} placeholder="800" />
        </Field>
        <Field className="block sm:col-span-2 border-t border-neutral-100 dark:border-neutral-700 pt-4 mt-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Film Bilgisi</Label>
        </Field>
        <Field className="block">
          <Label>Film Türü / Janr</Label>
          <Input className="mt-1" value={form.genre} onChange={set('genre')} placeholder="Aksiyon, Drama…" />
        </Field>
        <Field className="block">
          <Label>Yönetmen</Label>
          <Input className="mt-1" value={form.director} onChange={set('director')} placeholder="Yönetmen adı" />
        </Field>
        <Field className="block">
          <Label>Film Süresi (dakika)</Label>
          <Input type="number" className="mt-1" value={form.duration_minutes} onChange={set('duration_minutes')} placeholder="120" />
        </Field>
        <Field className="block">
          <Label>Yaş Sınırı / Puan</Label>
          <Input className="mt-1" value={form.rating} onChange={set('rating')} placeholder="PG-13, 18+, G" />
        </Field>
      </div>

      {/* Seans saatleri */}
      <div>
        <SectionTitle>Seans Saatleri</SectionTitle>
        <div className="space-y-2">
          <div className="grid gap-1.5 text-xs font-medium text-neutral-500 sm:grid-cols-[1fr_100px_80px_100px_32px]">
            <span>Saat</span><span>Format</span><span>Dil</span><span>Salon</span><span />
          </div>
          {showtimes.map((s, i) => (
            <div key={i} className="grid items-center gap-1.5 sm:grid-cols-[1fr_100px_80px_100px_32px]">
              <input type="time" value={s.time}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => setShowtime(i, 'time', e.target.value)} />
              <select value={s.format} className="rounded-xl border border-neutral-200 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => setShowtime(i, 'format', e.target.value)}>
                {['2D', '3D', 'IMAX', '4DX', 'ScreenX'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={s.lang} className="rounded-xl border border-neutral-200 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => setShowtime(i, 'lang', e.target.value)}>
                {['TR', 'EN', 'DE', 'Original'].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <input type="text" value={s.hall} placeholder="Salon 3"
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                onChange={(e) => setShowtime(i, 'hall', e.target.value)} />
              <button type="button" onClick={() => removeShowtime(i)} className="text-neutral-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addShowtime}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
            <PlusCircle className="h-4 w-4" /> Seans Ekle
          </button>
        </div>
      </div>

      <StatusMsg msg={msg} />
      <ButtonPrimary type="button" disabled={busy} onClick={() => void handleSave()}>
        {busy ? '…' : 'Sinema Bilgilerini Kaydet'}
      </ButtonPrimary>
    </div>
  )
}

// ─── Dışa aktarılan ana bileşen ───────────────────────────────────────────────
export function VerticalDetailsSection({
  categoryCode,
  listingId,
}: {
  categoryCode: string
  listingId: string
}) {
  switch (categoryCode) {
    case 'holiday_home':
      return <VillaSection listingId={listingId} />
    case 'yacht_charter':
      return <YachtSection listingId={listingId} />
    case 'tour':
      return <TourSection listingId={listingId} />
    case 'activity':
      return <ActivitySection listingId={listingId} />
    case 'car_rental':
      return <CarRentalSection listingId={listingId} />
    case 'event':
      return <EventSection listingId={listingId} />
    case 'beach_lounger':
      return <BeachLoungerSection listingId={listingId} />
    case 'restaurant_table':
      return <RestaurantSection listingId={listingId} />
    case 'visa':
      return <VisaSection listingId={listingId} />
    case 'hajj':
      return <HajjSection listingId={listingId} />
    case 'cinema_ticket':
      return <CinemaSection listingId={listingId} />
    default:
      return (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Bu kategori ({categoryCode}) için özel alan formu henüz tanımlanmamış.
        </p>
      )
  }
}

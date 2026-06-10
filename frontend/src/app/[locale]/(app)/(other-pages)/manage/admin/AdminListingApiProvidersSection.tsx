'use client'

import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import {
  mergeListingApiProvidersForSave,
  parseListingApiProvidersValue,
  type ListingApiProvidersSettings,
  type TravelrobotSettings,
  type TurnaSettings,
  type WtatilSettings,
  type Yolcu360Settings,
} from '@/lib/listing-api-settings-merge'
import React from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  fetchSiteSettingsFromPanel,
  upsertSiteSettingFromPanel,
} from '@/lib/travel-api'
import { Loader2, Plug, Save } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''
const SETTINGS_KEY = 'listing_api_providers'

const EMPTY_TRAVELROBOT: TravelrobotSettings = {
  enabled: false,
  base_url: 'https://api.bookingagora.com/v0',
  channel_code: '',
  channel_password: '',
  static_base_url: 'https://static.travelchain.online/api',
  static_user: '',
  static_password: '',
  listing_status: 'published',
  import_tours: true,
  import_hotels: false,
  import_flights: true,
  import_car_rental: false,
  import_hotel_rooms: true,
}

const EMPTY_TURNA: TurnaSettings = {
  enabled: false,
  base_url: 'https://api.turna.com',
  api_key: '',
  country_code: 'TR',
  currency_code: 'TRY',
  language_code: 'tr',
}

const EMPTY_YOLCU360: Yolcu360Settings = {
  enabled: false,
  base_url: 'https://api.pro.yolcu360.com/api/v1',
  api_key: '',
  api_secret: '',
  listing_status: 'published',
}

const EMPTY_WTATIL: WtatilSettings = {
  enabled: false,
  base_url: 'https://tour-api.reserwation.com',
  application_secret_key: '',
  username: '',
  password: '',
  agency_id: '',
  listing_status: 'published',
}

const EMPTY: ListingApiProvidersSettings = {
  wtatil: EMPTY_WTATIL,
  travelrobot: EMPTY_TRAVELROBOT,
  turna: EMPTY_TURNA,
  yolcu360: EMPTY_YOLCU360,
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  const [show, setShow] = React.useState(false)
  const isSecret = type === 'password'
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          autoComplete="off"
          spellCheck={false}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600"
          >
            {show ? 'Gizle' : 'Göster'}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  )
}

function applyLoadedSettings(
  parsed: Partial<ListingApiProvidersSettings> | null,
): ListingApiProvidersSettings {
  if (!parsed) return EMPTY
  return {
    wtatil: { ...EMPTY_WTATIL, ...(parsed.wtatil ?? {}) },
    travelrobot: { ...EMPTY_TRAVELROBOT, ...(parsed.travelrobot ?? {}) },
    turna: { ...EMPTY_TURNA, ...(parsed.turna ?? {}) },
    yolcu360: { ...EMPTY_YOLCU360, ...(parsed.yolcu360 ?? {}) },
  }
}

export default function AdminListingApiProvidersSection() {
  const [settings, setSettings] = React.useState<ListingApiProvidersSettings>(EMPTY)
  const persistedRef = React.useRef<ListingApiProvidersSettings>(EMPTY)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [testingTurna, setTestingTurna] = React.useState(false)
  const [testingY360, setTestingY360] = React.useState(false)
  const [testingWtatil, setTestingWtatil] = React.useState(false)
  const [locationQuery, setLocationQuery] = React.useState('istanbul')
  const [msg, setMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const token = getStoredAuthToken()
  const wtatil = settings.wtatil
  const tr = settings.travelrobot
  const turna = settings.turna
  const y360 = settings.yolcu360

  const setWtatil = (patch: Partial<WtatilSettings>) => {
    setSettings((prev) => ({ ...prev, wtatil: { ...prev.wtatil, ...patch } }))
  }

  const setTr = (patch: Partial<TravelrobotSettings>) => {
    setSettings((prev) => ({ ...prev, travelrobot: { ...prev.travelrobot, ...patch } }))
  }

  const setTurna = (patch: Partial<TurnaSettings>) => {
    setSettings((prev) => ({ ...prev, turna: { ...prev.turna, ...patch } }))
  }

  const setY360 = (patch: Partial<Yolcu360Settings>) => {
    setSettings((prev) => ({ ...prev, yolcu360: { ...prev.yolcu360, ...patch } }))
  }

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchSiteSettingsFromPanel({
          scope: 'platform',
          key: SETTINGS_KEY,
        })
        const row = Array.isArray(data.settings)
          ? data.settings.find((s) => s.key === SETTINGS_KEY)
          : null
        const loaded = applyLoadedSettings(parseListingApiProvidersValue(row?.value_json))
        if (!cancelled) {
          persistedRef.current = loaded
          setSettings(loaded)
        }
      } catch {
        if (!cancelled) setMsg({ type: 'err', text: 'Kayıtlı ayarlar yüklenemedi. Oturumu kontrol edin.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const merged = mergeListingApiProvidersForSave(settings, persistedRef.current)
      const payload: ListingApiProvidersSettings = {
        ...merged,
        wtatil: {
          ...merged.wtatil,
          enabled:
            merged.wtatil.enabled
            || (
              merged.wtatil.application_secret_key.trim() !== ''
              && merged.wtatil.username.trim() !== ''
              && merged.wtatil.password.trim() !== ''
            ),
        },
        travelrobot: {
          ...merged.travelrobot,
          enabled:
            merged.travelrobot.enabled
            || (
              merged.travelrobot.channel_code.trim() !== ''
              && merged.travelrobot.channel_password.trim() !== ''
            ),
        },
        turna: {
          ...merged.turna,
          enabled:
            merged.turna.enabled
            || merged.turna.api_key.trim() !== '',
        },
        yolcu360: {
          ...merged.yolcu360,
          enabled:
            merged.yolcu360.enabled
            || (
              merged.yolcu360.api_key.trim() !== ''
              && merged.yolcu360.api_secret.trim() !== ''
            ),
        },
      }
      await upsertSiteSettingFromPanel({
        key: SETTINGS_KEY,
        value_json: JSON.stringify(payload),
      })
      persistedRef.current = payload
      setSettings(payload)
      const hints: string[] = []
      if (payload.yolcu360.api_key && payload.yolcu360.api_secret) {
        hints.push('Yolcu360: araç formunda konum + tarih ile arayın')
      }
      if (payload.turna.api_key) {
        hints.push('Turna: uçak formunda nereden/nereye + tarih ile arayın')
      }
      if (
        payload.wtatil.application_secret_key
        && payload.wtatil.username
        && payload.wtatil.password
      ) {
        hints.push('Wtatil: node scripts/import-wtatil-tours.mjs --ping veya sync-wtatil-auto.mjs')
      }
      if (payload.travelrobot.channel_code && payload.travelrobot.channel_password) {
        hints.push('Travelrobot: sunucuda import script çalıştırın (tur/otel)')
      }
      setMsg({
        type: 'ok',
        text: hints.length > 0
          ? `Veritabanına kaydedildi (yeniden açılışta korunur). ${hints.join(' · ')}`
          : 'Veritabanına kaydedildi (yeniden açılışta korunur). Token testi ile bağlantıyı doğrulayın.',
      })
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Kayıt başarısız') })
    } finally {
      setSaving(false)
    }
  }

  const testWtatil = async () => {
    if (!token) return
    setTestingWtatil(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/integrations/wtatil/ping`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: wtatil.base_url,
          application_secret_key: wtatil.application_secret_key,
          username: wtatil.username,
          password: wtatil.password,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        token_preview?: string
        expire_date?: string
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setMsg({
        type: 'ok',
        text: `Wtatil bağlantısı OK${data.token_preview ? ` (token: ${data.token_preview})` : ''}${data.expire_date ? ` · geçerlilik: ${data.expire_date}` : ''}`,
      })
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Wtatil bağlantı testi başarısız') })
    } finally {
      setTestingWtatil(false)
    }
  }

  const testConnection = async () => {
    if (!token) return
    setTesting(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/integrations/travelrobot/ping`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: tr.base_url,
          channel_code: tr.channel_code,
          channel_password: tr.channel_password,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        token_preview?: string
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setMsg({
        type: 'ok',
        text: `Travelrobot bağlantısı OK${data.token_preview ? ` (token: ${data.token_preview})` : ''}`,
      })
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Bağlantı testi başarısız') })
    } finally {
      setTesting(false)
    }
  }

  const testTurna = async () => {
    if (!token) return
    setTestingTurna(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/integrations/turna/ping`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: turna.base_url,
          api_key: turna.api_key,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        session_preview?: string
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setMsg({
        type: 'ok',
        text: `Turna bağlantısı OK${data.session_preview ? ` (session: ${data.session_preview})` : ''}`,
      })
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Turna bağlantı testi başarısız') })
    } finally {
      setTestingTurna(false)
    }
  }

  const testYolcu360 = async () => {
    if (!token) return
    setTestingY360(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/integrations/yolcu360/ping`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: y360.base_url,
          api_key: y360.api_key,
          api_secret: y360.api_secret,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        access_token_preview?: string
        locations_preview?: string
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setMsg({
        type: 'ok',
        text: `Yolcu360 OK — JWT: ${data.access_token_preview ?? '—'} · Konum önizleme alındı (istanbul).`,
      })
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Yolcu360 bağlantı testi başarısız') })
    } finally {
      setTestingY360(false)
    }
  }

  const searchYolcu360Locations = async () => {
    if (!token || !locationQuery.trim()) return
    setTestingY360(true)
    setMsg(null)
    try {
      const q = encodeURIComponent(locationQuery.trim())
      const res = await fetch(`${API_BASE}/api/v1/integrations/yolcu360/locations?query=${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const text = await res.text()
      if (!res.ok) {
        let err = `HTTP ${res.status}`
        try {
          const j = JSON.parse(text) as { error?: string }
          if (j.error) err = j.error
        } catch {
          /* ham metin */
        }
        throw new Error(err)
      }
      const preview = text.length > 500 ? `${text.slice(0, 500)}…` : text
      setMsg({ type: 'ok', text: `Konum araması (${locationQuery}): ${preview}` })
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Konum araması başarısız') })
    } finally {
      setTestingY360(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Entegrasyonlar — ilan API</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Wtatil (tur), Travelrobot (KPlus), Turna (uçak) ve Yolcu360 (araç) — import ve canlı arama ayarları.
          Yolcu360:{' '}
          <a
            href="https://apidocs.yolcu360.com/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline"
          >
            apidocs.yolcu360.com
          </a>
          {' '}· API anahtarı: pro.yolcu360.com → API Keys.
        </p>
      </div>

      {msg && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            msg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Wtatil — Tur kataloğu</h2>
            <p className="text-xs text-neutral-500">
              API:{' '}
              <a
                href="https://tour-api.reserwation.com/docs/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 underline"
              >
                tour-api.reserwation.com
              </a>
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={wtatil.enabled}
              onChange={(e) => setWtatil({ enabled: e.target.checked })}
              className="rounded border-neutral-300"
            />
            Aktif
          </label>
        </div>

        <div className="space-y-4">
          <Field
            label="Base URL"
            value={wtatil.base_url}
            onChange={(v) => setWtatil({ base_url: v })}
            placeholder="https://tour-api.reserwation.com"
          />
          <Field
            label="Application Secret Key"
            value={wtatil.application_secret_key}
            onChange={(v) => setWtatil({ application_secret_key: v })}
            type="password"
          />
          <Field
            label="Kullanıcı adı (userName)"
            value={wtatil.username}
            onChange={(v) => setWtatil({ username: v })}
          />
          <Field
            label="Şifre"
            value={wtatil.password}
            onChange={(v) => setWtatil({ password: v })}
            type="password"
          />
          <Field
            label="Agency ID"
            hint="search-tour fiyat zenginleştirmesi ve dönem senkronu için (WTATIL_AGENCY_ID)"
            value={wtatil.agency_id}
            onChange={(v) => setWtatil({ agency_id: v })}
            placeholder="12345"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Import ilan durumu
            </label>
            <select
              value={wtatil.listing_status}
              onChange={(e) => setWtatil({ listing_status: e.target.value as 'draft' | 'published' })}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="published">Yayında (published)</option>
              <option value="draft">Taslak (draft)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => void testWtatil()}
            disabled={
              testingWtatil
              || !wtatil.application_secret_key
              || !wtatil.username
              || !wtatil.password
            }
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {testingWtatil ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Bağlantı testi (Token)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Travelrobot / KPlus</h2>
            <p className="text-xs text-neutral-500">
              Canlı Booking API: api.bookingagora.com · Statik içerik: static.travelchain.online
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tr.enabled}
              onChange={(e) => setTr({ enabled: e.target.checked })}
              className="rounded border-neutral-300"
            />
            Aktif
          </label>
        </div>

        <div className="space-y-4">
          <Field
            label="Booking API — Base URL"
            value={tr.base_url}
            onChange={(v) => setTr({ base_url: v })}
            placeholder="https://api.bookingagora.com/v0"
          />
          <Field
            label="Channel Code"
            value={tr.channel_code}
            onChange={(v) => setTr({ channel_code: v })}
            placeholder="agora_MM4N"
          />
          <Field
            label="Channel Password"
            value={tr.channel_password}
            onChange={(v) => setTr({ channel_password: v })}
            type="password"
          />

          <div className="rounded-xl border border-dashed border-neutral-200 p-3 dark:border-neutral-600">
            <p className="mb-3 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Statik içerik API (otel kodları, destinasyonlar, zenginleştirme)
            </p>
            <div className="space-y-4">
              <Field
                label="Static API — Base URL"
                value={tr.static_base_url}
                onChange={(v) => setTr({ static_base_url: v })}
                placeholder="https://static.travelchain.online/api"
              />
              <Field
                label="Static User"
                value={tr.static_user}
                onChange={(v) => setTr({ static_user: v })}
                placeholder="BAgora_mm4N"
              />
              <Field
                label="Static Password"
                value={tr.static_password}
                onChange={(v) => setTr({ static_password: v })}
                type="password"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Import ilan durumu</label>
            <select
              value={tr.listing_status}
              onChange={(e) => setTr({ listing_status: e.target.value as 'draft' | 'published' })}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="published">Yayında (published)</option>
              <option value="draft">Taslak (draft)</option>
            </select>
          </div>

          <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/40">
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">Import kategorileri</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={tr.import_tours} onChange={(e) => setTr({ import_tours: e.target.checked })} />
                Tur
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={tr.import_hotels} onChange={(e) => setTr({ import_hotels: e.target.checked })} />
                Otel
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tr.import_hotel_rooms}
                  disabled={!tr.import_hotels}
                  onChange={(e) => setTr({ import_hotel_rooms: e.target.checked })}
                />
                Otel oda tipleri (SearchHotel)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={tr.import_flights} onChange={(e) => setTr({ import_flights: e.target.checked })} />
                Uçak
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={testing || !tr.channel_code || !tr.channel_password}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Bağlantı testi (CreateToken)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Turna — Uçak bileti</h2>
            <p className="text-xs text-neutral-500">API: api.turna.com · Test: apitest.turna.com</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={turna.enabled}
              onChange={(e) => setTurna({ enabled: e.target.checked })}
              className="rounded border-neutral-300"
            />
            Aktif
          </label>
        </div>

        <div className="space-y-4">
          <Field
            label="API Base URL"
            hint="Canlı: https://api.turna.com · Test: https://apitest.turna.com (test genelde VPS IP whitelist ister; üretimde api.turna.com önerilir)"
            value={turna.base_url}
            onChange={(v) => setTurna({ base_url: v })}
            placeholder="https://api.turna.com"
          />
          <Field
            label="API Key"
            value={turna.api_key}
            onChange={(v) => setTurna({ api_key: v })}
            type="password"
          />
          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Country Code"
              value={turna.country_code}
              onChange={(v) => setTurna({ country_code: v })}
              placeholder="TR"
            />
            <Field
              label="Currency"
              value={turna.currency_code}
              onChange={(v) => setTurna({ currency_code: v })}
              placeholder="TRY"
            />
            <Field
              label="Language"
              value={turna.language_code}
              onChange={(v) => setTurna({ language_code: v })}
              placeholder="tr"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => void testTurna()}
            disabled={testingTurna || !turna.api_key}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {testingTurna ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Bağlantı testi (anonymousLogin)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Yolcu360 — Araç kiralama</h2>
            <p className="text-xs text-neutral-500">
              Staging: staging.api.pro.yolcu360.com · Canlı: api.pro.yolcu360.com/api/v1
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={y360.enabled}
              onChange={(e) => setY360({ enabled: e.target.checked })}
              className="rounded border-neutral-300"
            />
            Aktif
          </label>
        </div>

        <div className="space-y-4">
          <Field
            label="API Base URL"
            hint="Sondaki /api/v1 dahil; örn. https://staging.api.pro.yolcu360.com/api/v1"
            value={y360.base_url}
            onChange={(v) => setY360({ base_url: v })}
            placeholder="https://api.pro.yolcu360.com/api/v1"
          />
          <Field
            label="API Key"
            value={y360.api_key}
            onChange={(v) => setY360({ api_key: v })}
          />
          <Field
            label="API Secret"
            value={y360.api_secret}
            onChange={(v) => setY360({ api_secret: v })}
            type="password"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Import ilan durumu</label>
            <select
              value={y360.listing_status}
              onChange={(e) => setY360({ listing_status: e.target.value as 'draft' | 'published' })}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="published">Yayında (published)</option>
              <option value="draft">Taslak (draft)</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Konum ara (ör. istanbul)"
              className="min-w-[12rem] flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <button
              type="button"
              onClick={() => void searchYolcu360Locations()}
              disabled={testingY360 || !y360.api_key || !y360.api_secret}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              Konum ara
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => void testYolcu360()}
            disabled={testingY360 || !y360.api_key || !y360.api_secret}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {testingY360 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Bağlantı testi (login + istanbul)
          </button>
        </div>
      </div>

      <div className="space-y-1 text-xs text-neutral-500">
        <p>Sunucuda import (repo kökünden):</p>
        <p>
          Wtatil:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-wtatil-tours.mjs --ping</code>
          {' / '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/sync-wtatil-auto.mjs</code>
        </p>
        <p>
          Tur:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-travelrobot-tours.mjs --ping</code>
          {' / '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-travelrobot-tours.mjs --dry-run --limit 5</code>
        </p>
        <p>
          Otel:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-travelrobot-hotels.mjs --dry-run --limit 5</code>
        </p>
        <p>
          Travelrobot canlı/statik test:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/ping-travelrobot-live.mjs</code>
          {' · '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/apply-travelrobot-live-config.mjs</code>
        </p>
        <p>
          Travelrobot Uçak:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-travelrobot-flights.mjs --dry-run --limit 5</code>
        </p>
        <p>
          Turna Uçak:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-turna-flights.mjs --ping</code>
          {' / '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-turna-flights.mjs --dry-run</code>
          {' (rota: scripts/config/turna-flight-routes.json)'}
        </p>
        <p>
          Yolcu360 Araç:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-yolcu360-cars.mjs --ping</code>
          {' / '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-yolcu360-cars.mjs --dry-run --limit 2</code>
          {' · '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">./deploy/scripts/run-yolcu360-live-setup.sh</code>
        </p>
      </div>
    </div>
  )
}

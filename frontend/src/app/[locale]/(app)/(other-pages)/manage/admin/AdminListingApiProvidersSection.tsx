'use client'

import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import React from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { Loader2, Plug, Save } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''
const SETTINGS_KEY = 'listing_api_providers'

interface TravelrobotSettings {
  enabled: boolean
  base_url: string
  channel_code: string
  channel_password: string
  listing_status: 'draft' | 'published'
  import_tours: boolean
  import_hotels: boolean
  import_flights: boolean
  import_car_rental: boolean
}

interface TurnaSettings {
  enabled: boolean
  base_url: string
  api_key: string
  country_code: string
  currency_code: string
  language_code: string
}

interface Yolcu360Settings {
  enabled: boolean
  base_url: string
  api_key: string
  api_secret: string
}

interface ListingApiProvidersSettings {
  travelrobot: TravelrobotSettings
  turna: TurnaSettings
  yolcu360: Yolcu360Settings
}

const EMPTY_TRAVELROBOT: TravelrobotSettings = {
  enabled: false,
  base_url: 'http://sandbox.kplus.com.tr/kplus/v0',
  channel_code: '',
  channel_password: '',
  listing_status: 'published',
  import_tours: true,
  import_hotels: false,
  import_flights: false,
  import_car_rental: false,
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
  base_url: 'https://staging.api.pro.yolcu360.com/api/v1',
  api_key: '',
  api_secret: '',
}

const EMPTY: ListingApiProvidersSettings = {
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

export default function AdminListingApiProvidersSection() {
  const [settings, setSettings] = React.useState<ListingApiProvidersSettings>(EMPTY)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [testingTurna, setTestingTurna] = React.useState(false)
  const [testingY360, setTestingY360] = React.useState(false)
  const [locationQuery, setLocationQuery] = React.useState('istanbul')
  const [msg, setMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const token = getStoredAuthToken()
  const tr = settings.travelrobot
  const turna = settings.turna
  const y360 = settings.yolcu360

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
    if (!token) return
    fetch(`${API_BASE}/api/v1/site/settings?key=${SETTINGS_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const data = await r.json()
        const row = Array.isArray(data.settings)
          ? data.settings.find((s: { key: string }) => s.key === SETTINGS_KEY)
          : null
        if (row?.value_json) {
          const v = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json
          setSettings((prev) => ({
            ...prev,
            travelrobot: { ...prev.travelrobot, ...(v.travelrobot ?? {}) },
            turna: { ...prev.turna, ...(v.turna ?? {}) },
            yolcu360: { ...prev.yolcu360, ...(v.yolcu360 ?? {}) },
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const save = async () => {
    if (!token) return
    setSaving(true)
    setMsg(null)
    try {
      const payload: ListingApiProvidersSettings = {
        ...settings,
        yolcu360: {
          ...settings.yolcu360,
          enabled:
            settings.yolcu360.enabled
            || (
              settings.yolcu360.api_key.trim() !== ''
              && settings.yolcu360.api_secret.trim() !== ''
            ),
        },
      }
      const res = await fetch(`${API_BASE}/api/v1/site/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: SETTINGS_KEY,
          value_json: JSON.stringify(payload),
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setSettings(payload)
      setMsg({
        type: 'ok',
        text: payload.yolcu360.enabled && payload.yolcu360.api_key && payload.yolcu360.api_secret
          ? 'Kaydedildi. Yolcu360 etkin — araç araması için teslim tarihi + konum ile arama yapın.'
          : 'Kaydedildi. Token testi ile bağlantıyı doğrulayın.',
      })
    } catch (e) {
      setMsg({ type: 'err', text: formatManageApiCatch(e, 'Kayıt başarısız') })
    } finally {
      setSaving(false)
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
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">İlan API sağlayıcıları</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Travelrobot (KPlus) ve Yolcu360 Agency API — araç kiralama ve tur import ayarları.
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
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Travelrobot / KPlus</h2>
            <p className="text-xs text-neutral-500">Sandbox: sandbox.kplus.com.tr — canlı URL’yi sağlayıcıdan alın.</p>
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
            label="Base URL"
            value={tr.base_url}
            onChange={(v) => setTr({ base_url: v })}
            placeholder="http://sandbox.kplus.com.tr/kplus/v0"
          />
          <Field
            label="Channel Code"
            value={tr.channel_code}
            onChange={(v) => setTr({ channel_code: v })}
          />
          <Field
            label="Channel Password"
            value={tr.channel_password}
            onChange={(v) => setTr({ channel_password: v })}
            type="password"
          />
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
            hint="Canlı: https://api.turna.com · Test: https://apitest.turna.com"
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
            placeholder="https://staging.api.pro.yolcu360.com/api/v1"
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
          Yolcu360 env:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">YOLCU360_API_KEY</code>,{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">YOLCU360_API_SECRET</code>,{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">YOLCU360_BASE_URL</code>
        </p>
      </div>
    </div>
  )
}

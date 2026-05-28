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

interface ListingApiProvidersSettings {
  travelrobot: TravelrobotSettings
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

const EMPTY: ListingApiProvidersSettings = {
  travelrobot: EMPTY_TRAVELROBOT,
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
  const [msg, setMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const token = getStoredAuthToken()
  const tr = settings.travelrobot

  const setTr = (patch: Partial<TravelrobotSettings>) => {
    setSettings((prev) => ({ ...prev, travelrobot: { ...prev.travelrobot, ...patch } }))
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
      const res = await fetch(`${API_BASE}/api/v1/site/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: SETTINGS_KEY,
          value_json: JSON.stringify(settings),
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setMsg({ type: 'ok', text: 'Kaydedildi. Token testi ile bağlantıyı doğrulayın.' })
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
          Travelrobot (KPlus) ChannelCode / Password — turlar ve diğer kategoriler için ayrı ilan akışı.
          GTC, Wtatil, Turna import script’leri ortam dosyasından; Travelrobot panelden okunur.
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
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">Import kategorileri (ileride)</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={tr.import_tours} onChange={(e) => setTr({ import_tours: e.target.checked })} />
                Tur
              </label>
              <label className="flex items-center gap-2 opacity-60">
                <input type="checkbox" checked={tr.import_hotels} disabled onChange={() => {}} />
                Otel (yakında)
              </label>
              <label className="flex items-center gap-2 opacity-60">
                <input type="checkbox" checked={tr.import_flights} disabled onChange={() => {}} />
                Uçak (yakında)
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

      <p className="text-xs text-neutral-500">
        Sunucuda tur import:{' '}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">node scripts/import-travelrobot-tours.mjs --ping</code>
        (panelde kayıtlı kimlik bilgilerini okur)
      </p>
    </div>
  )
}

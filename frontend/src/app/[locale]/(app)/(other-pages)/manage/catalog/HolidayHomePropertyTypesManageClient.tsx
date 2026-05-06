'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { useManageT } from '@/lib/manage-i18n-context'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { HOLIDAY_PROPERTY_TYPE_OPTIONS } from '@/lib/holiday-property-type-options'
import { listSiteSettings, upsertSiteSetting } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const SETTING_KEY = 'catalog.holiday_home_property_types'

export default function HolidayHomePropertyTypesManageClient() {
  const t = useManageT()
  const [options, setOptions] = useState<string[]>([...HOLIDAY_PROPERTY_TYPE_OPTIONS])
  const [nova, setNova] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoaded(true)
      return
    }
    let cancelled = false
    void listSiteSettings(token, { scope: 'platform', key: SETTING_KEY })
      .then((res) => {
        if (cancelled) return
        const row = res.settings[0]
        if (!row?.value_json) {
          setLoaded(true)
          return
        }
        try {
          const parsed = JSON.parse(row.value_json) as unknown
          if (Array.isArray(parsed)) {
            const vals = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            if (vals.length > 0) setOptions(vals)
          }
        } catch {
          /* keep defaults */
        }
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function persist(next: string[]) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setErr(null)
    try {
      await upsertSiteSetting(token, {
        key: SETTING_KEY,
        value_json: JSON.stringify(next),
      })
      setOptions(next)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function addOpt() {
    const candidate = nova.trim()
    if (!candidate) return
    if (options.some((x) => x.toLocaleLowerCase('tr-TR') === candidate.toLocaleLowerCase('tr-TR'))) {
      setNova('')
      return
    }
    await persist([...options, candidate])
    setNova('')
  }

  async function removeOpt(opt: string) {
    await persist(options.filter((x) => x !== opt))
  }

  async function resetDefaults() {
    await persist([...HOLIDAY_PROPERTY_TYPE_OPTIONS])
  }

  if (!loaded) {
    return <p className="text-sm text-neutral-500">Yükleniyor…</p>
  }

  if (!getStoredAuthToken()) {
    return <p className="text-sm text-neutral-500">Oturum gerekli.</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t('catalog.hub_holiday_home_property_types')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Yeni ilan ve ilan düzenlemede «Listelerde görünen tip» açılır listesi buradaki sırayı ve metinleri kullanır.
          Ayar <span className="font-mono text-xs">site_settings.{SETTING_KEY}</span> içinde saklanır.
        </p>
      </div>

      {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {options.map((opt) => (
          <li key={opt} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <span className="text-sm text-neutral-800 dark:text-neutral-100">{opt}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void removeOpt(opt)}
              className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
              aria-label={`Sil: ${opt}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Yeni tip metni</label>
          <Input className="mt-1" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Örn. Loft daire" />
        </div>
        <ButtonPrimary type="button" disabled={busy || !nova.trim()} onClick={() => void addOpt()}>
          Ekle
        </ButtonPrimary>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void resetDefaults()}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Varsayılan listeye dön
        </button>
      </div>
    </div>
  )
}

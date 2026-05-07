'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { useManageT } from '@/lib/manage-i18n-context'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import {
  HOLIDAY_HOME_PROPERTY_TYPES_SITE_KEY,
  HOLIDAY_PROPERTY_TYPE_OPTIONS,
} from '@/lib/holiday-property-type-options'
import { fetchPublicHolidayHomePropertyTypes, upsertSiteSetting } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const SETTING_KEY = HOLIDAY_HOME_PROPERTY_TYPES_SITE_KEY

export default function HolidayHomePropertyTypesManageClient() {
  const t = useManageT()
  const [options, setOptions] = useState<string[]>([...HOLIDAY_PROPERTY_TYPE_OPTIONS])
  const [nova, setNova] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  /** Düzenlenen satır dizini — `null` görüntüleme modu */
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetchPublicHolidayHomePropertyTypes()
      .then((vals) => {
        if (cancelled) return
        if (vals.length > 0) setOptions(vals)
      })
      .catch(() => {})
      .finally(() => {
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

  async function removeOpt(atIdx: number) {
    if (options[atIdx] === undefined) return
    await persist(options.filter((_, i) => i !== atIdx))
    if (editingIndex === atIdx) {
      setEditingIndex(null)
      setEditDraft('')
    } else if (editingIndex != null && editingIndex > atIdx) {
      setEditingIndex(editingIndex - 1)
    }
  }

  function startEdit(idx: number) {
    const v = options[idx]
    if (v === undefined) return
    setErr(null)
    setEditingIndex(idx)
    setEditDraft(v)
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditDraft('')
  }

  async function saveEdit(idx: number) {
    const newLabel = editDraft.trim()
    if (!newLabel) return
    setErr(null)
    const conflict = options.some(
      (x, i) =>
        i !== idx && x.toLocaleLowerCase('tr-TR') === newLabel.toLocaleLowerCase('tr-TR'),
    )
    if (conflict) {
      setErr('Bu isim zaten listede.')
      return
    }
    const next = [...options]
    if (next[idx] === undefined) return
    next[idx] = newLabel
    await persist(next)
    setEditingIndex(null)
    setEditDraft('')
  }

  async function resetDefaults() {
    cancelEdit()
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
        {options.map((opt, idx) => (
          <li
            key={`${idx}-${opt}`}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
          >
            {editingIndex === idx ? (
              <>
                <Input
                  className="min-w-[12rem] flex-1"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  disabled={busy}
                  aria-label="Tip adı"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEdit()
                    if (e.key === 'Enter') void saveEdit(idx)
                  }}
                />
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy || !editDraft.trim()}
                    onClick={() => void saveEdit(idx)}
                    title="Kaydet"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={cancelEdit}
                    title="İptal"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 text-sm text-neutral-800 dark:text-neutral-100">
                  {opt}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || editingIndex != null}
                    onClick={() => startEdit(idx)}
                    title="Düzenle"
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    aria-label={`Düzenle: ${opt}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || editingIndex != null}
                    onClick={() => void removeOpt(idx)}
                    className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    aria-label={`Sil: ${opt}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Yeni tip metni</label>
          <Input
            className="mt-1"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            placeholder="Örn. Loft daire"
            disabled={busy || editingIndex != null}
          />
        </div>
        <ButtonPrimary
          type="button"
          disabled={busy || !nova.trim() || editingIndex != null}
          onClick={() => void addOpt()}
        >
          Ekle
        </ButtonPrimary>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || editingIndex != null}
          onClick={() => void resetDefaults()}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Varsayılan listeye dön
        </button>
      </div>
    </div>
  )
}

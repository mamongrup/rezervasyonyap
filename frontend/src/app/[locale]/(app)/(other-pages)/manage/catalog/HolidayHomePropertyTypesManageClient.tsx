'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { useManageT } from '@/lib/manage-i18n-context'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import {
  HOLIDAY_HOME_PROPERTY_TYPES_SITE_KEY,
  HOLIDAY_PROPERTY_TYPE_LOCALES,
  defaultHolidayHomePropertyTypeItems,
  holidayPropertyLabelForLocale,
  makeUniquePropertySlug,
  serializeHolidayHomePropertyTypesV2,
  type HolidayHomePropertyTypeItem,
} from '@/lib/holiday-property-type-options'
import type { StayRentalCategoryCode } from '@/lib/stay-rental-categories'
import {
  YACHT_CHARTER_PROPERTY_TYPES_SITE_KEY,
  defaultYachtCharterPropertyTypeItems,
} from '@/lib/yacht-property-type-options'
import { aiErrorMessage, translateOneToMany } from '@/lib/manage-content-ai'
import {
  fetchPublicHolidayHomePropertyTypes,
  fetchPublicYachtCharterPropertyTypes,
  upsertSiteSetting,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export default function HolidayHomePropertyTypesManageClient({
  categoryCode = 'holiday_home',
}: {
  categoryCode?: StayRentalCategoryCode
}) {
  const isYacht = categoryCode === 'yacht_charter'
  const SETTING_KEY = isYacht
    ? YACHT_CHARTER_PROPERTY_TYPES_SITE_KEY
    : HOLIDAY_HOME_PROPERTY_TYPES_SITE_KEY
  const t = useManageT()
  const [items, setItems] = useState<HolidayHomePropertyTypeItem[]>(() =>
    isYacht ? defaultYachtCharterPropertyTypeItems() : defaultHolidayHomePropertyTypeItems(),
  )
  const [newTr, setNewTr] = useState('')
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [previewLocale, setPreviewLocale] = useState('tr')
  /** Düzenlenen satır slug — `null` görüntüleme modu */
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [editLabels, setEditLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const fetchTypes = isYacht
      ? fetchPublicYachtCharterPropertyTypes
      : fetchPublicHolidayHomePropertyTypes
    void fetchTypes()
      .then((vals) => {
        if (cancelled) return
        if (vals.length > 0) setItems(vals)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [isYacht])

  const usedSlugs = useMemo(() => new Set(items.map((i) => i.slug)), [items])
  const sortedItems = useMemo(() => items, [items])

  async function persist(next: HolidayHomePropertyTypeItem[]) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await upsertSiteSetting(token, {
        key: SETTING_KEY,
        value_json: serializeHolidayHomePropertyTypesV2(next),
      })
      setItems(next)
      setMsg({ ok: true, text: 'Kaydedildi.' })
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'))
    } finally {
      setBusy(false)
    }
  }

  function startEdit(slug: string) {
    const row = items.find((i) => i.slug === slug)
    if (!row) return
    setErr(null)
    setMsg(null)
    setEditingSlug(slug)
    const next: Record<string, string> = {}
    for (const l of HOLIDAY_PROPERTY_TYPE_LOCALES) next[l.code] = row.labels[l.code] ?? ''
    setEditLabels(next)
  }

  function cancelEdit() {
    setEditingSlug(null)
    setEditLabels({})
  }

  async function handleAiTranslate(overwrite: boolean) {
    const trText = (editLabels.tr ?? '').trim()
    if (!trText) {
      setMsg({ ok: false, text: 'Önce TR alanını doldurun.' })
      return
    }
    setAiBusy(true)
    setMsg(null)
    try {
      const targets = HOLIDAY_PROPERTY_TYPE_LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
      const out = await translateOneToMany({
        text: trText,
        context: 'short_label',
        sourceLocale: 'tr',
        targetLocales: targets,
      })
      setEditLabels((prev) => {
        const next: Record<string, string> = { ...prev, tr: trText }
        for (const lc of targets) {
          const existing = (prev[lc] ?? '').trim()
          const fresh = out.ok[lc] ?? ''
          if (fresh && (overwrite || existing.length === 0)) next[lc] = fresh
        }
        return next
      })
      const filled = Object.keys(out.ok).length
      const failedLocales = out.failed.map((f) => f.locale.toUpperCase()).join(', ')
      const failTail = failedLocales ? ` Başarısız: ${failedLocales}.` : ''
      setMsg({
        ok: filled > 0,
        text: filled > 0 ? `${filled} dile AI çevirisi geldi. Kontrol edip kaydedin.` + failTail : 'AI çeviri sonucu boş döndü.',
      })
    } catch (e) {
      setMsg({ ok: false, text: aiErrorMessage(e) })
    } finally {
      setAiBusy(false)
    }
  }

  async function addOpt() {
    const candidate = newTr.trim()
    if (!candidate) return
    const sameTr = items.some((x) => (x.labels.tr ?? '').trim().toLocaleLowerCase('tr-TR') === candidate.toLocaleLowerCase('tr-TR'))
    if (sameTr) {
      setNewTr('')
      return
    }
    const slug = makeUniquePropertySlug(candidate, usedSlugs)
    const next: HolidayHomePropertyTypeItem[] = [...items, { slug, labels: { tr: candidate } }]
    await persist(next)
    setNewTr('')
  }

  async function removeOpt(slug: string) {
    await persist(items.filter((i) => i.slug !== slug))
    if (editingSlug === slug) cancelEdit()
  }

  async function saveEdit(slug: string) {
    const trText = (editLabels.tr ?? '').trim()
    if (!trText) return
    setErr(null)
    const conflict = items.some(
      (x) => x.slug !== slug && (x.labels.tr ?? '').trim().toLocaleLowerCase('tr-TR') === trText.toLocaleLowerCase('tr-TR'),
    )
    if (conflict) {
      setErr('Bu isim zaten listede.')
      return
    }
    const next = items.map((it) => {
      if (it.slug !== slug) return it
      const labels: Partial<Record<string, string>> = {}
      for (const l of HOLIDAY_PROPERTY_TYPE_LOCALES) {
        const v = (editLabels[l.code] ?? '').trim()
        if (v) labels[l.code] = v
      }
      if (!labels.tr) labels.tr = trText
      return { ...it, labels }
    })
    await persist(next)
    cancelEdit()
  }

  async function resetDefaults() {
    cancelEdit()
    await persist(defaultHolidayHomePropertyTypeItems())
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
          Yeni ilan ve ilan düzenlemede «Listelerde görünen tip» açılır listesi buradaki sırayı ve çoklu dil etiketlerini kullanır.
          Ayar <span className="font-mono text-xs">site_settings.{SETTING_KEY}</span> içinde v2 JSON olarak saklanır.
        </p>
      </div>

      {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
      {msg ? (
        <p
          className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}
        >
          {msg.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Ön izleme dili</label>
        <select
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          value={previewLocale}
          onChange={(e) => setPreviewLocale(e.target.value)}
          disabled={busy || editingSlug != null}
        >
          {HOLIDAY_PROPERTY_TYPE_LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {sortedItems.map((row) => (
          <li
            key={row.slug}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
          >
            {editingSlug === row.slug ? (
              <>
                <div className="min-w-[12rem] flex-1 space-y-3">
                  {HOLIDAY_PROPERTY_TYPE_LOCALES.map((l) => (
                    <div key={l.code}>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {l.label}
                      </label>
                      <Input
                        className="mt-1"
                        value={editLabels[l.code] ?? ''}
                        onChange={(e) =>
                          setEditLabels((prev) => ({ ...prev, [l.code]: e.target.value }))
                        }
                        disabled={busy}
                        aria-label={`${l.label} tip adı`}
                        autoFocus={l.code === 'tr'}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || aiBusy || !(editLabels.tr ?? '').trim()}
                      onClick={() => void handleAiTranslate(false)}
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      AI çeviri (boşları doldur)
                    </button>
                    <button
                      type="button"
                      disabled={busy || aiBusy || !(editLabels.tr ?? '').trim()}
                      onClick={() => void handleAiTranslate(true)}
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      AI çeviri (üstüne yaz)
                    </button>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy || !(editLabels.tr ?? '').trim()}
                    onClick={() => void saveEdit(row.slug)}
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
                  {holidayPropertyLabelForLocale(row, previewLocale)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || editingSlug != null}
                    onClick={() => startEdit(row.slug)}
                    title="Düzenle"
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    aria-label={`Düzenle: ${row.slug}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || editingSlug != null}
                    onClick={() => void removeOpt(row.slug)}
                    className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    aria-label={`Sil: ${row.slug}`}
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
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Yeni tip (TR)</label>
          <Input
            className="mt-1"
            value={newTr}
            onChange={(e) => setNewTr(e.target.value)}
            placeholder="Örn. Loft daire"
            disabled={busy || editingSlug != null}
          />
        </div>
        <ButtonPrimary
          type="button"
          disabled={busy || !newTr.trim() || editingSlug != null}
          onClick={() => void addOpt()}
        >
          Ekle
        </ButtonPrimary>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || editingSlug != null}
          onClick={() => void resetDefaults()}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Varsayılan listeye dön
        </button>
      </div>
    </div>
  )
}

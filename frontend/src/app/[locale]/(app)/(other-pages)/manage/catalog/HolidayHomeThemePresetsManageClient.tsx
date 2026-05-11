'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createManageThemeItem,
  deleteManageThemeItem,
  listManageThemeItems,
  listPublicCategoryThemeItems,
  patchManageThemeItem,
} from '@/lib/catalog-theme-items-api'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { useManageT } from '@/lib/manage-i18n-context'
import { aiErrorMessage, translateOneToMany } from '@/lib/manage-content-ai'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const CATEGORY = 'holiday_home'

const LOCALES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'RU' },
  { code: 'zh', label: 'ZH' },
  { code: 'fr', label: 'FR' },
] as const

function slugifyCode(s: string): string {
  const ascii = s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
  return ascii
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export default function HolidayHomeThemePresetsManageClient({ locale }: { locale: string }) {
  const t = useManageT()
  const chipCodes = useMemo(() => new Set<string>(), [])

  const [publicItems, setPublicItems] = useState<{ code: string; label: string }[]>([])
  const [manageRows, setManageRows] = useState<Array<{ id: string; code: string; labels: Record<string, string> }>>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [manageErr, setManageErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [previewLocale, setPreviewLocale] = useState<string>(locale || 'tr')
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabels, setEditLabels] = useState<Record<string, string>>({})
  const [hasToken, setHasToken] = useState(false)
  const configRef = useRef({ editingId, editLabels })

  useEffect(() => {
    setHasToken(Boolean(getStoredAuthToken()))
  }, [])

  const loadPublic = useCallback(async () => {
    const r = await listPublicCategoryThemeItems({ categoryCode: CATEGORY, locale: previewLocale })
    setPublicItems(r.items)
  }, [previewLocale])

  const loadManage = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setManageRows([])
      setManageErr(null)
      return
    }
    try {
      const all = await Promise.all(
        LOCALES.map(async (lc) => {
          try {
            const r = await listManageThemeItems(token, { categoryCode: CATEGORY, locale: lc.code })
            return { lc: lc.code, items: r.items }
          } catch {
            return { lc: lc.code, items: [] as { id: string; code: string; label: string }[] }
          }
        }),
      )
      const byId = new Map<string, { id: string; code: string; labels: Record<string, string> }>()
      for (const pack of all) {
        for (const it of pack.items) {
          const cur = byId.get(it.id) ?? { id: it.id, code: it.code, labels: {} }
          cur.code = it.code
          cur.labels[pack.lc] = it.label
          byId.set(it.id, cur)
        }
      }
      setManageRows([...byId.values()].sort((a, b) => a.code.localeCompare(b.code)))
      setManageErr(null)
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      setManageRows([])
      setManageErr(raw)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([loadPublic(), loadManage()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadPublic, loadManage])

  useEffect(() => {
    configRef.current = { editingId, editLabels }
  }, [editingId, editLabels])

  const manageLabelForUi = useCallback(
    (row: { labels: Record<string, string>; code: string }) => {
      const pick = (previewLocale || 'tr').trim().toLowerCase()
      return (
        row.labels[pick]?.trim() ||
        row.labels.tr?.trim() ||
        row.labels.en?.trim() ||
        Object.values(row.labels).find((x) => x?.trim()) ||
        row.code
      )
    },
    [previewLocale],
  )

  function startEdit(id: string) {
    const row = manageRows.find((r) => r.id === id)
    if (!row) return
    setManageErr(null)
    setMsg(null)
    setEditingId(id)
    const next: Record<string, string> = {}
    for (const lc of LOCALES) next[lc.code] = row.labels[lc.code] ?? ''
    setEditLabels(next)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLabels({})
    setMsg(null)
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
      const targets = LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
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
        text:
          filled > 0
            ? `${filled} dile AI çevirisi geldi. Kontrol edip kaydedin.` + failTail
            : 'AI çeviri sonucu boş döndü.',
      })
    } catch (e) {
      setMsg({ ok: false, text: aiErrorMessage(e) })
    } finally {
      setAiBusy(false)
    }
  }

  async function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    const code = slugifyCode(label)
    if (!code) {
      setManageErr('Etiketten geçerli bir kod üretilemedi (Latin harf, rakam, alt çizgi).')
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setManageErr(null)
    try {
      await createManageThemeItem(token, {
        category_code: CATEGORY,
        code,
        label,
        locale_code: 'tr',
      })
      setNewLabel('')
      await loadManage()
      await loadPublic()
    } catch (e) {
      setManageErr(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit(id: string) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setManageErr(null)
    try {
      const labels = { ...editLabels }
      const tr = (labels.tr ?? '').trim()
      if (!tr) {
        setManageErr('TR alanı zorunlu.')
        return
      }
      for (const lc of LOCALES) {
        const v = (labels[lc.code] ?? '').trim()
        if (!v) continue
        await patchManageThemeItem(token, id, { label: v, locale_code: lc.code })
      }
      cancelEdit()
      await loadManage()
      await loadPublic()
    } catch (e) {
      setManageErr(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`«${label}» kaydını silmek istediğinize emin misiniz?`)) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setManageErr(null)
    try {
      await deleteManageThemeItem(token, id)
      await loadManage()
      await loadPublic()
    } catch (e) {
      setManageErr(e instanceof Error ? e.message : 'delete_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t('catalog.hub_holiday_home_theme_presets')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          İlan düzenlemede «Özellikler / Temalar» ile vitrin filtreleri bu kodları kullanır. Bu sayfa öznitelikler gibi
          tek ekranda tüm dilleri düzenler; TR’den AI çeviri ile doldurabilirsiniz.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Vitrin temaları — ekle, düzenle, sil
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Kayıtlar veritabanındadır. Ön izleme dili:{' '}
              <strong className="text-neutral-700 dark:text-neutral-300">{previewLocale}</strong>
            </p>
          </div>
          {loading ? (
            <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
            </span>
          ) : null}
        </div>

        {!hasToken ? (
          <p className="mt-4 text-sm text-amber-800 dark:text-amber-200">
            Ekleme, düzenleme ve silme için yönetim paneline giriş yapın (oturum çerezi).
          </p>
        ) : null}

        {manageErr && hasToken ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{formatManageApiError(manageErr)}</p>
        ) : null}
        {msg ? (
          <p
            className={`mt-2 text-sm ${
              msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {msg.text}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Ön izleme dili</label>
          <select
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            value={previewLocale}
            onChange={(e) => setPreviewLocale(e.target.value)}
            disabled={busy || editingId != null}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {hasToken ? (
          <>
            <div className="mt-6 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-600 dark:bg-neutral-900/40">
              <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">Yeni tema</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="block min-w-[12rem] flex-1">
                  <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Vitrin etiketi (TR)
                  </label>
                  <Input
                    className="mt-1 text-sm"
                    placeholder="Listede görünecek ad"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <ButtonPrimary
                  type="button"
                  disabled={busy || !newLabel.trim()}
                  onClick={() => void handleAdd()}
                >
                  {busy ? '…' : 'Ekle'}
                </ButtonPrimary>
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                Kod, etiketten otomatik üretilir.
              </p>
            </div>

            <ul className="mt-6 divide-y divide-neutral-200 dark:divide-neutral-700">
              {manageRows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    {editingId === row.id ? (
                      <div className="w-full space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {LOCALES.map((lc) => (
                            <div key={lc.code}>
                              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                                {lc.label}
                              </label>
                              <Input
                                className="mt-1 text-sm"
                                value={editLabels[lc.code] ?? ''}
                                onChange={(e) =>
                                  setEditLabels((prev) => ({ ...prev, [lc.code]: e.target.value }))
                                }
                                disabled={busy}
                                aria-label={`${lc.label} etiketi`}
                                autoFocus={lc.code === 'tr'}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={busy || aiBusy || !(editLabels.tr ?? '').trim()}
                            onClick={() => void handleAiTranslate(false)}
                            className="rounded-lg border border-neutral-200 px-3 py-2 text-[11px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          >
                            AI çeviri (boşları)
                          </button>
                          <button
                            type="button"
                            disabled={busy || aiBusy || !(editLabels.tr ?? '').trim()}
                            onClick={() => void handleAiTranslate(true)}
                            className="rounded-lg border border-neutral-200 px-3 py-2 text-[11px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          >
                            AI çeviri (üstüne)
                          </button>
                          <button
                            type="button"
                            disabled={busy || !(editLabels.tr ?? '').trim()}
                            title="Kaydet"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                            onClick={() => void handleSaveEdit(row.id)}
                          >
                            <Check className="h-4 w-4" /> Kaydet
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            title="İptal"
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-[11px] text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" /> İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {manageLabelForUi(row)}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {chipCodes.has(row.code) ? (
                      <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400">
                        çip ile uyumlu
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase text-neutral-400">yalnız vitrin</span>
                    )}
                    {editingId !== row.id ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          title="Düzenle"
                          className="rounded p-1 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                          onClick={() => startEdit(row.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          title="Sil"
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          onClick={() => void handleDelete(row.id, manageLabelForUi(row))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {manageRows.length === 0 && !loading && !manageErr ? (
              <p className="mt-4 text-sm text-neutral-500">Henüz kayıt yok — yukarıdan ekleyin.</p>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Herkese açık API özeti</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Vitrin ve harita filtreleri bu sırayı kullanır ({previewLocale}).
        </p>
        {publicItems.length === 0 && !loading ? (
          <p className="mt-3 text-sm text-neutral-500">Liste boş.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {publicItems.map((row) => (
              <li
                key={row.code}
                className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                {row.label}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

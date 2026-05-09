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
import { VILLA_THEME_CHIP_PRESETS } from '@/lib/villa-theme-chip-presets'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const CATEGORY = 'holiday_home'

function slugifyCode(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export default function HolidayHomeThemePresetsManageClient({ locale }: { locale: string }) {
  const t = useManageT()
  const chipCodes = new Set(VILLA_THEME_CHIP_PRESETS.map((x) => x.code))

  const [publicItems, setPublicItems] = useState<{ code: string; label: string }[]>([])
  const [manageRows, setManageRows] = useState<{ id: string; code: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [manageErr, setManageErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    setHasToken(Boolean(getStoredAuthToken()))
  }, [])

  const loadPublic = useCallback(async () => {
    const r = await listPublicCategoryThemeItems({ categoryCode: CATEGORY, locale })
    setPublicItems(r.items)
  }, [locale])

  const loadManage = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setManageRows([])
      setManageErr(null)
      return
    }
    try {
      const r = await listManageThemeItems(token, { categoryCode: CATEGORY, locale })
      setManageRows(r.items)
      setManageErr(null)
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      setManageRows([])
      setManageErr(raw)
    }
  }, [locale])

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

  async function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    const code = slugifyCode(newCode || label)
    if (!code) {
      setManageErr('Geçerli bir kod üretin (Latin harf, rakam, alt çizgi).')
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
        locale_code: locale,
      })
      setNewCode('')
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
    const label = editDraft.trim()
    if (!label) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setManageErr(null)
    try {
      await patchManageThemeItem(token, id, { label, locale_code: locale })
      setEditingId(null)
      setEditDraft('')
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
          İlan düzenlemede «Özellikler / Temalar» ile vitrin filtreleri bu kodları kullanır. Çok dilli etiket için üst
          menüden panel dilini değiştirip aynı kod için farklı çevirileri düzenleyebilirsiniz.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Panel çip kodları (referans)</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          İlan formundaki tema çipleri bu kodlarla eşleşir; veritabanında aynı <span className="font-mono">code</span>{' '}
          varsa vitrin etiketi çeviri tablosundan gelir.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {VILLA_THEME_CHIP_PRESETS.map((chip) => (
            <li
              key={chip.code}
              className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <span className="font-mono text-[11px] text-neutral-500">{chip.code}</span>
              <span className="mt-0.5 block text-neutral-800 dark:text-neutral-100">{chip.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Vitrin temaları — düzenleme
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Kayıtlar <span className="font-mono">category_theme_items</span> tablosundadır. Şu an görünen dil:{' '}
              <strong className="text-neutral-700 dark:text-neutral-300">{locale}</strong>
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

        {hasToken ? (
          <>
            <div className="mt-6 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-600 dark:bg-neutral-900/40">
              <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">Yeni tema</p>
              <div className="flex flex-wrap items-end gap-2">
                <Field className="block min-w-[8rem]">
                  <Label className="text-[11px]">Kod</Label>
                  <Input
                    className="mt-1 font-mono text-xs"
                    placeholder="ör. rooftop_pool"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    disabled={busy}
                  />
                </Field>
                <Field className="block min-w-[12rem] flex-1">
                  <Label className="text-[11px]">Etiket ({locale})</Label>
                  <Input
                    className="mt-1 text-sm"
                    placeholder="Vitrinde görünen ad"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    disabled={busy}
                  />
                </Field>
                <ButtonPrimary type="button" disabled={busy || !newLabel.trim()} onClick={() => void handleAdd()}>
                  {busy ? '…' : 'Ekle'}
                </ButtonPrimary>
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                Kod boşsa etiketten üretilir (küçük harf, boşluk → alt çizgi).
              </p>
            </div>

            <ul className="mt-6 divide-y divide-neutral-200 dark:divide-neutral-700">
              {manageRows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    {editingId === row.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="max-w-md flex-1 text-sm"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          disabled={busy}
                          aria-label="Etiket düzenle"
                        />
                        <button
                          type="button"
                          disabled={busy || !editDraft.trim()}
                          title="Kaydet"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                          onClick={() => void handleSaveEdit(row.id)}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          title="İptal"
                          className="rounded-lg border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          onClick={() => {
                            setEditingId(null)
                            setEditDraft('')
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{row.label}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">{row.code}</span>
                      </>
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
                          onClick={() => {
                            setEditingId(row.id)
                            setEditDraft(row.label)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          title="Sil"
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          onClick={() => void handleDelete(row.id, row.label)}
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
          Vitrin ve harita filtreleri bu sırayı kullanır ({locale}).
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

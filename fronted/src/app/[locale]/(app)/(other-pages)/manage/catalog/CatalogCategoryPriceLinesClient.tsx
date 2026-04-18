'use client'

/**
 * Kategori bazında fiyata dahil / hariç kalem listesi — tek tanım; ilanlarda seçim için kullanılır.
 */
import { getStoredAuthToken } from '@/lib/auth-storage'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import {
  createPriceLineItem,
  deletePriceLineItem,
  listPriceLineItems,
  putPriceLineItemTranslations,
  type PriceLineItem,
} from '@/lib/travel-api'
import { MANAGE_PAGE_BOTTOM_SCROLL_CLASS } from '@/components/manage/ManageFormShell'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import clsx from 'clsx'
import { Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const LINE_LOCALES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
] as const

function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p
      className={`mt-2 rounded-lg px-3 py-2 text-xs ${
        msg.ok
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
      }`}
    >
      {msg.text}
    </p>
  )
}

export default function CatalogCategoryPriceLinesClient({ code }: { code: string }) {
  const [items, setItems] = useState<PriceLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [previewLocale, setPreviewLocale] = useState('tr')

  const load = useCallback(() => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoading(true)
    void listPriceLineItems(token, { categoryCode: code, locale: previewLocale })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [code, previewLocale])

  useEffect(() => {
    load()
  }, [load])

  const included = items.filter((i) => i.scope === 'included')
  const excluded = items.filter((i) => i.scope === 'excluded')

  return (
    <div className={clsx('flex h-full flex-col gap-6', MANAGE_PAGE_BOTTOM_SCROLL_CLASS)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {categoryLabelTr(code)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Dahil & Hariç (fiyat)
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Bu kategorideki ilanlar için fiyata dahil olan ve olmayan kalemleri bir kez tanımlayın; ilan düzenlemede kutulardan
          seçilir. Etiketler dil bazlıdır.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-neutral-500">Liste önizleme dili</label>
          <select
            value={previewLocale}
            onChange={(e) => setPreviewLocale(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {LINE_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PriceColumn
            title="Fiyata dahil"
            scope="included"
            categoryCode={code}
            rows={included}
            onChanged={load}
            previewLocale={previewLocale}
          />
          <PriceColumn
            title="Fiyata hariç"
            scope="excluded"
            categoryCode={code}
            rows={excluded}
            onChanged={load}
            previewLocale={previewLocale}
          />
        </div>
      )}
    </div>
  )
}

function PriceColumn({
  title,
  scope,
  categoryCode,
  rows,
  onChanged,
  previewLocale,
}: {
  title: string
  scope: 'included' | 'excluded'
  categoryCode: string
  rows: PriceLineItem[]
  onChanged: () => void
  previewLocale: string
}) {
  const [form, setForm] = useState({ code: '', label: '', sort: '0' })
  const [busy, setBusy] = useState(false)
  const [localMsg, setLocalMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [trans, setTrans] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const editItem = editingId ? rows.find((r) => r.id === editingId) : undefined

  useEffect(() => {
    if (!editItem) {
      setTrans({})
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    let cancelled = false
    void Promise.all(
      LINE_LOCALES.map((l) =>
        listPriceLineItems(token, { categoryCode, locale: l.code }).then((r) => {
          const row = r.items.find((x) => x.id === editItem.id)
          return [l.code, row?.label ?? ''] as const
        }),
      ),
    ).then((pairs) => {
      if (!cancelled) setTrans(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [editItem, categoryCode])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const cd = form.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!cd || !form.label.trim()) {
      setLocalMsg({ ok: false, text: 'Kod ve Türkçe etiket gerekli.' })
      return
    }
    setBusy(true)
    setLocalMsg(null)
    try {
      await createPriceLineItem(token, {
        category_code: categoryCode,
        scope,
        code: cd,
        label: form.label.trim(),
        sort_order: form.sort.trim() || '0',
      })
      setForm({ code: '', label: '', sort: '0' })
      setLocalMsg({ ok: true, text: 'Kalem eklendi.' })
      onChanged()
    } catch (e) {
      setLocalMsg({ ok: false, text: e instanceof Error ? e.message : 'Kayıt başarısız' })
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Bu kalemi sil?')) return
    const token = getStoredAuthToken()
    if (!token) return
    try {
      await deletePriceLineItem(token, id)
      setEditingId(null)
      onChanged()
    } catch {
      /* ignore */
    }
  }

  async function saveTranslations() {
    if (!editItem) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    try {
      const entries = LINE_LOCALES.map((l) => ({
        locale_code: l.code,
        label: (trans[l.code] ?? '').trim(),
      })).filter((e) => e.label.length > 0)
      if (entries.length === 0) {
        setLocalMsg({ ok: false, text: 'En az bir dilde etiket girin.' })
        return
      }
      await putPriceLineItemTranslations(token, editItem.id, { entries })
      setLocalMsg({ ok: true, text: 'Çeviriler kaydedildi.' })
      setEditingId(null)
      onChanged()
    } catch (e) {
      setLocalMsg({ ok: false, text: e instanceof Error ? e.message : 'Kayıt başarısız' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border bg-white shadow-sm dark:bg-neutral-800',
        scope === 'included'
          ? 'border-emerald-200 dark:border-emerald-900/40'
          : 'border-amber-200 dark:border-amber-900/40',
      )}
    >
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
        <p className="text-xs text-neutral-400">Önizleme: {previewLocale}</p>
      </div>
      <div className="p-4">
        {rows.length === 0 ? (
          <p className="mb-3 text-xs text-neutral-400">Henüz kalem yok.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-600"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{r.label || r.code}</p>
                  <p className="font-mono text-[11px] text-neutral-400">{r.code}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(r.id === editingId ? null : r.id)}
                    className="rounded-lg px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30"
                  >
                    Diller
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(r.id)}
                    className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {editItem ? (
          <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-900/40 dark:bg-primary-950/20">
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Etiketler — {editItem.code}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {LINE_LOCALES.map((l) => (
                <Field key={l.code} className="block">
                  <Label className="text-[11px]">{l.label}</Label>
                  <Input
                    value={trans[l.code] ?? ''}
                    onChange={(e) => setTrans((p) => ({ ...p, [l.code]: e.target.value }))}
                    className="mt-0.5 text-sm"
                  />
                </Field>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <ButtonPrimary type="button" className="text-xs" disabled={busy} onClick={() => void saveTranslations()}>
                {busy ? '…' : 'Çevirileri kaydet'}
              </ButtonPrimary>
              <button type="button" className="text-xs text-neutral-500 underline" onClick={() => setEditingId(null)}>
                Kapat
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={(e) => void onAdd(e)} className="space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Yeni kalem</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field className="block">
              <Label className="text-[11px]">Kod</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                  }))
                }
                placeholder="havuz_isitma"
                className="font-mono text-xs"
              />
            </Field>
            <Field className="block">
              <Label className="text-[11px]">Türkçe etiket (zorunlu)</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="Havuz ısıtma"
                className="text-sm"
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label className="text-[11px]">Sıra</Label>
              <Input
                type="number"
                min="0"
                value={form.sort}
                onChange={(e) => setForm((p) => ({ ...p, sort: e.target.value }))}
                className="max-w-[120px]"
              />
            </Field>
          </div>
          <ButtonPrimary type="submit" disabled={busy} className="text-sm">
            {busy ? '…' : `+ ${title} ekle`}
          </ButtonPrimary>
          <StatusMsg msg={localMsg} />
        </form>
      </div>
    </div>
  )
}

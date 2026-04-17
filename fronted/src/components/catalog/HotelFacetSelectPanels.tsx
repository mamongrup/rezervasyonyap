'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { prefixLocale } from '@/lib/i18n-config'
import {
  createManageThemeItem,
  deleteManageThemeItem,
  listManageThemeItems,
  listPublicThemeItems,
} from '@/lib/catalog-theme-items-api'
import { HOTEL_ACCOMMODATION_FILTER_FALLBACK } from '@/lib/hotel-accommodation-fallback'
import { HOTEL_THEME_OPTIONS, HOTEL_TYPE_OPTIONS } from '@/lib/hotel-manage-fields'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

function mergeOptions(
  api: { code: string; label: string }[] | null | undefined,
  fallback: { code: string; label: string }[],
): { code: string; label: string }[] {
  if (api && api.length > 0) return api.map((i) => ({ code: i.code, label: i.label }))
  return [...fallback]
}

function slugifyCode(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

type Facet = 'hotel_type' | 'theme' | 'accommodation'

function FacetOptionManager({
  facet,
  locale,
  onOptionsChanged,
}: {
  facet: Facet
  locale: string
  onOptionsChanged: () => void
}) {
  const [rows, setRows] = useState<{ id: string; code: string; label: string }[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newCode, setNewCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [listHint, setListHint] = useState<string | null>(null)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setRows([])
      setListHint(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const r = await listManageThemeItems(token, { categoryCode: 'hotel', facet, locale })
        if (!cancelled) {
          setRows(r.items)
          setListHint(null)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!cancelled) {
          setRows([])
          if (msg.includes('404') || msg.includes('manage_theme_items_404')) {
            setListHint(
              'Yönetim listesi bulunamadı (404). Gleam backend’i güncel kodla derleyin (gleam build) ve süreci yeniden başlatın; ardından sayfayı yenileyin.',
            )
          } else if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
            setListHint('Seçenek ekleme/silme için yönetici yetkisi gerekir.')
          } else {
            setListHint(`Liste yüklenemedi: ${msg}`)
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [facet, locale])

  if (!getStoredAuthToken()) return null

  async function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    let code = newCode.trim() || slugifyCode(label)
    if (!code) {
      setErr('Kod için Latin harf veya rakam kullanın (ör. «Butik Otel» → butik_otel).')
      return
    }
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum gerekli.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await createManageThemeItem(token, {
        category_code: 'hotel',
        facet,
        code,
        label,
        locale_code: locale,
      })
      setNewLabel('')
      setNewCode('')
      const r = await listManageThemeItems(token, { categoryCode: 'hotel', facet, locale })
      setRows(r.items)
      setListHint(null)
      onOptionsChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    const token = getStoredAuthToken()
    if (!token) return
    if (!window.confirm('Bu seçeneği silmek istediğinize emin misiniz?')) return
    setBusy(true)
    setErr(null)
    try {
      await deleteManageThemeItem(token, id)
      const r = await listManageThemeItems(token, { categoryCode: 'hotel', facet, locale })
      setRows(r.items)
      onOptionsChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'delete_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-900/40">
      <p className="mb-2 font-medium text-neutral-600 dark:text-neutral-400">Seçenekleri düzenle</p>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-[140px]"
          placeholder="Kod (opsiyonel)"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          disabled={busy}
        />
        <Input
          className="min-w-[160px] flex-1"
          placeholder="Etiket"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          disabled={busy || !newLabel.trim()}
          className="rounded-lg border border-primary-600 bg-primary-50 px-3 py-1.5 font-medium text-primary-800 disabled:opacity-50 dark:border-primary-500 dark:bg-primary-950/40 dark:text-primary-200"
          onClick={() => void handleAdd()}
        >
          Ekle
        </button>
      </div>
      {rows.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-600 dark:bg-neutral-900"
            >
              <span
                className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-100"
                title={`Kod: ${r.code}`}
              >
                {r.label}
              </span>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                title="Sil"
                aria-label={`Sil: ${r.label} (${r.code})`}
                disabled={busy}
                onClick={() => void handleDelete(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-neutral-500">
          {listHint ??
            'Kayıtlı yönetim satırı yok. Yukarıdaki listede seçenekler API’den geliyorsa yönetici listesi yüklenememiş olabilir.'}
        </p>
      )}
      {err ? <p className="mt-2 text-red-600 dark:text-red-400">{err}</p> : null}
    </div>
  )
}

/** Katalog → Otel → «Tip / tema / konaklama seçenekleri» sayfası — ekleme / silme listeleri. */
export function HotelFacetOptionManagers({
  locale,
  headings,
}: {
  locale: string
  headings?: Partial<{ hotelType: string; theme: string; accommodation: string }>
}) {
  const h = {
    hotelType: headings?.hotelType ?? 'Otel tipi',
    theme: headings?.theme ?? 'Tema',
    accommodation: headings?.accommodation ?? 'Konaklama tipi',
  }
  const noop = () => {}
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Field className="min-w-0 block">
        <Label className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{h.hotelType}</Label>
        <div data-slot="control">
          <FacetOptionManager facet="hotel_type" locale={locale} onOptionsChanged={noop} />
        </div>
      </Field>
      <Field className="min-w-0 block">
        <Label className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{h.theme}</Label>
        <div data-slot="control">
          <FacetOptionManager facet="theme" locale={locale} onOptionsChanged={noop} />
        </div>
      </Field>
      <Field className="min-w-0 block">
        <Label className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{h.accommodation}</Label>
        <div data-slot="control">
          <FacetOptionManager facet="accommodation" locale={locale} onOptionsChanged={noop} />
        </div>
      </Field>
    </div>
  )
}

export function HotelFacetSelectPanels({
  locale,
  selectCls,
  hotelTypeCode,
  setHotelTypeCode,
  hotelThemeCode,
  setHotelThemeCode,
  hotelAccommodation,
  setHotelAccommodation,
  hotelStar,
  setHotelStar,
  labels,
}: {
  locale: string
  selectCls: string
  hotelTypeCode: string
  setHotelTypeCode: (v: string) => void
  hotelThemeCode: string
  setHotelThemeCode: (v: string) => void
  hotelAccommodation: string
  setHotelAccommodation: (v: string) => void
  hotelStar: string
  setHotelStar: (v: string) => void
  labels?: Partial<{
    hotelType: string
    theme: string
    accommodation: string
    star: string
  }>
}) {
  const facetOptionsHref = prefixLocale(locale, '/manage/catalog/hotel/facet-options')
  const lt = {
    hotelType: labels?.hotelType ?? 'Otel tipi',
    theme: labels?.theme ?? 'Tema',
    accommodation: labels?.accommodation ?? 'Konaklama tipi',
    star: labels?.star ?? 'Yıldız',
  }
  const [typeOpts, setTypeOpts] = useState(() => HOTEL_TYPE_OPTIONS)
  const [themeOpts, setThemeOpts] = useState(() => HOTEL_THEME_OPTIONS)
  const [accOpts, setAccOpts] = useState(() => HOTEL_ACCOMMODATION_FILTER_FALLBACK)

  useEffect(() => {
    let cancelled = false
    void listPublicThemeItems({ categoryCode: 'hotel', locale, facet: 'hotel_type' }).then((r) => {
      if (!cancelled) setTypeOpts(mergeOptions(r?.items, HOTEL_TYPE_OPTIONS))
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    let cancelled = false
    void listPublicThemeItems({ categoryCode: 'hotel', locale, facet: 'theme' }).then((r) => {
      if (!cancelled) setThemeOpts(mergeOptions(r?.items, HOTEL_THEME_OPTIONS))
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    let cancelled = false
    void listPublicThemeItems({ categoryCode: 'hotel', locale, facet: 'accommodation' }).then((r) => {
      if (!cancelled) setAccOpts(mergeOptions(r?.items, HOTEL_ACCOMMODATION_FILTER_FALLBACK))
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  return (
    <div className="space-y-3">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field className="block">
        <Label>{lt.hotelType}</Label>
        <select
          key="select-hotel-type"
          className={`mt-1 ${selectCls}`}
          value={hotelTypeCode}
          onChange={(e) => setHotelTypeCode(e.target.value)}
        >
          <option value="">— Seçin (isteğe bağlı) —</option>
          {typeOpts.map((o) => (
            <option key={`hotel_type:${o.code}`} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        <HintText>Tesis sınıfı (tatil köyü, otel, motel, pansiyon).</HintText>
      </Field>
      <Field className="block">
        <Label>{lt.theme}</Label>
        <select
          key="select-hotel-theme"
          className={`mt-1 ${selectCls}`}
          value={hotelThemeCode}
          onChange={(e) => setHotelThemeCode(e.target.value)}
        >
          <option value="">— Seçin (isteğe bağlı) —</option>
          {themeOpts.map((o) => (
            <option key={`theme:${o.code}`} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        <HintText>Vitrinde öne çıkan tema (tek seçim).</HintText>
      </Field>
      <Field className="block">
        <Label>{lt.accommodation}</Label>
        <select
          key="select-hotel-acc"
          className={`mt-1 ${selectCls}`}
          value={hotelAccommodation}
          onChange={(e) => setHotelAccommodation(e.target.value)}
        >
          <option value="">— Seçin (isteğe bağlı) —</option>
          {accOpts.map((o) => (
            <option key={`accommodation:${o.code}`} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        <HintText>Liste ve filtrelerde «Her şey dahil», «Ultra» vb. ile eşlenir.</HintText>
      </Field>
      <Field className="block">
        <Label>{lt.star}</Label>
        <Input
          className="mt-1"
          value={hotelStar}
          onChange={(e) => setHotelStar(e.target.value)}
          placeholder="ör: 5 veya 4.5"
        />
        <HintText>Örn. 1–5 veya 4,5; vitrinde yıldız gösteriminde kullanılır.</HintText>
      </Field>
    </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        <Link
          href={facetOptionsHref}
          className="font-medium text-primary-600 underline decoration-primary-600/30 underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Otel tipi, tema ve konaklama seçeneklerini yönet
        </Link>
        {' '}
        — seçenek ekleme ve silme bu sayfada; burada yalnızca ilan için seçim yapılır.
      </p>
    </div>
  )
}

function HintText({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{children}</p>
}

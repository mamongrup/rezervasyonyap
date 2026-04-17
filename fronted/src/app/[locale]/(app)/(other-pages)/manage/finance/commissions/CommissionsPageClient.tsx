'use client'

import { getCategoryByListingType, type ListingType } from '@/data/category-registry'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { listProductCategories, type ProductCategoryRow } from '@/lib/travel-api'
import clsx from 'clsx'
import { BookOpen, ExternalLink, Layers, Percent, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

/** `product_categories.code` → vitrin `listingType` (sinema/plaj gibi ek kodlar rehberde yok). */
const PRODUCT_CODE_TO_LISTING_TYPE: Partial<Record<string, ListingType>> = {
  hotel: 'hotel',
  holiday_home: 'holiday-home',
  yacht_charter: 'yacht',
  car_rental: 'car-rental',
  transfer: 'transfer',
  ferry: 'ferry',
  flight: 'flight',
  tour: 'tour',
  activity: 'activity',
  cruise: 'cruise',
  visa: 'visa',
}

function categoryDisplayName(code: string): string | null {
  const lt = PRODUCT_CODE_TO_LISTING_TYPE[code]
  if (!lt) return null
  return getCategoryByListingType(lt)?.name ?? null
}

export default function CommissionsPageClient() {
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<ProductCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await listProductCategories()
        if (!cancelled) setRows(r.categories ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Yüklenemedi')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code)),
    [rows],
  )

  return (
    <div className="max-w-5xl space-y-8">
      <header className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
          <Percent className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Komisyon rehberi</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Platformda komisyon oranları <strong className="font-medium text-neutral-800 dark:text-neutral-200">ilan</strong>{' '}
            düzeyinde (<code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">commission_percent</code>)
            tutulur. Aşağıda ürün kategorileri (arama / vitrin) listelenir; oranları değiştirmek için katalogdaki ilanı
            açın.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
            <Layers className="h-4 w-4 text-violet-600" />
            İlan komisyonu
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Katalog → ilan düzenleme: her ilan için komisyon %, ön ödeme ve provizyon alanları.
          </p>
          <Link
            href={vitrinPath('/manage/catalog')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--manage-primary)] hover:underline"
          >
            Kataloga git
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
            <Settings2 className="h-4 w-4 text-emerald-600" />
            Ödeme, kur, taksit
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Site geneli ödeme sağlayıcısı ve para birimi ayarları genel ayarlarda.
          </p>
          <Link
            href={vitrinPath('/manage/admin/settings?tab=operasyon')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--manage-primary)] hover:underline"
          >
            Ödeme ve kur
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-neutral-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Ürün kategorileri</h2>
        </div>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Veritabanındaki <code className="text-xs">product_categories</code> kayıtları. Vitrin rotaları{' '}
          <code className="text-xs">category-registry</code> ile eşleşir.
        </p>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2.5">Kod</th>
                <th className="px-3 py-2.5">Görünen ad (rehber)</th>
                <th className="px-3 py-2.5">i18n anahtarı</th>
                <th className="px-3 py-2.5">Sıra</th>
                <th className="px-3 py-2.5">Aktif</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                    Kategori bulunamadı.
                  </td>
                </tr>
              ) : (
                sorted.map((c) => {
                  const hint = categoryDisplayName(c.code)
                  return (
                    <tr key={c.id} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-2.5 font-mono text-xs">{c.code}</td>
                      <td className="px-3 py-2.5 text-neutral-800 dark:text-neutral-200">{hint ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-neutral-500">{c.name_key}</td>
                      <td className="px-3 py-2.5">{c.sort_order}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            c.is_active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800',
                          )}
                        >
                          {c.is_active ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-neutral-500">
        Acente–tedarikçi ek komisyon kuralları acente / tedarikçi portallarındaki ilgili ekranlardan yönetilir.
      </p>
    </div>
  )
}

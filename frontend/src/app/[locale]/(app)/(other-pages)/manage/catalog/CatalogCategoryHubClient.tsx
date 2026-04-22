'use client'

import { categoryLabelTr, verticalTableLabelTr } from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useManageT } from '@/lib/manage-i18n-context'
import Link from 'next/link'

export default function CatalogCategoryHubClient({ code }: { code: string }) {
  const t = useManageT()
  const vitrinPath = useVitrinHref()
  const prefix = vitrinPath(`/manage/catalog/${encodeURIComponent(code)}`)
  const vertical = verticalTableLabelTr(code)

  const links: {
    href: string
    labelKey?: 'catalog.hub_all_listings' | 'catalog.hub_new_listing' | 'catalog.hub_attributes'
    noteKey?: 'catalog.hub_note_list' | 'catalog.hub_note_new' | 'catalog.hub_note_attr'
    label?: string
    note?: string
  }[] = [
    { href: `${prefix}/listings`, labelKey: 'catalog.hub_all_listings', noteKey: 'catalog.hub_note_list' },
    { href: `${prefix}/listings/new`, labelKey: 'catalog.hub_new_listing', noteKey: 'catalog.hub_note_new' },
    { href: `${prefix}/attributes`, labelKey: 'catalog.hub_attributes', noteKey: 'catalog.hub_note_attr' },
    ...(code === 'hotel'
      ? [
          {
            href: `${prefix}/room-features`,
            label: 'Oda öznitelikleri',
            note: 'Oda tipleri ve meta_json — ilan detayından yönetim',
          },
        ]
      : []),
    {
      href: `${prefix}/seo`,
      label: 'SEO & açılış',
      note: 'Yönlendirme ve site haritası (Yönetici ile bağlantılı)',
    },
    {
      href: vitrinPath('/manage/content/page-builder'),
      label: 'Kategori vitrin & hero mozaik',
      note:
        'Sayfa oluşturucuda bu kategorinin slug’ını seçin (ör. oteller); Hero Banner → üç görsel, bölge sayfasıyla aynı sıra (üst geniş, alt sol, alt sağ).',
    },
    {
      href: vitrinPath('/manage/regions/hero-images'),
      label: 'Filtre / bölge hero görselleri',
      note:
        'Örn. oteller + antalya — /oteller/antalya gibi filtreli liste; kategori route slug + bölge handle ile üç görsel.',
    },
    {
      href: `${prefix}/availability`,
      label: 'Kullanılabilirlik',
      note: 'Müsaitlik ilan bazında; otelde takvim ilan detayında',
    },
    { href: `${prefix}/recovery`, label: 'Kurtarma', note: 'Çöp kutusu — yakında / planlı' },
    {
      href: vitrinPath('/manage/admin/category-contracts'),
      label: 'Sözleşme şablonları',
      note: 'Kategori havuzu (emsal metinler) — tüm kategoriler tek sayfada',
    },
  ]

  const hubHeadLinks = links.slice(0, 3)
  const hubTailLinks = links.slice(3)

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        {t('catalog.category_badge')}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {categoryLabelTr(code)}
      </h1>
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        <span className="font-medium text-neutral-800 dark:text-neutral-200">{t('catalog.detail_table_prefix')} </span>
        {vertical}
      </p>

      <ul className="mt-8 space-y-3">
        {hubHeadLinks.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xs dark:border-neutral-700 dark:bg-neutral-900"
            >
              <span className="font-medium text-primary-700 dark:text-primary-300">
                {l.labelKey ? t(l.labelKey) : l.label}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                {l.noteKey ? t(l.noteKey) : l.note}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <div className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xs dark:border-neutral-700 dark:bg-neutral-900">
            <span className="font-medium text-primary-700 dark:text-primary-300">Dahil / Hariç</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
              Fiyata dahil ve hariç kalemler ile konaklama kural şablonları — ilanda çok dilli seçim
            </span>
            <ul className="mt-3 space-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-700">
              <li>
                <Link
                  href={`${prefix}/price-inclusions`}
                  className="font-medium text-primary-700 hover:underline dark:text-primary-300"
                >
                  Fiyat kalemleri
                </Link>
                <span className="mt-0.5 block text-[11px] text-neutral-500 dark:text-neutral-400">
                  Dahil / hariç satırları
                </span>
              </li>
              <li>
                <Link
                  href={`${prefix}/accommodation-rules`}
                  className="font-medium text-primary-700 hover:underline dark:text-primary-300"
                >
                  Kurallar
                </Link>
                <span className="mt-0.5 block text-[11px] text-neutral-500 dark:text-neutral-400">
                  Giriş/çıkış saati hariç konaklama kuralları
                </span>
              </li>
            </ul>
          </div>
        </li>
        {hubTailLinks.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xs dark:border-neutral-700 dark:bg-neutral-900"
            >
              <span className="font-medium text-primary-700 dark:text-primary-300">
                {l.labelKey ? t(l.labelKey) : l.label}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                {l.noteKey ? t(l.noteKey) : l.note}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
        <Link href={vitrinPath('/manage/catalog')} className="text-primary-600 underline dark:text-primary-400">
          {t('catalog.back_catalog_summary')}
        </Link>
      </p>
    </div>
  )
}

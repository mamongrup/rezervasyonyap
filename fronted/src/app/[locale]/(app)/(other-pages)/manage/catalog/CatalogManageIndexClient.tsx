'use client'

import { ORDERED_PRODUCT_CATEGORY_CODES, categoryLabelTr, verticalTableLabelTr } from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useManageT } from '@/lib/manage-i18n-context'
import Link from 'next/link'

export default function CatalogManageIndexClient() {
  const t = useManageT()
  const vitrinPath = useVitrinHref()
  const prefix = vitrinPath('/manage/catalog')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{t('catalog.index_title')}</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{t('catalog.index_intro')}</p>
      <p className="mt-3 max-w-2xl text-xs text-neutral-500 dark:text-neutral-400">
        Fiyata <strong className="font-medium text-neutral-700 dark:text-neutral-300">dahil / hariç</strong> metinlerini
        kategori kartının altındaki bağlantıdan veya kategori özeti sayfasından (Öznitelikler’in yanı) yönetirsiniz.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {ORDERED_PRODUCT_CATEGORY_CODES.map((code) => (
          <li key={code}>
            <div className="rounded-xl border border-neutral-200 bg-white shadow-xs transition hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-700">
              <Link href={`${prefix}/${code}`} className="block p-4 pb-3">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{categoryLabelTr(code)}</span>
                <span className="mt-2 block text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                  {verticalTableLabelTr(code)}
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-neutral-100 px-4 pb-4 pt-2 text-[11px] dark:border-neutral-600">
                <Link
                  href={`${prefix}/${code}/attributes`}
                  className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                >
                  Öznitelikler
                </Link>
                <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
                  ·
                </span>
                <Link
                  href={`${prefix}/${code}/price-inclusions`}
                  className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                >
                  Dahil / Hariç
                </Link>
                <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
                  ·
                </span>
                <Link
                  href={`${prefix}/${code}/accommodation-rules`}
                  className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                >
                  Kurallar
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

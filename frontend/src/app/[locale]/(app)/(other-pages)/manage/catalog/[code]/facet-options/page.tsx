import { HotelFacetOptionManagers, TourFacetOptionManagers } from '@/components/catalog/HotelFacetSelectPanels'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogFacetOptionsPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { code, locale } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c || !['hotel', 'tour'].includes(c)) {
    return notFound()
  }
  const isTour = c === 'tour'
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {isTour ? 'Tur ulaşım ve konaklama filtreleri' : 'Otel tipi, tema ve konaklama seçenekleri'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {isTour
            ? 'Tur kategori sayfasındaki ulaşım ve konaklama filtrelerinde görünen kodları buradan ekleyebilir veya silebilirsiniz.'
            : 'Vitrin listeleri ve filtrelerde görünen kodları buradan ekleyebilir veya silebilirsiniz.'}
        </p>
      </div>
      {isTour ? <TourFacetOptionManagers locale={locale} /> : <HotelFacetOptionManagers locale={locale} />}
    </div>
  )
}

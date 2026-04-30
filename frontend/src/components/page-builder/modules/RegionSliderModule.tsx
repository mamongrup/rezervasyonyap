import SectionSliderRegions from '@/components/SectionSliderRegions'
import { getPublicRegionStats } from '@/lib/travel-api'
import { withDevNoStore } from '@/lib/api-fetch-dev'
import { vitrinHref } from '@/lib/vitrin-href'
import HeadingWithSub from '@/shared/Heading'

interface Config {
  heading?: string
  subheading?: string
  /** Backend kategori kodu — boş bırakılırsa tüm kategoriler */
  categoryCode?: string
  /** Kategori sayfası link prefix'i, ör. "oteller" → /oteller/istanbul (boş = bölge sayfası) */
  categoryRoute?: string
  /** Bölge başına gösterilen birim etiketi, ör. "otel" */
  unit?: string
  /** Gösterilecek maksimum bölge sayısı (varsayılan 12) */
  limit?: number
}

export default async function RegionSliderModule({
  config,
  locale = 'tr',
}: {
  config: Config
  locale?: string
}) {
  const limit = config.limit ?? 12

  let regions: { name: string; slug: string; count: number; thumbnail: string }[] = []
  try {
    regions = await getPublicRegionStats(
      config.categoryCode ?? '',
      limit,
      withDevNoStore({ next: { revalidate: 300 } }),
    )
  } catch {
    // API yoksa boş — modül render edilmez
  }

  if (regions.length === 0) return null

  // categoryRoute boş veya tanımsızsa bölge sayfasına (/bolge/slug) link ver
  const categoryRoute = config.categoryRoute?.trim()
  let resolvedRoute: string
  if (categoryRoute) {
    resolvedRoute = await vitrinHref(locale, `/${categoryRoute}`)
  } else {
    resolvedRoute = await vitrinHref(locale, '/location')
  }

  return (
    <div>
      {config.heading && (
        <HeadingWithSub subheading={config.subheading}>{config.heading}</HeadingWithSub>
      )}
      <SectionSliderRegions
        regions={regions}
        categoryRoute={resolvedRoute}
        unit={config.unit ?? 'ilan'}
      />
    </div>
  )
}

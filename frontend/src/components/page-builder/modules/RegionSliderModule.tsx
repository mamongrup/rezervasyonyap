import SectionSliderRegions from '@/components/SectionSliderRegions'
import { getPublicRegionStats } from '@/lib/travel-api'
import { withDevNoStore } from '@/lib/api-fetch-dev'
import HeadingWithSub from '@/shared/Heading'

interface Config {
  heading?: string
  subheading?: string
  /** Backend kategori kodu — boş bırakılırsa tüm kategoriler */
  categoryCode?: string
  /** Kategori sayfası link prefix'i, ör. "oteller" → /oteller/istanbul */
  categoryRoute?: string
  /** Bölge başına gösterilen birim etiketi, ör. "otel" */
  unit?: string
  /** Gösterilecek maksimum bölge sayısı (varsayılan 12) */
  limit?: number
}

export default async function RegionSliderModule({ config }: { config: Config }) {
  const limit = config.limit ?? 12
  const categoryRoute = config.categoryRoute ?? 'oteller'

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

  return (
    <div>
      {config.heading && (
        <HeadingWithSub subheading={config.subheading}>{config.heading}</HeadingWithSub>
      )}
      <SectionSliderRegions
        regions={regions}
        categoryRoute={`/${categoryRoute}`}
        unit={config.unit ?? 'ilan'}
      />
    </div>
  )
}

import convertNumbThousand from '@/utils/convertNumbThousand'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

/** Harita + liste bölümü H1 — `CategoryPageTemplate` ile aynı çeviri anahtarları */
export function mapBrowseListingsHeading(
  locale: string | undefined,
  category: { count: number; name: string; handle: string },
): string {
  const m = getMessages(locale ?? 'tr')
  const cat = m.categoryPage
  const countStr = convertNumbThousand(category.count)
  if (category.handle && category.handle !== 'all') {
    return interpolate(cat.listingsHeadingFiltered, { count: countStr, handle: category.name })
  }
  return interpolate(cat.listingsHeadingAll, { count: countStr, category: category.name })
}

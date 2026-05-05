import SectionSliderNewCategories from '@/components/SectionSliderNewCategories'
import { getPageBuilderTravelCategories } from '@/data/categories'
import HeadingWithSub from '@/shared/Heading'

export interface CategorySliderModuleConfig {
  heading?: string
  subheading?: string
  /** 'card3' | 'card4' | 'card5' */
  cardType?: string
  /** Kategori dilimini belirtir: 'first6' | 'last6' | 'all' */
  slice?: 'first6' | 'last6' | 'all'
  /**
   * Gösterilecek kategori sayısı (üst sınır).
   * - İlk / Son: boş veya geçersizse eski davranış **6**.
   * - Tümü: boş veya geçersizse listenin tamamı.
   */
  categoryLimit?: number
  categoryThumbnails?: Record<string, string>
}

function resolveSliderCategories(
  categories: Awaited<ReturnType<typeof getPageBuilderTravelCategories>>,
  slice: string,
  limitRaw: unknown,
) {
  const n = categories.length
  if (n === 0) return []

  const parsed =
    typeof limitRaw === 'number' && Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), n)
      : null

  if (slice === 'last6') {
    if (parsed != null) {
      return categories.slice(Math.max(0, n - parsed))
    }
    /* Eski sabit pencere: 7–12. sıradaki kategoriler (registry 12+ iken anlamı “ikinci yarı”) */
    return categories.slice(6, Math.min(12, n))
  }

  if (slice === 'all') {
    const take = parsed ?? n
    return categories.slice(0, take)
  }

  /* first6 */
  const take = parsed ?? Math.min(6, n)
  return categories.slice(0, take)
}

export default async function CategorySliderModule({ config }: { config: CategorySliderModuleConfig }) {
  const categories = await getPageBuilderTravelCategories(config.categoryThumbnails)

  const slice = config.slice ?? 'first6'
  const displayed = resolveSliderCategories(categories, slice, config.categoryLimit)

  if (displayed.length === 0) return null

  return (
    <div>
      {config.heading && (
        <HeadingWithSub subheading={config.subheading}>{config.heading}</HeadingWithSub>
      )}
      {/* px-3 sm:px-5 xl:px-6: ok butonları (-start/end-3..6) overflow-x-hidden tarafından kesilmemesi için */}
      <div className="px-3 sm:px-5 xl:px-6">
        <SectionSliderNewCategories
          categories={displayed}
          categoryCardType={(config.cardType as 'card3' | 'card4' | 'card5') ?? 'card3'}
        />
      </div>
    </div>
  )
}

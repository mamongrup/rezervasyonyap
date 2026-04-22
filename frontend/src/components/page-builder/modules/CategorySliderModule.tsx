import SectionSliderNewCategories from '@/components/SectionSliderNewCategories'
import { getTravelCategories } from '@/data/categories'
import HeadingWithSub from '@/shared/Heading'

interface Config {
  heading?: string
  subheading?: string
  /** 'card3' | 'card5' */
  cardType?: string
  /** Kategori dilimini belirtir: 'first6' | 'last6' | 'all' */
  slice?: 'first6' | 'last6' | 'all'
}

export default async function CategorySliderModule({ config }: { config: Config }) {
  const categories = await getTravelCategories()

  const slice = config.slice ?? 'first6'
  const displayed =
    slice === 'first6' ? categories.slice(0, 6)
    : slice === 'last6' ? categories.slice(6, 12)
    : categories

  if (displayed.length === 0) return null

  return (
    <div>
      {config.heading && (
        <HeadingWithSub subheading={config.subheading}>{config.heading}</HeadingWithSub>
      )}
      <SectionSliderNewCategories
        categories={displayed}
        categoryCardType={(config.cardType as 'card3' | 'card5') ?? 'card3'}
      />
    </div>
  )
}

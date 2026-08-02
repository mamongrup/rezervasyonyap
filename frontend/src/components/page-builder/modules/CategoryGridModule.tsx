import SectionGridCategoryBox from '@/components/SectionGridCategoryBox'
import { getPageBuilderTravelCategories } from '@/data/categories'
import HeadingWithSub from '@/shared/Heading'

export interface CategoryGridModuleConfig {
  heading?: string
  subheading?: string
  categoryThumbnails?: Record<string, unknown>
}

export default async function CategoryGridModule({ config }: { config: CategoryGridModuleConfig }) {
  const allCategories = await getPageBuilderTravelCategories(config.categoryThumbnails)
  const categories = allCategories.filter((c) => (c.count ?? 0) > 0)

  if (categories.length === 0) return null

  return (
    <div>
      {config.heading && (
        <HeadingWithSub isCenter subheading={config.subheading}>{config.heading}</HeadingWithSub>
      )}
      <SectionGridCategoryBox categories={categories} />
    </div>
  )
}

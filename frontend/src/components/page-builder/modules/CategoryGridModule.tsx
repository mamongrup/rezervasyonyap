import SectionGridCategoryBox from '@/components/SectionGridCategoryBox'
import { getPageBuilderTravelCategories } from '@/data/categories'
import HeadingWithSub from '@/shared/Heading'

export interface CategoryGridModuleConfig {
  heading?: string
  subheading?: string
  categoryThumbnails?: Record<string, unknown>
}

export default async function CategoryGridModule({ config }: { config: CategoryGridModuleConfig }) {
  const categories = await getPageBuilderTravelCategories(config.categoryThumbnails)

  return (
    <div>
      {config.heading && (
        <HeadingWithSub isCenter subheading={config.subheading}>{config.heading}</HeadingWithSub>
      )}
      <SectionGridCategoryBox categories={categories} />
    </div>
  )
}

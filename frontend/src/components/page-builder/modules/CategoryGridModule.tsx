import SectionGridCategoryBox from '@/components/SectionGridCategoryBox'
import { getPageBuilderTravelCategories } from '@/data/categories'
import HeadingWithSub from '@/shared/Heading'

interface Config {
  heading?: string
  subheading?: string
}

export default async function CategoryGridModule({ config }: { config: Config }) {
  const categories = await getPageBuilderTravelCategories()

  return (
    <div>
      {config.heading && (
        <HeadingWithSub isCenter subheading={config.subheading}>{config.heading}</HeadingWithSub>
      )}
      <SectionGridCategoryBox categories={categories} />
    </div>
  )
}

import BgGlassmorphism from '@/components/BgGlassmorphism'
import CmsBlocksRenderer from '@/components/cms/CmsBlocksRenderer'
import { getCmsPageBySlug } from '@/lib/travel-api'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { page } = await getCmsPageBySlug({ slug })
    return { title: page.slug.replace(/-/g, ' ') }
  } catch {
    return { title: slug }
  }
}

export default async function CmsPublicPage({ params }: Props) {
  const { slug } = await params
  let data: Awaited<ReturnType<typeof getCmsPageBySlug>>
  try {
    data = await getCmsPageBySlug({ slug })
  } catch {
    notFound()
  }

  const blocks = data.blocks ?? []
  if (blocks.length === 0) {
    return (
      <div className="relative overflow-hidden">
        <BgGlassmorphism />
        <div className="container py-24 text-center text-neutral-500">
          <p>Bu sayfa için henüz blok eklenmemiş.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <BgGlassmorphism />
      <div className="container flex flex-col gap-y-16 py-16 lg:gap-y-28 lg:py-28">
        <CmsBlocksRenderer blocks={blocks} />
      </div>
    </div>
  )
}

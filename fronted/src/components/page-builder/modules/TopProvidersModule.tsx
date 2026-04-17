import type { TAuthor } from '@/data/authors'
import SectionTopProviders from '@/components/SectionTopProviders'

interface Config {
  heading?: string
  subheading?: string
  ctaText?: string
  ctaHref?: string
  maxCount?: number
}

interface Props {
  config: Config
  authors: TAuthor[]
  /** Mevcut kategori slug'ı — verilirse URL'den değil buradan filtreler */
  categorySlug?: string
}

export default function TopProvidersModule({ config, authors, categorySlug }: Props) {
  return (
    <SectionTopProviders
      authors={authors}
      heading={config.heading}
      subheading={config.subheading}
      ctaText={config.ctaText ?? 'Siz de ilan verin'}
      ctaHref={config.ctaHref ?? '/manage'}
      maxCount={config.maxCount ?? 10}
      filterBySlug={categorySlug}
    />
  )
}

import SectionClientSay, { type ClientSaySlideItem } from '@/components/SectionClientSay'
import { getPublicReviewsByCategory, type PublicReview } from '@/lib/travel-api'

interface TestimonialsConfig {
  title?: string
  subheading?: string
  categorySlug?: string
  /** Statik items — API verisi yokken fallback */
  items?: StaticTestimonialItem[]
}

type StaticTestimonialItem = {
  name: string
  rating: number
  text: string
  location?: string
  avatar?: string
}

const DEFAULT_ITEMS: StaticTestimonialItem[] = [
  {
    name: 'Ayşe K.',
    rating: 5,
    text: 'Harika bir deneyimdi! Her şey mükemmeldi, kesinlikle tekrar kullanacağım.',
    location: 'İstanbul',
  },
  {
    name: 'Mehmet T.',
    rating: 5,
    text: 'Fiyat kalite dengesi çok iyi. Müşteri hizmetleri de çok hızlı yanıt verdi.',
    location: 'Ankara',
  },
  {
    name: 'Fatma S.',
    rating: 4,
    text: 'Rezervasyon çok kolaydı ve her şey belirtildiği gibiydi. Teşekkürler!',
    location: 'İzmir',
  },
]

export default async function TestimonialsModule({ config }: { config: TestimonialsConfig }) {
  const title = config.title ?? 'Misafirlerimiz Ne Diyor? 🥇'
  const subheading = config.subheading ?? 'Bizimle seyahat eden gezginlerin gerçek yorumları.'

  let liveReviews: PublicReview[] = []
  if (config.categorySlug) {
    liveReviews = await getPublicReviewsByCategory(
      config.categorySlug,
      8,
      { next: { revalidate: 300 } } as RequestInit,
    )
  }

  const hasLive = liveReviews.length > 0
  const items: ClientSaySlideItem[] = hasLive
    ? liveReviews.map((r) => ({
        id: r.id,
        clientName: r.reviewer_name,
        content: (r.body || r.title || '').trim() || '—',
        rating: r.rating,
      }))
    : (config.items ?? DEFAULT_ITEMS).map((t, i) => {
        const slide: ClientSaySlideItem = {
          id: `static-${i}`,
          clientName: t.name,
          content: t.text,
          rating: t.rating,
        }
        if (t.avatar?.trim()) slide.avatar = t.avatar.trim()
        return slide
      })

  return (
    <section className="mb-16 md:mb-24">
      <SectionClientSay heading={title} subHeading={subheading} items={items} />
    </section>
  )
}

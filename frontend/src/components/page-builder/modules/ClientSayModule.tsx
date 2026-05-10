import SectionClientSay, { type ClientSaySlideItem } from '@/components/SectionClientSay'

export type ClientSayStaticItem = {
  name: string
  rating: number
  text: string
  avatar?: string
}

/** `TestimonialsModule` ile aynı vitrin varsayılanı — CMS `items` boşsa kullanılır */
const DEFAULT_ITEMS: ClientSayStaticItem[] = [
  {
    name: 'Ayşe K.',
    rating: 5,
    text: 'Harika bir deneyimdi! Her şey mükemmeldi, kesinlikle tekrar kullanacağım.',
  },
  {
    name: 'Mehmet T.',
    rating: 5,
    text: 'Fiyat kalite dengesi çok iyi. Müşteri hizmetleri de çok hızlı yanıt verdi.',
  },
  {
    name: 'Fatma S.',
    rating: 4,
    text: 'Rezervasyon çok kolaydı ve her şey belirtildiği gibiydi. Teşekkürler!',
  },
]

export interface ClientSayModuleConfig {
  heading?: string
  subHeading?: string
  items?: ClientSayStaticItem[]
}

function toSlides(raw: ClientSayStaticItem[]): ClientSaySlideItem[] {
  return raw.map((t, i) => {
    const slide: ClientSaySlideItem = {
      id: `client-say-${i}`,
      clientName: t.name,
      content: t.text,
      rating: t.rating,
    }
    if (t.avatar?.trim()) slide.avatar = t.avatar.trim()
    return slide
  })
}

export default function ClientSayModule({ config }: { config: ClientSayModuleConfig }) {
  const raw = Array.isArray(config.items) && config.items.length > 0 ? config.items : DEFAULT_ITEMS
  const items = toSlides(raw)
  if (!items.length) return null

  return (
    <section className="mb-16 md:mb-24">
      <SectionClientSay
        heading={config.heading ?? 'Misafirlerimiz Ne Diyor? 🥇'}
        subHeading={config.subHeading ?? 'Bizimle seyahat eden gezginlerin gerçek yorumları.'}
        items={items}
      />
    </section>
  )
}

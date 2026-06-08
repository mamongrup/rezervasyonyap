import SectionClientSay, { type ClientSaySlideItem } from '@/components/SectionClientSay'

export type ClientSayStaticItem = {
  name: string
  rating: number
  text: string
  initials?: string
}

/** `TestimonialsModule` ile aynı vitrin varsayılanı — CMS `items` boşsa kullanılır */
const DEFAULT_ITEMS: ClientSayStaticItem[] = [
  {
    name: 'Ayşe K.',
    initials: 'AK',
    rating: 5,
    text: 'Harika bir deneyimdi! Her şey mükemmeldi, kesinlikle tekrar kullanacağım.',
  },
  {
    name: 'Mehmet T.',
    initials: 'MT',
    rating: 5,
    text: 'Fiyat kalite dengesi çok iyi. Müşteri hizmetleri de çok hızlı yanıt verdi.',
  },
  {
    name: 'Fatma S.',
    initials: 'FS',
    rating: 4,
    text: 'Rezervasyon çok kolaydı ve her şey belirtildiği gibiydi. Teşekkürler!',
  },
  {
    name: 'Zeynep A.',
    initials: 'ZA',
    rating: 5,
    text: 'Antalya tatilimiz sorunsuz geçti, otel tam tarif edildiği gibiydi.',
  },
  {
    name: 'Can D.',
    initials: 'CD',
    rating: 5,
    text: 'Yat kiralama süreci çok şeffaftı, kaptan ve ekip harikaydı.',
  },
  {
    name: 'Elif Y.',
    initials: 'EY',
    rating: 5,
    text: 'Tur rehberimiz çok bilgiliydi, ailece keyifli bir gün geçirdik.',
  },
  {
    name: 'Burak M.',
    initials: 'BM',
    rating: 4,
    text: 'Aktivite rezervasyonu anında onaylandı, girişte sıra beklemek zorunda kalmadık.',
  },
  {
    name: 'Selin R.',
    initials: 'SR',
    rating: 5,
    text: 'Villa temiz ve konforluydu, tatil evi fotoğrafları gerçekle birebir uyuşuyordu.',
  },
  {
    name: 'James W.',
    initials: 'JW',
    rating: 5,
    text: 'Booking was seamless and the hotel exceeded our expectations. Highly recommend!',
  },
  {
    name: 'Emma L.',
    initials: 'EL',
    rating: 4,
    text: 'Great value for money. The support team responded within minutes.',
  },
  {
    name: 'Алексей В.',
    initials: 'АВ',
    rating: 5,
    text: 'Отличный сервис! Бронирование заняло пару минут, всё прошло без проблем.',
  },
  {
    name: 'Мария К.',
    initials: 'МК',
    rating: 5,
    text: 'Очень удобный сайт, тур организовали на высшем уровне.',
  },
  {
    name: '李明',
    initials: '李明',
    rating: 5,
    text: '预订流程非常顺畅，酒店和描述完全一致，我们会再次使用。',
  },
  {
    name: '王芳',
    initials: '王芳',
    rating: 4,
    text: '客服响应很快，游艇租赁体验棒极了，强烈推荐！',
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
    if (t.initials?.trim()) slide.initials = t.initials.trim()
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

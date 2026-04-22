import {
  ShieldCheck, BadgePercent, Headphones,
  Zap, RefreshCw, Globe, type LucideIcon,
} from 'lucide-react'

type IconKey = 'shield-check' | 'badge-percent' | 'headphones' | 'zap' | 'refresh-cw' | 'globe'

const ICON_MAP: Record<IconKey, LucideIcon> = {
  'shield-check':  ShieldCheck,
  'badge-percent': BadgePercent,
  'headphones':    Headphones,
  'zap':           Zap,
  'refresh-cw':    RefreshCw,
  'globe':         Globe,
}

const ICON_COLORS: Record<IconKey, string> = {
  'shield-check':  'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  'badge-percent': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  'headphones':    'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  'zap':           'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400',
  'refresh-cw':    'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  'globe':         'bg-sky-50 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400',
}

interface WhyUsItem {
  /** CMS'ten gelen emoji (geriye dönük uyumluluk) */
  emoji?: string
  /** Lucide icon anahtarı */
  icon?: string
  title: string
  description: string
}

interface WhyUsConfig {
  title?: string
  subtitle?: string
  items?: WhyUsItem[]
}

const DEFAULT_ITEMS: WhyUsItem[] = [
  { icon: 'shield-check',  title: 'Güvenli Rezervasyon',     description: 'SSL şifreleme ve 3D Secure ödeme altyapısıyla güvenle rezervasyon yapın.' },
  { icon: 'badge-percent', title: 'En İyi Fiyat Garantisi',  description: 'Daha ucuz bulsanız fark iade ediyoruz. Fiyat garantisi ile içiniz rahat olsun.' },
  { icon: 'headphones',    title: 'Uzman Destek',            description: 'Alanında uzman seyahat danışmanlarımız 7/24 hizmetinizde.' },
  { icon: 'zap',           title: 'Anında Onay',             description: 'Çoğu rezervasyon anında onaylanır, anında e-posta ile bilgi alırsınız.' },
  { icon: 'refresh-cw',   title: 'Esnek İptal',             description: 'Birçok ürünümüzde ücretsiz iptal ve değişiklik imkânı.' },
  { icon: 'globe',         title: 'Geniş Seçenek',           description: 'Türkiye geneli ve dünyaya açılan kapsamlı ürün portföyümüz.' },
]

function ItemIcon({ item }: { item: WhyUsItem }) {
  const iconKey = item.icon as IconKey | undefined
  const Icon = iconKey ? ICON_MAP[iconKey] : undefined
  const colorClass = iconKey ? ICON_COLORS[iconKey] : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'

  if (Icon) {
    return (
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    )
  }

  if (item.emoji) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
        <span className="text-xl leading-none">{item.emoji}</span>
      </div>
    )
  }

  return null
}

export default function WhyUsModule({ config }: { config: WhyUsConfig }) {
  const items = config.items ?? DEFAULT_ITEMS
  return (
    <section>
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">
          {config.title ?? 'Neden Bizi Tercih Edin?'}
        </h2>
        {config.subtitle && (
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">{config.subtitle}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex gap-4 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
          >
            <ItemIcon item={item} />
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

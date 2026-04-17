import Heading from '@/shared/Heading'
import { FC } from 'react'

const facts = [
  {
    id: '1',
    heading: '50.000+',
    subHeading: 'Aktif gezgin her ay platformumuz üzerinden rezervasyon yapıyor',
  },
  {
    id: '2',
    heading: '12.000+',
    subHeading: 'Aktif ilan sahibi otel, tur, araç kiralama ve tatil evi kategorilerinde hizmet veriyor',
  },
  {
    id: '3',
    heading: '81 İl',
    subHeading: "Türkiye'nin tüm illerinden ilan ve bölgesel içerik desteği sunuyoruz",
  },
]

interface SectionStatisticProps {
  className?: string
}

const SectionStatistic: FC<SectionStatisticProps> = ({ className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <Heading
        subheading="Güvenilir, hızlı ve şeffaf — seyahat sektöründe güçlü bir platform olma yolunda"
      >
        🚀 Rakamlarla Biz
      </Heading>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
        {facts.map((item) => (
          <div key={item.id} className="rounded-2xl bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-800">
            <h3 className="text-2xl leading-none font-semibold text-neutral-900 md:text-3xl dark:text-neutral-200">
              {item.heading}
            </h3>
            <span className="mt-3 block text-sm text-neutral-500 sm:text-base dark:text-neutral-400">
              {item.subHeading}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SectionStatistic

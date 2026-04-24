import rightImgAvif from '@/images/our-features.avif'
import { en } from '../../public/locales/en'
import { Badge } from '@/shared/Badge'
import { Heading } from '@/shared/Heading'
import clsx from 'clsx'
import Image, { StaticImageData } from 'next/image'
import { FC } from 'react'

const of = en.homePage.ourFeatures

const defaultListItems: {
  badge: string
  badgeColor?: 'red' | 'green' | 'blue'
  title: string
  description: string
}[] = [
  {
    badge: of.item1Badge,
    title: of.item1Title,
    description: of.item1Desc,
  },
  {
    badge: of.item2Badge,
    badgeColor: 'green',
    title: of.item2Title,
    description: of.item2Desc,
  },
  {
    badge: of.item3Badge,
    badgeColor: 'red',
    title: of.item3Title,
    description: of.item3Desc,
  },
]

interface Props {
  className?: string
  rightImg?: StaticImageData | string
  type?: 'type1' | 'type2'
  /** İlan detayı gezi fikirleri: görsel sütunu tema genişliğinde (max ~560px), ekstra dikey boşluk yok */
  layout?: 'default' | 'listingTravelIdeas'
  subHeading?: string
  heading?: string
  listItems?: {
    badge: string
    badgeColor?: 'red' | 'green' | 'blue'
    title: string
    description: string
  }[]
}

const SectionOurFeatures: FC<Props> = ({
  className,
  rightImg = rightImgAvif,
  type = 'type1',
  layout = 'default',
  subHeading = of.subHeading,
  heading = of.heading,
  listItems = defaultListItems,
}) => {
  const isListingTravelIdeas = layout === 'listingTravelIdeas'
  const imgIsRemote = typeof rightImg === 'string'

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center',
        className,
        type === 'type1' ? 'lg:flex-row' : 'lg:flex-row-reverse',
        isListingTravelIdeas && 'lg:items-start',
      )}
    >
      <div
        className={clsx(
          'grow',
          isListingTravelIdeas && 'w-full max-w-[min(100%,560px)] shrink-0 lg:flex-1',
        )}
      >
        <div className="overflow-hidden asymmetric-image-corners">
          {imgIsRemote ? (
            // eslint-disable-next-line @next/next/no-img-element -- harici URL: remotePatterns whitelist'inde olmayan host'lar olabilir
            <img
              src={rightImg}
              alt=""
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Image
              src={rightImg}
              alt=""
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={!isListingTravelIdeas}
              className="h-auto w-full object-cover"
            />
          )}
        </div>
      </div>
      <div
        className={clsx(
          'mt-10 max-w-2xl shrink-0 lg:mt-0 lg:w-2/5',
          type === 'type1' ? 'lg:ps-16' : 'lg:pe-16',
          isListingTravelIdeas && 'lg:min-w-0 lg:max-w-md lg:flex-1',
        )}
      >
        <span
          className={clsx(
            'text-sm text-gray-400 dark:text-neutral-500',
            isListingTravelIdeas ? 'tracking-wide' : 'tracking-widest uppercase',
          )}
        >
          {subHeading}
        </span>
        <Heading className="mt-4">{heading}</Heading>

        <ul className="mt-16 flex flex-col items-start gap-y-10">
          {listItems.map((item, index) => (
            <li className="flex flex-col items-start gap-y-4" key={index}>
              <Badge color={item.badgeColor}>{item.badge}</Badge>
              <span className="block text-xl font-semibold">{item.title}</span>
              <span className="block text-neutral-500 dark:text-neutral-400">{item.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default SectionOurFeatures

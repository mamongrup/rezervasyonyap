import ButtonSecondary from '@/shared/ButtonSecondary'
import { Link } from '@/shared/link'
import Image from 'next/image'
import { FC } from 'react'

export type CardCategory7Data = {
  name: string
  description?: string
  count?: number
  href: string
  thumbnail: string
  /** Varsayılan: "Collection" */
  badgeLabel?: string
  /** Varsayılan: "Show more" */
  ctaLabel?: string
}

interface Props {
  className?: string
  category: CardCategory7Data
}

const FALLBACK_THUMB =
  'https://images.pexels.com/photos/7740160/pexels-photo-7740160.jpeg?auto=compress&cs=tinysrgb&w=800'

const CardCategory7: FC<Props> = ({ className = '', category: { name, description, count, href, thumbnail, badgeLabel, ctaLabel } }) => {
  const badge = badgeLabel?.trim() || 'Collection'
  const cta = ctaLabel?.trim() || 'Show more'
  const src = thumbnail?.trim() ? thumbnail : FALLBACK_THUMB

  return (
    <div className={className}>
      <div
        className={
          'group/CardCategory7 aspect-w-16 relative h-0 w-full overflow-hidden rounded-2xl aspect-h-10 2xl:aspect-h-9'
        }
      >
        <div>
          <Image
            src={src}
            fill
            alt={name}
            className="object-cover brightness-100 transition-[filter] group-hover/CardCategory7:brightness-75"
            sizes="300px"
          />
        </div>

        <div>
          <div className="absolute inset-5 flex flex-col items-start gap-y-2.5">
            <div className="max-w-sm">
              <p className={`mb-2 block text-sm text-slate-700`}>{badge}</p>
              <h2 className={`text-xl font-semibold text-slate-900 md:text-2xl`}>
                <Link href={href} className="absolute inset-0"></Link>
                {name}
              </h2>
              {description ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
              ) : null}
              {typeof count === 'number' && count > 0 ? (
                <p className="mt-1 text-xs text-slate-500">{count.toLocaleString()}+</p>
              ) : null}
            </div>
            <ButtonSecondary className="mt-auto" href={href}>
              {cta}
            </ButtonSecondary>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CardCategory7

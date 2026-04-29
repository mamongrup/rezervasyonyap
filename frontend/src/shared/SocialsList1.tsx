import { SocialType } from '@/shared/SocialsShare'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { FC } from 'react'

interface Props {
  className?: string
  socials?: SocialType[]
}

const SocialsList1: FC<Props> = ({ className = 'gap-y-2.5', socials = [] }) => {
  const renderItem = (item: SocialType, index: number) => {
    return (
      <Link
        href={item.href}
        className="group flex items-center gap-x-2 text-2xl leading-none text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
        key={index}
        target="_blank"
        rel="noopener noreferrer"
        title={`Share on ${item.name}`}
        aria-label={`Share on ${item.name}`}
      >
        <HugeiconsIcon icon={item.icon} size={24} color="currentColor" strokeWidth={1.5} />
        <span className="hidden text-sm lg:block">{item.name}</span>
      </Link>
    )
  }

  if (socials.length === 0) return null
  return <div className={className}>{socials.map(renderItem)}</div>
}

export default SocialsList1

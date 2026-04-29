import { Facebook01Icon, Mail01Icon, NewTwitterIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import {
  buildFacebookShareUrl,
  buildMailtoShareUrl,
  buildTwitterShareUrl,
} from '@/lib/social-share/build-share-links'
import { FC, useMemo } from 'react'

interface SocialsShareProps {
  className?: string
  itemClass?: string
  /** Özel liste; verilmez ve `url` doluysa Facebook / X / e-posta otomatik */
  socials?: SocialType[]
  /** Mevcut sayfa tam URL’si (örn. window.location.href) */
  url?: string
  /** Tweet / e-posta konusu için kısa başlık */
  title?: string
}

export interface SocialType {
  name: string
  icon: IconSvgElement
  href: string
}

function builtInSocials(pageUrl: string, title?: string): SocialType[] {
  return [
    { name: 'Facebook', href: buildFacebookShareUrl(pageUrl), icon: Facebook01Icon },
    { name: 'Email', href: buildMailtoShareUrl(pageUrl, title), icon: Mail01Icon },
    { name: 'Twitter', href: buildTwitterShareUrl(pageUrl, title), icon: NewTwitterIcon },
  ]
}

const SocialsShare: FC<SocialsShareProps> = ({
  className = 'flex flex-col',
  itemClass = '',
  socials,
  url,
  title,
}) => {
  const items = useMemo(() => {
    if (socials?.length) return socials
    if (url) return builtInSocials(url, title)
    return []
  }, [socials, url, title])

  if (items.length === 0) return null

  const renderItem = (item: SocialType, index: number) => {
    const isMail = item.href.startsWith('mailto:')
    return (
      <a
        key={index}
        href={item.href}
        className={`-mx-2 flex items-center gap-x-2.5 rounded-lg bg-white p-2.5 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 ${itemClass}`}
        title={`Share on ${item.name}`}
        target={isMail ? undefined : '_blank'}
        rel={isMail ? undefined : 'noopener noreferrer'}
      >
        <HugeiconsIcon icon={item.icon} size={24} color="currentColor" strokeWidth={1.5} />
        <p className="text-sm">{item.name}</p>
      </a>
    )
  }

  return <div className={className}>{items.map(renderItem)}</div>
}

export default SocialsShare

'use client'

import { MapPin } from 'lucide-react'
import { useState } from 'react'
import {
  NEARBY_POI_FALLBACK_SRC,
  resolveNearbyPoiImageSrc,
} from '@/lib/nearby-poi-image'

type Props = {
  src?: string
  alt: string
  className?: string
}

const ICON_BOX =
  'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800'

const IMG_CLASS = 'h-16 w-16 shrink-0 rounded-xl object-cover'

export default function NearbyPoiCardImage({ src, alt, className }: Props) {
  const [imgSrc, setImgSrc] = useState(
    () => resolveNearbyPoiImageSrc(src) ?? NEARBY_POI_FALLBACK_SRC,
  )
  const [useIconFallback, setUseIconFallback] = useState(false)

  const boxClass = className ? `${ICON_BOX} ${className}` : ICON_BOX
  const imgClass = className ? `${IMG_CLASS} ${className}` : IMG_CLASS

  if (useIconFallback) {
    return (
      <div className={boxClass}>
        <MapPin className="h-6 w-6 text-neutral-400" />
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={imgClass}
      loading="lazy"
      onError={() => {
        if (imgSrc !== NEARBY_POI_FALLBACK_SRC) {
          setImgSrc(NEARBY_POI_FALLBACK_SRC)
          return
        }
        setUseIconFallback(true)
      }}
    />
  )
}

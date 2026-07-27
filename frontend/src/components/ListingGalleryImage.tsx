'use client'

/**
 * İlan galeri/hero görseli — 404/403'te kardeş uzantı dener (avif↔webp↔jpg).
 */
import { nextListingImageUrlFallback } from '@/lib/listing-image-url-fallbacks'
import Image, { type ImageProps } from 'next/image'
import { useEffect, useState } from 'react'

type Props = Omit<ImageProps, 'src' | 'onError'> & {
  src: string
}

export default function ListingGalleryImage({ src, alt, ...rest }: Props) {
  const initial = src.trim()
  const [current, setCurrent] = useState(initial)
  const [tried, setTried] = useState<string[]>(() => (initial ? [initial] : []))
  const [failed, setFailed] = useState(!initial)

  useEffect(() => {
    const next = src.trim()
    setCurrent(next)
    setTried(next ? [next] : [])
    setFailed(!next)
  }, [src])

  if (failed || !current) {
    return <div className="absolute inset-0 rounded-xl bg-neutral-200 dark:bg-neutral-700" aria-hidden />
  }

  const unoptimized =
    rest.unoptimized ??
    (current.startsWith('data:') ||
      current.startsWith('/uploads/') ||
      current.startsWith('/api/listing-ext-image') ||
      /^https?:\/\//i.test(current))

  return (
    <Image
      {...rest}
      alt={alt}
      src={current}
      unoptimized={unoptimized}
      onError={() => {
        const next = nextListingImageUrlFallback(current, new Set(tried))
        if (next) {
          setTried((prev) => [...prev, next])
          setCurrent(next)
          return
        }
        setFailed(true)
      }}
    />
  )
}

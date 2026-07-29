import Image from 'next/image'

function slotUnopt(u: string) {
  return u.startsWith('http') || u.startsWith('/uploads/')
}

/**
 * Hero mozaik / freeform ikincil katmanlar.
 *
 * Görseli JS ile `window.load` sonrasında DOM'a eklemek geç ve büyük bir boyama
 * oluşturup ikincil katmanı LCP adayı yapıyordu. Kaynağı ilk HTML'de tutuyoruz;
 * tarayıcı görünür katmanı kendi lazy-load eşiğiyle, düşük öncelikte getirir.
 */
export default function DeferredHeroLayerImage({
  src,
  alt,
  sizes,
  objectPosition,
  className,
}: {
  src: string
  alt: string
  sizes: string
  objectPosition?: string
  className?: string
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className ?? 'object-cover'}
      style={objectPosition ? { objectPosition } : undefined}
      loading="lazy"
      fetchPriority="low"
      decoding="async"
      unoptimized={slotUnopt(src)}
    />
  )
}

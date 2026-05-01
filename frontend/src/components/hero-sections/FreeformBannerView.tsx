import type { FreeformBannerDocV2 } from '@/lib/freeform-banner-spec'
import clsx from 'clsx'
import Image from 'next/image'

function slotUnopt(u: string) {
  return u.startsWith('http') || u.startsWith('/uploads/')
}

/** Tüm katmanların birleşim kutusu — boş tuval alanını kırparak görselleri büyütür */
function unionLayerBounds(layers: FreeformBannerDocV2['layers']): {
  minX: number
  minY: number
  bw: number
  bh: number
} | null {
  if (layers.length === 0) return null
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const l of layers) {
    minX = Math.min(minX, l.x)
    minY = Math.min(minY, l.y)
    maxX = Math.max(maxX, l.x + l.w)
    maxY = Math.max(maxY, l.y + l.h)
  }
  const pad = 0.015
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(1, maxX + pad)
  maxY = Math.min(1, maxY + pad)
  const bw = maxX - minX
  const bh = maxY - minY
  if (bw < 0.04 || bh < 0.04) return null
  return { minX, minY, bw, bh }
}

/**
 * `FreeformBannerDocV2` (version 2) — editördeki yüzde yerleşimi.
 * `imageUrls[i]` sırası `doc.layers[i]` ile eşleşir; `guides` yalnızca editör içindir, burada çizilmez.
 */
export default function FreeformBannerView({
  doc,
  imageUrls,
  alt,
  className,
  /** true: katmanların birleşim kutusuna göre kırp + ölçek (sağ yarı vb. boşluklar küçültülmez) */
  fitContentBounds = true,
}: {
  doc: FreeformBannerDocV2
  /** Katman sırasıyla URL; eksikse `layer.src` kullanılır */
  imageUrls: string[]
  alt: string
  className?: string
  fitContentBounds?: boolean
}) {
  const bounds = fitContentBounds ? unionLayerBounds(doc.layers) : null
  /** Tuval 16:9 iken x,y 0–1 kare normalize; fiziksel en/boy oranı (width/height) = bw*16/(bh*9) */
  const ar =
    bounds != null
      ? `${(bounds.bw * 16) / (bounds.bh * 9)} / 1`
      : doc.outerAspect.replace('/', ' / ')
  const layers = doc.layers

  const firstPriorityIdx = layers.findIndex((layer, i) => {
    const si = layer.slotIndex
    const urlIdx =
      typeof si === 'number' && Number.isFinite(si) ? Math.min(2, Math.max(0, Math.round(si))) : i
    const u = (imageUrls[urlIdx] ?? layer.src ?? '').trim()
    return u !== ''
  })
  const firstPriorityLayer =
    firstPriorityIdx >= 0 ? layers[firstPriorityIdx] : null
  const firstPriorityUrl = firstPriorityLayer
    ? (() => {
        const si = firstPriorityLayer.slotIndex
        const urlIdx =
          typeof si === 'number' && Number.isFinite(si)
            ? Math.min(2, Math.max(0, Math.round(si)))
            : firstPriorityIdx
        return (imageUrls[urlIdx] ?? firstPriorityLayer.src ?? '').trim()
      })()
    : ''

  return (
    <div
      className={clsx(
        'relative mb-5 w-full min-h-0 overflow-hidden rounded-xl',
        className,
      )}
      style={{ aspectRatio: ar }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl md:hidden">
        {firstPriorityUrl ? (
          <Image
            src={firstPriorityUrl}
            alt={`${alt} — 1`}
            fill
            sizes="100vw"
            className="object-cover"
            style={{
              objectPosition: firstPriorityLayer
                ? `${firstPriorityLayer.focusX}% ${firstPriorityLayer.focusY}%`
                : '50% 50%',
            }}
            fetchPriority="high"
            priority
            loading="eager"
            decoding="async"
            unoptimized={slotUnopt(firstPriorityUrl)}
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />
        )}
      </div>
      <div className="relative hidden h-full w-full overflow-hidden rounded-xl md:block">
        {layers.map((layer, i) => {
          const si = layer.slotIndex
          const urlIdx =
            typeof si === 'number' && Number.isFinite(si) ? Math.min(2, Math.max(0, Math.round(si))) : i
          const rawSrc = (imageUrls[urlIdx] ?? layer.src ?? '').trim()
          const src = rawSrc
          const has = src !== ''
          const bx = bounds
            ? ((layer.x - bounds.minX) / bounds.bw) * 100
            : layer.x * 100
          const by = bounds
            ? ((layer.y - bounds.minY) / bounds.bh) * 100
            : layer.y * 100
          const bwPct = bounds ? (layer.w / bounds.bw) * 100 : layer.w * 100
          const bhPct = bounds ? (layer.h / bounds.bh) * 100 : layer.h * 100
          const slotSizes = `(max-width: 768px) ${Math.ceil(bwPct)}vw, ${Math.ceil(
            bwPct * 0.58,
          )}vw`
          /** slotIndex küçük = üstte (0 sağ uzun); üst üste binmede yanlış kesilmesin */
          const zSlot =
            typeof si === 'number' && Number.isFinite(si) ? Math.min(2, Math.max(0, Math.round(si))) : i
          const zIndex = 30 - zSlot * 8
          return (
            <div
              key={layer.id}
              className="absolute overflow-hidden"
              style={{
                left: `${bx}%`,
                top: `${by}%`,
                width: `${bwPct}%`,
                height: `${bhPct}%`,
                zIndex,
              }}
            >
              {has ? (
                firstPriorityIdx === i ? (
                  <Image
                    src={src}
                    alt={`${alt} — ${i + 1}`}
                    fill
                    sizes={slotSizes}
                    className="object-cover"
                    style={{
                      objectPosition: `${layer.focusX}% ${layer.focusY}%`,
                    }}
                    fetchPriority="high"
                    priority
                    loading="eager"
                    decoding="async"
                    unoptimized={slotUnopt(src)}
                  />
                ) : (
                  <Image
                    src={src}
                    alt={`${alt} — ${i + 1}`}
                    fill
                    sizes={slotSizes}
                    className="object-cover"
                    style={{
                      objectPosition: `${layer.focusX}% ${layer.focusY}%`,
                    }}
                    unoptimized={slotUnopt(src)}
                  />
                )
              ) : (
                <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

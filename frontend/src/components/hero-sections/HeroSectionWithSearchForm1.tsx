import type { FreeformBannerDocV2 } from '@/lib/freeform-banner-spec'
import { sanitizeHeroInlineHtml } from '@/lib/sanitize-cms-html'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import FreeformBannerView from './FreeformBannerView'

type HeroImageDims = { src: string; width: number; height: number }

/**
 * 3 görsel:
 * - `bleed !== 'region'`: md+ üstte geniş [0], altta [1]|[2]; mobilde solda [0], sağda [1][2].
 * - `bleed === 'region'` (bölge / anasayfa / kategori hero): md+ **sol sütun** [0] üst + [1] alt,
 *   **sağ sütun** [2]; mobilde solda [0], sağda [1][2].
 */
function MosaicSlot({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string
  alt: string
  sizes: string
  priority?: boolean
}) {
  const t = src.trim()
  if (!t) {
    return <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />
  }
  const isExternal = /^https?:\/\//i.test(t)
  if (priority) {
    return (
      <Image
        src={t}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        fetchPriority="high"
        priority
        loading="eager"
        decoding="async"
        unoptimized={isExternal}
      />
    )
  }
  return (
    <Image
      src={t}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      loading="lazy"
      unoptimized={isExternal}
    />
  )
}

/** `flush`: anasayfa minimal hero — görseller arası boşluk yok (bitişik kolaj). */
function HeroImageMosaic({
  images,
  alt,
  flush = false,
  bleed = 'default',
}: {
  /** [0][1][2] anlamı `bleed`’e göre değişir — açıklama üstte */
  images: [string, string, string]
  alt: string
  flush?: boolean
  /**
   * `region`: bölge / anasayfa / kategori — md+ mozaik sol iki kutu + sağ uzun; sola hafif taşma + altta boşluk.
   */
  bleed?: 'default' | 'region'
}) {
  const firstPriorityIdx = [0, 1, 2].find((i) => images[i].trim() !== '')
  const sizesTop = '(max-width: 767px) 45vw, 90vw'
  const sizesPair = '(max-width: 767px) 45vw, 45vw'
  const sizesRegionSide = '(max-width: 1023px) 42vw, 28vw'
  const sizesRegionTall = '(max-width: 1023px) 42vw, 30vw'
  const slot = 'relative w-full min-w-0 overflow-hidden rounded-xl'
  const gap = flush ? 'gap-0' : 'gap-2.5'
  const region = bleed === 'region'

  /** Bölge tipi mozaik: md+ grid — sol [0]/[1], sağ [2] row-span-2 */
  if (region) {
    const regionBleedWrap =
      'relative lg:-ml-2 lg:w-[calc(100%+0.5rem)] lg:max-w-none lg:min-w-0 lg:pb-[50px] lg:overflow-visible'
    return (
      <div className={clsx('w-full min-h-0', flush ? 'mb-0' : 'mb-5', regionBleedWrap)}>
        {/* Mobil: solda [0], sağda [1] + [2] üst üste */}
        <div className={clsx('flex min-h-0 w-full flex-row md:hidden', gap)}>
          <div className={clsx(slot, 'aspect-[4/3] min-h-0 flex-1 shrink-0')}>
            <MosaicSlot
              src={images[0]}
              alt={`${alt} — 1`}
              sizes={sizesTop}
              priority={firstPriorityIdx === 0}
            />
          </div>
          <div className={clsx('flex min-h-0 min-w-0 flex-1 flex-col', gap)}>
            <div className={clsx(slot, 'aspect-[4/3] min-h-0 w-full min-w-0')}>
              <MosaicSlot
                src={images[1]}
                alt={`${alt} — 2`}
                sizes={sizesPair}
                priority={firstPriorityIdx === 1}
              />
            </div>
            <div className={clsx(slot, 'aspect-[4/3] min-h-0 w-full min-w-0')}>
              <MosaicSlot
                src={images[2]}
                alt={`${alt} — 3`}
                sizes={sizesPair}
                priority={firstPriorityIdx === 2}
              />
            </div>
          </div>
        </div>

        {/* md+: sol üst/alt iki kare, sağ sütun (bölge sayfası referansı) */}
        <div
          className={clsx(
            'hidden min-h-0 w-full md:grid md:grid-cols-2 md:grid-rows-2 md:items-stretch',
            gap,
          )}
        >
          <div className={clsx(slot, 'col-start-1 row-start-1 aspect-[4/3] min-h-0')}>
            <MosaicSlot
              src={images[0]}
              alt={`${alt} — 1`}
              sizes={sizesRegionSide}
              priority={firstPriorityIdx === 0}
            />
          </div>
          <div className={clsx(slot, 'col-start-1 row-start-2 aspect-[4/3] min-h-0')}>
            <MosaicSlot
              src={images[1]}
              alt={`${alt} — 2`}
              sizes={sizesRegionSide}
              priority={firstPriorityIdx === 1}
            />
          </div>
          <div
            className={clsx(
              slot,
              'col-start-2 row-span-2 row-start-1 min-h-0 self-stretch',
            )}
          >
            <MosaicSlot
              src={images[2]}
              alt={`${alt} — 3`}
              sizes={sizesRegionTall}
              priority={firstPriorityIdx === 2}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'flex min-h-0 w-full flex-row md:flex-col',
        gap,
        flush ? 'mb-0' : 'mb-5',
      )}
    >
      {/* [0]: mobilde sol sütun, md+ tam genişlik üst */}
      <div
        className={clsx(
          slot,
          'aspect-[4/3] min-h-0 flex-1 shrink-0 md:aspect-[2/1] md:w-full md:flex-none',
        )}
      >
        <MosaicSlot
          src={images[0]}
          alt={`${alt} — 1`}
          sizes={sizesTop}
          priority={firstPriorityIdx === 0}
        />
      </div>

      {/* [1] + [2]: mobilde sağ kolon (column); md+ alt satır (row) */}
      <div className={clsx('flex min-h-0 min-w-0 flex-1 flex-col md:w-full md:flex-none md:flex-row', gap)}>
        <div className={clsx(slot, 'aspect-[4/3] min-h-0 w-full min-w-0 md:flex-1')}>
          <MosaicSlot
            src={images[1]}
            alt={`${alt} — 2`}
            sizes={sizesPair}
            priority={firstPriorityIdx === 1}
          />
        </div>
        <div className={clsx(slot, 'aspect-[4/3] min-h-0 w-full min-w-0 md:flex-1')}>
          <MosaicSlot
            src={images[2]}
            alt={`${alt} — 3`}
            sizes={sizesPair}
            priority={firstPriorityIdx === 2}
          />
        </div>
      </div>
    </div>
  )
}

export type HeroSectionWithSearchForm1Props = {
  className?: string
  heading: string | ReactNode
  description: string | React.ReactNode
  /** Static fallback image (statik import veya `{ src, width, height }`). */
  image: HeroImageDims
  /** CDN override for the single-image fallback; takes precedence over `image`. */
  overrideImage?: { src: string; width?: number; height?: number }
  imageLinkHref?: string | null
  imageAlt: string
  searchForm: React.ReactNode
  /**
   * Banner düzen motoru JSON (version 2) — varsa sabit mozaik yerine bu yerleşim kullanılır.
   * Görseller `mosaicImages` ile aynı sırada (layers[0..2]) eşlenir veya katmandaki `src`.
   */
  freeformBannerLayout?: FreeformBannerDocV2
  /**
   * Üç görsel URL’i — `freeformBannerLayout` ile birlikte katman sırası; yalnız mozaikte de kullanılır.
   * Tuple: [üst geniş, alt sol, alt sağ] — eski şablon mozaik için.
   */
  mosaicImages?: [string, string, string]
  /**
   * Üst boşluk: `default` (kategori şablonu), `compact` (dar hero), `minimal` (anasayfa / bölge — Chisfis yerleşimi).
   * @deprecated `compactTop` yerine `topSpacing="compact"` kullanın
   */
  topSpacing?: 'default' | 'compact' | 'minimal'
  /** @deprecated `topSpacing="compact"` */
  compactTop?: boolean
  /**
   * `topSpacing="minimal"` iken arama+hap bloğunu yukarı kaydırır (Tailwind `bottom` / `mt` adımları).
   * Anasayfa: 0. Bölge gibi sayfalar: 1–3.
   */
  minimalSearchLiftSteps?: 0 | 1 | 2 | 3
  /**
   * Bölge hero: mozaik sağ/üst sabit, sola hafif uzar, altta `50px` (flex `stretch` anasayfa ile aynı).
   */
  heroMosaicBleed?: boolean
  /** Arama+hap bloğunu aşağı kaydırır (px, `translateY`). */
  searchFormOffsetYPx?: number
}

function HeroSectionWithSearchForm1({
  className,
  searchForm,
  description,
  heading,
  imageAlt,
  image,
  overrideImage,
  imageLinkHref,
  mosaicImages,
  freeformBannerLayout,
  topSpacing,
  compactTop = false,
  minimalSearchLiftSteps = 0,
  heroMosaicBleed = false,
  searchFormOffsetYPx,
}: HeroSectionWithSearchForm1Props) {
  const spacing: 'default' | 'compact' | 'minimal' =
    topSpacing ?? (compactTop ? 'compact' : 'default')
  const inlineSearch = spacing === 'minimal' || spacing === 'compact'
  const minimalBelowFoldSearch = spacing === 'minimal'
  // ── Right column content ──────────────────────────────────────────────────
  let rightCol: React.ReactNode

  if (freeformBannerLayout) {
    const urls: string[] =
      mosaicImages != null
        ? [...mosaicImages]
        : freeformBannerLayout.layers.map((l) => l.src ?? '')
    while (urls.length < freeformBannerLayout.layers.length) {
      urls.push('')
    }
    const freeformEl = (
      <FreeformBannerView
        doc={freeformBannerLayout}
        imageUrls={urls}
        alt={imageAlt}
        fitContentBounds
      />
    )
    rightCol = heroMosaicBleed ? (
      <div className="lg:-ml-2 lg:w-[calc(100%+0.5rem)] lg:max-w-none lg:min-w-0 lg:pb-[50px] lg:overflow-visible">
        {freeformEl}
      </div>
    ) : (
      freeformEl
    )
  } else if (mosaicImages) {
    rightCol = (
      <HeroImageMosaic
        images={mosaicImages}
        alt={imageAlt}
        flush={spacing === 'minimal'}
        bleed={heroMosaicBleed ? 'region' : 'default'}
      />
    )
  } else {
    const imgEl =
      overrideImage != null ? (
        <Image
          className="w-full"
          src={overrideImage.src}
          width={overrideImage.width ?? 1600}
          height={overrideImage.height ?? 1200}
          alt={imageAlt}
          priority
          unoptimized
        />
      ) : (
        <Image
          className="w-full"
          src={image.src}
          width={image.width}
          height={image.height}
          alt={imageAlt}
          priority
        />
      )

    rightCol =
      imageLinkHref != null && imageLinkHref !== '' ? (
        imageLinkHref.startsWith('/') || imageLinkHref.startsWith('#') ? (
          <Link href={imageLinkHref} className="block w-full">
            {imgEl}
          </Link>
        ) : (
          <a href={imageLinkHref} className="block w-full" target="_blank" rel="noreferrer">
            {imgEl}
          </a>
        )
      ) : (
        imgEl
      )
  }

  return (
    <div
      className={clsx(
        'relative flex',
        /** `compact` / bölge: arama üst satırın altında tam genişlik */
        spacing === 'compact' && 'flex-col pt-0 lg:pt-2',
        /** Kategori şablonu (`default`): üst boşluk üst sarmalayıcıda — çift pt-10 önlenir */
        !inlineSearch && 'flex-col pt-0',
        /** Anasayfa `minimal`: başlık+kolaj üstte, sekmeler+hap altta tam genişlik (Chisfis) */
        inlineSearch && spacing === 'minimal' && 'flex-col',
        spacing === 'minimal' && 'pt-0 lg:pt-0',
        heroMosaicBleed && 'lg:overflow-visible',
        className,
      )}
    >
      <div
        className={clsx(
          'relative',
          minimalBelowFoldSearch
            ? 'grid grid-cols-1 gap-x-6 gap-y-6 lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-6 xl:gap-x-8'
            : 'flex flex-col lg:flex-row',
          !minimalBelowFoldSearch &&
            (spacing === 'compact'
              ? 'gap-6 lg:items-stretch lg:gap-6 xl:gap-8'
              : 'gap-8 lg:items-stretch lg:gap-8 xl:gap-10 2xl:gap-12'),
          heroMosaicBleed && 'lg:overflow-visible',
        )}
      >
        {/* Left: başlık + açıklama; `minimal` iken arama ayrı satırda (mozaiğin altı) */}
        <div
          className={clsx(
            'relative flex w-full min-w-0 flex-col items-start',
            !minimalBelowFoldSearch && 'flex-1 basis-0',
            minimalBelowFoldSearch && 'order-1 lg:order-none lg:col-start-1 lg:row-start-1',
            /** `compact` kendi lg:pe-10 ile; `minimal` aşağıda */
            !(inlineSearch && spacing === 'minimal') &&
              spacing !== 'compact' &&
              'lg:pe-6 xl:pe-10 2xl:pe-14',
            /** Anasayfa `minimal` — arama ayrı grid satırında; `pb-60` yok */
            inlineSearch &&
              spacing === 'minimal' &&
              'gap-y-8 pb-8 lg:gap-y-8 lg:pe-10 lg:pt-12 lg:pb-0 xl:gap-y-10 xl:pe-14 2xl:pe-14',
            /** Bölge `compact` — alt boşluk arama bindirmesi için */
            spacing === 'compact' &&
              'gap-y-4 pb-16 sm:gap-y-5 lg:gap-y-5 lg:pe-10 lg:pt-4 lg:pb-60 xl:pe-14',
            /** Kategori `default` */
            spacing === 'default' && 'gap-y-8 pb-16 lg:pb-60 xl:gap-y-10',
            spacing === 'minimal' && 'lg:pt-0',
            spacing === 'compact' && 'lg:pt-2',
            spacing === 'default' && 'lg:pt-2',
          )}
        >
          <h2 className="w-full max-w-full text-5xl/[1.15] font-medium tracking-tight text-pretty xl:text-7xl/[1.1]">
            {typeof heading === 'string' ? (
              <span dangerouslySetInnerHTML={{ __html: sanitizeHeroInlineHtml(heading || '') }} />
            ) : (
              heading
            )}
          </h2>
          {description}
          {!minimalBelowFoldSearch ? (
            <div
              className={clsx(
                'z-30 hidden w-full min-w-0 md:block',
                /** Mobil: üst çubukta HeroSearchFormMobile — gövde araması yok; lg+: sol kolon tabanında, hap görsellerin üstüne biner */
                'lg:mt-0 lg:absolute lg:start-0 lg:w-screen lg:max-w-4xl xl:max-w-6xl',
                /** `default` / `compact`: üst üste binen arama — `minimal` bu dalda yok (`minimalBelowFoldSearch` ayrı blokta). */
                'mt-8 lg:bottom-12 xl:bottom-16',
              )}
              style={
                searchFormOffsetYPx != null && searchFormOffsetYPx !== 0
                  ? { transform: `translateY(${searchFormOffsetYPx}px)` }
                  : undefined
              }
            >
              {searchForm}
            </div>
          ) : null}
        </div>

        {/* Right: mozaik / görsel — bölge bleed taşması için */}
        <div
          className={clsx(
            'w-full min-h-0 min-w-0',
            !minimalBelowFoldSearch && 'flex-1 basis-0 lg:self-stretch',
            minimalBelowFoldSearch && 'order-3 lg:order-none lg:col-start-2 lg:row-start-1',
            heroMosaicBleed && 'lg:overflow-visible',
          )}
        >
          {rightCol}
        </div>

        {minimalBelowFoldSearch ? (
          <div
            className={clsx(
              'z-30 order-2 w-full min-w-0 max-w-full lg:order-none lg:col-span-2 lg:row-start-2',
              'lg:max-w-4xl xl:max-w-6xl',
              /** Adım arttıkça arama bloğu mozaiğe doğru daha fazla yukarı (daha büyük negatif -mt). */
              minimalSearchLiftSteps === 3
                ? 'lg:-mt-[340px]'
                : minimalSearchLiftSteps === 2
                  ? 'lg:-mt-[330px]'
                  : minimalSearchLiftSteps === 1
                    ? 'lg:-mt-[320px]'
                    : 'lg:-mt-[310px]',
            )}
            style={
              searchFormOffsetYPx != null && searchFormOffsetYPx !== 0
                ? { transform: `translateY(${searchFormOffsetYPx}px)` }
                : undefined
            }
          >
            {searchForm}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default HeroSectionWithSearchForm1

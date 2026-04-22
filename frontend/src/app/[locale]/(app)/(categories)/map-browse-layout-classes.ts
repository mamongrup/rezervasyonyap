/**
 * stay-car-experience harita + liste — Chisfis `stay-categories-map` ile uyumlu:
 * ~50/50 split ve 2 kolonlu grid `lg:` (demo: https://chisfis-nextjs.vercel.app/stay-categories-map/all )
 * Header3: h-16 (4rem)
 * Üst boşluk hero ile aynı: `heroContainerBelowHeaderClassName` değerleri (pt-3 sm:pt-4 lg:pt-5).
 */
export const mapBrowseOuter =
  'relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[100vw] flex-col gap-0 lg:flex-row lg:items-stretch'

/** Sol yarı */
export const mapBrowseListColumn =
  'flex w-full min-w-0 flex-col gap-y-8 border-neutral-200/90 px-4 pb-20 pt-3 sm:px-6 sm:pt-4 dark:border-neutral-700/80 lg:min-h-screen lg:w-1/2 lg:max-w-[50%] lg:flex-[0_0_50%] lg:border-e lg:px-8 lg:pt-5 lg:pr-8'

/** Harita sütunu — lg’de overflow-hidden fixed haritayı kaydırılmış gibi gösterebildiği için visible */
export const mapBrowseMapColumn =
  'relative flex min-h-[min(52dvh,520px)] w-full min-w-0 flex-col self-stretch overflow-hidden lg:h-auto lg:min-h-0 lg:w-1/2 lg:min-w-0 lg:max-w-[50%] lg:flex-[0_0_50%] lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0'

/** Sol panelde yan yana 2 ilan; lg altında harita altında tek sütun */
export const mapBrowseListingGridTwo =
  'grid w-full grid-cols-1 gap-x-4 gap-y-8 lg:grid-cols-2 lg:justify-items-stretch'

/** Araç kartları geniş — sol yarıda tek sütun */
export const mapBrowseListingGridCar =
  'grid w-full grid-cols-1 gap-y-8'

export const mapBrowseHeading =
  'text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50'

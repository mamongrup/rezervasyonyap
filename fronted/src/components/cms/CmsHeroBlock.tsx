'use client'

import Image from 'next/image'

export type CmsHeroConfig = {
  heading?: string
  subheading?: string
  /** Üç mozaik görsel URL (boş olanlar atlanır) */
  images?: string[]
}

export default function CmsHeroBlock({ config }: { config: CmsHeroConfig }) {
  const heading = config.heading ?? ''
  const subheading = config.subheading ?? ''
  const imgs = (config.images ?? []).map((u) => u.trim()).filter(Boolean)

  return (
    <div className="relative">
      <div className="relative flex flex-col items-center gap-10 text-center sm:gap-16 lg:flex-row lg:text-left">
        <div className="w-screen max-w-full xl:max-w-lg">
          <h1 className="text-4xl font-semibold sm:text-5xl">{heading || 'Başlık'}</h1>
          {subheading ? (
            <p className="mt-7 text-base text-neutral-600 xl:text-lg dark:text-neutral-400">{subheading}</p>
          ) : null}
        </div>
        <div className="grow">
          {imgs.length >= 3 ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {imgs.slice(0, 3).map((src, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-2xl"
                  style={{ paddingBottom: '140%' }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 25vw"
                    unoptimized={src.startsWith('http') || src.startsWith('/uploads/')}
                  />
                </div>
              ))}
            </div>
          ) : imgs.length === 1 || imgs.length === 2 ? (
            <div className={`grid gap-2 ${imgs.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {imgs.map((src, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl" style={{ paddingBottom: '75%' }}>
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized={src.startsWith('http') || src.startsWith('/uploads/')}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400 dark:border-neutral-700">
              Hero için en az bir görsel URL ekleyin.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

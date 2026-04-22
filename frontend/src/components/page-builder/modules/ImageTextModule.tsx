import Image from 'next/image'
import Link from 'next/link'

interface ImageTextConfig {
  title?: string
  subtitle?: string
  content?: string
  imageUrl?: string
  imageAlt?: string
  imagePosition?: 'left' | 'right'
  ctaText?: string
  ctaHref?: string
  ctaSecondaryText?: string
  ctaSecondaryHref?: string
  badge?: string
  backgroundStyle?: 'white' | 'light' | 'dark'
  imageRounded?: boolean
}

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg'

export default function ImageTextModule({ config }: { config: ImageTextConfig }) {
  const imageOnRight = (config.imagePosition ?? 'left') === 'right'
  const bg = config.backgroundStyle ?? 'white'
  const imageUrl = config.imageUrl || DEFAULT_IMAGE

  return (
    <section
      className={
        bg === 'light'
          ? 'rounded-3xl bg-neutral-50 dark:bg-neutral-900/60 px-6 py-12 md:px-12'
          : bg === 'dark'
          ? 'rounded-3xl bg-neutral-900 dark:bg-neutral-950 px-6 py-12 md:px-12 text-white'
          : undefined
      }
    >
      <div
        className={`flex flex-col gap-10 md:flex-row md:items-center md:gap-16 ${
          imageOnRight ? 'md:flex-row-reverse' : ''
        }`}
      >
        {/* Image */}
        <div className="w-full md:w-1/2 shrink-0">
          <div
            className={`relative aspect-[4/3] w-full overflow-hidden shadow-xl ${
              config.imageRounded !== false ? 'rounded-3xl' : 'rounded-xl'
            }`}
          >
            <Image
              src={imageUrl}
              alt={config.imageAlt ?? config.title ?? ''}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 flex flex-col gap-5">
          {config.badge && (
            <span className="inline-block self-start rounded-full bg-primary-100 dark:bg-primary-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-300">
              {config.badge}
            </span>
          )}
          {config.title && (
            <h2
              className={`text-2xl font-bold md:text-3xl lg:text-4xl leading-tight ${
                bg === 'dark' ? 'text-white' : 'text-neutral-900 dark:text-white'
              }`}
            >
              {config.title}
            </h2>
          )}
          {config.subtitle && (
            <p
              className={`text-lg font-medium ${
                bg === 'dark' ? 'text-neutral-300' : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {config.subtitle}
            </p>
          )}
          {config.content && (
            <p
              className={`leading-relaxed ${
                bg === 'dark' ? 'text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {config.content}
            </p>
          )}

          {(config.ctaHref || config.ctaSecondaryHref) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {config.ctaHref && (
                <Link
                  href={config.ctaHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-6000 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {config.ctaText ?? 'Keşfet'}
                </Link>
              )}
              {config.ctaSecondaryHref && (
                <Link
                  href={config.ctaSecondaryHref}
                  className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold transition ${
                    bg === 'dark'
                      ? 'border-neutral-600 text-neutral-200 hover:border-neutral-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {config.ctaSecondaryText ?? 'Daha Fazla'}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

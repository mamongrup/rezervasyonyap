import Link from 'next/link'

interface PromoBannerConfig {
  title?: string
  description?: string
  ctaText?: string
  ctaHref?: string
  backgroundUrl?: string
  gradient?: string
}

export default function PromoBannerModule({ config }: { config: PromoBannerConfig }) {
  const gradient = config.gradient ?? 'from-secondary-600 to-secondary-800'
  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-10 text-white shadow-xl md:p-16`}
      style={
        config.backgroundUrl
          ? { backgroundImage: `url(${config.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {config.backgroundUrl && <div className="absolute inset-0 bg-black/40" />}
      <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold md:text-3xl">{config.title ?? 'Özel Kampanyalar'}</h2>
          {config.description && (
            <p className="mt-2 text-white/80">{config.description}</p>
          )}
        </div>
        {config.ctaHref && (
          <Link
            href={config.ctaHref}
            className="shrink-0 rounded-xl bg-white px-6 py-3 font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            {config.ctaText ?? 'Hemen İncele'}
          </Link>
        )}
      </div>
    </section>
  )
}

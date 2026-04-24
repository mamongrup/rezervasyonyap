'use client'

import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/shared/Logo'
import rightImgDefault from '@/images/BecomeAnAuthorImg.png'
import { useRouter } from 'next/navigation'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'

interface BecomeProviderConfig {
  heading?: string
  subheading?: string
  ctaText?: string
  ctaHref?: string
  secondaryCtaText?: string
  secondaryCtaHref?: string
  imageUrl?: string
  /** Artık kullanılmıyor; geriye dönük uyumluluk için tutuldu */
  bgVariant?: 'light' | 'gradient' | 'dark'
  steps?: unknown[]
  stats?: unknown[]
}

export default function BecomeProviderModule({ config }: { config: BecomeProviderConfig }) {
  const {
    heading        = 'İlanınızı Ekleyin, Kazanmaya Başlayın',
    subheading     = 'Otel, tur, tatil evi, tekne, araç kiralama — ne sunarsanız sunun, milyonlarca gezgine ulaşmanın en kolay yolu burada. Hemen ücretsiz ilan oluşturun.',
    ctaText        = 'Ücretsiz İlan Ver',
    secondaryCtaText,
    secondaryCtaHref,
    imageUrl,
  } = config

  const router = useRouter()
  const vitrinPath = useVitrinHref()

  const handleCtaClick = () => {
    const token = getStoredAuthToken()
    if (!token) {
      router.push(`${vitrinPath('/login')}?redirect=${encodeURIComponent('/ilan-ekle')}`)
    } else {
      router.push(vitrinPath('/ilan-ekle'))
    }
  }

  return (
    <div className="relative flex flex-col items-center lg:flex-row">
      {/* ── Sol: metin ── */}
      <div className="mb-16 shrink-0 lg:me-10 lg:mb-0 lg:w-2/5">
        <Logo />

        <h2 className="mt-6 text-3xl font-semibold text-neutral-900 dark:text-neutral-100 sm:mt-11 sm:text-4xl">
          {heading}
        </h2>
        <p className="mt-6 text-neutral-600 dark:text-neutral-400">
          {subheading}
        </p>

        <div className="mt-6 flex flex-wrap gap-3 sm:mt-11">
          <button
            onClick={handleCtaClick}
            className="inline-flex items-center rounded-full bg-neutral-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            {ctaText}
          </button>
          {secondaryCtaText && (
            <Link
              href={secondaryCtaHref ?? '#'}
              aria-label={`${secondaryCtaText} — ${ctaText}`}
              className="inline-flex items-center rounded-full border border-neutral-300 px-7 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>

      {/* ── Sağ: illüstrasyon ── */}
      <div className="grow">
        {imageUrl ? (
          <div className="relative h-72 w-full overflow-hidden rounded-2xl lg:h-96">
            <Image src={imageUrl} alt={heading} fill className="object-cover object-center" sizes="50vw" />
          </div>
        ) : (
          <Image src={rightImgDefault} alt="İlan ver" className="w-full" />
        )}
      </div>
    </div>
  )
}

'use client'

import type { TAuthor } from '@/data/authors'
import CardAuthorBox from '@/components/CardAuthorBox'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

// URL path → categorySlug eşlemesi
const PATH_TO_SLUG: [string, string][] = [
  ['/oteller', 'oteller'],
  ['/tatil-evleri', 'tatil-evleri'],
  ['/yat-kiralama', 'yat-kiralama'],
  ['/turlar', 'turlar'],
  ['/aktiviteler', 'aktiviteler'],
  ['/kruvaziyer', 'kruvaziyer'],
  ['/hac-umre', 'hac-umre'],
  ['/vize', 'vize'],
  ['/ucak-bileti', 'ucak-bileti'],
  ['/arac-kiralama', 'arac-kiralama'],
  ['/feribot', 'feribot'],
  ['/transfer', 'transfer'],
]

function slugFromPath(pathname: string | null): string | null {
  if (!pathname) return null
  // locale prefix varsa çıkar (/tr/oteller → /oteller)
  const stripped = pathname.replace(/^\/(tr|en)(\/|$)/, '/')
  for (const [prefix, slug] of PATH_TO_SLUG) {
    if (stripped === prefix || stripped.startsWith(`${prefix}/`)) return slug
  }
  return null
}

interface Props {
  className?: string
  authors: TAuthor[]
  heading?: string
  subheading?: string
  ctaText?: string
  ctaHref?: string
  maxCount?: number
  /** Dışarıdan zorla belirli slug — verilmezse URL'den otomatik algılanır */
  filterBySlug?: string
}

export default function SectionTopProviders({
  className = '',
  authors,
  heading,
  subheading,
  ctaText = 'Siz de ilan verin',
  ctaHref = '/manage',
  maxCount = 10,
  filterBySlug,
}: Props) {
  const pathname = usePathname()

  // Önce prop, yoksa URL'den al, yoksa null (tümü)
  const activeSlug = filterBySlug ?? slugFromPath(pathname)

  const sorted = useMemo(
    () =>
      [...authors].sort((a, b) => {
        if ((b.starRating ?? 0) !== (a.starRating ?? 0)) return (b.starRating ?? 0) - (a.starRating ?? 0)
        return (b.count ?? 0) - (a.count ?? 0)
      }),
    [authors],
  )

  const displayed = useMemo(() => {
    const list = activeSlug
      ? sorted.filter((a) => a.categorySlug === activeSlug)
      : sorted
    return list.slice(0, maxCount)
  }, [sorted, activeSlug, maxCount])

  // Başlık: verilmemişse kategoriye göre otomatik üret
  const resolvedHeading = heading ?? (
    activeSlug
      ? 'Bu Kategorinin En Başarılı Sağlayıcıları'
      : 'En Başarılı İlan Sahipleri'
  )

  const resolvedSubheading = subheading ?? (
    activeSlug
      ? 'Müşteri puanlarına göre bu kategorinin öne çıkan ilan sağlayıcıları'
      : 'Tüm kategorilerde müşterilerinden en yüksek puanı alan ilan sağlayıcılar — siz de aramıza katılın'
  )

  if (displayed.length === 0) return null

  return (
    <section className={`relative ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            {resolvedHeading}
          </h2>
          {resolvedSubheading && (
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
              {resolvedSubheading}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-6">
        {displayed.map((author, idx) => (
          <CardAuthorBox
            key={author.id}
            author={author}
            index={idx < 3 ? idx + 1 : undefined}
          />
        ))}
      </div>

      {ctaText && ctaHref && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={ctaHref}
            className="rounded-full bg-primary-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            {ctaText}
          </Link>
          <Link
            href="/blog?kategori=seyahat-ipuclari"
            className="rounded-full border border-neutral-200 px-8 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Daha fazla bilgi al
          </Link>
        </div>
      )}
    </section>
  )
}

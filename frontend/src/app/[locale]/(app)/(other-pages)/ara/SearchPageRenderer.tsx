import type { PageBuilderModule } from '@/types/listing-types'
import type { AppMessages } from '../../../../../../public/locales/en'
import SearchResultsModule from '@/components/page-builder/modules/SearchResultsModule'
import DestinationCardsModule from '@/components/page-builder/modules/DestinationCardsModule'
import BecomeProviderModule from '@/components/page-builder/modules/BecomeProviderModule'
import NewsletterModule from '@/components/page-builder/modules/NewsletterModule'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  modules: PageBuilderModule[]
  locale: string
  query: string
  activeCategory: string
  page: number
  buildUrl: (overrides: Record<string, string | undefined>) => string
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  messages: AppMessages
}

const PER_PAGE = 24

export default async function SearchPageRenderer({
  modules,
  locale,
  query,
  activeCategory,
  page,
  buildUrl,
  // messages is available for future module use
}: Props) {
  const enabled = [...modules].filter((m) => m.enabled).sort((a, b) => a.order - b.order)
  const categoryFilter = activeCategory !== 'all' ? activeCategory : undefined

  // search_results modülünden total almak için önce render edip sayfalama bilgisini çıkaralım
  // Bunu SearchResultsModule ayrı render ediyor; pagination için de aynı sorguyu yaparız
  // Basitçe: pagination bilgisini bağımsız bir server bileşenine taşıyoruz
  return (
    <div>
      {enabled.map((module) => {
        const cfg = module.config as Record<string, unknown>

        switch (module.type) {
          case 'search_results':
            return (
              <div key={module.id} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <SearchResultsModule
                  config={{ perPage: PER_PAGE, ...(cfg as { perPage?: number }) }}
                  query={query}
                  categoryFilter={categoryFilter}
                  locale={locale}
                  page={page}
                />
                <SearchPagination
                  query={query}
                  categoryFilter={categoryFilter}
                  locale={locale}
                  page={page}
                  perPage={PER_PAGE}
                  buildUrl={buildUrl}
                />
              </div>
            )

          case 'destination_cards':
            return (
              <div key={module.id} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <DestinationCardsModule
                  config={cfg as Parameters<typeof DestinationCardsModule>[0]['config']}
                />
              </div>
            )

          case 'become_provider':
            return (
              <div key={module.id} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <BecomeProviderModule
                  config={cfg as Parameters<typeof BecomeProviderModule>[0]['config']}
                />
              </div>
            )

          case 'newsletter':
            return (
              <div key={module.id} className="mt-4">
                <NewsletterModule
                  config={cfg as Parameters<typeof NewsletterModule>[0]['config']}
                />
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}

async function SearchPagination({
  query,
  categoryFilter,
  locale,
  page,
  perPage,
  buildUrl,
}: {
  query: string
  categoryFilter?: string
  locale: string
  page: number
  perPage: number
  buildUrl: (overrides: Record<string, string | undefined>) => string
}) {
  if (!query) return null

  const { searchPublicListings } = await import('@/lib/travel-api')
  const result = await searchPublicListings({
    q: query,
    locale,
    page,
    perPage,
    ...(categoryFilter ? { categoryCode: categoryFilter } : {}),
  })

  if (!result) return null

  const total = result.total
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const pages = buildPaginationRange(page, totalPages)

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Sayfalama">
      {page > 1 && (
        <Link
          href={buildUrl({ page: String(page - 1) })}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-neutral-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildUrl({ page: String(p) })}
            className={[
              'flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors',
              p === page
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:border-primary-500 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400',
            ].join(' ')}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Link>
        ),
      )}

      {page < totalPages && (
        <Link
          href={buildUrl({ page: String(page + 1) })}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}

function buildPaginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)

  return pages
}

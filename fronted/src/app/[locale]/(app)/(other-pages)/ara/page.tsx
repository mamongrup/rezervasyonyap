import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { vitrinHref } from '@/lib/vitrin-href'
import { getMessages } from '@/utils/getT'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { getSearchPageDefaultModules } from '@/lib/page-builder-default-modules'
import { getCategoryPageBuilderConfig } from '@/data/page-builder-config'
import SearchPageRenderer from './SearchPageRenderer'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" için arama sonuçları` : 'Arama — İlan Bul',
    description: q
      ? `${q} için en iyi ilan ve koleksiyon sonuçları`
      : 'İlan ve koleksiyon arama',
  }
}

const ALL_FILTER = { slug: 'all', name: 'Tümü', emoji: '🔍' }

const SEARCH_TABS = [
  ALL_FILTER,
  ...CATEGORY_REGISTRY.map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji })),
]

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q, category, page: pageStr } = await searchParams

  const query = (q ?? '').trim()
  const activeCategory = (category ?? 'all').trim()
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))

  const messages = getMessages(locale)
  const araBase = await vitrinHref(locale, '/ara')

  // Arama sayfası config: kaydedilmiş page builder config varsa kullan, yoksa default
  const savedModules = await getCategoryPageBuilderConfig('ara', locale).catch(() => [])
  const modules = savedModules.length
    ? savedModules
    : getSearchPageDefaultModules().map((m, i) => ({ ...m, id: `search-default-${i}` }))

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    if (query) sp.set('q', query)
    if (activeCategory !== 'all') sp.set('category', activeCategory)
    if (page > 1) sp.set('page', String(page))
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '' || (k === 'category' && v === 'all') || (k === 'page' && v === '1')) {
        sp.delete(k)
      } else {
        sp.set(k, v)
      }
    }
    const str = sp.toString()
    return `${araBase}${str ? `?${str}` : ''}`
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* ── Üst başlık ──────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <Search className="h-6 w-6 text-neutral-400" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {query ? (
                <>
                  <span className="text-primary-600 dark:text-primary-400">
                    &ldquo;{query}&rdquo;
                  </span>{' '}
                  için sonuçlar
                </>
              ) : (
                'Arama'
              )}
            </h1>
          </div>

          {/* ── Kategori sekmeleri ──────────────────────────────────── */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SEARCH_TABS.map((tab) => {
              const isActive = tab.slug === activeCategory
              return (
                <Link
                  key={tab.slug}
                  href={buildUrl({ category: tab.slug, page: '1' })}
                  className={[
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                  ].join(' ')}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Sonuçlar + sayfalama + diğer modüller ───────────────────── */}
      <SearchPageRenderer
        modules={modules}
        locale={locale}
        query={query}
        activeCategory={activeCategory}
        page={page}
        buildUrl={buildUrl}
        messages={messages}
      />
    </div>
  )
}

import CorporatePageShell from '@/components/corporate/CorporatePageShell'
import FaqPageJsonLd from '@/components/seo/FaqPageJsonLd'
import {
  fillFaqPlaceholders,
  getLegalFaq,
  type LegalFaqCategoryId,
} from '@/lib/corporate/legal-faq'
import { vitrinHref } from '@/lib/vitrin-href'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ cat?: string }>
}

function applyPlaceholdersDeep<T>(value: T): T {
  if (typeof value === 'string') return fillFaqPlaceholders(value) as T
  if (Array.isArray(value)) return value.map((v) => applyPlaceholdersDeep(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = applyPlaceholdersDeep(v)
    return out as T
  }
  return value
}

const ANSWER_PATHS = [
  '/legal/cancellation',
  '/legal/privacy',
  '/legal/terms',
  '/legal/cookies',
  '/legal/faq',
  '/contact',
] as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const faq = applyPlaceholdersDeep(getLegalFaq(locale))
  return {
    title: faq.metaTitle,
    description: faq.metaDescription,
  }
}

export default async function LegalFaqPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const sp = await searchParams
  const faq = applyPlaceholdersDeep(getLegalFaq(locale))
  const catParam = typeof sp.cat === 'string' ? sp.cat : ''
  const active = faq.categories.find((c) => c.id === catParam) ?? null
  const faqBase = await vitrinHref(locale, '/legal/faq')

  const hrefByPath: Record<string, string> = {}
  await Promise.all(
    ANSWER_PATHS.map(async (p) => {
      hrefByPath[p] = await vitrinHref(locale, p)
    }),
  )

  const allItems = faq.categories.flatMap((c) => c.items)

  return (
    <>
      <FaqPageJsonLd items={active ? active.items : allItems} />
      <CorporatePageShell
        title={faq.pageTitle}
        subtitle={faq.pageLead}
        heroSrc="/corporate/travel-desk-hero.jpg"
        heroAlt={faq.pageTitle}
      >
        <div className="not-prose">
          {active ? (
            <div>
              <Link
                href={faqBase}
                className="inline-flex text-sm font-medium text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-400"
              >
                ← {faq.backToCategories}
              </Link>
              <h2 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {active.title}
              </h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">{active.description}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {faq.questionsCount.replace('{count}', String(active.items.length))}
              </p>

              <div className="mt-8 divide-y divide-neutral-200 dark:divide-neutral-800">
                {active.items.map((item) => (
                  <details key={item.q} className="group py-5">
                    <summary className="cursor-pointer list-none font-semibold text-neutral-900 dark:text-neutral-100 marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-start justify-between gap-4">
                        {item.q}
                        <span
                          className="mt-0.5 shrink-0 text-neutral-400 transition group-open:rotate-45"
                          aria-hidden
                        >
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
                      {linkifyAnswer(item.a, hrefByPath)}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {faq.categoriesHeading}
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {faq.categories.map((cat) => (
                  <li key={cat.id}>
                    <CategoryCard
                      href={`${faqBase}?cat=${cat.id as LegalFaqCategoryId}`}
                      title={cat.title}
                      description={cat.description}
                      countLabel={faq.questionsCount.replace('{count}', String(cat.items.length))}
                      openLabel={faq.openCategory}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CorporatePageShell>
    </>
  )
}

function CategoryCard({
  href,
  title,
  description,
  countLabel,
  openLabel,
}: {
  href: string
  title: string
  description: string
  countLabel: string
  openLabel: string
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
    >
      <span className="text-base font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
        {title}
      </span>
      <span className="mt-2 grow text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {description}
      </span>
      <span className="mt-4 flex items-center justify-between text-xs font-medium text-neutral-500">
        <span>{countLabel}</span>
        <span className="text-neutral-800 dark:text-neutral-200">{openLabel} →</span>
      </span>
    </Link>
  )
}

function linkifyAnswer(text: string, hrefByPath: Record<string, string>): ReactNode[] {
  const pattern = /(\/(?:legal\/[a-z0-9-]+|contact))/g
  const parts = text.split(pattern)
  return parts.map((part, i) => {
    const href = hrefByPath[part]
    if (href) {
      return (
        <Link key={i} href={href} className="font-medium underline underline-offset-2">
          {part}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
}

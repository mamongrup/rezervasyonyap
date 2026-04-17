import type { TravelIdea } from '@/lib/travel-api'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import clsx from 'clsx'
import Link from 'next/link'

export default function RegionTravelIdeasSection({
  ideas,
  locale,
}: {
  ideas: TravelIdea[]
  locale: string
}) {
  if (!ideas.length) return null

  return (
    <section className="bg-white py-14 dark:bg-neutral-900">
      <div className="container">
        <h2 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">Gezi Fikirleri</h2>
        <p className="mb-10 text-sm text-neutral-500 dark:text-neutral-400">
          Bu bölgede keşfedilecek yerler ve rotalar
        </p>
        <div className="space-y-12">
          {ideas.map((idea, i) => (
            <article
              key={idea.id}
              className="grid gap-8 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-6 md:grid-cols-2 md:items-stretch md:gap-10 dark:border-neutral-800 dark:bg-neutral-950/40"
            >
              <div className={clsx('flex flex-col justify-center', i % 2 === 1 && 'md:order-2')}>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{idea.title}</h3>
                <p className="mt-3 whitespace-pre-line text-neutral-600 dark:text-neutral-400">{idea.summary}</p>
                {idea.link ? (
                  <Link
                    href={normalizeHrefForLocale(locale, idea.link)}
                    className="mt-5 inline-flex w-fit text-sm font-semibold text-[color:var(--primary-600,#0ea5e9)] hover:underline dark:text-sky-400"
                  >
                    Devamını Oku
                  </Link>
                ) : null}
              </div>
              <div
                className={clsx(
                  'relative min-h-[200px] overflow-hidden rounded-2xl md:min-h-[260px]',
                  i % 2 === 1 && 'md:order-1',
                )}
              >
                {idea.image ? (
                  <img src={idea.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center bg-neutral-200/80 text-4xl dark:bg-neutral-800">
                    📷
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

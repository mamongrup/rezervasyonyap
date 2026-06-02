import { countryTourInfoHasContent, countryTourInfoRows } from '@/lib/country-tour-info'
import { regionPublicHref } from '@/lib/region-public-path'
import type { TourCountryCard } from '@/lib/tour-countries-resolve'
import { Divider } from '@/shared/divider'
import Link from 'next/link'
import { SectionHeading } from './components/SectionHeading'

function CountryCard({ card, locale }: { card: TourCountryCard; locale: string }) {
  const rows = countryTourInfoRows(card.info)
  const flag = card.info.flag_url?.trim() || card.page?.featured_image_url?.trim()
  const emoji = card.info.flag_emoji?.trim()
  const href = regionPublicHref(locale, card.iso2)

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
      <header className="flex items-center gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
        {flag ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flag} alt="" className="h-6 w-9 rounded object-cover shadow-sm" loading="lazy" />
        ) : emoji ? (
          <span className="text-2xl leading-none" aria-hidden>
            {emoji}
          </span>
        ) : null}
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <Link href={href} className="hover:text-primary-600 dark:hover:text-primary-300">
            {card.name}
          </Link>
        </h3>
      </header>

      {rows.length > 0 ? (
        <dl className="mt-4 space-y-2.5 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">{row.label}</dt>
              <dd className="leading-snug text-neutral-700 dark:text-neutral-300">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  )
}

export default function TourCountryInfoSection({
  countries,
  locale,
}: {
  countries: TourCountryCard[]
  locale: string
}) {
  const visible = countries.filter((c) => c.name.trim() && countryTourInfoHasContent(c.info))
  if (visible.length === 0) return null

  return (
    <section id="tour-section-countries" className="listingSection__wrap scroll-mt-28">
      <SectionHeading>Bölge Hakkında</SectionHeading>
      <Divider className="w-14!" />
      <p className="text-sm leading-snug text-neutral-600 dark:text-neutral-400">
        Tur kapsamındaki ülkelere ilişkin pratik bilgiler.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((card) => (
          <CountryCard key={card.iso2} card={card} locale={locale} />
        ))}
      </div>
    </section>
  )
}

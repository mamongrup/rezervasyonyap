'use client'

import type { TourItineraryDay } from './TourDetailSections'
import { LISTING_SECTION_STACKED } from './listing-section-classes'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function TourItineraryAccordion({
  days,
  locale = 'tr',
}: {
  days: TourItineraryDay[]
  locale?: string
}) {
  const visibleDays = days.filter((d) => d.title.trim() || d.description.trim() || d.descriptionHtml?.trim())
  const [openDays, setOpenDays] = useState<Set<number>>(() => {
    const first = visibleDays[0]?.day
    return first != null ? new Set([first]) : new Set()
  })

  if (visibleDays.length === 0) return null

  const td = getMessages(locale).listing.tourDetail

  function toggleDay(day: number) {
    setOpenDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  return (
    <section id="tour-section-program" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{td.programTitle}</SectionHeading>
        <SectionSubheading>{td.programSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="space-y-3">
        {visibleDays.map((day) => {
          const open = openDays.has(day.day)
          const title =
            day.title.trim() || interpolate(td.itineraryDayFallback, { day: String(day.day) })

          return (
            <article
              key={`${day.day}:${day.title}`}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <button
                type="button"
                onClick={() => toggleDay(day.day)}
                aria-expanded={open}
                className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {day.day}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
                </div>
                <ChevronDown
                  className={clsx(
                    'mt-2 h-5 w-5 shrink-0 text-neutral-400 transition-transform',
                    open && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              {open ? (
                <div className="border-t border-neutral-100 px-5 pb-5 pt-0 dark:border-neutral-800">
                  <div className="ms-[3.75rem]">
                    {day.descriptionHtml?.trim() ? (
                      <div
                        className="prose prose-sm max-w-none leading-relaxed text-neutral-600 dark:prose-invert dark:text-neutral-300 [&_p]:my-2 [&_p:first-child]:mt-3"
                        dangerouslySetInnerHTML={{ __html: day.descriptionHtml.trim() }}
                      />
                    ) : day.description.trim() ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-600 dark:text-neutral-300">
                        {day.description.trim()}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

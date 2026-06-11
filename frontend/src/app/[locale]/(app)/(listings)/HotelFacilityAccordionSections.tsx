'use client'

import type { HotelFacilityAccordionContent } from '@/lib/hotel-facility-sections'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

export default function HotelFacilityAccordionSections({
  content,
  className,
}: {
  content: HotelFacilityAccordionContent
  className?: string
}) {
  if (content.sections.length === 0 && !content.generalTermsHtml?.trim()) return null

  return (
    <div id="stay-section-facility-details" className={clsx('scroll-mt-28', className)}>
      <div className="flex flex-col gap-2">
        {content.sections.map((section) => (
          <Disclosure
            key={section.id}
            as="div"
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/40"
          >
            {({ open }) => (
              <>
                <DisclosureButton className="flex w-full items-center justify-between gap-3 px-4 py-4 text-start sm:px-5">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={clsx(
                      'size-5 shrink-0 text-neutral-400 transition-transform',
                      open && 'rotate-180',
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </DisclosureButton>
                <DisclosurePanel className="border-t border-neutral-100 px-4 pb-4 pt-3 sm:px-5 dark:border-neutral-800">
                  {section.badges && section.badges.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {section.badges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {section.items && section.items.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.bodyHtml?.trim() ? (
                    <div
                      className="prose prose-sm max-w-none leading-relaxed text-neutral-700 dark:prose-invert dark:text-neutral-300"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichCmsHtml(section.bodyHtml),
                      }}
                    />
                  ) : null}
                </DisclosurePanel>
              </>
            )}
          </Disclosure>
        ))}
      </div>

      {content.generalTermsHtml?.trim() ? (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 sm:p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {content.generalTermsTitle}
          </h3>
          <div
            className="prose prose-sm mt-3 max-w-none leading-relaxed text-neutral-700 dark:prose-invert dark:text-neutral-300"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichCmsHtml(content.generalTermsHtml),
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

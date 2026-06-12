'use client'

import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import {
  buildHotelFaqItems,
  type HotelFaqSource,
} from './hotel-faq-items'

/** Ortak akordeon SSS listesi — şablon / özel maddeler ve otel otomatik SSS için kullanılır. */
export function AccordionFaqSection({
  locale,
  items,
  title,
  subtitle,
  className,
}: {
  locale: string
  items: { q: string; a: string }[]
  title?: string
  subtitle?: string
  className?: string
}) {
  const messages = getMessages(locale)
  const t = (messages.listing.faq ?? {}) as Record<string, string>

  if (items.length === 0) return null

  const heading = title ?? t.title ?? 'Sıkça sorulan sorular'
  const sub =
    subtitle ??
    t.subtitle ??
    'Bu otel hakkında misafirlerin en çok sorduğu sorular.'

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{heading}</SectionHeading>
        <SectionSubheading>{sub}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {items.map((it, i) => (
          <Disclosure key={i} as="div" className="py-1">
            {({ open }) => (
              <>
                <DisclosureButton className="flex w-full items-start justify-between gap-3 py-3 text-start text-sm font-medium text-neutral-800 hover:text-primary-600 dark:text-neutral-200 dark:hover:text-neutral-200">
                  <span className="leading-snug">{it.q}</span>
                  <ChevronDown
                    className={clsx(
                      'mt-0.5 h-4 w-4 shrink-0 transition-transform',
                      open && 'rotate-180',
                    )}
                    strokeWidth={1.75}
                  />
                </DisclosureButton>
                <DisclosurePanel className="pb-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {it.a}
                </DisclosurePanel>
              </>
            )}
          </Disclosure>
        ))}
      </div>
    </div>
  )
}

export default function HotelFAQSection({
  locale,
  source,
  className,
}: {
  locale: string
  source: HotelFaqSource
  className?: string
}) {
  const messages = getMessages(locale)
  const t = (messages.listing.faq ?? {}) as Record<string, string>

  const items = buildHotelFaqItems(source, t)

  if (items.length === 0) return null

  return (
    <AccordionFaqSection
      locale={locale}
      items={items}
      className={className}
      title={t.title ?? 'Sıkça sorulan sorular'}
      subtitle={t.subtitle ?? 'Bu otel hakkında misafirlerin en çok sorduğu sorular.'}
    />
  )
}

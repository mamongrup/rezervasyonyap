'use client'

import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

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

/** Booking/ETStur tarzı "Sıkça Sorulan Sorular" bölümü.
 *  Mevcut listing alanlarından (check-in/out, ön ödeme yüzdesi, iptal
 *  politikası metni, bakanlık ruhsat numarası, kahvaltı dahil mi) otomatik
 *  üretilir; ek backend tablosu gerektirmez.
 *
 *  Hiç soru üretilemezse bölüm tamamen gizlenir.  Tasarım dili sayfanın geri
 *  kalanıyla aynı `listingSection__wrap` + `SectionHeading` + `Divider`. */
export interface HotelFaqSource {
  /** "14:00–23:00" gibi serbest metin (locale ile gelir) */
  checkInLine?: string
  /** "12:00'a kadar" gibi serbest metin (locale ile gelir) */
  checkOutLine?: string
  /** Ön ödeme yüzdesi metni (örn. "%30") — boşsa gizlenir */
  prepaymentNote?: string | null
  /** İptal politikası serbest metni — boşsa gizlenir */
  cancellationText?: string | null
  /** Kültür ve Turizm Bakanlığı ruhsat numarası — boşsa gizlenir */
  ministryLicenseRef?: string | null
  /** Otelin yemek planı durumu (aksiyon ifadesi için) */
  hasBreakfastIncluded?: boolean
  /** Otele özgü "evcil hayvan kabul ediyor mu?" kuralı (rules listesinden) */
  petPolicyText?: string | null
}

export function buildHotelFaqItems(
  source: HotelFaqSource,
  t: Record<string, string>,
): { q: string; a: string }[] {
  type Item = { q: string; a: string }
  const items: Item[] = []
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  const checkInLine = str(source.checkInLine)
  const checkOutLine = str(source.checkOutLine)
  if (checkInLine || checkOutLine) {
    const parts = [checkInLine, checkOutLine].filter(Boolean)
    items.push({
      q: t.qCheckInOut ?? 'Check-in ve check-out saatleri nedir?',
      a: parts.join(' · '),
    })
  }

  if (source.hasBreakfastIncluded) {
    items.push({
      q: t.qBreakfast ?? 'Bu otelde kahvaltı sunuluyor mu?',
      a:
        t.aBreakfast ??
        'Evet, otelde kahvaltı sunulmaktadır. Detaylar yemek planı bölümünde yer alır.',
    })
  }

  const prepaymentNote = str(source.prepaymentNote)
  if (prepaymentNote) {
    items.push({
      q: t.qPrepayment ?? 'Rezervasyon için ne kadar ön ödeme alınır?',
      a: prepaymentNote,
    })
  }

  const cancellationText = str(source.cancellationText)
  if (cancellationText) {
    items.push({
      q: t.qCancellation ?? 'Rezervasyonumu nasıl iptal edebilirim?',
      a: cancellationText,
    })
  }

  const petPolicyText = str(source.petPolicyText)
  if (petPolicyText) {
    items.push({
      q: t.qPets ?? 'Evcil hayvan kabul ediyor musunuz?',
      a: petPolicyText,
    })
  }

  const ministryLicenseRef = str(source.ministryLicenseRef)
  if (ministryLicenseRef) {
    items.push({
      q: t.qLicense ?? 'Tesisin Bakanlık ruhsat numarası nedir?',
      a: ministryLicenseRef,
    })
  }

  return items
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

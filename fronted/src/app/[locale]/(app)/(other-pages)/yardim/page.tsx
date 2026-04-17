import type { Metadata } from 'next'
import Link from 'next/link'
import { vitrinHref } from '@/lib/vitrin-href'
import { getMessages } from '@/utils/getT'
import {
  BookOpen, CreditCard, HelpCircle, LifeBuoy, Lock, MessageCircle,
  Phone, RefreshCcw, Star,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Yardım Merkezi',
}

export default async function YardimPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const contactHref = await vitrinHref(locale, '/contact')
  const T = getMessages(locale).helpPage

  const TOPICS = [
    { icon: CreditCard, title: T.topics.paymentTitle, desc: T.topics.paymentDesc },
    { icon: RefreshCcw, title: T.topics.cancellationTitle, desc: T.topics.cancellationDesc },
    { icon: Star, title: T.topics.reservationTitle, desc: T.topics.reservationDesc },
    { icon: Lock, title: T.topics.accountTitle, desc: T.topics.accountDesc },
    { icon: Star, title: T.topics.reviewsTitle, desc: T.topics.reviewsDesc },
    { icon: BookOpen, title: T.topics.listingTitle, desc: T.topics.listingDesc },
  ]

  return (
    <div className="pb-24 pt-10 sm:py-24">
      <div className="container mx-auto max-w-5xl px-4">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
              <LifeBuoy className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white sm:text-5xl">{T.pageTitle}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-500 dark:text-neutral-400">{T.pageSubtitle}</p>
        </div>

        {/* Konu Kartları */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-white">{T.topicsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SSS */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-white">{T.faqTitle}</h2>
          <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
            {T.faqs.map(({ q, a }) => (
              <details key={q} className="group bg-white dark:bg-neutral-800">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 font-medium text-neutral-900 marker:content-none dark:text-white">
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 shrink-0 text-primary-500" />
                    {q}
                  </span>
                  <svg className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 pt-1 text-sm/relaxed text-neutral-600 dark:text-neutral-400">{a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* İletişim */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-white">{T.contactTitle}</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/20">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">{T.liveChatTitle}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{T.liveChatDesc}</p>
              </div>
            </div>
            <Link href={contactHref}
              className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-6 transition hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">{T.contactFormTitle}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{T.contactFormDesc}</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

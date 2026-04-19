'use client'

import NotFoundLog from '@/components/NotFoundLog'
import I404Png from '@/images/404.png'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { getMessages } from '@/utils/getT'
import Image from 'next/image'
import { useParams } from 'next/navigation'

export default function LocaleNotFound() {
  const params = useParams()
  const vitrinPath = useVitrinHref()
  const raw = params?.locale
  const locale = typeof raw === 'string' && isAppLocale(raw) ? raw : defaultLocale
  const homeHref = vitrinPath('/')
  const t = getMessages(locale)
  const title = t.site.notFound.title
  const cta = t.site.notFound.backHome

  return (
    <div className="nc-Page404">
      <NotFoundLog />
      <div className="relative container pt-5 pb-16 lg:pt-5 lg:pb-20">
        <header className="mx-auto max-w-2xl space-y-2 text-center">
          <Image src={I404Png} alt="not-found" />
          <span className="block text-sm font-medium tracking-wider text-neutral-800 sm:text-base dark:text-neutral-200">
            {title}{' '}
          </span>
          <div className="pt-8">
            <ButtonPrimary href={homeHref}>{cta}</ButtonPrimary>
          </div>
        </header>
      </div>
    </div>
  )
}

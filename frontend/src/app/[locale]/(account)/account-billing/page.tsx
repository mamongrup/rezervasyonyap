'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { useParams } from 'next/navigation'

/**
 * İstemci sayfası: Next 16 production worker'ında bu rotanın metadata
 * prerender'ı request workStore olmadan çalışıp bütün build'i düşürebiliyordu.
 * Hesap layout'u zaten dinamik; locale'i güvenli biçimde URL parametresinden al.
 */
export default function AccountBillingPage() {
  const params = useParams<{ locale?: string }>()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const T = getMessages(locale).accountPage

  return (
    <div>
      <h1 className="text-3xl font-semibold">{T['Payments & payouts']}</h1>

      <Divider className="my-8 w-14!" />

      <div className="max-w-2xl">
        <span className="block text-xl font-semibold">{T['Payout methods']}</span>
        <br />
        <span className="block text-neutral-700 dark:text-neutral-300">
          {T.payoutDesc}
          <br />
          <br />
          {T.payoutLearnMore}
        </span>
        <div className="pt-10">
          <ButtonPrimary>{T['Add payout method']}</ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const T = getMessages(locale).accountPage
  return { title: T.paymentsPageTitle, description: T.pageDescription }
}

export default async function AccountBillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
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

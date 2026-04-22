'use client'

import AdminMerchantIntegrationsSection from '../../AdminMerchantIntegrationsSection'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { ManageAccessGuard } from '@/lib/use-manage-access'
import Link from 'next/link'
import { CreditCard, Link2, Store } from 'lucide-react'

export default function AdminPaymentGatewaysPage() {
  const vitrinPath = useVitrinHref()
  const posHref = vitrinPath('/manage/finance/payment-gateways')

  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <header className="mb-8 max-w-3xl">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              <Store className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Ticari ve sosyal entegrasyonlar
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                Bu sayfa <strong className="font-medium text-neutral-800 dark:text-neutral-200">Google Merchant</strong>,{' '}
                <strong className="font-medium text-neutral-800 dark:text-neutral-200">Instagram Shop</strong> ve{' '}
                <strong className="font-medium text-neutral-800 dark:text-neutral-200">WhatsApp sipariş</strong> kayıtlarını
                yönetir. Kredi kartı / sanal POS ayarları ayrıdır.
              </p>
            </div>
          </div>

          <Link
            href={posHref}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
          >
            <CreditCard className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span>
              <span className="font-semibold">Sanal POS (PayTR / Paratika)</span>
              <span className="mt-0.5 block text-xs font-normal opacity-90">
                Ödeme geçidi ve üye işyeri anahtarları → Finans sayfasına git
              </span>
            </span>
            <Link2 className="ml-auto h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </Link>
        </header>

        <AdminMerchantIntegrationsSection />
      </div>
    </ManageAccessGuard>
  )
}

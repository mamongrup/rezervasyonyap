'use client'

import { checkoutT } from '@/lib/checkout-i18n'
import { ShieldCheck } from 'lucide-react'

type Props = {
  locale: string
}

const PayWith = ({ locale }: Props) => {
  const C = checkoutT(locale)

  return (
    <div className="pt-2">
      <h3 className="text-2xl font-semibold">{C.payWithTitle}</h3>
      <div className="my-5 w-14 border-b border-neutral-200 dark:border-neutral-700" />

      <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/50">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {C.payWithSecureNote ?? 'Güvenli 3D Secure ödeme'}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {C.payWithRedirectNote ??
              '"Onayla ve öde" butonuna bastıktan sonra güvenli ödeme sayfasına yönlendirileceksiniz. Kart bilgileriniz sitemizde saklanmaz.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PayWith

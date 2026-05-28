import { intlDateLocaleTag } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'

export function checkoutT(locale: string | undefined | null) {
  return getMessages(locale).checkout
}

/** `{key}` yer tutucularını doldurur. */
export function fmtCheckout(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

export function formatCheckoutDate(locale: string | undefined | null, iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(intlDateLocaleTag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCheckoutMoney(
  locale: string | undefined | null,
  amount: number,
  currency: string,
): string {
  return new Intl.NumberFormat(intlDateLocaleTag(locale), {
    style: 'currency',
    currency: currency || 'TRY',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function checkoutStatusLabel(locale: string | undefined | null, status: string): string {
  const st = checkoutT(locale).status
  const key = status as keyof typeof st
  return st[key] ?? status
}

export function checkoutCouponError(locale: string | undefined | null, code: string): string {
  const errs = checkoutT(locale).couponErrors
  const key = code as keyof typeof errs
  return errs[key] ?? errs.unknown
}

/** PayTR `lang` parametresi — desteklenmeyen diller EN. */
export function paytrLangFromLocale(locale: string | undefined | null): 'tr' | 'en' {
  const l = (locale ?? 'tr').trim().toLowerCase()
  return l === 'tr' ? 'tr' : 'en'
}

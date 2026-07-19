'use client'

import { convertAmountWithRates } from '@/lib/currency-convert'
import { resolveCheckoutPaymentAmount } from '@/lib/checkout-payment-currency'
import { formatMoneyIntl, parseListingPriceString } from '@/lib/parse-listing-price'
import type { PublicCurrencyRateRow } from '@/lib/travel-api'
import { getPublicCurrencyRates } from '@/lib/travel-api'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

export const PREFERRED_CURRENCY_STORAGE_KEY = 'preferred_currency'

export const PREFERRED_CURRENCY_EVENT = 'preferred-currency-change'

type Ctx = {
  /** Kullanıcının seçtiği ISO kod (header ile aynı) */
  preferredCode: string
  rates: PublicCurrencyRateRow[]
  /** Kurlar veya para listesi yüklendi */
  ready: boolean
}

const PreferredCurrencyContext = createContext<Ctx | null>(null)

/** localStorage'ı senkron okur; SSR'de (window yok) 'TRY' döner. */
function readSavedCurrency(): string {
  if (typeof window === 'undefined') return 'TRY'
  try {
    const s = localStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY)
    if (s?.trim()) return s.trim().toUpperCase()
  } catch { /* ignore */ }
  return 'TRY'
}

export function PreferredCurrencyProvider({
  children,
  initialRates = [],
}: {
  children: React.ReactNode
  /** Sunucu (layout) tarafında çekilen kurlar — ilk boyamada dönüşüm için */
  initialRates?: PublicCurrencyRateRow[]
}) {
  // useState initializer ile ilk render'da localStorage'tan okur
  const [preferredCode, setPreferredCode] = useState(readSavedCurrency)
  const [rates, setRates] = useState<PublicCurrencyRateRow[]>(initialRates)

  useEffect(() => {
    // SSR'de window yokken TRY ile gelen state'i, istemcide localStorage ile hizala
    // useLayoutEffect değil: commit turunda layout okuma/yazma yarışı yok (PSI forced reflow)
    setPreferredCode(readSavedCurrency())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFERRED_CURRENCY_STORAGE_KEY && e.newValue?.trim()) {
        setPreferredCode(e.newValue.trim().toUpperCase())
      }
    }
    const onPick = (e: Event) => {
      const d = (e as CustomEvent<string>).detail
      if (typeof d === 'string' && d.trim()) setPreferredCode(d.trim().toUpperCase())
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(PREFERRED_CURRENCY_EVENT, onPick as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(PREFERRED_CURRENCY_EVENT, onPick as EventListener)
    }
  }, [])

  const ratesFetchedRef = useRef(false)
  useEffect(() => {
    if (ratesFetchedRef.current) return
    ratesFetchedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const rateRows = await getPublicCurrencyRates()
        if (!cancelled) setRates(rateRows)
      } catch {
        if (!cancelled) setRates([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ready = true

  const value = useMemo(
    () => ({
      preferredCode,
      rates,
      ready,
    }),
    [preferredCode, rates, ready],
  )

  return <PreferredCurrencyContext.Provider value={value}>{children}</PreferredCurrencyContext.Provider>
}

export function usePreferredCurrencyContext(): Ctx | null {
  return useContext(PreferredCurrencyContext)
}

/**
 * İlan tutarını seçilen para biriminde biçimlendirir (kur yoksa ilanın kendi para biriminde gösterir).
 * `priceAmountMax`: tatil evi dönemsel kurallardan gelen üst gecelik — min–max gösterimi.
 */
export function useConvertedListingPrice(
  priceLabel: string | undefined,
  priceAmount: number | undefined,
  priceCurrency: string | undefined,
  priceAmountMax?: number,
): string {
  const ctx = usePreferredCurrencyContext()

  return useMemo(() => {
    const amount =
      typeof priceAmount === 'number' && Number.isFinite(priceAmount) ? priceAmount : undefined
    const amountMax =
      typeof priceAmountMax === 'number' && Number.isFinite(priceAmountMax)
        ? priceAmountMax
        : undefined
    const cur = priceCurrency?.trim().toUpperCase()

    const hasRange =
      amount != null && amountMax != null && cur && amountMax > amount + 0.004

    const native =
      hasRange
        ? `${formatMoneyIntl(amount, cur)} – ${formatMoneyIntl(amountMax, cur)}`
        : amount != null && cur
          ? formatMoneyIntl(amount, cur)
          : (priceLabel?.trim() || '—')

    if (!ctx) return native

    const target = ctx.preferredCode

    if (hasRange && target) {
      if (cur === target || ctx.rates.length === 0) {
        return `${formatMoneyIntl(amount, cur)} – ${formatMoneyIntl(amountMax, cur)}`
      }
      const cMin = convertAmountWithRates(amount, cur, target, ctx.rates)
      const cMax = convertAmountWithRates(amountMax, cur, target, ctx.rates)
      if (cMin != null && cMax != null && cMax > cMin + 0.004) {
        return `${formatMoneyIntl(cMin, target)} – ${formatMoneyIntl(cMax, target)}`
      }
      return `${formatMoneyIntl(amount, cur)} – ${formatMoneyIntl(amountMax, cur)}`
    }

    let from = cur
    let val = amount

    if ((val == null || !from) && priceLabel) {
      const p = parseListingPriceString(priceLabel)
      if (p) {
        val = p.amount
        from = p.currency
      }
    }

    if (val == null || !from || !target) return native
    if (from === target) return formatMoneyIntl(val, target)

    if (ctx.rates.length === 0) return native

    const converted = convertAmountWithRates(val, from, target, ctx.rates)
    if (converted == null) return native
    return formatMoneyIntl(converted, target)
  }, [priceLabel, priceAmount, priceCurrency, priceAmountMax, ctx])
}

/** Sayısal tutarı header’daki seçili para biriminde biçimlendirir */
export function useFormatMoneyInPreferredCurrency(
  amount: number | null | undefined,
  fromCurrency: string | undefined,
): string {
  const ctx = usePreferredCurrencyContext()

  return useMemo(() => {
    const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : null
    const from = (fromCurrency?.trim().toUpperCase() || 'TRY')
    if (n == null || n <= 0) return '—'
    if (!ctx) return formatMoneyIntl(n, from)

    const target = (ctx.preferredCode?.trim().toUpperCase() || from)
    if (from === target || ctx.rates.length === 0) return formatMoneyIntl(n, from)

    const converted = convertAmountWithRates(n, from, target, ctx.rates)
    return converted != null ? formatMoneyIntl(converted, target) : formatMoneyIntl(n, from)
  }, [amount, fromCurrency, ctx])
}

/** Checkout / ödeme URL'si için seçili para biriminde tutar */
export function useCheckoutPaymentAmount(
  listingCurrency: string,
  amountInListingCurrency: number,
): { currencyCode: string; unitPrice: number } {
  const ctx = usePreferredCurrencyContext()

  return useMemo(
    () =>
      resolveCheckoutPaymentAmount(
        listingCurrency,
        amountInListingCurrency,
        ctx?.rates ?? [],
        ctx?.preferredCode,
      ),
    [listingCurrency, amountInListingCurrency, ctx?.rates, ctx?.preferredCode],
  )
}

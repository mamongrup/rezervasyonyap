'use client'

import { convertAmountWithRates } from '@/lib/currency-convert'
import { formatMoneyIntl, parseListingPriceString } from '@/lib/parse-listing-price'
import type { PublicCurrencyRateRow } from '@/lib/travel-api'
import { getPublicCurrencyRates } from '@/lib/travel-api'
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

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
  // useState initializer ile ilk render'da localStorage'tan okur → useLayoutEffect race ortadan kalkar
  const [preferredCode, setPreferredCode] = useState(readSavedCurrency)
  const [rates, setRates] = useState<PublicCurrencyRateRow[]>(initialRates)

  useLayoutEffect(() => {
    // SSR'de window yokken TRY ile gelen state'i, istemcide localStorage ile hizala
    setPreferredCode(readSavedCurrency())
  }, [])

  useLayoutEffect(() => {
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
 */
export function useConvertedListingPrice(
  priceLabel: string | undefined,
  priceAmount: number | undefined,
  priceCurrency: string | undefined,
): string {
  const ctx = usePreferredCurrencyContext()

  return useMemo(() => {
    const amount =
      typeof priceAmount === 'number' && Number.isFinite(priceAmount) ? priceAmount : undefined
    const cur = priceCurrency?.trim().toUpperCase()

    const native =
      amount != null && cur
        ? formatMoneyIntl(amount, cur)
        : (priceLabel?.trim() ?? '—')

    if (!ctx) return native

    const target = ctx.preferredCode
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
  }, [priceLabel, priceAmount, priceCurrency, ctx])
}

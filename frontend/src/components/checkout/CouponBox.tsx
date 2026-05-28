'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { validateCouponPublic, type CouponPreview } from '@/lib/travel-api'
import { checkoutCouponError, checkoutT, fmtCheckout } from '@/lib/checkout-i18n'

type Props = {
  locale: string
  subtotal: number
  onCouponChange: (preview: CouponPreview | null) => void
}

export default function CouponBox({ locale, subtotal, onCouponChange }: Props) {
  const C = checkoutT(locale)
  const searchParams = useSearchParams()
  const [code, setCode] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [applied, setApplied] = React.useState<CouponPreview | null>(null)
  const autoTried = React.useRef(false)

  const apply = async () => {
    const c = code.trim().toUpperCase()
    if (!c) {
      setErr(checkoutCouponError(locale, 'code_required'))
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const r = await validateCouponPublic(c, subtotal)
      setApplied(r)
      onCouponChange(r)
    } catch (e) {
      const m = e instanceof Error ? e.message : 'unknown'
      setApplied(null)
      onCouponChange(null)
      setErr(checkoutCouponError(locale, m))
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    setApplied(null)
    setCode('')
    setErr(null)
    onCouponChange(null)
  }

  React.useEffect(() => {
    if (autoTried.current) return
    if (applied) return
    if (!searchParams) return
    const fromUrl = searchParams.get('coupon')?.trim().toUpperCase()
    if (!fromUrl) return
    autoTried.current = true
    setCode(fromUrl)
    if (subtotal > 0) {
      void (async () => {
        setBusy(true)
        setErr(null)
        try {
          const r = await validateCouponPublic(fromUrl, subtotal)
          setApplied(r)
          onCouponChange(r)
        } catch (e) {
          const m = e instanceof Error ? e.message : 'unknown'
          setErr(checkoutCouponError(locale, m))
        } finally {
          setBusy(false)
        }
      })()
    }
  }, [searchParams, subtotal, applied, onCouponChange, locale])

  if (applied) {
    const isPercent = applied.discount_type === 'percent'
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-900/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {fmtCheckout(C.couponApplied, { code: applied.code })}
            </div>
            <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              {isPercent
                ? fmtCheckout(C.couponDiscountPercent, { value: applied.discount_value })
                : fmtCheckout(C.couponDiscountFixed, { value: applied.discount_value })}{' '}
              · {fmtCheckout(C.couponSavings, { amount: applied.discount_amount })}
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            className="rounded-md px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-800/40"
          >
            {C.couponRemove}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{C.couponPrompt}</div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={C.couponPlaceholder}
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm uppercase placeholder:normal-case focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
          disabled={busy}
          autoComplete="off"
          maxLength={32}
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {busy ? '…' : C.couponApply}
        </button>
      </div>
      {err && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</div>}
    </div>
  )
}

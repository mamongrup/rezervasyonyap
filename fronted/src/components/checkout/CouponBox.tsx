'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { validateCouponPublic, type CouponPreview } from '@/lib/travel-api'

type Props = {
  /** Kullanıcı toplamı (TL/USD vb. — pasif validate; backend asıl uygulamayı yapar). */
  subtotal: number
  /** Kupon değiştiğinde dışarıya bildir — checkout submit sırasında uygulanacak. */
  onCouponChange: (preview: CouponPreview | null) => void
}

const ERR_MSG: Record<string, string> = {
  code_required: 'Kupon kodu girin.',
  coupon_not_found_or_expired: 'Kupon bulunamadı veya süresi geçmiş.',
  coupon_max_uses: 'Bu kuponun kullanım limiti dolmuş.',
  coupon_min_order_not_met: 'Minimum sepet tutarına ulaşılmadı.',
  coupon_category_not_allowed: 'Bu kupon sepetinizdeki ürünler için geçerli değil.',
  validate_failed: 'Doğrulama başarısız. Lütfen tekrar deneyin.',
}

export default function CouponBox({ subtotal, onCouponChange }: Props) {
  const searchParams = useSearchParams()
  const [code, setCode] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [applied, setApplied] = React.useState<CouponPreview | null>(null)
  const autoTried = React.useRef(false)

  const apply = async () => {
    const c = code.trim().toUpperCase()
    if (!c) {
      setErr(ERR_MSG.code_required)
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
      setErr(ERR_MSG[m] ?? 'Kupon uygulanamadı.')
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

  // URL ?coupon=KOD ile gelen kullanıcı için otomatik doldur + dene.
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
          setErr(ERR_MSG[m] ?? 'Kupon uygulanamadı.')
        } finally {
          setBusy(false)
        }
      })()
    }
  }, [searchParams, subtotal, applied, onCouponChange])

  if (applied) {
    const isPercent = applied.discount_type === 'percent'
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-900/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {applied.code} kuponu uygulandı
            </div>
            <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              {isPercent
                ? `%${applied.discount_value} indirim`
                : `${applied.discount_value} indirim`}{' '}
              · Tasarruf: {applied.discount_amount}
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            className="rounded-md px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-800/40"
          >
            Kaldır
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
        Kupon kodun var mı?
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ÖRNEK20"
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
          {busy ? '…' : 'Uygula'}
        </button>
      </div>
      {err && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</div>}
    </div>
  )
}

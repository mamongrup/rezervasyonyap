'use client'

import React from 'react'
import {
  getListingPerks,
  patchListingPerks,
  type ListingPerks,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'

type Props = {
  listingId: string
}

export default function ListingPerksManageCard({ listingId }: Props) {
  const [perks, setPerks] = React.useState<ListingPerks | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getListingPerks(listingId)
      .then((p) => {
        if (!cancelled) setPerks(p)
      })
      .catch(() => {
        if (!cancelled) setPerks({ instant_book: false, mobile_discount_percent: 0, super_host: false })
      })
    return () => {
      cancelled = true
    }
  }, [listingId])

  const update = async (body: Partial<{ instant_book: boolean; mobile_discount_percent: number }>) => {
    const token = getStoredAuthToken()
    if (!token) {
      setMsg('Yetkilendirme bulunamadı.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      await patchListingPerks(token, listingId, body)
      setPerks((cur) => (cur ? { ...cur, ...body } : cur))
      setMsg('Kaydedildi ✓')
      setTimeout(() => setMsg(null), 1500)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Hata')
    } finally {
      setBusy(false)
    }
  }

  if (!perks) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        Yükleniyor…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <div className="text-base font-semibold">Vitrin Özellikleri</div>
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Bu seçenekler ilan detayında özel rozet ve fiyat indirimleri olarak görünür.
        </div>
      </div>

      {/* Anında Onay */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-900/20">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={perks.instant_book}
          disabled={busy}
          onChange={(e) => update({ instant_book: e.target.checked })}
        />
        <div className="flex-1">
          <div className="text-sm font-semibold text-sky-900 dark:text-sky-200">
            ⚡ Anında Onay (Instant Book)
          </div>
          <div className="mt-0.5 text-xs text-sky-800/80 dark:text-sky-300/80">
            Misafir manuel onayınızı beklemeden anında rezerve edebilir. Booking
            stilinde dönüşüm artırır.
          </div>
        </div>
      </label>

      {/* Mobil indirim */}
      <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3 dark:border-fuchsia-800 dark:bg-fuchsia-900/20">
        <div className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-200">
          📱 Mobil-özel indirim (%)
        </div>
        <div className="mt-0.5 text-xs text-fuchsia-800/80 dark:text-fuchsia-300/80">
          Yalnızca mobil cihazdan görüntüleyenlere uygulanan ek indirim (0-50).
          Booking & Etstur'un mobil indirim stratejisi.
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            defaultValue={perks.mobile_discount_percent}
            disabled={busy}
            className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            onBlur={(e) => {
              const v = Number(e.target.value)
              if (!Number.isNaN(v) && v !== perks.mobile_discount_percent) {
                update({ mobile_discount_percent: Math.max(0, Math.min(50, v)) })
              }
            }}
          />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            %
          </span>
        </div>
      </div>

      {/* Süper Ev Sahibi readonly */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          ⭐ Süper Ev Sahibi
        </div>
        <div className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
          Bu rozet kuruluş seviyesinde verilir (yüksek puan + tamamlama oranı +
          hızlı yanıt). Şu anki durum:{' '}
          <span className="font-semibold">
            {perks.super_host ? 'Aktif' : 'Aktif değil'}
          </span>
        </div>
      </div>

      {msg && (
        <div className="text-xs text-neutral-600 dark:text-neutral-400">{msg}</div>
      )}
    </div>
  )
}

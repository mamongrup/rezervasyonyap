'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { HotelFacetSelectPanels } from '@/components/catalog/HotelFacetSelectPanels'
import {
  getListingAttributeValues,
  patchManageHotelDetails,
  putListingAttributeValues,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useEffect, useState } from 'react'

export default function HotelFacetsEditor({
  listingId,
  organizationId,
  locale,
  starRating,
  onStarSaved,
}: {
  listingId: string
  organizationId?: string
  locale: string
  starRating: string
  onStarSaved?: (star: string) => void
}) {
  const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined
  const selectCls =
    'block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100'

  const [hotelTypeCode, setHotelTypeCode] = useState('')
  const [hotelThemeCode, setHotelThemeCode] = useState('')
  const [hotelAccommodation, setHotelAccommodation] = useState('')
  const [star, setStar] = useState(starRating)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setStar(starRating)
  }, [starRating])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    void getListingAttributeValues(token, listingId)
      .then((res) => {
        if (cancelled) return
        const vm: Record<string, string> = {}
        for (const v of res.values) {
          let value = v.value_json
          if (typeof value === 'string' && value.startsWith('"')) {
            try {
              const parsed = JSON.parse(value)
              value = typeof parsed === 'string' ? parsed : value
            } catch {
              /* keep raw */
            }
          }
          vm[`${v.group_code}.${v.key}`] = String(value ?? '')
        }
        setHotelTypeCode(vm['hotel.hotel_type_code'] ?? '')
        setHotelThemeCode(vm['hotel.theme_code'] ?? '')
        setHotelAccommodation(vm['hotel.accommodation_code'] ?? '')
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId, organizationId])

  async function handleSave() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      const payload = [
        { group_code: 'hotel', key: 'hotel_type_code', value: hotelTypeCode.trim() },
        { group_code: 'hotel', key: 'theme_code', value: hotelThemeCode.trim() },
        { group_code: 'hotel', key: 'accommodation_code', value: hotelAccommodation.trim() },
      ].filter((row) => row.value !== '')
      await putListingAttributeValues(token, listingId, payload, orgParam)
      await patchManageHotelDetails(
        token,
        listingId,
        { star_rating: star.trim() || undefined },
        orgParam,
      )
      onStarSaved?.(star.trim())
      setMsg({ ok: true, text: 'Otel profili kaydedildi.' })
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'),
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-400">Otel profili yükleniyor…</p>

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Otel tipi, tema ve konaklama tipi vitrin başlığındaki kategori etiketi ile filtrelerde kullanılır. Yıldız
        sınıfı otel adının altında gösterilir.
      </p>
      <HotelFacetSelectPanels
        locale={locale}
        selectCls={selectCls}
        hotelTypeCode={hotelTypeCode}
        setHotelTypeCode={setHotelTypeCode}
        hotelThemeCode={hotelThemeCode}
        setHotelThemeCode={setHotelThemeCode}
        hotelAccommodation={hotelAccommodation}
        setHotelAccommodation={setHotelAccommodation}
        hotelStar={star}
        setHotelStar={setStar}
      />
      <ButtonPrimary type="button" onClick={() => void handleSave()} disabled={busy}>
        {busy ? 'Kaydediliyor…' : 'Otel profilini kaydet'}
      </ButtonPrimary>
      {msg ? (
        <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  )
}

/**
 * /api/yolcu360-cars?pickup=Istanbul&dropoff=Istanbul&checkin=2024-06-10T10:00&checkout=2024-06-15T10:00
 *
 * Yolcu360 araç arama proxy'si (BFF).
 * Backend Gleam API'sine iletir — Yolcu360 kimlik bilgileri sunucuda kalır.
 *
 * Yolcu360 etkin değilse: 503 { error: "yolcu360_not_enabled" }
 * Başarılı: 200 { cars: Yolcu360Car[] }
 */

import { apiOriginForFetch } from '@/lib/api-origin'
import { NextRequest, NextResponse } from 'next/server'

export interface Yolcu360Car {
  id: string
  vehicleClass?: string
  brand?: string
  model?: string
  imageUrl?: string
  thumbnailUrl?: string
  dailyPrice?: number
  totalPrice?: number
  currency?: string
  transmission?: string
  seats?: number
  fuelType?: string
  bags?: number
  vendorName?: string
  vendorLogo?: string
  requiresFindeks?: boolean
  pickupLocationId?: string
  returnLocationId?: string
  [key: string]: unknown
}

function normalizeCars(raw: unknown): Yolcu360Car[] {
  if (Array.isArray(raw)) return raw as Yolcu360Car[]
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    if (Array.isArray(r['data'])) return r['data'] as Yolcu360Car[]
    if (Array.isArray(r['cars'])) return r['cars'] as Yolcu360Car[]
    if (Array.isArray(r['vehicles'])) return r['vehicles'] as Yolcu360Car[]
    if (Array.isArray(r['results'])) return r['results'] as Yolcu360Car[]
  }
  return []
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const pickup = sp.get('pickup')?.trim() ?? ''
  const dropoff = sp.get('dropoff')?.trim() ?? pickup
  const checkin = sp.get('checkin')?.trim() ?? ''
  const checkout = sp.get('checkout')?.trim() ?? ''

  if (!pickup || !checkin || !checkout) {
    return NextResponse.json({ error: 'pickup_checkin_checkout_required' }, { status: 400 })
  }

  const apiBase = apiOriginForFetch()
  if (!apiBase) {
    return NextResponse.json({ error: 'api_not_configured' }, { status: 503 })
  }

  const params = new URLSearchParams({
    pickup,
    dropoff: dropoff || pickup,
    checkin,
    checkout,
  })

  try {
    const res = await fetch(
      `${apiBase}/api/v1/public/yolcu360/cars?${params.toString()}`,
      { cache: 'no-store' },
    )

    if (res.status === 503) {
      return NextResponse.json({ error: 'yolcu360_not_enabled' }, { status: 503 })
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'upstream_error' }))
      return NextResponse.json(err, { status: res.status })
    }

    const raw = await res.json()
    const cars = normalizeCars(raw)
    return NextResponse.json({ cars })
  } catch {
    return NextResponse.json({ error: 'yolcu360_http_failed' }, { status: 502 })
  }
}

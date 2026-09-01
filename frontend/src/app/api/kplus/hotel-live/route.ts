import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LiveRoom = {
  name: string
  nightlyPrice: number
  currency: string
  boardType: string | null
  availableUnits: number
  roomCode: string | null
  searchKey: string | null
}

type CacheEntry = { expiresAt: number; promise: Promise<ResponseBody> }
type ResponseBody = {
  ok: boolean
  available: boolean
  rooms: LiveRoom[]
  checkedAt: string
  error?: string
}

const responseCache = new Map<string, CacheEntry>()
const CACHE_MS = 45_000

function isoDate(value: unknown): string | null {
  const text = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const date = new Date(`${text}T12:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text
}

function positiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(max, parsed) : fallback
}

function scriptModuleUrl(file: string): string {
  return pathToFileURL(path.resolve(process.cwd(), '..', 'scripts', 'lib', file)).href
}

async function importScriptModule(file: string): Promise<Record<string, any>> {
  // These modules are deliberately loaded at runtime: they are shared by import jobs
  // and the Next server, but must not be bundled into the browser build.
  return import(/* webpackIgnore: true */ scriptModuleUrl(file)) as Promise<Record<string, any>>
}

function roomNameKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function queryLive(input: {
  listingId: string
  checkIn: string
  checkOut: string
  adults: number
  childAges: number[]
}): Promise<ResponseBody> {
  const [{ createPgClient }, api, roomApi, extras] = await Promise.all([
    importScriptModule('pg-client.mjs'),
    importScriptModule('travelrobot-api.mjs'),
    importScriptModule('travelrobot-hotel-rooms.mjs'),
    importScriptModule('travelrobot-hotel-extras.mjs'),
  ])

  const pg = createPgClient()
  await pg.connect()
  let hotelCode = ''
  try {
    const result = await pg.query(
      `SELECT lhd.travelrobot_hotel_code::text AS code
       FROM listings l
       JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
       WHERE l.id = $1::uuid
         AND l.status = 'published'
         AND l.external_provider_code = 'travelrobot'
       LIMIT 1`,
      [input.listingId],
    )
    hotelCode = String(result.rows[0]?.code ?? '').trim()
  } finally {
    await pg.end()
  }
  if (!hotelCode) {
    return { ok: false, available: false, rooms: [], checkedAt: new Date().toISOString(), error: 'not_kplus' }
  }

  const cfg = await api.loadTravelrobotConfig()
  if (!cfg.channelCode || !cfg.channelPassword) throw new Error('kplus_credentials_missing')
  const { tokenCode } = await api.createTravelrobotToken(cfg)
  const childAgeList = input.childAges.map((age) => Math.max(0, Math.min(17, age)))
  const enriched = await roomApi.enrichHotelRowWithRoomPrices(
    cfg,
    tokenCode,
    { HotelCode: hotelCode, HotelId: hotelCode },
    {
      force: true,
      minOffers: 1,
      checkInDate: input.checkIn,
      checkOutDate: input.checkOut,
      rooms: [
        {
          adults: Math.max(1, input.adults),
          children: childAgeList.length,
          childAges: childAgeList,
        },
      ],
      onRequest: false,
      timeoutMs: 30_000,
    },
  )

  const deduped = new Map<string, LiveRoom>()
  for (const row of extras.buildTravelrobotHotelRoomRows(enriched) as Array<Record<string, any>>) {
    const nightlyPrice = Number(row.price)
    const name = String(row.name ?? '').trim()
    if (!name || !Number.isFinite(nightlyPrice) || nightlyPrice <= 0) continue
    const meta = row.meta && typeof row.meta === 'object' ? row.meta : {}
    const item: LiveRoom = {
      name,
      nightlyPrice,
      currency: String(meta.currency ?? row.currency ?? 'TRY').trim().toUpperCase() || 'TRY',
      boardType: String(meta.board_type ?? row.board_type ?? '').trim() || null,
      availableUnits: Math.max(1, Number(meta.available_units ?? row.unitCount ?? 1) || 1),
      roomCode: String(meta.travelrobot_room_code ?? '').trim() || null,
      searchKey: String(meta.search_key ?? '').trim() || null,
    }
    const key = roomNameKey(name)
    const current = deduped.get(key)
    if (!current || item.nightlyPrice < current.nightlyPrice) deduped.set(key, item)
  }

  const rooms = [...deduped.values()].sort((a, b) => a.nightlyPrice - b.nightlyPrice)
  return { ok: true, available: rooms.length > 0, rooms, checkedAt: new Date().toISOString() }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const listingId = String(body.listingId ?? '').trim()
    const checkIn = isoDate(body.checkIn)
    const checkOut = isoDate(body.checkOut)
    const adults = Math.max(1, positiveInt(body.adults, 2, 12))
    const childAges = Array.isArray(body.childAges)
      ? body.childAges.slice(0, 8).map((age) => positiveInt(age, 0, 17))
      : []
    if (!/^[0-9a-f-]{36}$/i.test(listingId) || !checkIn || !checkOut || checkOut <= checkIn) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const key = JSON.stringify([listingId, checkIn, checkOut, adults, childAges])
    const now = Date.now()
    let entry = responseCache.get(key)
    if (!entry || entry.expiresAt <= now) {
      entry = {
        expiresAt: now + CACHE_MS,
        promise: queryLive({ listingId, checkIn, checkOut, adults, childAges }),
      }
      responseCache.set(key, entry)
      if (responseCache.size > 200) {
        for (const [cacheKey, cached] of responseCache) {
          if (cached.expiresAt <= now) responseCache.delete(cacheKey)
        }
      }
    }
    return NextResponse.json(await entry.promise, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        available: false,
        rooms: [],
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message.slice(0, 160) : 'kplus_live_failed',
      },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}

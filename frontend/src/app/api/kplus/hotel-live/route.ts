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

async function persistVerifiedRoomCalendar(
  listingId: string,
  checkIn: string,
  checkOut: string,
  rooms: LiveRoom[],
): Promise<void> {
  const { createPgClient } = await importScriptModule('pg-client.mjs')
  const pg = createPgClient()
  await pg.connect()
  try {
    await pg.query('BEGIN')
    const stored = await pg.query(
      `SELECT id::text, name FROM hotel_rooms WHERE listing_id=$1::uuid FOR UPDATE`,
      [listingId],
    )
    const idsByName = new Map(stored.rows.map((row: Record<string, any>) => [roomNameKey(row.name), row.id]))
    const nights = dateRangeNights(checkIn, checkOut)
    // Seçilen aralık yeniden doğrulanırken eski sağlayıcı stoğu açık kalmasın.
    await pg.query(
      `INSERT INTO hotel_room_availability_calendar (hotel_room_id, day, available_units, price_override)
       SELECT hr.id, d.day::date, 0, NULL
       FROM hotel_rooms hr
       CROSS JOIN generate_series($2::date, $3::date - interval '1 day', interval '1 day') d(day)
       WHERE hr.listing_id=$1::uuid
       ON CONFLICT (hotel_room_id, day)
       DO UPDATE SET available_units=0, price_override=NULL`,
      [listingId, checkIn, checkOut],
    )
    for (const room of rooms) {
      const roomId = idsByName.get(roomNameKey(room.name))
      if (!roomId) continue
      for (const day of nights) {
        await pg.query(
          `INSERT INTO hotel_room_availability_calendar (hotel_room_id, day, available_units, price_override)
           VALUES ($1::uuid, $2::date, $3::smallint, $4::numeric)
           ON CONFLICT (hotel_room_id, day)
           DO UPDATE SET available_units=excluded.available_units, price_override=excluded.price_override`,
          [roomId, day, room.availableUnits, room.nightlyPrice],
        )
      }
    }
    await pg.query('COMMIT')
  } catch (error) {
    await pg.query('ROLLBACK')
    throw error
  } finally {
    await pg.end()
  }
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

function dateRangeNights(checkIn: string, checkOut: string): string[] {
  const out: string[] = []
  const cursor = new Date(`${checkIn}T12:00:00Z`)
  const end = new Date(`${checkOut}T12:00:00Z`)
  while (cursor < end && out.length < 60) {
    out.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

function importedRoomNightly(meta: Record<string, any>, nights: string[]): number | null {
  const rows = Array.isArray(meta.seasonal_prices)
    ? meta.seasonal_prices
    : Array.isArray(meta.seasonalPrices)
      ? meta.seasonalPrices
      : []
  if (!rows.length || !nights.length) return null
  const prices: number[] = []
  for (const day of nights) {
    const matches = rows.filter((rate: Record<string, any>) => {
      const from = String(rate.validFrom ?? rate.valid_from ?? rate.startDate ?? '').slice(0, 10)
      const to = String(rate.validTo ?? rate.valid_to ?? rate.endDate ?? '').slice(0, 10)
      return (!from || day >= from) && (!to || day <= to)
    })
    const dayPrices = matches
      .map((rate: Record<string, any>) =>
        Number(rate.nightlyPrice ?? rate.nightly_price ?? rate.price ?? rate.amount),
      )
      .filter((price: number) => Number.isFinite(price) && price > 0)
    if (!dayPrices.length) return null
    prices.push(Math.min(...dayPrices))
  }
  return Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100
}

async function queryImportedHotel(input: {
  listingId: string
  checkIn: string
  checkOut: string
  adults: number
  childAges: number[]
  provider: string
}): Promise<ResponseBody> {
  const { createPgClient } = await importScriptModule('pg-client.mjs')
  const pg = createPgClient()
  await pg.connect()
  try {
    const result = await pg.query(
      `SELECT hr.id::text, hr.name, coalesce(hr.capacity, 2)::int AS capacity,
              coalesce(hr.board_type, '') AS board_type, hr.meta_json::text,
              greatest(0, hr.unit_count::int - coalesce((
                SELECT max(booked.qty)::int FROM (
                  SELECT ns.day, coalesce(sum(rli.quantity), 0)::int AS qty
                  FROM generate_series($2::date, $3::date - interval '1 day', interval '1 day') ns(day)
                  LEFT JOIN reservation_line_items rli
                    ON rli.listing_id = $1::uuid
                   AND rli.meta_json->>'hotel_room_id' = hr.id::text
                   AND rli.starts_on <= ns.day AND rli.ends_on > ns.day
                   AND EXISTS (SELECT 1 FROM reservations r WHERE r.id=rli.reservation_id AND r.status IN ('held','confirmed'))
                  GROUP BY ns.day
                ) booked
              ), 0)) AS available_units
       FROM hotel_rooms hr
       WHERE hr.listing_id = $1::uuid
       ORDER BY hr.created_at`,
      [input.listingId, input.checkIn, input.checkOut],
    )
    const nights = dateRangeNights(input.checkIn, input.checkOut)
    const guests = input.adults + input.childAges.length
    const verifiedRooms: Array<LiveRoom & { capacity: number }> = []
    for (const row of result.rows) {
      let meta: Record<string, any> = {}
      try { meta = JSON.parse(row.meta_json || '{}') } catch { /* invalid legacy metadata */ }
      const nightlyPrice = importedRoomNightly(meta, nights)
      const availableUnits = Number(row.available_units ?? 0)
      const capacity = Math.max(1, Number(row.capacity ?? 2) || 2)
      if (nightlyPrice == null || availableUnits <= 0) continue
      verifiedRooms.push({
        name: String(row.name),
        nightlyPrice,
        currency: String(meta.currency ?? 'TRY').toUpperCase(),
        boardType: String(row.board_type || meta.board_type || '').trim() || null,
        availableUnits,
        roomCode: String(meta.tatilbudur_room_type_id ?? meta.room_type_id ?? '').trim() || null,
        searchKey: null,
        capacity,
      })
    }
    const rooms = verifiedRooms
      .filter((room) => room.availableUnits * room.capacity >= guests)
      .map(({ capacity: _capacity, ...room }) => room)
    rooms.sort((a, b) => a.nightlyPrice - b.nightlyPrice)
    await persistVerifiedRoomCalendar(input.listingId, input.checkIn, input.checkOut, verifiedRooms)
    return {
      ok: true,
      available: rooms.length > 0,
      rooms,
      checkedAt: new Date().toISOString(),
      ...(rooms.length ? {} : { error: `${input.provider}_date_rate_or_inventory_missing` }),
    }
  } finally {
    await pg.end()
  }
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
  let provider = ''
  try {
    const result = await pg.query(
      `SELECT coalesce(lhd.travelrobot_hotel_code::text, '') AS code,
              coalesce(l.external_provider_code::text, '') AS provider
       FROM listings l
       JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
       WHERE l.id = $1::uuid
         AND l.status = 'published'
         AND l.external_provider_code = 'travelrobot'
       LIMIT 1`,
      [input.listingId],
    )
    hotelCode = String(result.rows[0]?.code ?? '').trim()
    provider = String(result.rows[0]?.provider ?? '').trim()
  } finally {
    await pg.end()
  }
  if (!provider) {
    return { ok: false, available: false, rooms: [], checkedAt: new Date().toISOString(), error: 'not_imported_hotel' }
  }
  if (provider !== 'travelrobot') {
    return queryImportedHotel({ ...input, provider })
  }
  if (!hotelCode) {
    return { ok: false, available: false, rooms: [], checkedAt: new Date().toISOString(), error: 'kplus_code_missing' }
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
  await persistVerifiedRoomCalendar(input.listingId, input.checkIn, input.checkOut, rooms)
  return { ok: true, available: rooms.length > 0, rooms, checkedAt: new Date().toISOString() }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 })
    }
    const body = (await request.json()) as Record<string, unknown>
    const listingId = String(body.listingId ?? '').trim()
    const checkIn = isoDate(body.checkIn)
    const checkOut = isoDate(body.checkOut)
    const adults = Math.max(1, positiveInt(body.adults, 2, 12))
    const childAges = Array.isArray(body.childAges)
      ? body.childAges.slice(0, 8).map((age) => positiveInt(age, 0, 17))
      : []
    const nights = checkIn && checkOut ? dateRangeNights(checkIn, checkOut) : []
    const today = new Date().toISOString().slice(0, 10)
    const horizon = new Date()
    horizon.setUTCMonth(horizon.getUTCMonth() + 18)
    const horizonYmd = horizon.toISOString().slice(0, 10)
    if (
      !/^[0-9a-f-]{36}$/i.test(listingId) ||
      !checkIn ||
      !checkOut ||
      checkIn < today ||
      checkOut <= checkIn ||
      checkOut > horizonYmd ||
      nights.length < 1 ||
      nights.length > 60
    ) {
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

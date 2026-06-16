#!/usr/bin/env node
/**
 * Tek Travelrobot otel teşhisi — DB + Statik API görselleri.
 *   node scripts/debug-travelrobot-hotel.mjs KTR208407
 */
import { createTravelrobotToken, loadTravelrobotConfig } from './lib/travelrobot-api.mjs'
import { authenticateStatic, getHotelContent } from './lib/travelrobot-static-api.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const code = process.argv[2]?.trim()
if (!code) {
  console.error('Kullanım: node scripts/debug-travelrobot-hotel.mjs <HotelCode>')
  process.exit(1)
}

function pickUrls(hotel) {
  const urls = []
  const push = (u) => {
    const s = String(u || '').trim()
    if (s && !urls.includes(s)) urls.push(s)
  }
  const nested = hotel?.Hotel ?? hotel?.hotel ?? hotel
  const fields = ['HotelImageURL', 'ImageUrl', 'ThumbnailUrl', 'CoverPhoto']
  for (const f of fields) push(nested?.[f] ?? hotel?.[f])
  for (const key of ['Images', 'images', 'Photos', 'photos', 'Gallery', 'gallery', 'HotelImages']) {
    const arr = nested?.[key] ?? hotel?.[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (typeof item === 'string') push(item)
      else push(item?.Url ?? item?.url ?? item?.ImageUrl ?? item?.imageUrl)
    }
  }
  return urls
}

async function loadFromDb(pg, hotelCode) {
  const r = await pg.query(
    `SELECT l.id::text, l.slug, lt.title, l.featured_image_url,
            (SELECT count(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS image_count,
            la.value_json::text AS snapshot_json
     FROM listings l
     JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
     LEFT JOIN listing_translations lt ON lt.listing_id = l.id
     LEFT JOIN locales loc ON loc.id = lt.locale_id AND loc.code = 'tr'
     LEFT JOIN listing_attributes la
       ON la.listing_id = l.id AND la.group_code = 'travelrobot' AND la.key = 'snapshot'
     WHERE lhd.travelrobot_hotel_code = $1
     LIMIT 1`,
    [hotelCode],
  )
  return r.rows[0] ?? null
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  const pg = createPgClient()
  await pg.connect()
  try {
    const row = await loadFromDb(pg, code)
    console.log('══ DB ══')
    if (!row) {
      console.log(`Kayıt yok: travelrobot_hotel_code = ${code}`)
    } else {
      console.log(`slug: ${row.slug}`)
      console.log(`title: ${row.title}`)
      console.log(`featured_image_url: ${row.featured_image_url ?? '(yok)'}`)
      console.log(`listing_images count: ${row.image_count}`)
      let snapUrls = []
      try {
        const snap = JSON.parse(row.snapshot_json || '{}')
        const catalog = snap?.catalog ?? snap
        snapUrls = pickUrls(catalog)
        console.log(`snapshot içi görsel URL: ${snapUrls.length}`)
        snapUrls.slice(0, 5).forEach((u, i) => console.log(`  [${i + 1}] ${u}`))
      } catch {
        console.log('snapshot parse edilemedi')
      }
    }

    console.log('\n══ Statik API (getHotels) ══')
    try {
      const { token } = await authenticateStatic(cfg)
      const payload = await getHotelContent(cfg, token, [code])
      const list = payload?.Result ?? payload?.Hotels ?? payload ?? []
      const hotel = Array.isArray(list) ? list[0] : list
      if (!hotel) {
        console.log('Statik API: otel bulunamadı')
      } else {
        const nested = hotel?.Hotel ?? hotel?.hotel ?? hotel
        const name = nested?.HotelName ?? nested?.Name ?? hotel?.HotelName ?? '?'
        console.log(`name: ${name}`)
        const urls = pickUrls(hotel)
        console.log(`görsel URL sayısı: ${urls.length}`)
        urls.forEach((u, i) => console.log(`  [${i + 1}] ${u}`))
      }
    } catch (e) {
      console.log(`Statik API hata: ${e.message}`)
    }

    console.log('\n══ Booking API (GetHotelDetails galeri) ══')
    try {
      const { tokenCode } = await createTravelrobotToken(cfg)
      const { getHotelDetails } = await import('./lib/travelrobot-api.mjs')
      const { mergeHotelDetailsGallery } = await import('./lib/travelrobot-hotel-details.mjs')
      const { collectHotelImageUrls } = await import('./lib/travelrobot-listing-db.mjs')
      const payload = await getHotelDetails(cfg, tokenCode, code, { languageCode: 'tr' })
      if (payload?.HasError) {
        console.log(`GetHotelDetails hata: ${payload?.ErrorMessage ?? 'HasError'}`)
      } else {
        const result = payload?.Result ?? {}
        const imgs = result?.HotelImages ?? []
        console.log(`HotelImages: ${Array.isArray(imgs) ? imgs.length : 0}`)
        if (Array.isArray(imgs)) {
          imgs.slice(0, 5).forEach((m, i) =>
            console.log(`  [${i + 1}] ${m?.ImageTitle ?? ''} ${m?.ImageUrl ?? m?.url ?? ''}`),
          )
        }
        const merged = mergeHotelDetailsGallery({}, payload)
        console.log(`merge sonrası URL: ${collectHotelImageUrls(merged).length}`)
      }
    } catch (e) {
      console.log(`GetHotelDetails atlandı: ${e.message}`)
    }

    console.log('\n══ Booking API (GetHotelRoomPrices — oda tipleri) ══')
    try {
      const { tokenCode } = await createTravelrobotToken(cfg)
      const { enrichHotelRowWithRoomPrices, countHotelRoomOffers, countUniqueHotelRoomNames } =
        await import('./lib/travelrobot-hotel-rooms.mjs')
      const merged = await enrichHotelRowWithRoomPrices(cfg, tokenCode, { HotelCode: code }, {})
      const offers = countHotelRoomOffers(merged)
      console.log(`RoomAlternatives (API): ${offers}`)
      console.log(`Benzersiz oda adı: ${countUniqueHotelRoomNames(merged)}`)
      const names = new Set()
      for (const r of merged?.Rooms ?? merged?.rooms ?? []) {
        for (const a of r?.RoomAlternatives ?? r?.roomAlternatives ?? []) {
          names.add(a?.RoomName ?? a?.Name ?? '?')
        }
      }
      console.log(`Benzersiz oda adı (liste): ${names.size}`)
      ;[...names].slice(0, 10).forEach((n, i) => console.log(`  [${i + 1}] ${n}`))
    } catch (e) {
      console.log(`GetHotelRoomPrices atlandı: ${e.message}`)
    }

    console.log('\n══ Vitrin eşlemesi (tema / pansiyon / özellik / kurallar) ══')
    try {
      const { buildTravelrobotHotelVitrinPackage } = await import('./lib/travelrobot-hotel-vitrin.mjs')
      const { mergeHotelDetails } = await import('./lib/travelrobot-hotel-details.mjs')
      const { getHotelDetails } = await import('./lib/travelrobot-api.mjs')
      const dbRow = await loadFromDb(pg, code)
      let catalog = { HotelCode: code }
      if (dbRow?.snapshot_json) {
        try {
          const snap = JSON.parse(dbRow.snapshot_json)
          catalog = snap?.catalog ?? snap ?? catalog
        } catch {
          /* ignore */
        }
      }
      const { tokenCode: vitrinToken } = await createTravelrobotToken(cfg)
      const detailsPayload = await getHotelDetails(cfg, vitrinToken, code, { languageCode: 'tr' })
      const merged = mergeHotelDetails(catalog, detailsPayload)
      const pkg = buildTravelrobotHotelVitrinPackage(merged)
      console.log(`hotel_type: ${pkg.facets.hotel_type_code ?? '-'}`)
      console.log(`theme: ${pkg.facets.theme_code ?? '-'}`)
      console.log(`accommodation: ${pkg.facets.accommodation_code ?? '-'}`)
      console.log(`özellik (otel_kplus): ${pkg.amenities.length}`)
      console.log(`genel şartlar HTML: ${pkg.verticalHotel.general_terms_html ? 'var' : 'yok'}`)
      console.log(`ek bölüm: ${pkg.verticalHotel.facility_sections?.length ?? 0}`)
      console.log(`SSS: ${pkg.verticalHotel.faq_items?.length ?? 0}`)
      pkg.amenities.slice(0, 8).forEach((a, i) => console.log(`  [${i + 1}] ${a.value_json.label}`))
    } catch (e) {
      console.log(`Vitrin eşlemesi atlandı: ${e.message}`)
    }

    console.log('\n══ Ek alan eşlemesi (pansiyon / fiyat / iptal / meta) ══')
    try {
      const {
        extractTravelrobotMealPlans,
        extractTravelrobotCancellationText,
        extractTravelrobotListingMeta,
        extractTravelrobotSeasonalPriceRules,
        buildTravelrobotHotelRoomRows,
      } = await import('./lib/travelrobot-hotel-extras.mjs')
      const { mergeHotelDetails } = await import('./lib/travelrobot-hotel-details.mjs')
      const { getHotelDetails } = await import('./lib/travelrobot-api.mjs')
      const dbRow = await loadFromDb(pg, code)
      let catalog = { HotelCode: code }
      if (dbRow?.snapshot_json) {
        try {
          const snap = JSON.parse(dbRow.snapshot_json)
          catalog = snap?.catalog ?? snap ?? catalog
        } catch {
          /* ignore */
        }
      }
      const { tokenCode: extrasToken } = await createTravelrobotToken(cfg)
      const detailsPayload = await getHotelDetails(cfg, extrasToken, code, { languageCode: 'tr' })
      const merged = mergeHotelDetails(catalog, detailsPayload)
      const rooms = buildTravelrobotHotelRoomRows(merged)
      const plans = extractTravelrobotMealPlans(merged)
      const meta = extractTravelrobotListingMeta(merged)
      const cancel = extractTravelrobotCancellationText(merged)
      const bands = extractTravelrobotSeasonalPriceRules(merged)
      console.log(`oda satırı: ${rooms.length}`)
      console.log(`pansiyon planı: ${plans.length}`)
      console.log(`dönemsel fiyat bandı: ${bands.length}`)
      console.log(`iptal metni: ${cancel ? `${cancel.slice(0, 80)}…` : 'yok'}`)
      console.log(`check-in/out: ${meta.check_in_time ?? '-'} / ${meta.check_out_time ?? '-'}`)
      console.log(`adres: ${meta.address ? 'var' : 'yok'}`)
      rooms.slice(0, 3).forEach((r, i) => {
        console.log(
          `  [${i + 1}] ${r.name} — kap:${r.capacity ?? '-'}, gün:${r.dailyCalendar?.length ?? 0}, kod:${r.meta?.travelrobot_room_code ?? '-'}`,
        )
      })
    } catch (e) {
      console.log(`Ek alan eşlemesi atlandı: ${e.message}`)
    }

    console.log('\n══ Booking API (SearchHotel örneği — opsiyonel) ══')
    try {
      const { tokenCode } = await createTravelrobotToken(cfg)
      const { searchHotels, pickHotelRows } = await import('./lib/travelrobot-api.mjs')
      const payload = await searchHotels(cfg, tokenCode, { destinationId: '10033097', limit: 200 })
      const rows = pickHotelRows(payload)
      const hit = rows.find((r) => {
        const c = String(r?.HotelCode ?? r?.Hotel?.HotelCode ?? '').trim()
        return c === code
      })
      if (!hit) {
        console.log('İstanbul SearchHotel sonuçlarında bu kod yok (normal — kod başka destinasyonda olabilir)')
      } else {
        const urls = pickUrls(hit)
        console.log(`SearchHotel görsel URL: ${urls.length}`)
        urls.forEach((u, i) => console.log(`  [${i + 1}] ${u}`))
      }
    } catch (e) {
      console.log(`SearchHotel atlandı: ${e.message}`)
    }
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

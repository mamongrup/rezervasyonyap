#!/usr/bin/env node
/**
 * Travelrobot oteller — DB eksiklik raporu (API'den alınmayan / boş alanlar).
 *
 *   node scripts/audit-travelrobot-hotel-gaps.mjs
 *   node scripts/audit-travelrobot-hotel-gaps.mjs --json
 *   node scripts/audit-travelrobot-hotel-gaps.mjs --limit 50 --offset 0
 *   node scripts/audit-travelrobot-hotel-gaps.mjs --worst 20
 */

import { createPgClient } from './lib/pg-client.mjs'
import { cliLog } from './lib/cli-log.mjs'

const args = new Set(process.argv.slice(2))
const AS_JSON = args.has('--json')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const offsetIdx = process.argv.indexOf('--offset')
const OFFSET = offsetIdx >= 0 ? Number(process.argv[offsetIdx + 1]) : 0
const worstIdx = process.argv.indexOf('--worst')
const WORST = worstIdx >= 0 ? Number(process.argv[worstIdx + 1]) : 0

const I18N_LOCALES = ['en', 'de', 'ru', 'zh', 'fr']

const GAP_CHECKS = [
  { id: 'images_lt2', label: 'Görsel < 2', weight: 3 },
  { id: 'rooms_lt1', label: 'Oda yok', weight: 4 },
  { id: 'rooms_lt3', label: 'Oda < 3', weight: 2 },
  { id: 'no_amenities', label: 'Olanak (otel_kplus) yok', weight: 2 },
  { id: 'no_vertical_meta', label: 'Kurallar/SSS (vertical_hotel) yok', weight: 2 },
  { id: 'no_meal_plans', label: 'Pansiyon planı yok', weight: 2 },
  { id: 'no_calendar', label: 'Günlük fiyat takvimi yok', weight: 2 },
  { id: 'no_price_rules', label: 'Fiyat kuralı yok', weight: 1 },
  { id: 'no_cancellation', label: 'İptal metni yok', weight: 1 },
  { id: 'no_phone', label: 'Telefon yok', weight: 1 },
  { id: 'no_email', label: 'E-posta yok', weight: 1 },
  { id: 'no_checkin', label: 'Giriş saati yok', weight: 1 },
  { id: 'no_description', label: 'Açıklama yok/kısa', weight: 2 },
  { id: 'i18n_incomplete', label: '6 dil çeviri eksik', weight: 3 },
  { id: 'no_star', label: 'Yıldız yok', weight: 1 },
  { id: 'no_map', label: 'Harita koordinat yok', weight: 2 },
]

/** API'de var, yapılandırılmış DB'de yok / booking-only — bilgi amaçlı */
const API_GAPS_INFO = [
  'GetHotelRoomCancellationPolicies — ayrı endpoint çağrılmıyor (inline iptal metni kullanılıyor)',
  'GetHotelRoomRemarks — oda notları alınmıyor',
  'ValidateHotelRoomsV2 / BookHotel — canlı rezervasyon akışı henüz vitrin dışı',
  'Static getCountries / getDestinations — lokasyon hiyerarşisi DB\'ye bağlanmıyor',
  'TripAdvisor / puan alanları — API yanıtında yoksa atlanır',
  'Tüm teklif varyantları — vitrinde oda adı başına en ucuz teklif saklanır',
]

async function loadHotelRows(pg) {
  cliLog('DB sorgusu çalışıyor (otel sayısına göre 10–60 sn sürebilir)…')
  const params = [OFFSET, I18N_LOCALES]
  let sql = `
    SELECT l.id::text AS listing_id,
           l.slug,
           lhd.travelrobot_hotel_code AS code,
           lhd.star_rating,
           l.map_lat,
           l.map_lng,
           l.cancellation_policy_text,
           coalesce(img.cnt, 0) AS image_count,
           coalesce(hr.cnt, 0) AS room_count,
           coalesce(am.cnt, 0) AS amenity_count,
           coalesce(mp.cnt, 0) AS meal_plan_count,
           coalesce(cal.cnt, 0) AS calendar_day_count,
           coalesce(pr.cnt, 0) AS price_rule_count,
           (vh.value_json->'data' IS NOT NULL) AS has_vertical_meta,
           coalesce(tr_desc.len, 0) AS desc_len,
           lm.value_json AS listing_meta,
           coalesce(i18n.cnt, 0) AS i18n_rich_count
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
    JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
    LEFT JOIN (
      SELECT listing_id, count(*)::int AS cnt FROM listing_images GROUP BY listing_id
    ) img ON img.listing_id = l.id
    LEFT JOIN (
      SELECT listing_id, count(*)::int AS cnt FROM hotel_rooms GROUP BY listing_id
    ) hr ON hr.listing_id = l.id
    LEFT JOIN (
      SELECT listing_id, count(*)::int AS cnt
      FROM listing_attributes
      WHERE group_code = 'otel_kplus'
      GROUP BY listing_id
    ) am ON am.listing_id = l.id
    LEFT JOIN (
      SELECT listing_id, count(*)::int AS cnt FROM listing_meal_plans GROUP BY listing_id
    ) mp ON mp.listing_id = l.id
    LEFT JOIN (
      SELECT hr2.listing_id, count(*)::int AS cnt
      FROM hotel_room_availability_calendar c
      JOIN hotel_rooms hr2 ON hr2.id = c.hotel_room_id
      GROUP BY hr2.listing_id
    ) cal ON cal.listing_id = l.id
    LEFT JOIN (
      SELECT listing_id, count(*)::int AS cnt FROM listing_price_rules GROUP BY listing_id
    ) pr ON pr.listing_id = l.id
    LEFT JOIN listing_attributes vh
      ON vh.listing_id = l.id AND vh.group_code = 'vertical_hotel' AND vh.key = 'v1'
    LEFT JOIN listing_attributes lm
      ON lm.listing_id = l.id AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
    LEFT JOIN (
      SELECT lt.listing_id, length(coalesce(lt.description, ''))::int AS len
      FROM listing_translations lt
      JOIN locales loc ON loc.id = lt.locale_id AND loc.code = 'tr'
    ) tr_desc ON tr_desc.listing_id = l.id
    LEFT JOIN (
      SELECT lt.listing_id, count(DISTINCT loc.code)::int AS cnt
      FROM listing_translations lt
      JOIN locales loc ON loc.id = lt.locale_id
      WHERE loc.code = ANY($2::text[])
        AND length(trim(coalesce(lt.description, ''))) > 80
      GROUP BY lt.listing_id
    ) i18n ON i18n.listing_id = l.id
    WHERE l.external_provider_code = 'travelrobot'
      AND lhd.travelrobot_hotel_code IS NOT NULL
      AND trim(lhd.travelrobot_hotel_code) <> ''
    ORDER BY l.slug ASC
    OFFSET $1`
  if (LIMIT > 0) {
    params.push(LIMIT)
    sql += ` LIMIT $${params.length}`
  }
  const r = await pg.query(sql, params)
  return r.rows
}

function metaField(meta, key) {
  if (!meta || typeof meta !== 'object') return null
  const v = meta[key]
  return v == null || v === '' ? null : v
}

function gapsForRow(row) {
  const meta = row.listing_meta ?? {}
  const gaps = []
  if ((row.image_count ?? 0) < 2) gaps.push('images_lt2')
  if ((row.room_count ?? 0) < 1) gaps.push('rooms_lt1')
  else if ((row.room_count ?? 0) < 3) gaps.push('rooms_lt3')
  if ((row.amenity_count ?? 0) < 1) gaps.push('no_amenities')
  if (!row.has_vertical_meta) gaps.push('no_vertical_meta')
  if ((row.meal_plan_count ?? 0) < 1) gaps.push('no_meal_plans')
  if ((row.calendar_day_count ?? 0) < 1) gaps.push('no_calendar')
  if ((row.price_rule_count ?? 0) < 1) gaps.push('no_price_rules')
  if (!String(row.cancellation_policy_text ?? '').trim()) gaps.push('no_cancellation')
  if (!metaField(meta, 'phone')) gaps.push('no_phone')
  if (!metaField(meta, 'email')) gaps.push('no_email')
  if (!metaField(meta, 'check_in_time')) gaps.push('no_checkin')
  if ((row.desc_len ?? 0) < 80) gaps.push('no_description')
  if ((row.i18n_rich_count ?? 0) < I18N_LOCALES.length) gaps.push('i18n_incomplete')
  if (row.star_rating == null || Number(row.star_rating) <= 0) gaps.push('no_star')
  if (row.map_lat == null || row.map_lng == null) gaps.push('no_map')
  const score = gaps.reduce((s, id) => s + (GAP_CHECKS.find((g) => g.id === id)?.weight ?? 1), 0)
  return { gaps, score }
}

async function main() {
  cliLog('Audit başlıyor…')
  const pg = createPgClient()
  cliLog('PostgreSQL bağlanılıyor…')
  await pg.connect()
  cliLog('DB bağlantısı OK')
  try {
    const rows = await loadHotelRows(pg)
    cliLog(`${rows.length} otel yüklendi — rapor hesaplanıyor…`)
    const summary = Object.fromEntries(GAP_CHECKS.map((g) => [g.id, 0]))
    const perHotel = []

    for (const row of rows) {
      const { gaps, score } = gapsForRow(row)
      for (const g of gaps) summary[g] = (summary[g] ?? 0) + 1
      perHotel.push({
        code: row.code,
        slug: row.slug,
        score,
        gaps,
        image_count: row.image_count,
        room_count: row.room_count,
      })
    }

    const report = {
      total: rows.length,
      offset: OFFSET,
      limit: LIMIT || null,
      gap_counts: summary,
      gap_labels: Object.fromEntries(GAP_CHECKS.map((g) => [g.id, g.label])),
      api_not_imported: API_GAPS_INFO,
      hotels_with_any_gap: perHotel.filter((h) => h.gaps.length > 0).length,
      perfect_hotels: perHotel.filter((h) => h.gaps.length === 0).length,
    }

    if (AS_JSON) {
      report.worst = [...perHotel].sort((a, b) => b.score - a.score).slice(0, WORST || 50)
      console.log(JSON.stringify(report, null, 2))
      return
    }

    console.log('=== Travelrobot otel eksiklik raporu ===')
    console.log(`Toplam otel: ${report.total}`)
    console.log(`Eksiksiz (rapor kriterlerine göre): ${report.perfect_hotels}`)
    console.log(`En az bir eksik: ${report.hotels_with_any_gap}`)
    console.log('')
    console.log('Eksik alan sayıları:')
    for (const g of GAP_CHECKS) {
      const n = summary[g.id] ?? 0
      if (n > 0) console.log(`  ${String(n).padStart(5)}  ${g.label}`)
    }
    console.log('')
    console.log('API\'den henüz yapılandırılmayan / kısmi alanlar:')
    for (const line of API_GAPS_INFO) console.log(`  • ${line}`)

    const showWorst = WORST > 0 ? WORST : 15
    const worst = [...perHotel].sort((a, b) => b.score - a.score).slice(0, showWorst)
    if (worst.length && worst[0].gaps.length) {
      console.log('')
      console.log(`En çok eksik olan ${Math.min(showWorst, worst.length)} otel:`)
      for (const h of worst) {
        if (!h.gaps.length) break
        const labels = h.gaps.map((id) => GAP_CHECKS.find((g) => g.id === id)?.label ?? id).join(', ')
        console.log(`  ${h.code}  ${h.slug}  [${labels}]`)
      }
    }
    console.log('')
    console.log('Tam iyileştirme: node scripts/backfill-all-travelrobot-hotels.mjs --batch-size 50')
    console.log('6 dil için: ... --with-i18n (otel başına ~5 ek API çağrısı, çok yavaş)')
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Akasia yat ilanları — yatreyonu.com ile eksik meta/açıklama zenginleştirme.
 *
 *   node scripts/enrich-akasia-yachts.mjs --dry-run --limit 5
 *   node scripts/enrich-akasia-yachts.mjs --only-missing-bath
 *   node scripts/enrich-akasia-yachts.mjs --slug sultan-suna-ak-*
 */

import { createPgClient } from './lib/pg-client.mjs'
import {
  buildAkasiaCapacityLines,
  buildDescription,
} from './lib/akasia-api.mjs'
import { enrichFromYatreyonu, parseBathroomFromText } from './lib/yatreyonu-api.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const ONLY_MISSING_BATH = args.has('--only-missing-bath')
const FORCE = args.has('--force')
const SKIP_INFER = args.has('--skip-infer-gulet-bath')
const ONLY_UNENRICHED = args.has('--only-unenriched')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''

function parseIntMeta(raw) {
  const m = String(raw ?? '').match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function extractAkasiaTail(description) {
  const text = String(description || '')
  const idxRates = text.indexOf('Haftalık charter ücretleri:')
  const idxSpecs = text.indexOf('Teknik özellikler:')
  const start = idxRates >= 0 ? idxRates : idxSpecs >= 0 ? idxSpecs : -1
  if (start < 0) return ''
  return text.slice(start).trim()
}

function buildEnrichedDescription({
  title,
  pax,
  cabinCount,
  bathCount,
  yatreyonuDescription,
  amenities,
  akasiaTail,
}) {
  const lines = []
  lines.push(...buildAkasiaCapacityLines(pax, cabinCount, bathCount))

  const body = String(yatreyonuDescription || '').trim()
  if (body) {
    lines.push(body)
    lines.push('')
  }

  if (amenities?.length) {
    lines.push('Ücretsiz olanaklar:')
    for (const a of amenities) lines.push(`- ${a}`)
    lines.push('')
  }

  const tail = String(akasiaTail || '').trim()
  if (tail) {
    lines.push(tail)
  } else if (!body) {
    return buildDescription(title, {}, [], { pax, cabinCount, bathCount })
  }

  return lines.join('\n').trim()
}

function needsEnrichment(meta, description) {
  const bath = parseIntMeta(meta?.bath_count)
  const descLen = String(description || '').trim().length
  return bath == null || descLen < 280
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  let sql = `
    SELECT l.id::text AS listing_id, l.slug, l.external_listing_ref AS akasia_id,
           la.value_json AS meta, lt.title, lt.description
    FROM listings l
    JOIN listing_attributes la ON la.listing_id = l.id
      AND la.group_code = 'listing_meta' AND la.key = 'v1'
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id
      AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
    WHERE l.external_provider_code = 'akasia'
    ORDER BY l.slug`
  const { rows } = await pg.query(sql)

  let targets = rows
  if (SLUG_FILTER) {
    const needle = SLUG_FILTER.replace(/\*/g, '')
    targets = targets.filter((r) => r.slug.includes(needle))
  }
  if (ONLY_UNENRICHED) {
    targets = targets.filter((r) => !r.meta?.enrichment_sources?.yatreyonu)
  } else if (ONLY_MISSING_BATH) {
    targets = targets.filter((r) => !parseIntMeta(r.meta?.bath_count))
  } else if (!FORCE) {
    targets = targets.filter((r) => needsEnrichment(r.meta, r.description))
  }
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(
    `Akasia yatreyonu zenginleştirme — ${targets.length} ilan, dry-run=${DRY_RUN}, only-missing-bath=${ONLY_MISSING_BATH}`,
  )

  let matched = 0
  let updated = 0
  let skipped = 0

  for (const row of targets) {
    const title = row.title || row.slug.replace(/-ak-\d+$/, '').replace(/-/g, ' ')
    process.stdout.write(`  ${row.slug} … `)

    try {
      const result = await enrichFromYatreyonu(title, { slug: row.slug })
      if (!result) {
        console.log('eşleşme yok')
        skipped += 1
        continue
      }

      matched += 1
      const { match, detail } = result
      const meta = row.meta || {}
      const specs = meta.specs ?? {}
      const rates = meta.weekly_rates ?? []

      const pax = detail.pax ?? parseIntMeta(meta.max_guests) ?? null
      const cabinCount = detail.cabinCount ?? parseIntMeta(meta.room_count) ?? null
      const existingBath = parseIntMeta(meta.bath_count)
      const bathCount = detail.bathroomCount ?? existingBath ?? null

      const akasiaTail = extractAkasiaTail(row.description)
      const newDescription = buildEnrichedDescription({
        title,
        pax,
        cabinCount,
        bathCount,
        yatreyonuDescription: detail.description,
        amenities: detail.amenities,
        akasiaTail,
      })

      const enrichment = {
        ...(meta.enrichment_sources || {}),
        yatreyonu: {
          url: detail.url,
          match_title: match.title,
          match_score: match.score,
          fetched_at: new Date().toISOString(),
        },
      }

      const newMeta = {
        ...meta,
        max_guests: pax != null ? String(pax) : meta.max_guests || '',
        room_count: cabinCount != null ? String(cabinCount) : meta.room_count || '',
        bath_count: bathCount != null ? String(bathCount) : meta.bath_count || '',
        cabin_count: cabinCount ?? meta.cabin_count ?? null,
        length_m: detail.lengthM ?? meta.length_m ?? null,
        enrichment_sources: enrichment,
      }

      if (DRY_RUN) {
        console.log(
          `→ ${match.title} (${match.score}) | ${pax ?? '-'} misafir, ${cabinCount ?? '-'} kabin, ${bathCount ?? '-'} banyo | ${detail.url}`,
        )
        continue
      }

      await pg.query(
        `UPDATE listing_attributes SET value_json = $2::jsonb
         WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
        [row.listing_id, JSON.stringify(newMeta)],
      )
      await pg.query(
        `UPDATE listing_translations SET description = $2
         WHERE listing_id = $1::uuid
           AND locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)`,
        [row.listing_id, newDescription || null],
      )
      if (cabinCount != null) {
        await pg.query(
          `INSERT INTO listing_yacht_details (listing_id, length_meters, cabin_count, theme_codes, rule_codes, ical_managed)
           VALUES ($1::uuid, $2::numeric, $3::smallint, '{}', '{}', false)
           ON CONFLICT (listing_id) DO UPDATE SET
             length_meters = COALESCE($2::numeric, listing_yacht_details.length_meters),
             cabin_count = COALESCE($3::smallint, listing_yacht_details.cabin_count)`,
          [row.listing_id, detail.lengthM ?? null, cabinCount],
        )
      }

      console.log(
        `güncellendi — ${bathCount ?? '-'} banyo, ${newDescription.length} karakter`,
      )
      updated += 1
    } catch (e) {
      console.log(`hata: ${e.message}`)
      skipped += 1
    }
  }

  let inferred = 0
  if (!SKIP_INFER && !DRY_RUN) {
    const { rows: guletRows } = await pg.query(
      `SELECT l.id::text AS listing_id, l.slug, la.value_json AS meta, lt.description
       FROM listings l
       JOIN listing_attributes la ON la.listing_id = l.id
         AND la.group_code = 'listing_meta' AND la.key = 'v1'
       JOIN listing_attributes tip ON tip.listing_id = l.id
         AND tip.group_code = 'ilan_tipi' AND tip.key = 'gulet'
       LEFT JOIN listing_translations lt ON lt.listing_id = l.id
         AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
       WHERE l.external_provider_code = 'akasia'
         AND COALESCE(la.value_json->>'bath_count', '') = ''`,
    )
    for (const row of guletRows) {
      const meta = row.meta || {}
      const cabinCount = parseIntMeta(meta.room_count) ?? meta.cabin_count ?? null
      if (!cabinCount) continue
      const fromText = parseBathroomFromText(row.description, cabinCount)
      const bathCount = fromText ?? cabinCount
      const newMeta = {
        ...meta,
        bath_count: String(bathCount),
        bath_inferred: fromText ? null : 'ensuite_per_cabin',
      }
      const capLines = buildAkasiaCapacityLines(
        parseIntMeta(meta.max_guests),
        cabinCount,
        bathCount,
      )
      let description = String(row.description || '')
      if (description.startsWith('Konaklama:')) {
        const rest = description.replace(/^Konaklama:[\s\S]*?\n\n/, '')
        description = [...capLines, rest].filter(Boolean).join('\n')
      } else if (capLines.length) {
        description = [...capLines, description].join('\n')
      }
      await pg.query(
        `UPDATE listing_attributes SET value_json = $2::jsonb
         WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
        [row.listing_id, JSON.stringify(newMeta)],
      )
      await pg.query(
        `UPDATE listing_translations SET description = $2
         WHERE listing_id = $1::uuid
           AND locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)`,
        [row.listing_id, description || null],
      )
      inferred += 1
    }
    if (inferred) console.log(`Gulet banyo çıkarımı (kabin başına): ${inferred} ilan`)
  }

  await pg.end()
  console.log(
    `Bitti: eşleşen=${matched}, güncellenen=${updated}, atlanan=${skipped}, gulet_banyo_çıkarım=${inferred}`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

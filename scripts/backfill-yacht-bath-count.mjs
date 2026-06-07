/**
 * Tüm yat ilanları — banyo sayısı backfill (Baransen refetch + metin + gulet ensuite).
 *
 *   node scripts/backfill-yacht-bath-count.mjs --dry-run
 *   node scripts/backfill-yacht-bath-count.mjs --refetch
 *   node scripts/backfill-yacht-bath-count.mjs --slug perdue
 */

import { createPgClient } from './lib/pg-client.mjs'
import { buildAkasiaCapacityLines } from './lib/akasia-api.mjs'
import { fetchBoatDetail } from './lib/baransen-api.mjs'
import { fetchYachtDetail, parseBathroomCountFromSpecs } from './lib/akasia-api.mjs'
import { enrichFromYatreyonu } from './lib/yatreyonu-api.mjs'
import { fetchAkasiaPublicPage } from './lib/akasia-public-page.mjs'
import {
  isEnsuiteDefaultPropertyType,
  parseBathroomCount,
  parseCabinCountFromText,
  sanitizeBathCount,
} from './lib/yacht-bathroom-parse.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const REFETCH = args.has('--refetch')
const FORCE = args.has('--force')
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

function updateCapacityInDescription(description, pax, cabinCount, bathCount) {
  const capLines = buildAkasiaCapacityLines(pax, cabinCount, bathCount)
  const text = String(description || '')
  if (text.startsWith('Konaklama:')) {
    const rest = text.replace(/^Konaklama:[\s\S]*?\n\n/, '')
    return [...capLines, rest].filter(Boolean).join('\n')
  }
  if (capLines.length) return [...capLines, text].join('\n')
  return text
}

async function resolveBathAndCabins(row, title) {
  const meta = row.meta || {}
  const propertyType = row.property_type || meta.property_type || ''
  let cabinCount = parseIntMeta(meta.room_count) ?? meta.cabin_count ?? null
  let pax = parseIntMeta(meta.max_guests)
  let bathCount = parseIntMeta(meta.bath_count)
  let source = 'existing'

  const existingBath = parseIntMeta(meta.bath_count)
  const cabinsKnown = parseIntMeta(meta.room_count) ?? meta.cabin_count
  const looksWrong =
    existingBath != null &&
    ((cabinsKnown && existingBath > cabinsKnown) ||
      existingBath > 20 ||
      (cabinsKnown >= 2 && existingBath === 1))

  if (!FORCE && existingBath && !looksWrong) {
    return { bathCount: existingBath, cabinCount, pax, source, changed: false }
  }

  const descText = row.description || ''
  bathCount =
    parseBathroomCount(descText, cabinCount, { propertyType }) ??
    parseBathroomCountFromSpecs(meta.specs || {}) ??
    null

  if (!cabinCount) cabinCount = parseCabinCountFromText(descText)

  if (!bathCount && REFETCH) {
    const baransenUrl = meta.enrichment_sources?.baransen?.url || meta.source_url
    if (baransenUrl && baransenUrl.includes('baranselyachting.com')) {
      try {
        const detail = await fetchBoatDetail(baransenUrl)
        cabinCount = cabinCount ?? detail.cabinCount
        pax = pax ?? detail.pax
        cabinCount = cabinCount ?? detail.cabinCount
        pax = pax ?? detail.pax
        bathCount =
          detail.bathroomCount ??
          parseBathroomCountFromSpecs(detail.specs || {}) ??
          parseBathroomCount(detail.articleText, cabinCount, { propertyType }) ??
          parseBathroomCount(
            [detail.articleText, descText].join('\n'),
            cabinCount,
            { propertyType },
          )
        if (bathCount) source = 'baransen'
      } catch {
        /* sonraki kaynak */
      }
    }

    if (!bathCount && row.external_provider_code === 'akasia' && row.external_listing_ref) {
      try {
        const detail = await fetchYachtDetail(row.external_listing_ref)
        cabinCount = cabinCount ?? detail.cabinCount
        pax = pax ?? detail.pax
        bathCount =
          detail.bathroomCount ??
          parseBathroomCountFromSpecs(detail.specs || {}) ??
          parseBathroomCount(detail.description, cabinCount, { propertyType })
        if (bathCount) source = 'akasia'
      } catch {
        /* ignore */
      }
    }

    if (!bathCount && row.external_provider_code === 'akasia' && title) {
      try {
        const page = await fetchAkasiaPublicPage(title, propertyType, {
          title,
          pax,
          cabinCount,
        })
        if (page) {
          cabinCount = cabinCount ?? page.cabinCount
          pax = pax ?? page.pax
          const pageText = (page.paragraphs || []).join('\n')
          bathCount =
            parseBathroomCountFromSpecs(page.specs || {}) ??
            parseBathroomCount(pageText, cabinCount, { propertyType })
          if (bathCount) source = 'akasia_public'
        }
      } catch {
        /* ignore */
      }
    }

    if (!bathCount && title) {
      try {
        const yr = await enrichFromYatreyonu(title, { slug: row.slug, minScore: 55 })
        if (yr?.detail) {
          cabinCount = cabinCount ?? yr.detail.cabinCount
          pax = pax ?? yr.detail.pax
          bathCount =
            yr.detail.bathroomCount ??
            parseBathroomCount(yr.detail.description, cabinCount, { propertyType })
          if (bathCount) source = 'yatreyonu'
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (!bathCount) {
    bathCount =
      parseBathroomCountFromSpecs(meta.specs || {}) ??
      parseBathroomCount(descText, cabinCount, { propertyType })
    if (bathCount) source = 'description'
  }

  if (
    !bathCount &&
    cabinCount &&
    isEnsuiteDefaultPropertyType(propertyType)
  ) {
    bathCount = cabinCount
    source = 'ensuite_per_cabin'
  }

  bathCount = sanitizeBathCount(bathCount, cabinCount, pax)

  const shouldClearWrong = looksWrong && bathCount == null

  return {
    bathCount: bathCount ?? null,
    cabinCount: cabinCount ?? null,
    pax: pax ?? null,
    source: shouldClearWrong ? 'cleared_wrong' : source,
    changed: bathCount != null || shouldClearWrong,
    clearBath: shouldClearWrong,
  }
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  let sql = `
    SELECT l.id::text AS listing_id, l.slug, l.external_provider_code,
           l.external_listing_ref, la.value_json AS meta, lt.description,
           lt.title, tip.key AS property_type
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
    JOIN listing_attributes la ON la.listing_id = l.id
      AND la.group_code = 'listing_meta' AND la.key = 'v1'
    LEFT JOIN listing_attributes tip ON tip.listing_id = l.id AND tip.group_code = 'ilan_tipi'
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id
      AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
    ORDER BY l.slug`

  const { rows } = await pg.query(sql)
  let targets = rows
  if (SLUG_FILTER) {
    const needle = SLUG_FILTER.replace(/\*/g, '')
    targets = targets.filter((r) => r.slug.includes(needle))
  }
  if (!FORCE) {
    targets = targets.filter((r) => {
      const bath = parseIntMeta(r.meta?.bath_count)
      const cabins = parseIntMeta(r.meta?.room_count) ?? r.meta?.cabin_count
      if (!bath) return true
      if ((cabins && bath > cabins) || bath > 20) return true
      // Tek banyo + çoklu kabin: genelde eksik/yanlış parse
      if (cabins && cabins >= 2 && bath === 1) return true
      return false
    })
  }
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(
    `Yat banyo backfill — ${targets.length} ilan, refetch=${REFETCH}, dry-run=${DRY_RUN}`,
  )

  let updated = 0
  const bySource = {}

  for (const row of targets) {
    const result = await resolveBathAndCabins(row, row.title || '')
    if (!result.changed) {
      console.log(`  ${row.slug} → banyo bulunamadı`)
      continue
    }
    if (result.clearBath) {
      if (DRY_RUN) {
        console.log(`  [dry] ${row.slug} → yanlış banyo temizlendi`)
        continue
      }
      const meta = { ...(row.meta || {}), bath_count: '' }
      delete meta.bath_inferred
      const description = updateCapacityInDescription(
        row.description,
        result.pax ?? parseIntMeta(meta.max_guests),
        result.cabinCount ?? parseIntMeta(meta.room_count),
        null,
      )
      await pg.query(
        `UPDATE listing_attributes SET value_json = $2::jsonb
         WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
        [row.listing_id, JSON.stringify(meta)],
      )
      await pg.query(
        `UPDATE listing_translations SET description = $2
         WHERE listing_id = $1::uuid
           AND locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)`,
        [row.listing_id, description || null],
      )
      console.log(`  ${row.slug} → yanlış banyo temizlendi`)
      updated += 1
      continue
    }
    if (result.bathCount == null) {
      console.log(`  ${row.slug} → banyo bulunamadı`)
      continue
    }

    bySource[result.source] = (bySource[result.source] || 0) + 1

    if (DRY_RUN) {
      console.log(
        `  [dry] ${row.slug} → ${result.bathCount} banyo (${result.cabinCount ?? '-'} kabin) [${result.source}]`,
      )
      continue
    }

    const meta = {
      ...(row.meta || {}),
      bath_count: String(result.bathCount),
      room_count:
        result.cabinCount != null
          ? String(result.cabinCount)
          : row.meta?.room_count || '',
      cabin_count: result.cabinCount ?? row.meta?.cabin_count ?? null,
      max_guests:
        result.pax != null ? String(result.pax) : row.meta?.max_guests || '',
    }
    if (result.source === 'ensuite_per_cabin' && !meta.bath_inferred) {
      meta.bath_inferred = 'ensuite_per_cabin'
    }

    const description = updateCapacityInDescription(
      row.description,
      result.pax ?? parseIntMeta(meta.max_guests),
      result.cabinCount ?? parseIntMeta(meta.room_count),
      result.bathCount,
    )

    await pg.query(
      `UPDATE listing_attributes SET value_json = $2::jsonb
       WHERE listing_id = $1::uuid AND group_code = 'listing_meta' AND key = 'v1'`,
      [row.listing_id, JSON.stringify(meta)],
    )
    await pg.query(
      `UPDATE listing_translations SET description = $2
       WHERE listing_id = $1::uuid
         AND locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)`,
      [row.listing_id, description || null],
    )
    if (result.cabinCount != null) {
      await pg.query(
        `INSERT INTO listing_yacht_details (listing_id, length_meters, cabin_count, theme_codes, rule_codes, ical_managed)
         VALUES ($1::uuid, NULL, $2::smallint, '{}', '{}', false)
         ON CONFLICT (listing_id) DO UPDATE SET
           cabin_count = COALESCE($2::smallint, listing_yacht_details.cabin_count)`,
        [row.listing_id, result.cabinCount],
      )
    }

    console.log(`  ${row.slug} → ${result.bathCount} banyo [${result.source}]`)
    updated += 1
  }

  await pg.end()
  console.log(`Bitti: güncellenen=${updated}`, bySource)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

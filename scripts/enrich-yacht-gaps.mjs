/**
 * Yat ilanları — eksik banyo/kabin/açıklama (yatreyonu + Akasia SEO + Baransen + metin parse).
 *
 *   node scripts/enrich-yacht-gaps.mjs --dry-run --limit 10
 *   node scripts/enrich-yacht-gaps.mjs
 */

import { createPgClient } from './lib/pg-client.mjs'
import {
  buildAkasiaCapacityLines,
  fetchYachtDetail,
  parseBathroomCountFromSpecs,
} from './lib/akasia-api.mjs'
import { fetchBoatDetail } from './lib/baransen-api.mjs'
import { fetchAkasiaPublicPage } from './lib/akasia-public-page.mjs'
import { enrichFromYatreyonu } from './lib/yatreyonu-api.mjs'
import {
  parseBathroomCount,
  parseCabinCountFromText,
  sanitizeBathCount,
} from './lib/yacht-bathroom-parse.mjs'
import {
  buildTurkishNarrative,
  isDescriptionInsufficient,
} from './lib/yacht-description-tr.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
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

function extractAkasiaTail(description) {
  const text = String(description || '')
  const idxRates = text.indexOf('Haftalık charter ücretleri:')
  const idxSpecs = text.indexOf('Teknik özellikler:')
  const start = idxRates >= 0 ? idxRates : idxSpecs >= 0 ? idxSpecs : -1
  if (start < 0) return ''
  return text.slice(start).trim()
}

function buildDescription({
  title,
  propertyType,
  pax,
  cabinCount,
  bathCount,
  body,
  akasiaTail,
  amenities,
}) {
  const lines = []
  lines.push(...buildAkasiaCapacityLines(pax, cabinCount, bathCount))
  const narrative = String(body || '').trim()
  if (narrative) {
    lines.push(narrative)
    lines.push('')
  } else if (title) {
    const narrative = buildTurkishNarrative({
      displayTitle: title,
      propertyType,
      pax,
      cabinCount,
      bathCount,
      basePort: '',
    })
    if (narrative) {
      lines.push(narrative)
      lines.push('')
    }
  }
  if (amenities?.length) {
    lines.push('Ücretsiz olanaklar:')
    for (const a of amenities) lines.push(`- ${a}`)
    lines.push('')
  }
  const tail = String(akasiaTail || '').trim()
  if (tail) lines.push(tail)
  let out = lines.join('\n').trim()
  if (out.length < 280 && title) {
    const extra = buildTurkishNarrative({
      displayTitle: title,
      propertyType,
      pax,
      cabinCount,
      bathCount,
      basePort: '',
    })
    out = [...buildAkasiaCapacityLines(pax, cabinCount, bathCount), extra, tail]
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  return out
}

function needsWork(row) {
  const meta = row.meta || {}
  const bath = parseIntMeta(meta.bath_count)
  const cabin = parseIntMeta(meta.room_count) ?? meta.cabin_count
  const descLen = String(row.description || '').trim().length
  if (!bath) return true
  if (!cabin) return true
  if (isDescriptionInsufficient(row.description, { minLen: 280 })) return true
  if (FORCE) return true
  return false
}

async function resolveFromSources(row) {
  const meta = row.meta || {}
  const propertyType = row.property_type || meta.property_type || ''
  let pax = parseIntMeta(meta.max_guests)
  let cabinCount = parseIntMeta(meta.room_count) ?? meta.cabin_count ?? null
  let bathCount = parseIntMeta(meta.bath_count)
  let bodyText = ''
  let amenities = []
  const sources = []
  const boatName = meta.specs?.['Boat Name'] || meta.specs?.['Boat name'] || ''

  const tryParse = (text, cab) => {
    return (
      parseBathroomCountFromSpecs(meta.specs || {}) ??
      parseBathroomCount(text, cab ?? cabinCount, { propertyType })
    )
  }

  if (!bathCount) {
    bathCount = tryParse(row.description, cabinCount)
    if (bathCount) sources.push('description')
  }

  if (!cabinCount) {
    cabinCount = parseCabinCountFromText(row.description)
    if (cabinCount) sources.push('description_cabin')
  }

  const baransenUrl =
    meta.enrichment_sources?.baransen?.url || meta.source_url || ''
  if (baransenUrl.includes('baranselyachting.com')) {
    try {
      const detail = await fetchBoatDetail(baransenUrl)
      pax = pax ?? detail.pax
      cabinCount = cabinCount ?? detail.cabinCount
      bathCount =
        bathCount ??
        detail.bathroomCount ??
        parseBathroomCountFromSpecs(detail.specs || {}) ??
        parseBathroomCount(detail.articleText, cabinCount, { propertyType })
      if (!bodyText && detail.articleText?.length > 120) bodyText = detail.articleText
      if (detail.bathroomCount || detail.cabinCount) sources.push('baransen')
    } catch {
      /* ignore */
    }
  }

  if (row.external_provider_code === 'akasia' && row.external_listing_ref) {
    try {
      const detail = await fetchYachtDetail(row.external_listing_ref)
      pax = pax ?? detail.pax
      cabinCount = cabinCount ?? detail.cabinCount
      bathCount =
        bathCount ??
        detail.bathroomCount ??
        parseBathroomCountFromSpecs(detail.specs || {}) ??
        parseBathroomCount(detail.description, cabinCount, { propertyType })
      sources.push('akasia_api')
    } catch {
      /* ignore */
    }

    try {
      const page = await fetchAkasiaPublicPage(row.title, propertyType, {
        title: row.title,
        pax,
        cabinCount,
      })
      if (page) {
        pax = pax ?? page.pax
        cabinCount = cabinCount ?? page.cabinCount
        const pageText = (page.paragraphs || []).join('\n')
        bathCount =
          bathCount ??
          parseBathroomCountFromSpecs(page.specs || {}) ??
          parseBathroomCount(pageText, cabinCount, { propertyType })
        if (!bodyText && pageText.length > 120) bodyText = pageText
        if (page.cabinCount || pageText) sources.push('akasia_public')
      }
    } catch {
      /* ignore */
    }
  }

  if (!bathCount || !bodyText || String(row.description || '').length < 280) {
    try {
      const yr = await enrichFromYatreyonu(row.title, {
        slug: row.slug,
        boatName,
        minScore: 48,
      })
      if (yr?.detail) {
        pax = pax ?? yr.detail.pax
        cabinCount = cabinCount ?? yr.detail.cabinCount
        bathCount =
          bathCount ??
          yr.detail.bathroomCount ??
          parseBathroomCount(yr.detail.description, cabinCount, { propertyType })
        if (yr.detail.description?.length > 120) bodyText = yr.detail.description
        amenities = yr.detail.amenities || []
        sources.push('yatreyonu')
        meta.enrichment_sources = {
          ...(meta.enrichment_sources || {}),
          yatreyonu: {
            url: yr.detail.url,
            match_title: yr.match.title,
            match_score: yr.match.score,
            fetched_at: new Date().toISOString(),
          },
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!bathCount && cabinCount && propertyType === 'gulet') {
    const fromText = parseBathroomCount(row.description, cabinCount, { propertyType })
    bathCount = fromText ?? cabinCount
    sources.push(fromText ? 'gulet_text' : 'gulet_ensuite')
    meta.bath_inferred = fromText ? null : 'ensuite_per_cabin'
  }

  bathCount = sanitizeBathCount(bathCount, cabinCount, pax)

  return {
    pax,
    cabinCount,
    bathCount,
    bodyText,
    amenities,
    sources,
    meta,
  }
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(`
    SELECT l.id::text AS listing_id, l.slug, l.external_provider_code,
           l.external_listing_ref, la.value_json AS meta, lt.title, lt.description,
           tip.key AS property_type
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
    JOIN listing_attributes la ON la.listing_id = l.id
      AND la.group_code = 'listing_meta' AND la.key = 'v1'
    LEFT JOIN listing_attributes tip ON tip.listing_id = l.id AND tip.group_code = 'ilan_tipi'
    LEFT JOIN listing_translations lt ON lt.listing_id = l.id
      AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
    ORDER BY l.slug`)

  let targets = rows.filter(needsWork)
  if (SLUG_FILTER) {
    const needle = SLUG_FILTER.replace(/\*/g, '')
    targets = targets.filter((r) => r.slug.includes(needle))
  }
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Yat eksik tamamlama — ${targets.length} ilan, dry-run=${DRY_RUN}`)

  let updated = 0
  let skipped = 0

  for (const row of targets) {
    process.stdout.write(`  ${row.slug} … `)
    const result = await resolveFromSources(row)
    const changed =
      (result.bathCount && !parseIntMeta(row.meta?.bath_count)) ||
      (result.cabinCount && !parseIntMeta(row.meta?.room_count)) ||
      isDescriptionInsufficient(row.description, { minLen: 280 })

    if (!changed && !result.bathCount && !result.cabinCount) {
      console.log('kaynak yok')
      skipped += 1
      continue
    }

    const akasiaTail = extractAkasiaTail(row.description)
    const newDescription = buildDescription({
      title: row.title,
      propertyType: row.property_type,
      pax: result.pax ?? parseIntMeta(row.meta?.max_guests),
      cabinCount: result.cabinCount ?? parseIntMeta(row.meta?.room_count),
      bathCount: result.bathCount ?? parseIntMeta(row.meta?.bath_count),
      body: result.bodyText,
      akasiaTail,
      amenities: result.amenities,
    })

    if (DRY_RUN) {
      console.log(
        `[dry] ${result.bathCount ?? '-'} banyo, ${result.cabinCount ?? '-'} kabin, ${newDescription.length} chr [${result.sources.join(',')}]`,
      )
      continue
    }

    const newMeta = {
      ...(result.meta || row.meta || {}),
      max_guests:
        result.pax != null ? String(result.pax) : row.meta?.max_guests || '',
      room_count:
        result.cabinCount != null
          ? String(result.cabinCount)
          : row.meta?.room_count || '',
      bath_count:
        result.bathCount != null
          ? String(result.bathCount)
          : row.meta?.bath_count || '',
      cabin_count: result.cabinCount ?? row.meta?.cabin_count ?? null,
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
      [row.listing_id, newDescription || row.description || null],
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

    console.log(
      `→ ${result.bathCount ?? '-'} banyo, ${result.cabinCount ?? '-'} kabin [${result.sources.join(',')}]`,
    )
    updated += 1
  }

  await pg.end()
  console.log(`Bitti: güncellenen=${updated}, atlanan=${skipped}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

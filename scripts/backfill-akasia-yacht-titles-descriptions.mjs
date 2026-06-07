/**
 * Akasia yatları: kategorili Türkçe başlık + doğrulanmış Türkçe açıklama.
 *
 *   node scripts/backfill-akasia-yacht-titles-descriptions.mjs --dry-run
 *   node scripts/backfill-akasia-yacht-titles-descriptions.mjs --slug sensation
 *   node scripts/backfill-akasia-yacht-titles-descriptions.mjs --titles-only
 */

import { createPgClient } from './lib/pg-client.mjs'
import { buildAkasiaCapacityLines } from './lib/akasia-api.mjs'
import { enrichFromYatreyonu, parseBathroomFromText } from './lib/yatreyonu-api.mjs'
import { fetchAkasiaPublicPage } from './lib/akasia-public-page.mjs'
import { formatYachtTitleTr } from './lib/yacht-title-tr.mjs'
import {
  buildTurkishNarrative,
  isDescriptionInsufficient,
} from './lib/yacht-description-tr.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const TITLES_ONLY = args.has('--titles-only')
const FORCE_DESC = args.has('--force-desc')
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

function buildFullDescription({
  displayTitle,
  propertyType,
  pax,
  cabinCount,
  bathCount,
  narrative,
  akasiaTail,
  yatreyonuBody,
  amenities,
}) {
  const lines = []
  lines.push(...buildAkasiaCapacityLines(pax, cabinCount, bathCount))

  const body = String(narrative || yatreyonuBody || '').trim()
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
  if (tail) lines.push(tail)

  return lines.join('\n').trim()
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(
    `SELECT l.id::text AS listing_id, l.slug, l.external_listing_ref AS akasia_id,
            la.value_json AS meta, lt.title, lt.description, tip.key AS property_type
     FROM listings l
     JOIN listing_attributes la ON la.listing_id = l.id
       AND la.group_code = 'listing_meta' AND la.key = 'v1'
     LEFT JOIN listing_attributes tip ON tip.listing_id = l.id AND tip.group_code = 'ilan_tipi'
     LEFT JOIN listing_translations lt ON lt.listing_id = l.id
       AND lt.locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)
     WHERE l.external_provider_code = 'akasia'
     ORDER BY l.slug`,
  )

  let targets = rows
  if (SLUG_FILTER) {
    const needle = SLUG_FILTER.replace(/\*/g, '')
    targets = targets.filter((r) => r.slug.includes(needle))
  }
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(
    `Akasia başlık/açıklama — ${targets.length} ilan, dry-run=${DRY_RUN}, titles-only=${TITLES_ONLY}`,
  )

  let titlesUpdated = 0
  let descUpdated = 0
  let skipped = 0

  for (const row of targets) {
    const propertyType = row.property_type || row.meta?.property_type || 'motor_yat'
    const rawTitle = row.title || row.slug.replace(/-ak-\d+$/, '').replace(/-/g, ' ')
    const displayTitle = formatYachtTitleTr(rawTitle, propertyType)
    const titleChanged = displayTitle !== row.title

    const needsDesc =
      FORCE_DESC || isDescriptionInsufficient(row.description)

    process.stdout.write(`  ${row.slug} → "${displayTitle}"`)

    if (!titleChanged && (TITLES_ONLY || !needsDesc)) {
      console.log(' (değişiklik yok)')
      skipped += 1
      continue
    }

    let newDescription = row.description
    let enrichmentPatch = row.meta?.enrichment_sources || {}

    if (!TITLES_ONLY && needsDesc) {
      const meta = row.meta || {}
      const pax = parseIntMeta(meta.max_guests)
      const cabinCount = parseIntMeta(meta.room_count) ?? meta.cabin_count
      const bathCount = parseIntMeta(meta.bath_count)
      const akasiaTail = extractAkasiaTail(row.description)

      let narrative = ''
      let amenities = []
      let yatreyonuBody = ''

      const yatreyonu = await enrichFromYatreyonu(rawTitle, { slug: row.slug })
      if (yatreyonu?.detail) {
        const v = yatreyonu.detail
        const paxOk = !pax || !v.pax || pax === v.pax
        const cabinOk = !cabinCount || !v.cabinCount || cabinCount === v.cabinCount
        if (paxOk && cabinOk) {
          yatreyonuBody = v.description || ''
          amenities = v.amenities || []
          enrichmentPatch = {
            ...enrichmentPatch,
            yatreyonu: {
              url: v.url,
              match_title: yatreyonu.match.title,
              match_score: yatreyonu.match.score,
              fetched_at: new Date().toISOString(),
            },
          }
        }
      }

      if (!yatreyonuBody) {
        const akasiaPage = await fetchAkasiaPublicPage(rawTitle, propertyType, {
          title: rawTitle,
          pax,
          cabinCount,
          lengthM: meta.length_m ?? null,
        })
        if (akasiaPage?.verification?.verified) {
          narrative = buildTurkishNarrative({
            displayTitle,
            propertyType,
            lengthM: akasiaPage.lengthM ?? meta.length_m,
            built: akasiaPage.built,
            refit: akasiaPage.refit,
            basePort: akasiaPage.basePort || meta.base_port,
            pax: akasiaPage.pax ?? pax,
            cabinCount: akasiaPage.cabinCount ?? cabinCount,
            bathCount: bathCount ?? parseBathroomFromText(akasiaPage.paragraphs.join(' '), cabinCount),
            englishParagraphs: akasiaPage.paragraphs.filter((p) => p.length > 50),
            waterToys: akasiaPage.specs['Water Toys'],
            maxSpeed: akasiaPage.specs['Maximum Speed'],
            cruiseSpeed: akasiaPage.specs['Cruising Speed'],
          })
          enrichmentPatch = {
            ...enrichmentPatch,
            akasia_public: {
              url: akasiaPage.url,
              verified: true,
              verification: akasiaPage.verification,
              fetched_at: new Date().toISOString(),
            },
          }
        }
      }

      if (yatreyonuBody || narrative) {
        newDescription = buildFullDescription({
          displayTitle,
          propertyType,
          pax,
          cabinCount,
          bathCount,
          narrative,
          yatreyonuBody,
          amenities,
          akasiaTail,
        })
      } else {
        console.log(' — açıklama kaynağı bulunamadı')
      }
    }

    if (DRY_RUN) {
      console.log(
        titleChanged ? ' [başlık]' : '',
        newDescription !== row.description ? ` [açıklama ${newDescription.length} chr]` : '',
      )
      continue
    }

    if (titleChanged) {
      await pg.query(
        `UPDATE listing_translations SET title = $2
         WHERE listing_id = $1::uuid
           AND locale_id = (SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1)`,
        [row.listing_id, displayTitle],
      )
      titlesUpdated += 1
    }

    if (!TITLES_ONLY && newDescription !== row.description && needsDesc) {
      const newMeta = {
        ...(row.meta || {}),
        title: displayTitle,
        enrichment_sources: enrichmentPatch,
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
      descUpdated += 1
      console.log(` — açıklama ${newDescription.length} karakter`)
    } else {
      console.log(titleChanged ? ' — başlık güncellendi' : '')
    }
  }

  await pg.end()
  console.log(`Bitti: başlık=${titlesUpdated}, açıklama=${descUpdated}, atlanan=${skipped}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

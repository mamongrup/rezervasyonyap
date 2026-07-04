/**
 * Tüm ilan açıklamalarını okunabilir / SEO uyumlu HTML'e çevirir:
 * 1) Düz metin → paragraf / liste HTML
 * 2) Tatil evi (ve benzeri): Mamon tarzı h2/h3 + Depozito sonrası
 *    giriş/çıkış, ödeme, kurallar, uzaklıklar vb. ara başlıklar
 *
 *   node scripts/backfill-description-html.mjs --dry-run
 *   node scripts/backfill-description-html.mjs
 *   node scripts/backfill-description-html.mjs --force   # tüm tatil evlerini yeniden işle
 */
import { createPgClient } from './lib/pg-client.mjs'
import { structuredPlainTextToHtml, toSeoListingDescriptionHtml } from './lib/text-to-html.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

const HTML_BLOCK_RE = /<p[\s>]|<br\s*\/?>|<div[\s>]|<ul[\s>]|<ol[\s>]|<h[1-4][\s>]/i
const SEO_CATEGORIES = new Set(['holiday_home', 'yacht_charter'])

const pg = createPgClient()
await pg.connect()

try {
  const { rows } = await pg.query(`
    SELECT lt.listing_id, lt.locale_id, lt.description, lt.title, l.slug, pc.code AS category
    FROM listing_translations lt
    JOIN listings l ON l.id = lt.listing_id
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE lt.description IS NOT NULL AND lt.description <> ''
  `)

  let plainFixed = 0
  let seoFixed = 0
  let skipped = 0
  const byCategory = {}

  for (const row of rows) {
    let next = row.description
    let changed = false

    const hasHtmlBlock = HTML_BLOCK_RE.test(next)
    const hasNewline = next.includes('\n')

    if (!hasHtmlBlock && hasNewline) {
      next = structuredPlainTextToHtml(next)
      changed = true
      plainFixed += 1
    }

    // Tatil evi / yat: her zaman SEO normalizer (Depozito sonrası ara başlıklar dahil)
    if (SEO_CATEGORIES.has(row.category) && next) {
      const seo = toSeoListingDescriptionHtml(next, { title: row.title || '' })
      if (seo && seo !== next) {
        next = seo
        changed = true
        seoFixed += 1
      } else if (FORCE && seo) {
        next = seo
        changed = seo !== row.description
        if (changed) seoFixed += 1
      }
    } else if (next && (!hasHtmlBlock || /class="tex|<span\b[^>]*$/i.test(next))) {
      // Diğer kategorilerde kırık HTML / düz metin
      const seo = toSeoListingDescriptionHtml(next, { title: row.title || '' })
      if (seo && seo !== next) {
        next = seo
        changed = true
        seoFixed += 1
      }
    }

    if (!changed || !next || next === row.description) {
      skipped += 1
      continue
    }

    byCategory[row.category] = (byCategory[row.category] || 0) + 1

    if (!DRY_RUN) {
      await pg.query(
        `UPDATE listing_translations SET description = $3
         WHERE listing_id = $1::uuid AND locale_id = $2`,
        [row.listing_id, row.locale_id, next],
      )
    }
  }

  console.log(
    JSON.stringify(
      { dryRun: DRY_RUN, force: FORCE, totalScanned: rows.length, plainFixed, seoFixed, skipped, byCategory },
      null,
      2,
    ),
  )
} finally {
  await pg.end()
}

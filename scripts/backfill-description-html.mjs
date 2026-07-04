/**
 * Var olan tüm ilanların düz metin (HTML etiketsiz) açıklamalarını, paragraf/madde
 * yapısını koruyarak `<p>`/`<ul><li>`/`<strong>` HTML'ine çevirir. Kaynak ne olursa
 * olsun (yat/villa/tur/…) "yazılar içe içe girmiş" görünümünü düzeltir.
 *
 *   node scripts/backfill-description-html.mjs --dry-run
 *   node scripts/backfill-description-html.mjs
 */
import { createPgClient } from './lib/pg-client.mjs'
import { structuredPlainTextToHtml } from './lib/text-to-html.mjs'

const DRY_RUN = process.argv.includes('--dry-run')

const HTML_BLOCK_RE = /<p[\s>]|<br\s*\/?>|<div[\s>]|<ul[\s>]|<ol[\s>]/i

const pg = createPgClient()
await pg.connect()

try {
  const { rows } = await pg.query(`
    SELECT lt.listing_id, lt.locale_id, lt.description, l.slug, pc.code AS category
    FROM listing_translations lt
    JOIN listings l ON l.id = lt.listing_id
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE lt.description IS NOT NULL AND lt.description <> ''
      AND lt.description LIKE '%' || chr(10) || '%'
  `)

  let fixed = 0
  let skippedAlreadyHtml = 0
  const byCategory = {}

  for (const row of rows) {
    if (HTML_BLOCK_RE.test(row.description)) {
      skippedAlreadyHtml += 1
      continue
    }
    const html = structuredPlainTextToHtml(row.description)
    if (!html || html === row.description) continue

    fixed += 1
    byCategory[row.category] = (byCategory[row.category] || 0) + 1

    if (!DRY_RUN) {
      await pg.query(
        `UPDATE listing_translations SET description = $3
         WHERE listing_id = $1::uuid AND locale_id = $2`,
        [row.listing_id, row.locale_id, html],
      )
    }
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, totalScanned: rows.length, fixed, skippedAlreadyHtml, byCategory }, null, 2))
} finally {
  await pg.end()
}

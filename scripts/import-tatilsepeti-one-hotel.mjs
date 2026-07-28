#!/usr/bin/env node
/**
 * Tek Tatilsepeti oteli — URL / slug / hotelId ile eksiksiz aktarım.
 *
 *   node scripts/import-tatilsepeti-one-hotel.mjs --url https://www.tatilsepeti.com/meri-hotel-oludeniz
 *   node scripts/import-tatilsepeti-one-hotel.mjs --slug meri-hotel-oludeniz --hotel-id 7661
 *   TATILSEPETI_LISTING_STATUS=published node scripts/import-tatilsepeti-one-hotel.mjs --url ...
 */
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import { fileURLToPath } from 'node:url'
import {
  TatilsepetiSession,
  fetchHotelDetailPackage,
  scoreHotelPackage,
} from './lib/tatilsepeti-hotel-api.mjs'
import {
  resolveTatilsepetiImportContext,
  upsertTatilsepetiHotelListing,
} from './lib/tatilsepeti-hotel-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { cliLog } from './lib/cli-log.mjs'
import { queueHotelEditorialRefresh } from './lib/hotel-import-quality.mjs'

dns.setDefaultResultOrder('ipv4first')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)

function valueAfter(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? String(argv[i + 1] || '').trim() : ''
}

const DRY_RUN = argv.includes('--dry-run')
const SKIP_ROOM_PRICES = argv.includes('--skip-room-prices')
const QUEUE_AI = !argv.includes('--no-ai-queue')
const URL = valueAfter('--url') || process.env.TATILSEPETI_HOTEL_URL || ''
const SLUG = valueAfter('--slug') || process.env.TATILSEPETI_HOTEL_SLUG || ''
const HOTEL_ID = valueAfter('--hotel-id') || process.env.TATILSEPETI_HOTEL_ID || ''
const NAME = valueAfter('--name') || ''
const ORG_ID = valueAfter('--org-id') || process.env.IMPORT_ORG_ID || ''
const STATUS = process.env.TATILSEPETI_LISTING_STATUS || 'published'
const PACKAGE_OUT =
  valueAfter('--package-out') ||
  path.join(__dirname, '..', 'deploy', 'data', 'tatilsepeti', `${SLUG || 'one-hotel'}.package.json`)
const EDITORIAL_HTML = valueAfter('--editorial-html') // file path

function slugFromUrl(u) {
  try {
    const p = new URL(u).pathname.replace(/\/+$/, '')
    return p.split('/').filter(Boolean).pop() || ''
  } catch {
    return ''
  }
}

function loadEditorialHtml() {
  if (!EDITORIAL_HTML) return null
  const abs = path.isAbsolute(EDITORIAL_HTML)
    ? EDITORIAL_HTML
    : path.join(process.cwd(), EDITORIAL_HTML)
  return fs.readFileSync(abs, 'utf8').trim()
}

async function resolveOrgId(pg) {
  if (ORG_ID) return ORG_ID
  const r = await pg.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)
  if (!r.rows[0]) throw new Error('organizations kaydı yok; --org-id <uuid>')
  return r.rows[0].id
}

async function main() {
  const slug = SLUG || (URL ? slugFromUrl(URL) : '')
  if (!slug && !HOTEL_ID && !URL) {
    throw new Error('Kullanım: --url <tatilsepeti-url>  veya  --slug <slug> [--hotel-id <id>]')
  }

  const listRow = {
    hotelId: HOTEL_ID || '0',
    name: NAME || slug || 'Tatilsepeti Oteli',
    slug: slug || undefined,
    url: URL || (slug ? `https://www.tatilsepeti.com/${slug}` : undefined),
    region: '',
    theme: '',
    guestScore: null,
    reviewCount: null,
  }

  const session = new TatilsepetiSession()
  cliLog(`[fetch] ${listRow.url || listRow.slug || listRow.hotelId}`)
  const pkg = await fetchHotelDetailPackage(session, listRow, {
    fetchRoomPrices: !SKIP_ROOM_PRICES,
    log: cliLog,
  })

  const editorial = loadEditorialHtml()
  if (editorial) {
    pkg.description = editorial
    cliLog(`[editorial] TR açıklama dosyadan uygulandı (${editorial.length} karakter)`)
  }

  const completeness = scoreHotelPackage(pkg)
  fs.mkdirSync(path.dirname(PACKAGE_OUT), { recursive: true })
  fs.writeFileSync(PACKAGE_OUT, JSON.stringify({ ...pkg, completeness }, null, 2))
  cliLog(
    `[paket] ${pkg.name} id=${pkg.hotelId} galeri=${pkg.gallery?.length || 0} oda=${pkg.rooms?.length || 0} min=${pkg.minNightlyPrice ?? '-'} tamlık=${completeness.score}% → ${PACKAGE_OUT}`,
  )
  if (completeness.missing.length) cliLog(`[uyarı] eksik: ${completeness.missing.join(', ')}`)

  if (DRY_RUN) {
    cliLog('[dry-run] DB yazılmadı')
    return
  }

  const pg = createPgClient()
  await pg.connect()
  try {
    const ctx = await resolveTatilsepetiImportContext(pg, await resolveOrgId(pg))
    const result = await upsertTatilsepetiHotelListing(pg, ctx, pkg, { status: STATUS })
    cliLog(
      `[db] ${result.action} slug=${result.slug} id=${result.listingId} görsel=${result.imageCount} oda=${result.roomCount} kalite=${result.quality?.status || '?'}`,
    )
    if (QUEUE_AI && result.listingId) {
      const batchId = await queueHotelEditorialRefresh(pg, result.listingId, { overwrite: true })
      cliLog(`[ai] dil/SEO kuyruğu: batch=${batchId}`)
    }
  } finally {
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e.stack || e.message)
  process.exit(1)
})

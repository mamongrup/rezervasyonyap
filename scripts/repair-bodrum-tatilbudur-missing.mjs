#!/usr/bin/env node
/**
 * Bodrum: teklifi olan ama DB'de eksik / odasız / fiyatsız otelleri onarır.
 * Harvest başarısız olsa bile offer stub + fiyat/oda yazar (yerel AVIF sonra).
 *
 *   node scripts/repair-bodrum-tatilbudur-missing.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const urlsFile = path.join(ROOT, 'deploy/data/tatilbudur/bodrum-request-urls.txt')
const feedPath = path.join(ROOT, 'backups/tatilbudur-bodrum-public-feed.json')
const offersFamily = path.join(
  ROOT,
  'deploy/data/tatilbudur/bodrum-2026-08-10-13-2adults-1child-offers.json',
)
const offersTwoAdults = path.join(
  ROOT,
  'deploy/data/tatilbudur/bodrum-2026-08-10-13-2adults-offers.json',
)
const statePath = path.join(ROOT, 'backups/tatilbudur-bodrum-import-state.json')

/** Bu listede teklif JSON yok — fiyat uydurulmaz. */
const NO_OFFER_SLUGS = new Set([
  'akyali-butik-otel',
  'cinar-butik-otel-bodrum',
  'anar-hotel-torba',
  'asterina-hotel',
  'el-vino-hotel-suites',
  'delfi-hotel',
  'oda-bodrum-gumusluk',
])

function run(script, args = []) {
  console.log(`==> node ${script} ${args.join(' ')}`)
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  })
  if (r.status !== 0) process.exit(r.status || 1)
}

function slugFromUrl(url) {
  try {
    return new URL(url).pathname.replace(/^\/+|\/+$/g, '')
  } catch {
    return ''
  }
}

const allUrls = fs
  .readFileSync(urlsFile, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*/, '').trim())
  .filter((line) => /^https:\/\/www\.tatilbudur\.com\//i.test(line))

const client = createPgClient()
await client.connect()
let missingSlugs = []
let roomlessSlugs = []
try {
  const refs = allUrls.map(slugFromUrl).filter(Boolean)
  const result = await client.query(
    `SELECT l.external_listing_ref AS ref, l.status,
       (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id=l.id) AS rooms,
       (SELECT count(*)::int FROM listing_price_rules lpr
         WHERE lpr.listing_id=l.id
           AND lpr.rule_json->>'source'='tatilbudur'
           AND nullif(lpr.rule_json->>'base_nightly','')::numeric > 0) AS prices
     FROM listings l
     WHERE l.external_provider_code='tatilbudur'
       AND l.external_listing_ref = ANY($1::text[])`,
    [refs],
  )
  const byRef = new Map(result.rows.map((r) => [r.ref, r]))
  missingSlugs = refs.filter((r) => !byRef.has(r))
  roomlessSlugs = result.rows
    .filter((r) => Number(r.rooms) < 1 || Number(r.prices) < 1 || r.status !== 'published')
    .map((r) => r.ref)
} finally {
  await client.end()
}

// Teklifi olanları öncelikle onar; teklifsizleri ayrı bildir
const repairSlugs = [...new Set([...missingSlugs, ...roomlessSlugs])].filter(
  (s) => !NO_OFFER_SLUGS.has(s),
)
const blockedNoOffer = [...new Set([...missingSlugs, ...roomlessSlugs])].filter((s) =>
  NO_OFFER_SLUGS.has(s),
)

console.log(
  JSON.stringify(
    {
      missingSlugs,
      roomlessOrDraft: roomlessSlugs,
      willRepairWithOffers: repairSlugs,
      blockedNoOfferInJson: blockedNoOffer,
    },
    null,
    2,
  ),
)

if (!repairSlugs.length) {
  console.log('Teklifi olan onarılacak kayıt yok.')
  if (blockedNoOffer.length) {
    console.log('Teklif JSON’da olmayan (ekran görüntüsü gerekir):', blockedNoOffer.join(', '))
  }
  process.exit(0)
}

const onlyUrls = path.join(ROOT, 'backups/tatilbudur-bodrum-repair-urls.txt')
fs.writeFileSync(
  onlyUrls,
  `${repairSlugs.map((s) => `https://www.tatilbudur.com/${s}`).join('\n')}\n`,
)

const patchFeed = path.join(ROOT, 'backups/tatilbudur-bodrum-repair-feed.json')
run('scripts/harvest-tatilbudur-url-list.mjs', [
  '--urls',
  path.relative(ROOT, onlyUrls),
  '--out',
  path.relative(ROOT, patchFeed),
  '--min-images',
  '0',
])

const mainFeed = fs.existsSync(feedPath)
  ? JSON.parse(fs.readFileSync(feedPath, 'utf8'))
  : { hotels: [] }
const patch = JSON.parse(fs.readFileSync(patchFeed, 'utf8'))
const byId = new Map((mainFeed.hotels || []).map((h) => [String(h.id || h.slug), h]))
for (const hotel of patch.hotels || []) {
  const key = String(hotel.id || hotel.slug)
  const prev = byId.get(key)
  if (!prev) {
    byId.set(key, hotel)
    continue
  }
  byId.set(key, {
    ...prev,
    ...hotel,
    images: hotel.images?.length ? hotel.images : prev.images || [],
    description: hotel.description || prev.description,
    name: hotel.name || prev.name,
    rooms: prev.rooms?.length ? prev.rooms : hotel.rooms || [],
  })
}
mainFeed.hotels = [...byId.values()]
fs.writeFileSync(feedPath, `${JSON.stringify(mainFeed, null, 2)}\n`)

// Önce aile teklifleri, sonra 2 yetişkin — stub oluştur
for (const offersPath of [offersFamily, offersTwoAdults]) {
  if (!fs.existsSync(offersPath)) continue
  run('scripts/apply-tatilbudur-visible-offers.mjs', [
    '--feed',
    path.relative(ROOT, feedPath),
    '--offers',
    path.relative(ROOT, offersPath),
    '--create-missing',
  ])
}
run('scripts/fix-hotel-room-images-in-feed.mjs', [path.relative(ROOT, feedPath)])

process.env.TATILBUDUR_LISTING_STATUS = 'draft'
process.env.TATILBUDUR_IMPORT_STATE = statePath
run('scripts/import-tatilbudur-hotels.mjs', ['--file', path.relative(ROOT, feedPath)])

console.log(`
[OK] Teklifi olan eksikler import edildi (yerel AVIF korunur).

Sırada:
  IMAGE_CONVERT_CONCURRENCY=1 AVIF_EFFORT=2 VIPS_CONCURRENCY=1 \\
    ./deploy/scripts/rehost-external-images-detached.sh \\
    --provider=tatilbudur --category=hotel \\
    --hosts=productcdn.tatilbudur.com,ucdn.tatilbudur.net,tatilbudur.com
  ./deploy/scripts/rehost-external-images-detached.sh wait
  node scripts/finalize-bodrum-tatilbudur.mjs

Teklif JSON'da OLMAYAN (yayınlanamaz, ekran görüntüsü gerekir):
  ${blockedNoOffer.join(', ') || '(yok)'}
`)

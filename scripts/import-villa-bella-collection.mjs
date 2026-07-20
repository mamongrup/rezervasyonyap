#!/usr/bin/env node
/**
 * Birvillas Villa Bella 1-5 koleksiyonunu taslak olarak ekler.
 *
 *   node scripts/import-villa-bella-collection.mjs
 *   node scripts/import-villa-bella-collection.mjs --skip-images
 *   node scripts/import-villa-bella-collection.mjs --dry-run
 */
import { runManualHolidayHomeImport } from './lib/manual-holiday-home-db.mjs'
import { BELLA_VILLAS, buildBellaVillaPackage } from './lib/villa-bella-collection.mjs'

const SKIP_IMAGES = process.argv.includes('--skip-images')
const DRY_RUN = process.argv.includes('--dry-run')
const ALLOW_OFFLINE = process.argv.includes('--allow-offline')

const results = []
for (const villa of BELLA_VILLAS) {
  const built = await buildBellaVillaPackage(villa, {
    requireLive: !ALLOW_OFFLINE,
    resolveAmenities: !DRY_RUN,
  })
  if (!built.live && !ALLOW_OFFLINE) {
    throw new Error(`live_required:${villa.slug}`)
  }
  const result = await runManualHolidayHomeImport(built.pkg, {
    status: 'draft',
    skipImages: SKIP_IMAGES,
    dryRun: DRY_RUN,
  })
  results.push({
    ...result,
    sourceGalleryCount: built.sourceGalleryCount,
    live: built.live,
    themeCodes: built.pkg.themeCodes,
    amenityCount: built.pkg.amenityRows?.length || built.pkg.amenities?.length || 0,
    priceBands: built.pkg.seasonalPrices?.length || 0,
  })
  console.log(JSON.stringify(results.at(-1), null, 2))
}

console.log('Villa Bella koleksiyonu:', results.map((r) => `${r.slug}:${r.imageCount || 0}/${r.sourceGalleryCount}`).join(', '))

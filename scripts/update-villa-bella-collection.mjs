#!/usr/bin/env node
/**
 * Villa Bella 1–5 fiyat, müsaitlik ve sistem özelliklerini Birvillas canlı veriden günceller.
 * Mevcut yayın durumunu korur; görselleri varsayılan olarak değiştirmez.
 *
 *   node scripts/update-villa-bella-collection.mjs
 *   node scripts/update-villa-bella-collection.mjs --dry-run
 *   node scripts/update-villa-bella-collection.mjs --with-images
 */
import { runManualHolidayHomeImport } from './lib/manual-holiday-home-db.mjs'
import { BELLA_VILLAS, buildBellaVillaPackage } from './lib/villa-bella-collection.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const WITH_IMAGES = process.argv.includes('--with-images')

const results = []
for (const villa of BELLA_VILLAS) {
  const built = await buildBellaVillaPackage(villa, {
    requireLive: true,
    resolveAmenities: !DRY_RUN,
  })
  // Güncellemede galeriyi yeniden indirmemek için boş bırak (mevcut görseller korunur).
  if (!WITH_IMAGES) {
    built.pkg.galleryUrls = undefined
  }

  let result
  if (DRY_RUN) {
    result = {
      action: 'would_update',
      slug: villa.slug,
      externalRef: villa.externalRef,
      dryRun: true,
    }
  } else {
    result = await runManualHolidayHomeImport(built.pkg, {
      status: 'published',
      preserveStatus: true,
      skipImages: !WITH_IMAGES,
    })
  }

  results.push({
    ...result,
    live: built.live,
    themeCodes: built.pkg.themeCodes,
    amenityCount: built.pkg.amenityRows?.length || built.pkg.amenities?.length || 0,
    priceBands: built.pkg.seasonalPrices?.length || 0,
    calendarDays: built.pkg.calendarDays?.length || 0,
    calendarBlocked: built.pkg.calendarDays?.filter((d) => !d.is_available).length || 0,
    vitrinPrice: built.pkg.vitrinPrice,
    minStayNights: built.pkg.minStayNights,
    seasonalPrices: (built.pkg.seasonalPrices || []).map((b) => ({
      from: b.from, to: b.to, price: b.baseNightly, label: b.label,
    })),
  })
  console.log(JSON.stringify(results.at(-1), null, 2))
}

const failed = results.filter((r) => !r.live)
if (failed.length) {
  console.error(`[FAIL] canlı veri olmayan ilanlar: ${failed.map((r) => r.slug).join(', ')}`)
  process.exit(1)
}

console.log(
  'Villa Bella güncellendi:',
  results.map((r) => `${r.slug}:₺${r.vitrinPrice}/${r.priceBands}b/${r.calendarDays}d/${r.amenityCount}öz/${(r.themeCodes || []).join('+')}`).join(', '),
)

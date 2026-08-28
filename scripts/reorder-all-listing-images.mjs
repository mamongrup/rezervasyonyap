/**
 * Tüm veya seçili ilanlardaki galeri görsellerini vitrin kurallarına göre yeniden sıralar:
 * - Dış Mekan / Manzara / Deniz / Cephe -> İlk sıra (Kapak)
 * - Havuz / Bahçe -> Üst sıralar
 * - Salon / Lobi / Mutfak -> Orta sıralar
 * - Yatak Odaları -> Orta-Son sıralar
 * - Banyo / WC / Kat Planı -> En son sıralar
 *
 * Kullanım:
 *   node scripts/reorder-all-listing-images.mjs --all
 *   node scripts/reorder-all-listing-images.mjs --category holiday_home
 *   node scripts/reorder-all-listing-images.mjs --slug kayakoy-kuzey-villa
 *   node scripts/reorder-all-listing-images.mjs --all --dry-run
 */
import { createPgClient } from './lib/pg-client.mjs'
import { reorderListingImagesInDb, classifyImageScene } from './lib/listing-image-ranking.mjs'

const argv = process.argv.slice(2)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const DRY_RUN = argv.includes('--dry-run')
const ALL = argv.includes('--all')
const CATEGORY = valueAfter('--category')
const SLUG = valueAfter('--slug')
const ID = valueAfter('--id')
const LIMIT_RAW = valueAfter('--limit')
const LIMIT = LIMIT_RAW ? Number.parseInt(LIMIT_RAW, 10) : null

async function main() {
  const pg = await createPgClient()
  if (!pg) {
    console.error('PostgreSQL bağlantısı kurulamadı. Ortam değişkenlerini kontrol edin.')
    process.exit(1)
  }

  try {
    let query = `
      SELECT l.id::text, l.title, l.slug, l.category_code, l.featured_image_url,
             count(li.id)::int as image_count
      FROM listings l
      INNER JOIN listing_images li ON li.listing_id = l.id
      WHERE 1=1
    `
    const params = []

    if (ID) {
      params.push(ID)
      query += ` AND l.id = $${params.length}::uuid`
    } else if (SLUG) {
      params.push(SLUG)
      query += ` AND l.slug = $${params.length}`
    } else if (CATEGORY) {
      params.push(CATEGORY)
      query += ` AND l.category_code = $${params.length}`
    } else if (!ALL) {
      console.log(`Lütfen bir hedef belirtin:
  --all                 : Tüm ilanları yeniden sıralar
  --category <kod>      : Belirli bir kategori (örn: holiday_home, hotel, yacht_charter)
  --slug <ilan-slug>    : Tek bir ilan
  --id <ilan-id>        : İlan ID
  --dry-run             : Değişiklikleri uygulamadan önizler`)
      process.exit(0)
    }

    query += `
      GROUP BY l.id, l.title, l.slug, l.category_code, l.featured_image_url
      HAVING count(li.id) > 1
      ORDER BY l.created_at DESC
    `

    if (LIMIT && Number.isFinite(LIMIT)) {
      params.push(LIMIT)
      query += ` LIMIT $${params.length}`
    }

    const { rows: listings } = await pg.query(query, params)
    console.log(`\n🔍 ${listings.length} adet çoklu fotoğraflı ilan bulundu.${DRY_RUN ? ' (DRY RUN - veritabanı değişmeyecek)' : ''}\n`)

    let totalUpdated = 0
    let totalCoverFixed = 0

    for (let idx = 0; idx < listings.length; idx++) {
      const listing = listings[idx]
      const { rows: imgRows } = await pg.query(
        `SELECT id::text, sort_order, storage_key, coalesce(alt_text_key, '') as alt_text_key, coalesce(scene_code, '') as scene_code
         FROM listing_images
         WHERE listing_id = $1::uuid
         ORDER BY sort_order ASC, created_at ASC`,
        [listing.id],
      )

      if (imgRows.length <= 1) continue

      const firstBefore = imgRows[0]?.storage_key || ''
      const firstBeforeScene = classifyImageScene(firstBefore)

      if (DRY_RUN) {
        // Simülasyon
        const simulated = imgRows.map((r, oIdx) => {
          const det = classifyImageScene(`${r.storage_key} ${r.alt_text_key}`)
          return { ...r, originalIndex: oIdx, finalScene: det.scene_code, finalPriority: det.priority }
        })
        simulated.sort((a, b) => {
          if (a.finalPriority !== b.finalPriority) return a.finalPriority - b.finalPriority
          return a.originalIndex - b.originalIndex
        })
        const firstAfter = simulated[0]?.storage_key || ''
        const firstAfterScene = simulated[0]?.finalScene || ''

        const orderChanged = simulated.some((item, i) => item.sort_order !== i)
        if (orderChanged) {
          totalUpdated++
          const coverChanged = firstBefore !== firstAfter
          if (coverChanged) totalCoverFixed++
          console.log(`[${idx + 1}/${listings.length}] ${listing.title} (${listing.slug})`)
          console.log(`  Eski kapak: [${firstBeforeScene.scene_code}] ${firstBefore}`)
          console.log(`  Yeni kapak: [${firstAfterScene}] ${firstAfter}`)
        }
      } else {
        const res = await reorderListingImagesInDb(pg, listing.id, { updateFeaturedImage: true })
        if (res.updated) {
          totalUpdated++
          const coverChanged = res.hero && !listing.featured_image_url?.includes(res.hero)
          if (coverChanged) totalCoverFixed++
          console.log(`✅ [${idx + 1}/${listings.length}] ${listing.title} (${listing.slug}) -> ${res.total} görsel yeniden sıralandı.`)
        }
      }
    }

    console.log(`\n========================================`)
    console.log(`📊 SONUÇ ÖZETİ`)
    console.log(`----------------------------------------`)
    console.log(`Toplam taranan ilan        : ${listings.length}`)
    console.log(`Sıralaması güncellenen ilan: ${totalUpdated}`)
    console.log(`Kapağı iyileştirilen ilan  : ${totalCoverFixed}`)
    console.log(`========================================\n`)
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('Hata oluştu:', err)
  process.exit(1)
})

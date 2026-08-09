/**
 * Wtatil Ilanlarinin Tam Kapsamli Kalite ve Dogruluk Auditi:
 * 1) Resim galerisindeki resimler ve resim kaliteleri (AVIF, yerel disk varligi, kapak resmi, media_incomplete)
 * 2) Musaitlik durumu (Gelecek tarihli, satis durumundaki periyotlar, Stop&Sale kontrolu)
 * 3) Tur periyotlari ve periyot fiyatlari (cheapest_price, vitrin_price uyumu, para birimi)
 *
 * Kullanim:
 *   node scripts/audit-wtatil-full-quality.mjs
 *   node scripts/audit-wtatil-full-quality.mjs --sample 20
 *   node scripts/audit-wtatil-full-quality.mjs --slug balkan-guzelleri-...
 *   node scripts/audit-wtatil-full-quality.mjs --repair-prices
 *   node scripts/audit-wtatil-full-quality.mjs --repair-covers
 *   node scripts/audit-wtatil-full-quality.mjs --download-images
 *
 * Env: PG*, WTATIL_*
 */

import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  fetchWtatilToken,
  loadWtatilConfigAsync,
} from './lib/wtatil-api.mjs'
import { enrichWtatilTour } from './lib/wtatil-enrich.mjs'
import {
  avifFileName,
  downloadAndSaveAvif,
  filterUrlsForDownload,
  isExternalImageKey,
  isLocalAvifKey,
} from './lib/wtatil-image-download.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const PUBLIC_ROOT = path.join(REPO_ROOT, 'frontend', 'public')
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, 'uploads', 'listings')

const args = new Set(process.argv.slice(2))
const REPAIR_PRICES = args.has('--repair-prices')
const REPAIR_COVERS = args.has('--repair-covers')
const DOWNLOAD_IMAGES = args.has('--download-images')
const LIVE_API = args.has('--live-api')

const sampleIdx = process.argv.indexOf('--sample')
const SAMPLE = sampleIdx >= 0 ? Number(process.argv[sampleIdx + 1]) : 0

const slugIdx = process.argv.indexOf('--slug')
const TARGET_SLUG = slugIdx >= 0 ? process.argv[slugIdx + 1] : null

function isWtatilPeriodSellable(row) {
  if (!row || typeof row !== 'object') return false
  if (
    row.isStopSale === true ||
    row.IsStopSale === true ||
    row.stopSale === true ||
    row.StopSale === true ||
    row.askSell === true ||
    row.AskSell === true
  ) return false
  const quota = row.quota ?? row.Quota
  if (quota != null && quota !== '' && Number(quota) === 0) return false
  return true
}

function localFilePathFromStorageKey(storageKey) {
  if (!storageKey || isExternalImageKey(storageKey)) return null
  const key = String(storageKey).replace(/^\/+/, '')
  return path.join(PUBLIC_ROOT, ...key.split('/'))
}

function checkDiskFile(filePath) {
  if (!filePath) return { exists: false, size: 0 }
  if (!existsSync(filePath)) return { exists: false, size: 0 }
  try {
    const st = statSync(filePath)
    return { exists: st.size > 0, size: st.size }
  } catch {
    return { exists: false, size: 0 }
  }
}

async function main() {
  const pgClient = createPgClient()
  await pgClient.connect()

  let auth = null
  let agencyId = null
  if (LIVE_API || DOWNLOAD_IMAGES) {
    try {
      auth = await fetchWtatilToken()
      const cfg = await loadWtatilConfigAsync()
      agencyId = cfg.agencyId
      console.log('Wtatil API baglantisi OK.')
    } catch (e) {
      console.warn('Wtatil API baglantisi alinamadi:', e.message)
    }
  }

  try {
    let sql = `
      SELECT l.id::text AS listing_id,
             l.slug,
             l.status,
             l.currency_code,
             l.featured_image_url,
             l.thumbnail_url,
             l.vitrin_price,
             l.external_listing_ref,
             l.last_synced_at,
             ltd.program_days_json
      FROM listings l
      LEFT JOIN listing_tour_details ltd ON ltd.listing_id = l.id
      WHERE l.external_provider_code = 'wtatil'`

    const params = []
    if (TARGET_SLUG) {
      params.push(TARGET_SLUG)
      sql += ` AND l.slug = $${params.length}`
    } else {
      sql += ` ORDER BY l.status DESC, l.slug ASC`
      if (SAMPLE > 0) {
        params.push(SAMPLE)
        sql += ` LIMIT $${params.length}`
      }
    }

    const { rows: listings } = await pgClient.query(sql, params)
    console.log(`\n=== WTATIL ILAN KALITE VE DOGRULUK AUDITI (${listings.length} ILAN) ===\n`)

    const listingIds = listings.map((l) => l.listing_id)
    let imagesByListing = new Map()
    if (listingIds.length > 0) {
      const imgRes = await pgClient.query(
        `SELECT li.listing_id::text, li.id::text AS image_id, li.storage_key, li.sort_order, li.original_mime
         FROM listing_images li
         WHERE li.listing_id = ANY($1::uuid[])
         ORDER BY li.listing_id, li.sort_order, li.id`,
        [listingIds],
      )
      for (const img of imgRes.rows) {
        if (!imagesByListing.has(img.listing_id)) imagesByListing.set(img.listing_id, [])
        imagesByListing.get(img.listing_id).push(img)
      }
    }

    const stats = {
      total: listings.length,
      published: 0,
      draft: 0,
      // Medya
      media_ok: 0,
      media_incomplete: 0,
      external_images_count: 0,
      local_avif_count: 0,
      missing_disk_files: 0,
      cover_missing_or_broken: 0,
      // Musaitlik
      has_sellable_periods: 0,
      no_sellable_periods: 0,
      no_periods: 0,
      total_periods_count: 0,
      total_sellable_periods_count: 0,
      // Fiyat
      price_ok: 0,
      price_missing: 0,
      price_mismatch: 0,
      repairs_applied: 0,
    }

    const issues = []
    const todayStr = new Date().toISOString().slice(0, 10)

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i]
      if (listing.status === 'published') stats.published++
      else stats.draft++

      const images = imagesByListing.get(listing.listing_id) || []
      const programJson =
        listing.program_days_json && typeof listing.program_days_json === 'object'
          ? listing.program_days_json
          : {}

      // --- 1. RESIM GALERISI VE KALITE KONTROLU ---
      let localAvifCount = 0
      let externalCount = 0
      let missingDiskCount = 0

      for (const img of images) {
        if (isLocalAvifKey(img.storage_key)) {
          localAvifCount++
          const diskCheck = checkDiskFile(localFilePathFromStorageKey(img.storage_key))
          if (!diskCheck.exists) missingDiskCount++
        } else if (isExternalImageKey(img.storage_key)) {
          externalCount++
        } else {
          // Baska yerel format
          const diskCheck = checkDiskFile(localFilePathFromStorageKey(img.storage_key))
          if (!diskCheck.exists) missingDiskCount++
        }
      }

      stats.local_avif_count += localAvifCount
      stats.external_images_count += externalCount
      stats.missing_disk_files += missingDiskCount

      // Kapak resmi kontrolu
      const coverUrl = listing.featured_image_url || listing.thumbnail_url || ''
      const coverLocalFile = localFilePathFromStorageKey(coverUrl)
      const coverDiskCheck = coverLocalFile ? checkDiskFile(coverLocalFile) : null
      const isCoverBroken =
        !coverUrl || (coverLocalFile && !coverDiskCheck?.exists)

      if (isCoverBroken) stats.cover_missing_or_broken++

      const isMediaIncomplete = images.length === 0 || isCoverBroken
      if (isMediaIncomplete) {
        stats.media_incomplete++
        issues.push({
          slug: listing.slug,
          issue: 'media_incomplete',
          details: `Görsel: ${images.length} (Yerel AVIF: ${localAvifCount}, Harici: ${externalCount}), Kapak: ${coverUrl ? (coverDiskCheck?.exists ? 'tam' : 'dosya_yok') : 'yok'}`,
        })
      } else {
        stats.media_ok++
      }

      // Kapak onarimi (REPAIR_COVERS)
      if (REPAIR_COVERS && isCoverBroken && images.length > 0) {
        const firstUsable = images.find((img) => {
          const fp = localFilePathFromStorageKey(img.storage_key)
          return !fp || checkDiskFile(fp).exists
        })
        if (firstUsable) {
          const newCover = isExternalImageKey(firstUsable.storage_key)
            ? firstUsable.storage_key
            : `/${String(firstUsable.storage_key).replace(/^\/+/, '')}`
          await pgClient.query(
            `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
            [listing.listing_id, newCover],
          )
          stats.repairs_applied++
          console.log(`  [repair-cover] ${listing.slug} -> ${newCover}`)
        }
      }

      // Harici resimleri AVIF indirip yerellestirme (DOWNLOAD_IMAGES)
      if (DOWNLOAD_IMAGES && externalCount > 0) {
        const toFetch = filterUrlsForDownload(images)
        if (toFetch.length > 0) {
          let downloadOk = 0
          for (const imgRow of toFetch) {
            const fileName = avifFileName(imgRow.sort_order, imgRow.storage_key)
            const destAbs = path.join(listingUploadDir(UPLOADS_ROOT, 'tour', listing.slug), fileName)
            const storageKey = listingStorageKey('tour', listing.slug, fileName)

            try {
              const res = await downloadAndSaveAvif(imgRow.storage_key, destAbs)
              if (res.ok) {
                await pgClient.query(
                  `UPDATE listing_images SET storage_key = $2, original_mime = 'image/avif' WHERE id = $1::uuid`,
                  [imgRow.image_id, storageKey],
                )
                downloadOk++
              }
            } catch (err) {
              console.warn(`  [download-fail] ${listing.slug} sort=${imgRow.sort_order}: ${err.message}`)
            }
          }
          if (downloadOk > 0) {
            const firstImgRes = await pgClient.query(
              `SELECT storage_key FROM listing_images WHERE listing_id = $1::uuid ORDER BY sort_order ASC LIMIT 1`,
              [listing.listing_id],
            )
            const hero = firstImgRes.rows[0]?.storage_key
            if (hero && !isExternalImageKey(hero)) {
              const heroUrl = `/${hero.replace(/^\/+/, '')}`
              await pgClient.query(
                `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
                [listing.listing_id, heroUrl],
              )
            }
            stats.repairs_applied += downloadOk
            console.log(`  [download-images] ${listing.slug}: ${downloadOk} resim AVIF olarak indirildi.`)
          }
        }
      }

      // --- 2. MUSAITLIK DURUMU KONTROLU ---
      const rawPeriods = Array.isArray(programJson.periods) ? programJson.periods : []
      stats.total_periods_count += rawPeriods.length

      let sellablePeriods = []
      if (rawPeriods.length > 0) {
        for (const p of rawPeriods) {
          const endDate = p?.endDate || p?.periodEndDate || p?.startDate || p?.periodStartDate || ''
          const isFuture = endDate ? String(endDate).slice(0, 10) >= todayStr : true
          const sellable = isWtatilPeriodSellable(p)
          if (isFuture && sellable) {
            sellablePeriods.push(p)
          }
        }
      }

      stats.total_sellable_periods_count += sellablePeriods.length

      if (rawPeriods.length === 0) {
        stats.no_periods++
        issues.push({
          slug: listing.slug,
          issue: 'no_periods',
          details: 'Hiç dönem bulunamadı (program_days_json.periods boş)',
        })
      } else if (sellablePeriods.length === 0) {
        stats.no_sellable_periods++
        issues.push({
          slug: listing.slug,
          issue: 'no_sellable_periods',
          details: `Toplam ${rawPeriods.length} dönem var ama satışa açık/gelecek dönem 0 (Stop&Sale veya tarihi geçmiş)`,
        })
      } else {
        stats.has_sellable_periods++
      }

      // --- 3. TUR PERIYOTLARI VE PERIYOT FIYATLARI KONTROLU ---
      const cheapestInProgram =
        programJson.cheapest_price != null ? Number(programJson.cheapest_price) : null
      const vitrinPrice =
        listing.vitrin_price != null ? Number(listing.vitrin_price) : null

      if (vitrinPrice != null && vitrinPrice > 0) {
        if (cheapestInProgram != null && Math.abs(vitrinPrice - cheapestInProgram) > 0.01) {
          stats.price_mismatch++
          issues.push({
            slug: listing.slug,
            issue: 'price_mismatch',
            details: `vitrin_price (${vitrinPrice}) != cheapest_price (${cheapestInProgram})`,
          })
          if (REPAIR_PRICES) {
            await pgClient.query(
              `UPDATE listings SET vitrin_price = $2::numeric, updated_at = now() WHERE id = $1::uuid`,
              [listing.listing_id, cheapestInProgram],
            )
            stats.repairs_applied++
            console.log(`  [repair-price] ${listing.slug} vitrin_price: ${vitrinPrice} -> ${cheapestInProgram}`)
          }
        } else {
          stats.price_ok++
        }
      } else if (cheapestInProgram != null && cheapestInProgram > 0) {
        stats.price_mismatch++
        issues.push({
          slug: listing.slug,
          issue: 'vitrin_price_null',
          details: `cheapest_price (${cheapestInProgram}) var ama vitrin_price NULL`,
        })
        if (REPAIR_PRICES) {
          await pgClient.query(
            `UPDATE listings SET vitrin_price = $2::numeric, updated_at = now() WHERE id = $1::uuid`,
            [listing.listing_id, cheapestInProgram],
          )
          stats.repairs_applied++
          console.log(`  [repair-price] ${listing.slug} vitrin_price NULL -> ${cheapestInProgram}`)
        }
      } else {
        stats.price_missing++
        if (listing.status === 'published') {
          issues.push({
            slug: listing.slug,
            issue: 'published_without_price',
            details: 'İlan yayında ama geçerli fiyatı yok!',
          })
        }
      }

      // Live API karșılaștırma (isteğe bağlı)
      if (LIVE_API && auth && agencyId && listing.external_listing_ref) {
        try {
          const enrich = await enrichWtatilTour(auth.userName, auth.token, { id: listing.external_listing_ref }, agencyId, { withPrices: true })
          const apiPeriodCount = Array.isArray(enrich.periods) ? enrich.periods.length : 0
          if (apiPeriodCount !== rawPeriods.length) {
            issues.push({
              slug: listing.slug,
              issue: 'live_api_period_count_diff',
              details: `DB dönem sayısı (${rawPeriods.length}) != API dönem sayısı (${apiPeriodCount})`,
            })
          }
        } catch (err) {
          console.warn(`  [live-api-fail] ${listing.slug}: ${err.message}`)
        }
      }
    }

    console.log('=== WTATIL KALITE AUDIT OZETI ===')
    console.log(`Toplam Ilan: ${stats.total} (${stats.published} Yayında, ${stats.draft} Taslak)`)
    console.log(`\n[1. Medya Kalitesi]`)
    console.log(`  - Kalite Kapisi Gecti (Media OK): ${stats.media_ok}`)
    console.log(`  - Kalite Kapisi Uyarisi (Media Incomplete): ${stats.media_incomplete}`)
    console.log(`  - Yerel AVIF Resim Sayisi: ${stats.local_avif_count}`)
    console.log(`  - Yerellesmemis Harici Resim Sayisi: ${stats.external_images_count}`)
    console.log(`  - Eksik Disk Dosyasi (Broken): ${stats.missing_disk_files}`)
    console.log(`  - Eksik/Bozuk Kapak Resmi: ${stats.cover_missing_or_broken}`)

    console.log(`\n[2. Musaitlik Durumu]`)
    console.log(`  - Satisabilir/Gelecek Periyotlu Ilanlar: ${stats.has_sellable_periods}`)
    console.log(`  - Tum Periyotlari Dolu/Kapali/Gecmis Ilanlar: ${stats.no_sellable_periods}`)
    console.log(`  - Hic Periyot Kaydi Olmayan Ilanlar: ${stats.no_periods}`)
    console.log(`  - Toplam Kayitli Periyot: ${stats.total_periods_count} (Satisabilir: ${stats.total_sellable_periods_count})`)

    console.log(`\n[3. Periyot Fiyatlari & Vitrin]`)
    console.log(`  - Fiyatlar Tam & Uyumlu: ${stats.price_ok}`)
    console.log(`  - Fiyat Uyumsuzlugu / vitrin_price Eksik: ${stats.price_mismatch}`)
    console.log(`  - Fiyati Olmayan Ilanlar: ${stats.price_missing}`)

    if (stats.repairs_applied > 0) {
      console.log(`\n[Onarimlar]: ${stats.repairs_applied} adet duzeltme uygulandi.`)
    }

    if (issues.length > 0) {
      console.log(`\n=== TESPIT EDILEN SORUNLAR (Toplam ${issues.length}) ===`)
      console.table(issues.slice(0, 50))
      if (issues.length > 50) {
        console.log(`... +${issues.length - 50} sorun daha var.`)
      }
    } else {
      console.log('\n[TEBRIKLER] Hicbir sorun tespit edilmedi!')
    }

  } finally {
    await pgClient.end()
  }
}

main().catch((err) => {
  console.error('Audit hatasi:', err.message || err)
  process.exit(1)
})

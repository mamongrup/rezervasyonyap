#!/usr/bin/env node
/**
 * Tum ilan galerileri icin dusuk riskli, tekrar calistirilabilir kalite denetimi.
 *
 * Varsayilan: yalnizca yayindaki ilanlar, DB + yerel dosya kontrolu.
 *   node scripts/audit-listing-media-integrity.mjs
 *   node scripts/audit-listing-media-integrity.mjs --hash-files
 *   node scripts/audit-listing-media-integrity.mjs --hash-files --repair-safe
 *
 * --repair-safe sadece bos/kirik kapagi, mevcut ilk galeri gorseliyle tamamlar.
 * Galeri satiri silmez, dosya tasimaz ve semantik olarak tahmin yapmaz.
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { listingStoragePrefix } from './lib/listing-upload-path.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicRoot = path.join(root, 'frontend', 'public')
const backupsRoot = path.join(root, 'backups')
const args = new Set(process.argv.slice(2))
const publishedOnly = !args.has('--all-statuses')
const checkDisk = !args.has('--skip-disk')
const hashFiles = args.has('--hash-files')
const repairSafe = args.has('--repair-safe')
const maxSamplesIndex = process.argv.indexOf('--max-samples')
const maxSamples = Math.max(
  10,
  Number(maxSamplesIndex >= 0 ? process.argv[maxSamplesIndex + 1] : 150) || 150,
)
const outputIndex = process.argv.indexOf('--output')
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const reportPath = path.resolve(
  outputIndex >= 0
    ? process.argv[outputIndex + 1]
    : path.join(backupsRoot, `listing-media-integrity-${stamp}.json`),
)

const minimumImages = {
  hotel: 2,
  holiday_home: 5,
  yacht_charter: 5,
  cruise: 2,
  tour: 1,
  activity: 1,
  car_rental: 1,
}

function normalizedMediaKey(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      return `${url.origin.toLowerCase()}${url.pathname}`
    } catch {
      return raw.split(/[?#]/, 1)[0]
    }
  }
  return raw.replace(/^\/+/, '').split(/[?#]/, 1)[0]
}

function localStorageKey(value) {
  const key = normalizedMediaKey(value)
  if (!key || /^https?:\/\//i.test(key)) return ''
  return key
}

function absoluteLocalFile(value) {
  const key = localStorageKey(value)
  if (!key) return ''
  const resolved = path.resolve(publicRoot, ...key.split('/'))
  const rootWithSep = `${path.resolve(publicRoot)}${path.sep}`
  if (!resolved.startsWith(rootWithSep)) return ''
  return resolved
}

function publicMediaUrl(value) {
  const raw = String(value || '').trim()
  if (!raw || /^https?:\/\//i.test(raw)) return raw
  return `/${raw.replace(/^\/+/, '')}`
}

function sampledFileHash(filePath) {
  const size = statSync(filePath).size
  const chunkSize = Math.min(64 * 1024, size)
  const first = Buffer.alloc(chunkSize)
  const last = Buffer.alloc(chunkSize)
  const fd = openSync(filePath, 'r')
  try {
    readSync(fd, first, 0, chunkSize, 0)
    if (size > chunkSize) readSync(fd, last, 0, chunkSize, Math.max(0, size - chunkSize))
  } finally {
    closeSync(fd)
  }
  return createHash('sha256')
    .update(String(size))
    .update(first)
    .update(last)
    .digest('hex')
}

const issueCounts = new Map()
const issueSamples = new Map()
const aiCandidateReasons = new Map()

function addAiCandidate(listingId, reason) {
  if (!listingId) return
  if (!aiCandidateReasons.has(listingId)) aiCandidateReasons.set(listingId, new Set())
  aiCandidateReasons.get(listingId).add(reason)
}

function issue(code, severity, listing, details = {}, aiReview = false) {
  issueCounts.set(code, (issueCounts.get(code) || 0) + 1)
  if (!issueSamples.has(code)) issueSamples.set(code, [])
  const samples = issueSamples.get(code)
  if (samples.length < maxSamples) {
    samples.push({
      severity,
      listing_id: listing?.id || null,
      slug: listing?.slug || null,
      title: listing?.title || null,
      category: listing?.category_code || null,
      provider: listing?.external_provider_code || null,
      external_ref: listing?.external_listing_ref || null,
      ...details,
    })
  }
  if (aiReview && listing?.id) addAiCandidate(listing.id, code)
}

function categoryStats(listings) {
  const result = {}
  for (const listing of listings) {
    const code = listing.category_code || 'unknown'
    result[code] ||= { listings: 0, images: 0, no_gallery: 0, below_minimum: 0 }
    result[code].listings++
    result[code].images += Number(listing.image_count || 0)
    if (!Number(listing.image_count || 0)) result[code].no_gallery++
    if (Number(listing.image_count || 0) < (minimumImages[code] || 1)) {
      result[code].below_minimum++
    }
  }
  return result
}

mkdirSync(path.dirname(reportPath), { recursive: true })
const pg = createPgClient()
await pg.connect()

const repairs = []
try {
  const listingResult = await pg.query(
    `WITH image_rollup AS (
       SELECT listing_id,
              count(*)::int AS image_count,
              (array_agg(storage_key ORDER BY sort_order, id))[1] AS first_image
       FROM listing_images
       GROUP BY listing_id
     )
     SELECT l.id::text, l.organization_id::text, l.slug, l.status,
            pc.code AS category_code,
            l.external_provider_code, l.external_listing_ref,
            l.featured_image_url, l.thumbnail_url,
            coalesce(tr.title, '') AS title,
            coalesce(ir.image_count, 0)::int AS image_count,
            ir.first_image
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id
     LEFT JOIN locales loc ON loc.code = 'tr'
     LEFT JOIN listing_translations tr ON tr.listing_id = l.id AND tr.locale_id = loc.id
     LEFT JOIN image_rollup ir ON ir.listing_id = l.id
     WHERE ($1::boolean = false OR l.status = 'published')
     ORDER BY pc.code, l.slug`,
    [publishedOnly],
  )
  const listings = listingResult.rows
  const listingById = new Map(listings.map((row) => [row.id, row]))

  const imageResult = await pg.query(
    `SELECT li.listing_id::text, li.storage_key, li.sort_order
     FROM listing_images li
     JOIN listings l ON l.id = li.listing_id
     WHERE ($1::boolean = false OR l.status = 'published')
     ORDER BY li.listing_id, li.sort_order, li.id`,
    [publishedOnly],
  )
  const imagesByListing = new Map()
  for (const image of imageResult.rows) {
    if (!imagesByListing.has(image.listing_id)) imagesByListing.set(image.listing_id, [])
    imagesByListing.get(image.listing_id).push(image)
  }

  const bravoBundlePath = path.join(root, 'scripts', 'data', 'bravo-id-collision-repair.json')
  let bravoBundle = null
  if (existsSync(bravoBundlePath)) {
    bravoBundle = JSON.parse(readFileSync(bravoBundlePath, 'utf8'))
  }
  const bravoSpaceBySlug = new Map((bravoBundle?.spaces || []).map((row) => [row.slug, row]))
  const bravoEventBySlug = new Map((bravoBundle?.events || []).map((row) => [row.slug, row]))

  const exactKeyOwners = new Map()
  const galleryOwners = new Map()
  const contentHashOwners = new Map()
  const hashCache = new Map()
  let diskFilesChecked = 0
  let contentFilesHashed = 0
  let missingFiles = 0

  for (const listing of listings) {
    const images = imagesByListing.get(listing.id) || []
    const expectedPrefix = `${listingStoragePrefix(listing.category_code, listing.slug)}/`
    const galleryKeys = images.map((row) => normalizedMediaKey(row.storage_key)).filter(Boolean)
    const gallerySet = new Set(galleryKeys)
    const coverKey = normalizedMediaKey(listing.featured_image_url)
    const minCount = minimumImages[listing.category_code] || 1

    if (!images.length) {
      issue('gallery_missing', 'critical', listing, {}, true)
    } else if (images.length < minCount) {
      issue('gallery_below_category_minimum', 'warning', listing, {
        image_count: images.length,
        expected_minimum: minCount,
      }, true)
    }

    if (!coverKey) {
      issue('cover_missing', 'critical', listing, {}, true)
    } else if (images.length && !gallerySet.has(coverKey)) {
      issue('cover_not_in_gallery', 'warning', listing, {
        cover: listing.featured_image_url,
        first_gallery_image: images[0]?.storage_key || null,
      }, true)
    }

    const coverFile = absoluteLocalFile(listing.featured_image_url)
    const coverBroken = Boolean(checkDisk && coverFile && !existsSync(coverFile))
    if (coverBroken) {
      missingFiles++
      issue('cover_file_missing', 'critical', listing, { cover: listing.featured_image_url }, true)
    }

    const first = images[0]?.storage_key || ''
    const firstFile = absoluteLocalFile(first)
    const firstUsable = first && (!firstFile || existsSync(firstFile))
    if (repairSafe && firstUsable && (!coverKey || coverBroken)) {
      const newUrl = publicMediaUrl(first)
      await pg.query(
        `UPDATE listings
         SET featured_image_url = $2, thumbnail_url = $2, updated_at = now()
         WHERE id = $1::uuid`,
        [listing.id, newUrl],
      )
      repairs.push({ listing_id: listing.id, slug: listing.slug, action: 'cover_from_first_gallery', value: newUrl })
    }

    for (const image of images) {
      const normalized = normalizedMediaKey(image.storage_key)
      if (!normalized) {
        issue('gallery_empty_storage_key', 'critical', listing, { sort_order: image.sort_order }, true)
        continue
      }

      if (!exactKeyOwners.has(normalized)) exactKeyOwners.set(normalized, new Set())
      exactKeyOwners.get(normalized).add(listing.id)

      const localKey = localStorageKey(image.storage_key)
      if (localKey && !localKey.startsWith(expectedPrefix)) {
        issue('gallery_wrong_category_or_slug_path', 'warning', listing, {
          storage_key: image.storage_key,
          expected_prefix: expectedPrefix,
        }, true)
      }

      const filePath = absoluteLocalFile(image.storage_key)
      if (!checkDisk || !filePath) continue
      diskFilesChecked++
      if (!existsSync(filePath)) {
        missingFiles++
        issue('gallery_file_missing', 'critical', listing, { storage_key: image.storage_key }, true)
        continue
      }

      if (hashFiles) {
        let digest = hashCache.get(filePath)
        if (!digest) {
          try {
            digest = sampledFileHash(filePath)
            hashCache.set(filePath, digest)
            contentFilesHashed++
          } catch (error) {
            issue('gallery_file_unreadable', 'critical', listing, {
              storage_key: image.storage_key,
              error: error.message,
            }, true)
            continue
          }
        }
        if (!contentHashOwners.has(digest)) contentHashOwners.set(digest, [])
        contentHashOwners.get(digest).push({ listing_id: listing.id, storage_key: image.storage_key })
      }
    }

    if (galleryKeys.length) {
      const fingerprint = createHash('sha256').update(galleryKeys.join('\n')).digest('hex')
      if (!galleryOwners.has(fingerprint)) galleryOwners.set(fingerprint, [])
      galleryOwners.get(fingerprint).push(listing.id)
    }

    const expectedSpace = bravoSpaceBySlug.get(listing.slug)
    if (expectedSpace && (listing.category_code !== 'holiday_home' || listing.external_provider_code !== 'bravo_space')) {
      issue('bravo_space_identity_collision', 'critical', listing, {
        expected_category: 'holiday_home',
        expected_provider: 'bravo_space',
        expected_external_ref: String(expectedSpace.id),
      }, true)
    }
    const expectedEvent = bravoEventBySlug.get(listing.slug)
    if (expectedEvent && (listing.category_code !== 'activity' || listing.external_provider_code !== 'bravo_event')) {
      issue('bravo_event_identity_collision', 'critical', listing, {
        expected_category: 'activity',
        expected_provider: 'bravo_event',
        expected_external_ref: String(expectedEvent.id),
      }, true)
    }
    if (listing.external_provider_code === 'bravo_space' && listing.category_code !== 'holiday_home') {
      issue('bravo_space_wrong_category', 'critical', listing, { expected_category: 'holiday_home' }, true)
    }
    if (listing.external_provider_code === 'bravo_event' && listing.category_code !== 'activity') {
      issue('bravo_event_wrong_category', 'critical', listing, { expected_category: 'activity' }, true)
    }
  }

  for (const [storageKey, ids] of exactKeyOwners) {
    if (ids.size < 2) continue
    const owners = [...ids].map((id) => listingById.get(id)).filter(Boolean)
    const crossCategory = new Set(owners.map((row) => row.category_code)).size > 1
    for (const owner of owners) {
      issue('shared_gallery_storage_key', crossCategory ? 'critical' : 'warning', owner, {
        storage_key: storageKey,
        other_listing_ids: owners.filter((row) => row.id !== owner.id).map((row) => row.id),
      }, true)
    }
  }

  for (const [fingerprint, ids] of galleryOwners) {
    if (ids.length < 2) continue
    const owners = ids.map((id) => listingById.get(id)).filter(Boolean)
    const crossCategory = new Set(owners.map((row) => row.category_code)).size > 1
    for (const owner of owners) {
      issue('identical_gallery_across_listings', crossCategory ? 'critical' : 'warning', owner, {
        fingerprint,
        other_listing_ids: owners.filter((row) => row.id !== owner.id).map((row) => row.id),
      }, true)
    }
  }

  if (hashFiles) {
    for (const [digest, entries] of contentHashOwners) {
      const listingIds = [...new Set(entries.map((entry) => entry.listing_id))]
      if (listingIds.length < 2) continue
      const owners = listingIds.map((id) => listingById.get(id)).filter(Boolean)
      const crossCategory = new Set(owners.map((row) => row.category_code)).size > 1
      for (const owner of owners) {
        issue('same_image_content_across_listings', crossCategory ? 'critical' : 'warning', owner, {
          sampled_sha256: digest,
          other_listing_ids: owners.filter((row) => row.id !== owner.id).map((row) => row.id),
          storage_keys: entries.filter((entry) => entry.listing_id === owner.id).map((entry) => entry.storage_key).slice(0, 10),
        }, crossCategory)
      }
    }
  }

  const externalRefs = new Map()
  for (const listing of listings) {
    if (!listing.external_listing_ref) continue
    const key = `${listing.organization_id}\u0000${listing.external_listing_ref}`
    if (!externalRefs.has(key)) externalRefs.set(key, [])
    externalRefs.get(key).push(listing)
  }
  for (const owners of externalRefs.values()) {
    const categories = new Set(owners.map((row) => row.category_code))
    if (owners.length < 2 || categories.size < 2) continue
    for (const owner of owners) {
      issue('external_ref_reused_across_categories', 'info', owner, {
        peers: owners.filter((row) => row.id !== owner.id).map((row) => ({
          listing_id: row.id,
          category: row.category_code,
          provider: row.external_provider_code,
        })),
      })
    }
  }

  const issueCountObject = Object.fromEntries([...issueCounts].sort(([a], [b]) => a.localeCompare(b)))
  const report = {
    generated_at: new Date().toISOString(),
    scope: publishedOnly ? 'published' : 'all_statuses',
    options: { check_disk: checkDisk, hash_files: hashFiles, repair_safe: repairSafe },
    summary: {
      listings: listings.length,
      gallery_rows: imageResult.rows.length,
      disk_files_checked: diskFilesChecked,
      content_files_hashed: contentFilesHashed,
      missing_files: missingFiles,
      repairs: repairs.length,
      ai_review_candidates: aiCandidateReasons.size,
      issues: issueCountObject,
      by_category: categoryStats(listings),
    },
    repairs,
    ai_review_candidates: [...aiCandidateReasons].map(([listingId, reasons]) => {
      const listing = listingById.get(listingId)
      return {
        listing_id: listingId,
        slug: listing?.slug || null,
        title: listing?.title || null,
        category: listing?.category_code || null,
        provider: listing?.external_provider_code || null,
        external_ref: listing?.external_listing_ref || null,
        reasons: [...reasons].sort(),
      }
    }),
    issue_samples: Object.fromEntries([...issueSamples].sort(([a], [b]) => a.localeCompare(b))),
  }

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log('=== ILAN MEDYA KALITE DENETIMI ===')
  console.log(JSON.stringify(report.summary, null, 2))
  console.log(`RAPOR: ${reportPath}`)
} finally {
  await pg.end()
}


import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { convertExistingRawGallery } from './wtatil-image-download.mjs'

export async function registerGalleryImages(pg, listingId, imageRows) {
  if (!imageRows.length) return 0
  const sorted = [...imageRows].sort((a, b) => a.sort - b.sort)
  await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (const row of sorted) {
    await pg.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/avif')`,
      [listingId, row.sort, row.storageKey],
    )
  }
  const hero = `/${sorted[0].storageKey}`
  await pg.query(
    `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
    [listingId, hero],
  )
  return sorted.length
}

/** `.raw` bekleyen galeri dizinleri — `ilanlar/yatlar/slug` veya eski düz `slug`. */
export async function listMediaSubPathsWithRawFiles(uploadsRoot) {
  const found = []
  async function walk(dir, relParts = []) {
    let entries = []
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      const rel = [...relParts, ent.name]
      if (ent.name === '.raw') {
        const parentRel = relParts.join('/')
        if (parentRel) found.push(parentRel)
        continue
      }
      await walk(path.join(dir, ent.name), rel)
    }
  }
  await walk(uploadsRoot)
  return [...new Set(found)].sort()
}

/** @deprecated `listMediaSubPathsWithRawFiles` kullanın */
export async function listSlugsWithRawFiles(uploadsRoot) {
  const subs = await listMediaSubPathsWithRawFiles(uploadsRoot)
  return subs.map((s) => s.split('/').pop() || s)
}

export async function countRawFiles(uploadsRoot) {
  const subs = await listMediaSubPathsWithRawFiles(uploadsRoot)
  let total = 0
  for (const sub of subs) {
    const files = await readdir(path.join(uploadsRoot, ...sub.split('/'), '.raw'))
    total += files.filter((f) => !f.startsWith('.')).length
  }
  return { slugs: subs.length, files: total }
}

export async function mediaSubPathHasRawFiles(uploadsRoot, mediaSubPath) {
  const rawDir = path.join(uploadsRoot, ...String(mediaSubPath).split('/'), '.raw')
  if (!existsSync(rawDir)) return false
  const files = await readdir(rawDir)
  return files.some((f) => !f.startsWith('.'))
}

export async function convertAndRegisterSlug(pg, listingId, slug, uploadsRoot, opts = {}) {
  const imageRows = await convertExistingRawGallery(slug, uploadsRoot, {
    categoryCode: opts.categoryCode || 'yacht_charter',
    mediaSubPath: opts.mediaSubPath,
    ...opts,
  })
  if (!imageRows.length) return 0
  return registerGalleryImages(pg, listingId, imageRows)
}

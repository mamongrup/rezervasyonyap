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

export async function listSlugsWithRawFiles(uploadsRoot) {
  const slugs = []
  let entries = []
  try {
    entries = await readdir(uploadsRoot, { withFileTypes: true })
  } catch {
    return slugs
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    const rawDir = path.join(uploadsRoot, ent.name, '.raw')
    if (!existsSync(rawDir)) continue
    try {
      const files = await readdir(rawDir)
      if (files.some((f) => f && !f.startsWith('.'))) slugs.push(ent.name)
    } catch {
      /* skip */
    }
  }
  return slugs.sort()
}

export async function countRawFiles(uploadsRoot) {
  const slugs = await listSlugsWithRawFiles(uploadsRoot)
  let total = 0
  for (const slug of slugs) {
    const files = await readdir(path.join(uploadsRoot, slug, '.raw'))
    total += files.filter((f) => !f.startsWith('.')).length
  }
  return { slugs: slugs.length, files: total }
}

export async function slugHasRawFiles(uploadsRoot, slug) {
  const rawDir = path.join(uploadsRoot, slug, '.raw')
  if (!existsSync(rawDir)) return false
  const files = await readdir(rawDir)
  return files.some((f) => !f.startsWith('.'))
}

export async function convertAndRegisterSlug(pg, listingId, slug, uploadsRoot, opts = {}) {
  const imageRows = await convertExistingRawGallery(slug, uploadsRoot, opts)
  if (!imageRows.length) return 0
  return registerGalleryImages(pg, listingId, imageRows)
}

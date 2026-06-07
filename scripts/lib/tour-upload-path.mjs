import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { listingCategoryFolder } from './listing-upload-path.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const TRAVEL_ROOT = path.resolve(__dirname, '..', '..')
const LISTINGS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings')

/** Tur ilanları kökü — `ilanlar/turlar/` */
export const WTATIL_UPLOADS_ROOT = path.join(LISTINGS_ROOT, 'ilanlar', listingCategoryFolder('tour'))

export function storageKeyToAbsPath(storageKey) {
  const k = String(storageKey || '').trim()
  if (!k.startsWith('uploads/')) return null
  return path.join(TRAVEL_ROOT, 'frontend', 'public', ...k.slice('uploads/'.length).split('/'))
}

export function localAvifExists(storageKey) {
  const abs = storageKeyToAbsPath(storageKey)
  return Boolean(abs && existsSync(abs))
}

/** Tur görselleri diskte eksik mi (kayıt yok veya dosya yok)? */
export async function listingNeedsLocalImages(pgClient, listingId) {
  const { rows } = await pgClient.query(
    `SELECT storage_key FROM listing_images
     WHERE listing_id = $1::uuid
     ORDER BY sort_order ASC, created_at ASC`,
    [listingId],
  )
  if (!rows.length) return true
  return rows.some((r) => !localAvifExists(r.storage_key))
}

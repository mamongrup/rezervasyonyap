/**
 * Yerel klasördeki görselleri tatil evi galerisine yazar (AVIF).
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bufferToAvif,
  avifFileName,
  IMAGE_CONVERT_CONCURRENCY,
} from './wtatil-image-download.mjs'
import { listingUploadDir, listingStorageKey } from './listing-upload-path.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEFAULT_UPLOADS_ROOT = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'public',
  'uploads',
  'listings',
)

const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif|heic|bmp|tif{1,2})$/i

async function walkImages(dir, base = dir) {
  /** @type {{ abs: string, rel: string }[]} */
  const out = []
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (e) {
    throw new Error(`Klasör okunamadı: ${dir} (${e?.message || e})`)
  }
  // Klasörler önce (oda alt klasörleri), dosyalar sonra — isim sırası
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
    return a.name.localeCompare(b.name, 'tr')
  })
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      out.push(...(await walkImages(abs, base)))
      continue
    }
    if (!IMAGE_RE.test(ent.name)) continue
    // çok küçük / logo dosyalarını sonda tutmak için işaretle
    const st = await stat(abs).catch(() => null)
    out.push({
      abs,
      rel: path.relative(base, abs),
      size: st?.size || 0,
      low: /dosya|logo|thumb|icon/i.test(ent.name) || (st && st.size < 80_000),
    })
  }
  return out
}

/**
 * @param {string} folderPath
 * @returns {Promise<{ abs: string, rel: string, size: number, low: boolean }[]>}
 */
export async function listLocalGalleryFiles(folderPath) {
  const root = path.resolve(folderPath)
  if (!existsSync(root)) throw new Error(`Klasör yok: ${root}`)
  const files = await walkImages(root)
  files.sort((a, b) => {
    const aDir = path.dirname(a.rel)
    const bDir = path.dirname(b.rel)
    const aNested = aDir === '.' ? 0 : 1
    const bNested = bDir === '.' ? 0 : 1
    if (aNested !== bNested) return aNested - bNested
    if (Boolean(a.low) !== Boolean(b.low)) return a.low ? 1 : -1
    return a.rel.localeCompare(b.rel, 'tr')
  })
  return files
}

/**
 * @param {import('pg').Client} pg
 * @param {{ listingId: string, slug: string, folderPath: string, uploadsRoot?: string, replace?: boolean }} opts
 */
export async function applyLocalGalleryToListing(pg, opts) {
  const {
    listingId,
    slug,
    folderPath,
    uploadsRoot = DEFAULT_UPLOADS_ROOT,
    replace = true,
  } = opts

  const files = await listLocalGalleryFiles(folderPath)
  if (!files.length) throw new Error(`Klasörde görsel yok: ${folderPath}`)

  const listingDir = listingUploadDir(uploadsRoot, 'holiday_home', slug)
  await mkdir(listingDir, { recursive: true })

  if (replace) {
    await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
    // eski avif'leri temizle (ham .raw hariç)
    try {
      const existing = await readdir(listingDir)
      for (const name of existing) {
        if (name === '.raw') continue
        await rm(path.join(listingDir, name), { recursive: true, force: true }).catch(() => {})
      }
    } catch {
      /* ignore */
    }
  }

  const rows = []
  let i = 0
  const concurrency = Math.max(1, IMAGE_CONVERT_CONCURRENCY)
  async function convertOne(file, index) {
    const buf = await readFile(file.abs)
    const avif = await bufferToAvif(buf)
    const fakeUrl = `file://${file.rel.replace(/\\/g, '/')}`
    const fileName = avifFileName(index, fakeUrl)
    const dest = path.join(listingDir, fileName)
    await writeFile(dest, avif)
    const storageKey = listingStorageKey('holiday_home', slug, fileName)
    return { sort: index, storageKey, fileName, rel: file.rel }
  }

  // paralel havuz
  const results = new Array(files.length)
  let next = 0
  async function worker() {
    for (;;) {
      const idx = next
      next += 1
      if (idx >= files.length) break
      results[idx] = await convertOne(files[idx], idx)
      i += 1
      if (i % 10 === 0 || i === files.length) {
        console.log(`[gallery] ${i}/${files.length} ${slug}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()))

  for (const row of results) {
    if (!row) continue
    await pg.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/avif')`,
      [listingId, row.sort, row.storageKey],
    )
    rows.push(row)
  }

  const hero = rows[0]?.storageKey
  if (hero) {
    const publicPath = `/${hero}`
    await pg.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [listingId, publicPath],
    )
  }

  return { count: rows.length, hero, files: rows.map((r) => r.rel) }
}

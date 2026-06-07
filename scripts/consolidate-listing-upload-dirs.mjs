/**
 * Eski `uploads/listings/{yatlar|turlar|…}/` altındaki kalan dosyaları
 * `uploads/listings/ilanlar/{kategori}/` altına taşır.
 */

import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { listingCategoryFolder } from './lib/listing-upload-path.mjs'

const UPLOADS_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'frontend',
  'public',
  'uploads',
  'listings',
)

const CATEGORIES = ['yacht_charter', 'holiday_home', 'tour', 'activity', 'hotel']
let moved = 0
let skipped = 0

for (const code of CATEGORIES) {
  const folder = listingCategoryFolder(code)
  const oldRoot = path.join(UPLOADS_ROOT, folder)
  const newRoot = path.join(UPLOADS_ROOT, 'ilanlar', folder)
  if (!existsSync(oldRoot)) continue

  const slugs = await readdir(oldRoot, { withFileTypes: true })
  for (const ent of slugs) {
    if (!ent.isDirectory()) continue
    const oldDir = path.join(oldRoot, ent.name)
    const newDir = path.join(newRoot, ent.name)
    const files = await readdir(oldDir, { withFileTypes: true })
    for (const f of files) {
      if (!f.isFile()) continue
      const oldAbs = path.join(oldDir, f.name)
      const newAbs = path.join(newDir, f.name)
      if (existsSync(newAbs)) {
        skipped++
        continue
      }
      await mkdir(newDir, { recursive: true })
      await rename(oldAbs, newAbs)
      moved++
    }
  }
}

const wtatilRoot = path.join(UPLOADS_ROOT, 'wtatil')
const tourRoot = path.join(UPLOADS_ROOT, 'ilanlar', listingCategoryFolder('tour'))
if (existsSync(wtatilRoot)) {
  const slugs = await readdir(wtatilRoot, { withFileTypes: true })
  for (const ent of slugs) {
    if (!ent.isDirectory()) continue
    const oldDir = path.join(wtatilRoot, ent.name)
    const newDir = path.join(tourRoot, ent.name)
    const files = await readdir(oldDir, { withFileTypes: true })
    for (const f of files) {
      if (!f.isFile()) continue
      const oldAbs = path.join(oldDir, f.name)
      const newAbs = path.join(newDir, f.name)
      if (existsSync(newAbs)) {
        skipped++
        continue
      }
      await mkdir(newDir, { recursive: true })
      await rename(oldAbs, newAbs)
      moved++
    }
  }
}

console.log(`Taşındı: ${moved}, zaten vardı: ${skipped}`)

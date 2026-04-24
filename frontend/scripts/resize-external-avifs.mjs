#!/usr/bin/env node
/**
 * `public/uploads/external/*.avif` dosyalarını yeniden boyutlandırır (DB / ağ gerekmez).
 * `-thumb.avif` dosyalarını atlar; ana dosyayı güncelledikten sonra THUMB_SIZE>0 ise thumb yeniden üretir.
 *
 *   TARGET_WIDTH=800 THUMB_SIZE=256 node scripts/resize-external-avifs.mjs
 *
 * Opsiyonel env:
 *   UPLOADS_ROOT  — varsayılan: ./public/uploads
 *   TARGET_WIDTH  — varsayılan: 800
 *   AVIF_QUALITY  — varsayılan: 72
 *   THUMB_SIZE    — varsayılan: 256, 0 → thumb üretme
 *   DRY_RUN       — 1 ise sadece listeler, yazmaz
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const UPLOADS_ROOT =
  process.env.UPLOADS_ROOT || path.join(PROJECT_ROOT, 'public', 'uploads')
const EXTERNAL_DIR = path.join(UPLOADS_ROOT, 'external')
const TARGET_WIDTH = Number(process.env.TARGET_WIDTH || 800)
const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 72)
const THUMB_SIZE = Number(process.env.THUMB_SIZE ?? 256)
const DRY_RUN = process.env.DRY_RUN === '1'

async function main() {
  console.log(`[resize-external-avifs] DRY_RUN=${DRY_RUN ? 'YES' : 'no'}`)
  console.log(`  dir = ${EXTERNAL_DIR}`)
  console.log(`  target width = ${TARGET_WIDTH}, thumb = ${THUMB_SIZE || 'off'}`)

  let names
  try {
    names = await fs.readdir(EXTERNAL_DIR)
  } catch (e) {
    console.error(`Klasör okunamadı: ${e.message}`)
    process.exit(1)
  }

  const avifs = names.filter(
    (n) =>
      n.endsWith('.avif') &&
      !n.endsWith('-thumb.avif'),
  )

  if (avifs.length === 0) {
    console.log('İşlenecek .avif yok.')
    return
  }

  let done = 0
  let skipped = 0
  let bytesBefore = 0
  let bytesAfter = 0

  for (const name of avifs) {
    const full = path.join(EXTERNAL_DIR, name)
    const stat = await fs.stat(full)
    bytesBefore += stat.size
    const buf = await fs.readFile(full)
    const meta = await sharp(buf).metadata()
    const w = meta.width ?? 0
    if (w > 0 && w <= TARGET_WIDTH && !DRY_RUN) {
      skipped++
      bytesAfter += stat.size
      console.log(`  - skip (zaten ≤${TARGET_WIDTH}px) ${name} (${w}px)`)
      continue
    }

    if (DRY_RUN) {
      console.log(`  [dry] ${name} (${w}px → max ${TARGET_WIDTH}px)`)
      continue
    }

    const out = await sharp(buf)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .avif({ quality: AVIF_QUALITY, effort: 4 })
      .toBuffer()
    await fs.writeFile(full, out)
    bytesAfter += out.length
    done++
    console.log(
      `  + ${name} ${(stat.size / 1024).toFixed(1)} KB → ${(out.length / 1024).toFixed(1)} KB`,
    )

    if (THUMB_SIZE > 0) {
      const base = name.replace(/\.avif$/i, '')
      const thumbPath = path.join(EXTERNAL_DIR, `${base}-thumb.avif`)
      const thumb = await sharp(buf)
        .resize({
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          fit: 'cover',
          position: 'attention',
          withoutEnlargement: true,
        })
        .avif({ quality: AVIF_QUALITY, effort: 4 })
        .toBuffer()
      await fs.writeFile(thumbPath, thumb)
      console.log(`    · thumb ${base}-thumb.avif (${(thumb.length / 1024).toFixed(1)} KB)`)
    }
  }

  console.log(`\n[bitti] yeniden yazılan=${done}, atlanan=${skipped}`)
  if (!DRY_RUN && done > 0) {
    console.log(
      `  toplam boyut ~ ${(bytesBefore / 1024).toFixed(0)} KB → ${(bytesAfter / 1024).toFixed(0)} KB`,
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

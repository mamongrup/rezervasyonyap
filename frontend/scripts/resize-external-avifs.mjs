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
 *   AVIF_QUALITY  — varsayılan: 58 (PSI görsel boyutu)
 *   AVIF_EFFORT   — sharp AVIF effort 0–9, varsayılan: 6
 *   AVIF_RECOMPRESS_MIN_KB — hedef genişlik zaten küçük ama dosya bu KB üzerindeyse yeniden AVIF (varsayılan 10; 0=kapat)
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
const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 58)
const AVIF_EFFORT = Math.min(9, Math.max(0, Number(process.env.AVIF_EFFORT ?? 6)))
const THUMB_SIZE = Number(process.env.THUMB_SIZE ?? 256)
const DRY_RUN = process.env.DRY_RUN === '1'
/** ≤TARGET_WIDTH görsellerde yalnız boyut büyükse yeniden sıkıştır (PSI “sıkıştırmayı artır”) */
const RECOMPRESS_MIN_KB = Number(process.env.AVIF_RECOMPRESS_MIN_KB ?? 10)

async function main() {
  console.log(`[resize-external-avifs] DRY_RUN=${DRY_RUN ? 'YES' : 'no'}`)
  console.log(`  dir = ${EXTERNAL_DIR}`)
  console.log(
    `  target width = ${TARGET_WIDTH}, avif q = ${AVIF_QUALITY}, effort = ${AVIF_EFFORT}, thumb = ${THUMB_SIZE || 'off'}, recompress if >${RECOMPRESS_MIN_KB || 'off'} KB`,
  )

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
    const smallDims = w > 0 && w <= TARGET_WIDTH
    const shouldRecompressOnly =
      smallDims &&
      !DRY_RUN &&
      RECOMPRESS_MIN_KB > 0 &&
      stat.size >= RECOMPRESS_MIN_KB * 1024
    if (smallDims && !DRY_RUN && !shouldRecompressOnly) {
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
      .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
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
        .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
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

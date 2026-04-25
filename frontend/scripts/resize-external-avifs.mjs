#!/usr/bin/env node
/**
 * `public/uploads/external/*.avif` dosyalarını yeniden boyutlandırır + sıkıştırır (DB / ağ gerekmez).
 * `-thumb.avif` dosyalarını atlar; ana dosyayı güncelledikten sonra THUMB_SIZE>0 ise thumb yeniden üretir.
 *
 *   TARGET_WIDTH=800 AVIF_QUALITY=58 THUMB_SIZE=256 node scripts/resize-external-avifs.mjs
 *
 * Opsiyonel env:
 *   UPLOADS_ROOT     — varsayılan: ./public/uploads
 *   TARGET_WIDTH     — varsayılan: 800
 *   AVIF_QUALITY     — varsayılan: 72
 *   AVIF_EFFORT      — 0..9, varsayılan: 6 (yüksek = daha küçük dosya, daha yavaş)
 *   THUMB_SIZE       — varsayılan: 256, 0 → thumb üretme
 *   AVIF_RECOMPRESS_MIN_KB — varsayılan: 10 (dosya bu KB'tan büyükse, genişlik aynı bile olsa kaliteyi düşürerek yeniden sıkıştır)
 *   DRY_RUN          — 1 ise sadece listeler, yazmaz
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
const AVIF_EFFORT = Math.min(9, Math.max(0, Number(process.env.AVIF_EFFORT ?? 6)))
const THUMB_SIZE = Number(process.env.THUMB_SIZE ?? 256)
const RECOMPRESS_MIN_KB = Number(process.env.AVIF_RECOMPRESS_MIN_KB ?? 10)
const DRY_RUN = process.env.DRY_RUN === '1'

async function main() {
  console.log(`[resize-external-avifs] DRY_RUN=${DRY_RUN ? 'YES' : 'no'}`)
  console.log(`  dir = ${EXTERNAL_DIR}`)
  console.log(
    `  target width = ${TARGET_WIDTH}, quality = ${AVIF_QUALITY}, effort = ${AVIF_EFFORT}, thumb = ${THUMB_SIZE || 'off'}, recompress >= ${RECOMPRESS_MIN_KB}KB`,
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
    const sizeKB = stat.size / 1024
    /**
     * Genişlik zaten ≤ hedef VE dosya recompress eşiğinin altındaysa atla.
     * Aksi halde (genişlik büyük YA DA dosya iri) yeniden sıkıştır — bu sayede
     * "boyut tamam ama kalite yüksek" durumda da kazanım elde ederiz (PSI:
     * "Resim yayınlamayı kolaylaştırın" uyarısı).
     */
    if (w > 0 && w <= TARGET_WIDTH && sizeKB <= RECOMPRESS_MIN_KB && !DRY_RUN) {
      skipped++
      bytesAfter += stat.size
      console.log(`  - skip (≤${TARGET_WIDTH}px, ${sizeKB.toFixed(0)}KB ≤ ${RECOMPRESS_MIN_KB}KB) ${name}`)
      continue
    }

    if (DRY_RUN) {
      console.log(`  [dry] ${name} (${w}px / ${sizeKB.toFixed(0)}KB → max ${TARGET_WIDTH}px, q${AVIF_QUALITY})`)
      continue
    }

    const out = await sharp(buf)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
      .toBuffer()
    /**
     * Yeni dosya beklenmedik şekilde eskisinden büyükse (kalite yükseltme tam
     * tersi yapar veya küçük dosyalarda overhead artırabilir), eski dosyayı koru.
     */
    if (out.length >= stat.size) {
      skipped++
      bytesAfter += stat.size
      console.log(
        `  - skip (yeniden sıkıştırma kazanç sağlamadı) ${name} ${sizeKB.toFixed(1)}KB → ${(out.length / 1024).toFixed(1)}KB`,
      )
      continue
    }
    await fs.writeFile(full, out)
    bytesAfter += out.length
    done++
    console.log(
      `  + ${name} ${sizeKB.toFixed(1)} KB → ${(out.length / 1024).toFixed(1)} KB`,
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

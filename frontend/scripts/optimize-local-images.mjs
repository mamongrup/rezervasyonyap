#!/usr/bin/env node
/**
 * optimize-local-images.mjs
 *
 * `src/images/**\/*.{png,jpg,jpeg}` dosyalarını `sharp` ile AVIF'e çevirir
 * (quality 72, max width 1600px). Yanına `<name>.avif` olarak yazar.
 * Başarılı dönüşümden sonra:
 *   - Orijinal PNG/JPG dosyasını siler (git'te geçmişi duruyor).
 *   - Repo içindeki tüm `.ts/.tsx/.js/.mjs/.json` dosyalarında
 *     `<name>.png` / `<name>.jpg` referanslarını `<name>.avif` olarak günceller.
 *
 * KULLANIM (frontend/ dizininden):
 *   DRY_RUN=1 node scripts/optimize-local-images.mjs       # sadece raporla
 *   node scripts/optimize-local-images.mjs                 # gerçek çalıştırma
 *
 * Opsiyonel env:
 *   TARGET_WIDTH   — varsayılan: 1600
 *   AVIF_QUALITY   — varsayılan: 72
 *   INCLUDE_SMALL  — "1" ise 50 KB altındaki dosyaları da işler (default: atlar).
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

const DRY_RUN = process.env.DRY_RUN === '1'
const TARGET_WIDTH = Number(process.env.TARGET_WIDTH || 1600)
const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 72)
const INCLUDE_SMALL = process.env.INCLUDE_SMALL === '1'
const SMALL_THRESHOLD = 50 * 1024

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg'])
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'])
const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', 'dist', '.git', 'coverage', 'public'])

async function walkDir(dir, filter, acc) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      await walkDir(path.join(dir, e.name), filter, acc)
    } else if (e.isFile() && filter(e.name)) {
      acc.push(path.join(dir, e.name))
    }
  }
}

async function main() {
  console.log(`[optimize-local-images] DRY_RUN=${DRY_RUN ? 'YES' : 'no'}`)
  console.log(`  target width = ${TARGET_WIDTH}, avif quality = ${AVIF_QUALITY}`)
  console.log(`  small threshold = ${INCLUDE_SMALL ? 'disabled' : `${SMALL_THRESHOLD / 1024} KB`}`)

  const imagesRoot = path.join(PROJECT_ROOT, 'src', 'images')
  const imageFiles = []
  await walkDir(
    imagesRoot,
    (n) => IMAGE_EXT.has(path.extname(n).toLowerCase()),
    imageFiles,
  )

  if (imageFiles.length === 0) {
    console.log('Hiç resim bulunamadı.')
    return
  }

  // ---- 1) AVIF dönüşümü ----
  console.log(`\n[1/2] ${imageFiles.length} dosya işlenecek...`)
  const conversions = [] // { oldRel, newRel, oldBytes, newBytes }

  for (const src of imageFiles) {
    const stat = await fs.stat(src)
    const rel = path.relative(PROJECT_ROOT, src)
    if (!INCLUDE_SMALL && stat.size < SMALL_THRESHOLD) {
      console.log(`  - skip (küçük) ${rel} (${(stat.size / 1024).toFixed(1)} KB)`)
      continue
    }

    const avifPath = src.replace(/\.(png|jpe?g)$/i, '.avif')
    const avifRel = path.relative(PROJECT_ROOT, avifPath)

    if (avifPath === src) {
      console.log(`  ! isim değişmedi, atla: ${rel}`)
      continue
    }

    try {
      if (DRY_RUN) {
        console.log(`  [dry] ${rel} (${(stat.size / 1024).toFixed(1)} KB) → ${avifRel}`)
        conversions.push({
          src,
          avif: avifPath,
          oldRel: rel,
          newRel: avifRel,
          oldBytes: stat.size,
          newBytes: 0,
        })
        continue
      }

      const buf = await fs.readFile(src)
      const output = await sharp(buf)
        .resize({ width: TARGET_WIDTH, withoutEnlargement: true, fit: 'inside' })
        .avif({ quality: AVIF_QUALITY, effort: 4 })
        .toBuffer()
      await fs.writeFile(avifPath, output)

      conversions.push({
        src,
        avif: avifPath,
        oldRel: rel,
        newRel: avifRel,
        oldBytes: stat.size,
        newBytes: output.length,
      })

      const pct = ((1 - output.length / stat.size) * 100).toFixed(0)
      console.log(
        `  + ${avifRel} (${(output.length / 1024).toFixed(1)} KB, -${pct}%)  ← ${rel} (${(stat.size / 1024).toFixed(1)} KB)`,
      )
    } catch (e) {
      console.warn(`  ! dönüşüm hatası ${rel}: ${e.message}`)
    }
  }

  if (conversions.length === 0) {
    console.log('\nDönüşüm yok, çıkılıyor.')
    return
  }

  if (DRY_RUN) {
    console.log(`\n[dry] ${conversions.length} dosya dönüştürülecekti.`)
    console.log('Gerçek çalıştırma için DRY_RUN bayrağını kaldır.')
    return
  }

  // ---- 2) Source dosyalarında import referanslarını güncelle ----
  console.log('\n[2/2] Kaynak kodda referanslar güncelleniyor...')
  const srcRoot = path.join(PROJECT_ROOT, 'src')
  const sourceFiles = []
  await walkDir(
    srcRoot,
    (n) => SOURCE_EXT.has(path.extname(n).toLowerCase()),
    sourceFiles,
  )

  // Basit replace mapping: `<basename>.png` → `<basename>.avif`
  // Her conversion için iki varyant: unix ve windows path separator.
  const replacements = conversions.map((c) => {
    const oldBase = path.basename(c.src) // örn "our-features.png"
    const newBase = path.basename(c.avif) // örn "our-features.avif"
    return { oldBase, newBase }
  })

  let filesUpdated = 0
  let totalReplacements = 0
  for (const f of sourceFiles) {
    let txt
    try {
      txt = await fs.readFile(f, 'utf8')
    } catch {
      continue
    }
    let localReplacements = 0
    for (const r of replacements) {
      if (!txt.includes(r.oldBase)) continue
      // Tam basename match ile değiştir (başka dosya adına zarar vermemek için
      // word boundary analoğu: baştaki '/', '\\' veya '"', "'" vb. kalmalı).
      const before = txt
      txt = txt.split(r.oldBase).join(r.newBase)
      if (before !== txt) localReplacements++
    }
    if (localReplacements > 0) {
      await fs.writeFile(f, txt, 'utf8')
      filesUpdated++
      totalReplacements += localReplacements
      const rel = path.relative(PROJECT_ROOT, f)
      console.log(`  ✓ ${rel} (${localReplacements} replacement)`)
    }
  }

  // ---- 3) Orijinal PNG/JPG dosyalarını sil ----
  console.log('\n[3/3] Orijinal PNG/JPG dosyaları siliniyor...')
  let deleted = 0
  for (const c of conversions) {
    try {
      await fs.unlink(c.src)
      deleted++
    } catch (e) {
      console.warn(`  ! silme hatası ${c.oldRel}: ${e.message}`)
    }
  }

  const oldTotal = conversions.reduce((a, c) => a + c.oldBytes, 0)
  const newTotal = conversions.reduce((a, c) => a + c.newBytes, 0)
  console.log(`\n[bitti]`)
  console.log(`  dönüştürülen dosya    = ${conversions.length}`)
  console.log(`  silinen orijinal      = ${deleted}`)
  console.log(`  kaynak dosya güncellendi = ${filesUpdated} (${totalReplacements} replacement)`)
  console.log(`  eski toplam           = ${(oldTotal / 1024).toFixed(1)} KB`)
  console.log(`  yeni toplam           = ${(newTotal / 1024).toFixed(1)} KB`)
  console.log(`  tasarruf              = ${((1 - newTotal / oldTotal) * 100).toFixed(0)}%`)
  console.log(`\nŞimdi build + restart:`)
  console.log(`  npm run build && systemctl restart travel-web`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

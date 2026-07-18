/**
 * Vitrin hero kolaj görsellerini yerinde küçültür (PSI "Properly size images").
 * Kolaj slotları en fazla ~40vw genişlikte render edilir; 1400-1600px kaynak
 * mobilde 353x199 kutuya iniyor ve LCP'yi tek başına saniyelerce uzatıyordu.
 *
 * Dosya adları DEĞİŞMEZ (panel config URL'leri aynı kalır); içerik yeniden
 * boyutlandırılıp sıkıştırılır. Küçülmeyen dosyaya dokunulmaz.
 *
 *   node scripts/optimize-hero-uploads.mjs            # frontend/public/uploads
 *   HERO_MAX_WIDTH=900 node scripts/optimize-hero-uploads.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const sharp = require('sharp')

// Kolaj slotları mobilde ~170–350 px; 640 px kaynak PSI "properly size" +
// "efficiently encode" denetimini karşılar. Daha agresif: HERO_MAX_WIDTH=480
const MAX_WIDTH = Number.parseInt(process.env.HERO_MAX_WIDTH ?? '640', 10) || 640
const AVIF_QUALITY = Number.parseInt(process.env.HERO_AVIF_QUALITY ?? '42', 10) || 42
const JPEG_QUALITY = Number.parseInt(process.env.HERO_JPEG_QUALITY ?? '58', 10) || 58
const HERO_DIRS = [
  path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'general', 'hero'),
  path.join(TRAVEL_ROOT, 'uploads', 'general', 'hero'),
]

async function listImages(dir) {
  try {
    const names = await fs.readdir(dir)
    return names.filter((n) => /\.(avif|webp|jpe?g|png)$/i.test(n)).map((n) => path.join(dir, n))
  } catch {
    return []
  }
}

function encoderFor(filePath, img) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.avif') return img.avif({ quality: AVIF_QUALITY, effort: 6 })
  if (ext === '.webp') return img.webp({ quality: 58 })
  if (ext === '.png') return img.png({ compressionLevel: 9, palette: true })
  return img.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
}

async function writeAvifSibling(filePath, input) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.avif') return 0
  const avifPath = filePath.replace(/\.(jpe?g|png|webp)$/i, '.avif')
  if (avifPath === filePath) return 0
  try {
    const existing = await fs.readFile(avifPath).catch(() => null)
    const resized = sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true })
    const output = await resized.avif({ quality: AVIF_QUALITY, effort: 6 }).toBuffer()
    if (existing && existing.length <= output.length) {
      console.log(`avif-kept ${avifPath} (${(existing.length / 1024).toFixed(0)} KB)`)
      return 0
    }
    const tmp = `${avifPath}.tmp`
    await fs.writeFile(tmp, output)
    await fs.rename(tmp, avifPath)
    const before = existing ? existing.length : 0
    console.log(
      `avif-write ${avifPath} ${(output.length / 1024).toFixed(0)} KB` +
        (before ? ` (was ${(before / 1024).toFixed(0)} KB)` : ''),
    )
    return before > output.length ? before - output.length : 0
  } catch (e) {
    console.warn(`avif-fail ${filePath}:`, e?.message || e)
    return 0
  }
}

async function optimizeOne(filePath) {
  const input = await fs.readFile(filePath)
  const meta = await sharp(input).metadata()
  const width = meta.width ?? 0
  const resized = sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true })
  const output = await encoderFor(filePath, resized).toBuffer()
  let saved = 0
  if (output.length >= input.length) {
    console.log(`kept      ${filePath} (${(input.length / 1024).toFixed(0)} KB, w=${width})`)
  } else {
    const tmp = `${filePath}.tmp`
    await fs.writeFile(tmp, output)
    await fs.rename(tmp, filePath)
    saved = input.length - output.length
    console.log(
      `optimized ${filePath} ${(input.length / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB (w=${width} -> <=${MAX_WIDTH})`,
    )
  }
  // LCP için jpg/png yanında .avif kardeş (frontend preferHeroAvifUrl kullanır)
  saved += await writeAvifSibling(filePath, input)
  return saved
}

let files = []
for (const dir of HERO_DIRS) files = files.concat(await listImages(dir))
if (files.length === 0) {
  console.error('Hero görseli bulunamadı:', HERO_DIRS.join(' | '))
  process.exit(1)
}

let totalSaved = 0
for (const f of files) totalSaved += await optimizeOne(f)
console.log(`--- toplam kazanç: ${(totalSaved / 1024).toFixed(0)} KB (${files.length} dosya)`)

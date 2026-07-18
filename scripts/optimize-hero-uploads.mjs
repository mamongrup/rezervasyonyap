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

const MAX_WIDTH = Number.parseInt(process.env.HERO_MAX_WIDTH ?? '900', 10) || 900
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
  if (ext === '.avif') return img.avif({ quality: 50, effort: 6 })
  if (ext === '.webp') return img.webp({ quality: 62 })
  if (ext === '.png') return img.png({ compressionLevel: 9, palette: true })
  return img.jpeg({ quality: 62, mozjpeg: true, progressive: true })
}

async function optimizeOne(filePath) {
  const input = await fs.readFile(filePath)
  const meta = await sharp(input).metadata()
  const width = meta.width ?? 0
  const resized = sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true })
  const output = await encoderFor(filePath, resized).toBuffer()
  if (output.length >= input.length) {
    console.log(`kept      ${filePath} (${(input.length / 1024).toFixed(0)} KB, w=${width})`)
    return 0
  }
  const tmp = `${filePath}.tmp`
  await fs.writeFile(tmp, output)
  await fs.rename(tmp, filePath)
  const saved = input.length - output.length
  console.log(
    `optimized ${filePath} ${(input.length / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB (w=${width} -> <=${MAX_WIDTH})`,
  )
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

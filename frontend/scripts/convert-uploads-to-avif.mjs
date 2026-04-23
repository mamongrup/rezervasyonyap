/**
 * Mevcut `public/uploads/**` altındaki `.webp/.jpg/.jpeg/.png/.jfif` dosyalarını
 * `.avif`'e dönüştürür ve orijinalleri siler.
 *
 * Kullanım (frontend dizininde):
 *   node scripts/convert-uploads-to-avif.mjs            # public/uploads
 *   node scripts/convert-uploads-to-avif.mjs /özel/yol  # özel kök dizin
 *   node scripts/convert-uploads-to-avif.mjs --dry-run  # sadece listele, değişiklik yapma
 *
 * Idempotent: zaten `.avif` olan dosyalar atlanır; tekrar çalıştırmak güvenli.
 * Upload endpoint'iyle aynı kalite profili kullanılır (quality 72, effort 4).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultRoot = path.resolve(__dirname, '..', 'public', 'uploads')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const positional = args.filter((a) => !a.startsWith('--'))
const root = positional[0] ? path.resolve(positional[0]) : defaultRoot

const CONVERT_EXTS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.jfif'])
const SKIP_EXTS = new Set(['.avif', '.svg', '.ico', '.pdf', '.gif'])

/** Upload pipeline ile aynı kalite. hero/listings/etc. ayrımı burada yok; tek global değer. */
const AVIF_QUALITY = 72
const AVIF_EFFORT = 4

let stats = { converted: 0, skipped: 0, failed: 0, savedBytes: 0 }

async function walk(dir) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`[convert-avif] Dizin bulunamadı: ${dir}`)
      return
    }
    throw err
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
    } else if (entry.isFile()) {
      await handleFile(full)
    }
  }
}

async function handleFile(file) {
  const ext = path.extname(file).toLowerCase()
  if (SKIP_EXTS.has(ext)) {
    stats.skipped++
    return
  }
  if (!CONVERT_EXTS.has(ext)) {
    stats.skipped++
    return
  }

  const targetFile = file.slice(0, -ext.length) + '.avif'

  try {
    await fs.access(targetFile)
    if (dryRun) {
      console.log(`SKIP  (avif var)  ${path.relative(root, file)}`)
    } else {
      await fs.unlink(file)
      console.log(`REMOVE (dupe)     ${path.relative(root, file)}`)
    }
    stats.skipped++
    return
  } catch {
    // target yok, devam
  }

  if (dryRun) {
    console.log(`PLAN              ${path.relative(root, file)} -> .avif`)
    return
  }

  try {
    const statBefore = await fs.stat(file)
    const buffer = await sharp(file).avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toBuffer()
    await fs.writeFile(targetFile, buffer)
    await fs.unlink(file)
    const saved = statBefore.size - buffer.length
    stats.converted++
    stats.savedBytes += saved
    const kb = (saved / 1024).toFixed(1)
    console.log(
      `OK    ${statBefore.size.toString().padStart(8)}B -> ${buffer.length.toString().padStart(8)}B  (-${kb}KB)  ${path.relative(root, file)}`,
    )
  } catch (err) {
    stats.failed++
    console.error(`FAIL              ${path.relative(root, file)}: ${err.message}`)
  }
}

console.log(`[convert-avif] root=${root} dryRun=${dryRun}`)
await walk(root)
console.log(
  `\n[convert-avif] done — converted=${stats.converted} skipped=${stats.skipped} failed=${stats.failed} saved=${(stats.savedBytes / 1024 / 1024).toFixed(2)}MB`,
)

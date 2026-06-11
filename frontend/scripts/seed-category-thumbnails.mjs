#!/usr/bin/env node
/**
 * Kategori kart görsellerini indirip AVIF olarak kaydeder.
 *   cd frontend && npm run seed:category-thumbnails
 *
 * Kaynak: scripts/category-thumbnail-seed.json
 * Çıktı: public/uploads/general/hero/{slug}-card.avif
 *        public/page-builder/shared-travel-category-thumbnails.json
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = path.resolve(__dirname, '..')
const SEED_PATH = path.join(__dirname, 'category-thumbnail-seed.json')

const OUT_DIR = path.join(FRONTEND_ROOT, 'public', 'uploads', 'general', 'hero')
const SHARED_JSON = path.join(FRONTEND_ROOT, 'public', 'page-builder', 'shared-travel-category-thumbnails.json')
const TARGET_WIDTH = 900
const AVIF_QUALITY = 72

async function downloadAvif(slug, url) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const outPath = path.join(OUT_DIR, `${slug}-card.avif`)
  const avif = await sharp(buf)
    .rotate()
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .avif({ quality: AVIF_QUALITY, effort: 4 })
    .toBuffer()
  await fs.writeFile(outPath, avif)
  return `/uploads/general/hero/${slug}-card.avif`
}

async function main() {
  const seedRaw = JSON.parse(await fs.readFile(SEED_PATH, 'utf8'))
  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.mkdir(path.dirname(SHARED_JSON), { recursive: true })

  const thumbnails = {}
  for (const [slug, meta] of Object.entries(seedRaw)) {
    const url = typeof meta === 'object' && meta && 'url' in meta ? meta.url : String(meta)
    process.stdout.write(`→ ${slug} … `)
    const src = await downloadAvif(slug, url)
    const pos = typeof meta === 'object' && meta && meta.objectPosition ? meta.objectPosition : undefined
    thumbnails[slug] = pos && pos !== '50% 50%' ? { src, objectPosition: pos } : src
    process.stdout.write('ok\n')
  }

  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    thumbnails,
  }
  await fs.writeFile(SHARED_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`\nKaydedildi: ${SHARED_JSON}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

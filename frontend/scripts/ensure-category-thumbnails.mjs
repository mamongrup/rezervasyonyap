#!/usr/bin/env node
/** Eksik kategori görsellerini tamamlar; mevcut dosya ve panel seçimlerine dokunmaz. */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptsDir, '..')
const seed = JSON.parse(await fs.readFile(path.join(scriptsDir, 'category-thumbnail-seed.json'), 'utf8'))
const outDir = path.join(frontendRoot, 'public', 'uploads', 'general', 'hero')
await fs.mkdir(outDir, { recursive: true })

let created = 0
for (const [slug, meta] of Object.entries(seed)) {
  const target = path.join(outDir, `${slug}-card.avif`)
  try {
    await fs.access(target)
    continue
  } catch {
    // Missing file: download its declared category-specific source.
  }
  const response = await fetch(meta.url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${slug}: HTTP ${response.status}`)
  const input = Buffer.from(await response.arrayBuffer())
  const image = await sharp(input)
    .rotate()
    .resize({ width: 1200, height: 800, fit: 'cover' })
    .avif({ quality: 74, effort: 4 })
    .toBuffer()
  await fs.writeFile(target, image)
  created += 1
  console.log(`[category-image] created ${slug}`)
}

console.log(`[category-image] complete created=${created}`)

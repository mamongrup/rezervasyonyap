#!/usr/bin/env node
/**
 * Recompress already-migrated external AVIF assets in-place.
 *
 * Usage (frontend/):
 *   DRY_RUN=1 node scripts/recompress-external-avif.mjs
 *   TARGET_WIDTH=1200 AVIF_QUALITY=58 node scripts/recompress-external-avif.mjs
 *
 * Env:
 *   TARGET_WIDTH   default: 1200
 *   AVIF_QUALITY   default: 58
 *   EFFORT         default: 5
 *   INCLUDE_THUMBS default: 0  (set 1 to include *-thumb.avif)
 *   DRY_RUN        default: 0
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const EXTERNAL_DIR = path.join(PROJECT_ROOT, 'public', 'uploads', 'external')

const TARGET_WIDTH = Number(process.env.TARGET_WIDTH || 1200)
const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 58)
const EFFORT = Number(process.env.EFFORT || 5)
const INCLUDE_THUMBS = process.env.INCLUDE_THUMBS === '1'
const DRY_RUN = process.env.DRY_RUN === '1'

function isTargetFile(name) {
  if (!name.endsWith('.avif')) return false
  if (!INCLUDE_THUMBS && name.endsWith('-thumb.avif')) return false
  return true
}

async function main() {
  const entries = await fs.readdir(EXTERNAL_DIR, { withFileTypes: true }).catch(() => [])
  const files = entries.filter((e) => e.isFile() && isTargetFile(e.name)).map((e) => path.join(EXTERNAL_DIR, e.name))

  if (files.length === 0) {
    console.log('No target AVIF files found.')
    return
  }

  console.log(`[recompress-external-avif] files=${files.length} dry=${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`  width=${TARGET_WIDTH} quality=${AVIF_QUALITY} effort=${EFFORT} includeThumbs=${INCLUDE_THUMBS ? 'yes' : 'no'}`)

  let totalBefore = 0
  let totalAfter = 0
  let changed = 0
  let skipped = 0

  for (const file of files) {
    const rel = path.relative(PROJECT_ROOT, file)
    const input = await fs.readFile(file)
    totalBefore += input.length

    const output = await sharp(input)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .avif({ quality: AVIF_QUALITY, effort: EFFORT })
      .toBuffer()

    // Keep original if recompression is not better.
    if (output.length >= input.length) {
      totalAfter += input.length
      skipped++
      continue
    }

    totalAfter += output.length
    changed++

    if (!DRY_RUN) {
      await fs.writeFile(file, output)
    }

    const savedKb = ((input.length - output.length) / 1024).toFixed(1)
    console.log(`  ✓ ${rel}  -${savedKb} KB`)
  }

  const base = totalBefore || 1
  const savingPct = (((totalBefore - totalAfter) / base) * 100).toFixed(1)
  console.log('\nDone.')
  console.log(`  changed=${changed} skipped=${skipped}`)
  console.log(`  before=${(totalBefore / 1024).toFixed(1)} KB`)
  console.log(`  after=${(totalAfter / 1024).toFixed(1)} KB`)
  console.log(`  saved=${savingPct}%`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


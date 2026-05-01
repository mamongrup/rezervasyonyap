import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(__dirname, '..')

const uploadRoots = [
  path.join(appRoot, 'public', 'uploads'),
  path.join(appRoot, '..', 'uploads'),
]

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function optimizeFile(root, relPath, transform) {
  const filePath = path.join(root, relPath)
  if (!(await exists(filePath))) return false

  const input = await fs.readFile(filePath)
  const tmpPath = `${filePath}.tmp`
  await transform(sharp(input)).toFile(tmpPath)
  const output = await fs.readFile(tmpPath)
  if (output.length >= input.length) {
    await fs.unlink(tmpPath)
    console.log(`kept ${path.relative(appRoot, filePath)} (already smaller)`)
    return false
  }

  await fs.rename(tmpPath, filePath)
  const savedKb = ((input.length - output.length) / 1024).toFixed(1)
  console.log(`optimized ${path.relative(appRoot, filePath)} (-${savedKb} KB)`)
  return true
}

const jobs = [
  {
    relPath: 'site/vitrin-kategori/homepage/slide-1.jpg',
    transform: (img) =>
      img.resize({ width: 340, withoutEnlargement: true }).jpeg({
        quality: 38,
        mozjpeg: true,
        progressive: true,
      }),
  },
  {
    relPath: 'external/04c0a91826506101d71a.avif',
    transform: (img) =>
      img.resize({ width: 560, withoutEnlargement: true }).avif({ quality: 32, effort: 6 }),
  },
  {
    relPath: 'external/4746d8f388d7ff5a67a0.avif',
    transform: (img) =>
      img.resize({ width: 560, withoutEnlargement: true }).avif({ quality: 32, effort: 6 }),
  },
  {
    relPath: 'external/f3bf43fed9e4c346d6dc.avif',
    transform: (img) =>
      img.resize({ width: 560, withoutEnlargement: true }).avif({ quality: 32, effort: 6 }),
  },
  {
    relPath: 'site/logo-light.avif',
    transform: (img) =>
      img.resize({ width: 240, withoutEnlargement: true }).avif({ quality: 35, effort: 6 }),
  },
]

let optimized = 0
for (const root of uploadRoots) {
  for (const job of jobs) {
    if (await optimizeFile(root, job.relPath, job.transform)) optimized += 1
  }
}

console.log(`upload optimization complete: ${optimized} file(s) optimized`)

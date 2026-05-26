import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(__dirname, '..', '..', 'frontend', 'package.json'))
const sharp = require('sharp')

sharp.cache(false)
sharp.concurrency(1)

export const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 90)
export const AVIF_EFFORT = Number(process.env.AVIF_EFFORT || 4)
export const MAX_WIDTH = Number(process.env.MAX_WIDTH || 1600)

export function isExternalImageKey(key) {
  const k = String(key || '').trim()
  return k.startsWith('http://') || k.startsWith('https://')
}

export function isLocalAvifKey(key) {
  const k = String(key || '').trim().toLowerCase()
  return k.startsWith('uploads/listings/') && k.endsWith('.avif')
}

export function isWtatilThumbnailUrl(url) {
  return /-thumbnail\.(jpe?g|png|webp|avif)$/i.test(String(url || ''))
}

export function normalizeDownloadUrl(url) {
  const s = String(url || '').trim()
  if (!s) return ''
  if (s.startsWith('http://')) return `https://${s.slice(7)}`
  return s
}

export function avifFileName(sortOrder, sourceUrl) {
  let base = 'img'
  try {
    base = path.basename(new URL(sourceUrl).pathname).replace(/\.[^.]+$/i, '') || 'img'
  } catch {
    /* ignore */
  }
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 72)
  return `${String(sortOrder).padStart(2, '0')}-${safe || 'img'}.avif`
}

export function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, { timeout: 90000, headers: { 'User-Agent': 'TravelWtatilImport/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          fetchBuffer(normalizeDownloadUrl(res.headers.location)).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

export async function bufferToAvif(buffer) {
  let pipeline = sharp(buffer, { failOn: 'none', limitInputPixels: false }).rotate()
  const meta = await pipeline.metadata()
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
  }
  return pipeline.avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toBuffer()
}

export async function downloadAndSaveAvif(sourceUrl, destAbsPath, { dryRun = false } = {}) {
  if (dryRun) return { ok: true, dryRun: true, bytes: 0 }
  if (existsSync(destAbsPath)) {
    const buf = await readFile(destAbsPath)
    return { ok: true, skipped: true, bytes: buf.length }
  }
  await mkdir(path.dirname(destAbsPath), { recursive: true })
  const raw = await fetchBuffer(normalizeDownloadUrl(sourceUrl))
  const avif = await bufferToAvif(raw)
  await writeFile(destAbsPath, avif)
  return { ok: true, bytes: avif.length, sourceBytes: raw.length }
}

/** Thumbnail atla: aynı ilanda en az bir tam boy harici URL varsa. */
export function filterUrlsForDownload(rows) {
  const externals = rows.filter((r) => isExternalImageKey(r.storage_key))
  const hasFull = externals.some((r) => !isWtatilThumbnailUrl(r.storage_key))
  return externals.filter((r) => {
    if (isLocalAvifKey(r.storage_key)) return false
    if (hasFull && isWtatilThumbnailUrl(r.storage_key)) return false
    return true
  })
}

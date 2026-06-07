import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(__dirname, '..', '..', 'frontend', 'package.json'))
const sharp = require('sharp')

sharp.cache(false)

export const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 90)
export const AVIF_EFFORT = Number(process.env.AVIF_EFFORT || 4)
export const MAX_WIDTH = Number(process.env.MAX_WIDTH || 1600)
export const IMAGE_DOWNLOAD_CONCURRENCY = Number(process.env.IMAGE_DOWNLOAD_CONCURRENCY || 6)
export const IMAGE_CONVERT_CONCURRENCY = Number(process.env.IMAGE_CONVERT_CONCURRENCY || 2)

export function rawFileToAvifName(rawName) {
  return String(rawName).replace(/\.[^.]+$/i, '.avif')
}

export function parseSortFromFileName(name) {
  const m = String(name).match(/^(\d+)-/)
  return m ? Number(m[1]) : 0
}

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

function safeBaseName(sourceUrl) {
  let base = 'img'
  try {
    base = path.basename(new URL(sourceUrl).pathname).replace(/\.[^.]+$/i, '') || 'img'
  } catch {
    /* ignore */
  }
  return base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 72) || 'img'
}

export function avifFileName(sortOrder, sourceUrl) {
  return `${String(sortOrder).padStart(2, '0')}-${safeBaseName(sourceUrl)}.avif`
}

export function rawFileName(sortOrder, sourceUrl) {
  let ext = '.jpg'
  try {
    const fromUrl = path.extname(new URL(sourceUrl).pathname).toLowerCase()
    if (fromUrl && fromUrl.length <= 5) ext = fromUrl
  } catch {
    /* ignore */
  }
  return `${String(sortOrder).padStart(2, '0')}-${safeBaseName(sourceUrl)}${ext}`
}

export function fetchBuffer(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(
        url,
        {
          timeout: 90000,
          headers: { 'User-Agent': 'TravelWtatilImport/1.0', ...extraHeaders },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume()
            fetchBuffer(normalizeDownloadUrl(res.headers.location), extraHeaders).then(resolve, reject)
            return
          }
          if (res.statusCode !== 200) {
            res.resume()
            reject(new Error(`HTTP ${res.statusCode}`))
            return
          }
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => {
            const buf = Buffer.concat(chunks)
            if (!buf.length) reject(new Error('Empty download'))
            else resolve(buf)
          })
        },
      )
      .on('error', reject)
  })
}

export async function bufferToAvif(buffer) {
  if (!buffer?.length) throw new Error('Input Buffer is empty')
  sharp.concurrency(IMAGE_CONVERT_CONCURRENCY)
  let pipeline = sharp(buffer, { failOn: 'none', limitInputPixels: false }).rotate()
  const meta = await pipeline.metadata()
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
  }
  return pipeline.avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toBuffer()
}

async function runPool(items, concurrency, fn) {
  if (!items.length) return []
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    for (;;) {
      const i = next
      next += 1
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

async function downloadGalleryRawPhase(jobs, downloadConcurrency, headers) {
  await runPool(jobs, downloadConcurrency, async (job) => {
    if (existsSync(job.destAvif)) {
      return { job, phase: 'skip-avif' }
    }
    try {
      if (existsSync(job.destRaw)) {
        const st = await stat(job.destRaw)
        if (st.size > 0) return { job, phase: 'raw-cached' }
        await unlink(job.destRaw).catch(() => {})
      }
      const raw = await fetchBuffer(normalizeDownloadUrl(job.url), headers)
      await writeFile(job.destRaw, raw)
      return { job, phase: 'downloaded' }
    } catch (e) {
      return { job, phase: 'download-fail', error: e.message }
    }
  })
}

async function convertGalleryRawPhase(jobs, convertConcurrency, { cleanupRaw = true } = {}) {
  const convertTargets = jobs.filter((job) => {
    if (existsSync(job.destAvif)) return false
    return existsSync(job.destRaw)
  })

  await runPool(convertTargets, convertConcurrency, async (job) => {
    try {
      const rawBuf = await readFile(job.destRaw)
      const avif = await bufferToAvif(rawBuf)
      await writeFile(job.destAvif, avif)
      if (cleanupRaw) await unlink(job.destRaw).catch(() => {})
      return { job, ok: true }
    } catch {
      return { job, ok: false }
    }
  })
}

function galleryRowsFromJobs(jobs, slug, { requireAvif = true, requireRaw = false } = {}) {
  const rows = []
  for (const job of jobs) {
    const hasAvif = existsSync(job.destAvif)
    const hasRaw = existsSync(job.destRaw)
    if (requireAvif && !hasAvif) continue
    if (requireRaw && !hasRaw) continue
    if (!requireAvif && !requireRaw && !hasAvif && !hasRaw) continue
    rows.push({
      storageKey: `uploads/listings/${slug}/${job.fileName}`,
      sort: job.i,
    })
  }
  return rows
}

/**
 * Galeri: önce ham dosyaları paralel indir (.raw/), sonra AVIF'e dönüştür.
 * downloadOnly: yalnızca .raw indir | convertOnly: diskteki .raw → AVIF
 */
export async function downloadGalleryImages(
  urls,
  slug,
  uploadsRoot,
  {
    skipImages = false,
    downloadOnly = false,
    convertOnly = false,
    downloadConcurrency = IMAGE_DOWNLOAD_CONCURRENCY,
    convertConcurrency = IMAGE_CONVERT_CONCURRENCY,
    headers = {},
  } = {},
) {
  if (!urls.length) return []

  if (skipImages) {
    return urls.map((url, i) => ({
      storageKey: `uploads/listings/${slug}/${avifFileName(i, url)}`,
      sort: i,
    }))
  }

  const listingDir = path.join(uploadsRoot, slug)
  const rawDir = path.join(listingDir, '.raw')
  await mkdir(rawDir, { recursive: true })

  const jobs = urls.map((url, i) => ({
    url,
    i,
    fileName: avifFileName(i, url),
    rawName: rawFileName(i, url),
    destAvif: path.join(listingDir, avifFileName(i, url)),
    destRaw: path.join(rawDir, rawFileName(i, url)),
  }))

  if (!convertOnly) {
    await downloadGalleryRawPhase(jobs, downloadConcurrency, headers)
  }

  if (!downloadOnly) {
    await convertGalleryRawPhase(jobs, convertConcurrency, { cleanupRaw: true })
    try {
      const left = await readdir(rawDir)
      if (!left.length) await rm(rawDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    return galleryRowsFromJobs(jobs, slug, { requireAvif: true })
  }

  return galleryRowsFromJobs(jobs, slug, { requireRaw: true })
}

/** Diskteki .raw klasörünü AVIF'e çevir (URL listesi gerekmez). */
export async function convertExistingRawGallery(slug, uploadsRoot, opts = {}) {
  const listingDir = path.join(uploadsRoot, slug)
  const rawDir = path.join(listingDir, '.raw')
  if (!existsSync(rawDir)) return []

  let rawNames = []
  try {
    rawNames = (await readdir(rawDir)).filter((n) => !n.startsWith('.'))
  } catch {
    return []
  }
  if (!rawNames.length) return []

  const jobs = rawNames.map((rawName) => {
    const avifName = rawFileToAvifName(rawName)
    const sort = parseSortFromFileName(rawName)
    return {
      url: '',
      i: sort,
      fileName: avifName,
      rawName,
      destAvif: path.join(listingDir, avifName),
      destRaw: path.join(rawDir, rawName),
    }
  })

  await convertGalleryRawPhase(jobs, opts.convertConcurrency ?? IMAGE_CONVERT_CONCURRENCY, {
    cleanupRaw: opts.cleanupRaw !== false,
  })

  try {
    const left = await readdir(rawDir)
    if (!left.length) await rm(rawDir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }

  return galleryRowsFromJobs(jobs, slug, { requireAvif: true })
}

/** Tek görsel — önce indir, sonra dönüştür (geriye uyumluluk). */
export async function downloadAndSaveAvif(sourceUrl, destAbsPath, { dryRun = false, headers = {} } = {}) {
  if (dryRun) return { ok: true, dryRun: true, bytes: 0 }
  if (existsSync(destAbsPath)) {
    const buf = await readFile(destAbsPath)
    return { ok: true, skipped: true, bytes: buf.length }
  }
  await mkdir(path.dirname(destAbsPath), { recursive: true })
  const raw = await fetchBuffer(normalizeDownloadUrl(sourceUrl), headers)
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

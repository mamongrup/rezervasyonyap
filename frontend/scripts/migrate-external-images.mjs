#!/usr/bin/env node
/**
 * migrate-external-images.mjs
 *
 * External (Unsplash / Pexels / Pixabay) image URL'lerini indirir,
 * sharp ile AVIF'e çevirir, public/uploads/external/<hash>.avif olarak kaydeder
 * ve iki yerde eski URL'i yenisi ile değiştirir:
 *   1) DB'deki tüm text/varchar/jsonb kolonlarında
 *   2) `public/page-builder/**\/*.json` statik dosyalarında
 *
 * KULLANIM (frontend/ dizininden):
 *
 *   # Kuru koşu — DB'ye yazmaz, sadece raporlar:
 *   DATABASE_URL="postgres://user:pass@127.0.0.1:5432/db" DRY_RUN=1 \
 *     node scripts/migrate-external-images.mjs
 *
 *   # Gerçek çalıştırma:
 *   DATABASE_URL="postgres://user:pass@127.0.0.1:5432/db" \
 *     node scripts/migrate-external-images.mjs
 *
 * Opsiyonel env:
 *   UPLOADS_ROOT     — varsayılan: ./public/uploads
 *   TARGET_WIDTH     — varsayılan: 1600 (px)
 *   AVIF_QUALITY     — varsayılan: 72
 *   MAX_CONCURRENT   — varsayılan: 4
 */

import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

const DATABASE_URL = process.env.DATABASE_URL
const DRY_RUN = process.env.DRY_RUN === '1'
const UPLOADS_ROOT =
  process.env.UPLOADS_ROOT || path.join(PROJECT_ROOT, 'public', 'uploads')
const EXTERNAL_SUBDIR = 'external'
const PUBLIC_PREFIX = '/uploads/external'
const TARGET_WIDTH = Number(process.env.TARGET_WIDTH || 1600)
const AVIF_QUALITY = Number(process.env.AVIF_QUALITY || 72)
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT || 4)

const EXTERNAL_HOSTS = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'images.pexels.com',
  'cdn.pixabay.com',
]

const hostAlternation = EXTERNAL_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')
// URL parse: https?://HOST/path (boşluk, tırnak, >, <, \, ) öncesi biter)
const URL_RE = new RegExp(`https?://(?:${hostAlternation})/[^\\s"'<>\\\\)]+`, 'g')
// DB taraması için POSIX regex (PostgreSQL ~ operatörü)
const PG_PATTERN = `https?://(${hostAlternation})/`

if (!DATABASE_URL) {
  console.error('HATA: DATABASE_URL env değişkeni zorunlu.')
  process.exit(1)
}

const externalDir = path.join(UPLOADS_ROOT, EXTERNAL_SUBDIR)

function hashUrl(url) {
  return createHash('md5').update(url).digest('hex').slice(0, 20)
}

function publicPathFor(url) {
  return `${PUBLIC_PREFIX}/${hashUrl(url)}.avif`
}

function localPathFor(url) {
  return path.join(externalDir, `${hashUrl(url)}.avif`)
}

async function fileExists(p) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

const downloadCache = new Map()

async function downloadAndConvert(url) {
  if (downloadCache.has(url)) return downloadCache.get(url)

  const target = localPathFor(url)
  const publicUrl = publicPathFor(url)

  if (await fileExists(target)) {
    downloadCache.set(url, publicUrl)
    return publicUrl
  }

  if (DRY_RUN) {
    downloadCache.set(url, publicUrl)
    return publicUrl
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'travel-image-migrator/1.0' },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.warn(`  ! HTTP ${res.status}: ${url.slice(0, 100)}`)
      downloadCache.set(url, null)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const output = await sharp(buf)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .avif({ quality: AVIF_QUALITY, effort: 4 })
      .toBuffer()
    await fs.mkdir(externalDir, { recursive: true })
    await fs.writeFile(target, output)
    console.log(
      `  + ${publicUrl} (${(output.length / 1024).toFixed(1)} KB) ← ${url.slice(0, 80)}`,
    )
    downloadCache.set(url, publicUrl)
    return publicUrl
  } catch (e) {
    console.warn(`  ! İndirme hatası (${url.slice(0, 80)}): ${e.message}`)
    downloadCache.set(url, null)
    return null
  }
}

async function runWithConcurrency(items, worker, concurrency) {
  const queue = [...items]
  let idx = 0
  const total = items.length
  async function runner() {
    while (queue.length) {
      const item = queue.shift()
      await worker(item)
      idx++
      if (idx % 20 === 0 || idx === total) {
        console.log(`  [${idx}/${total}]`)
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner))
}

async function scanJsonFiles() {
  const root = path.join(PROJECT_ROOT, 'public', 'page-builder')
  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.json')) continue
    const full = path.join(root, e.name)
    const txt = await fs.readFile(full, 'utf8')
    const matches = txt.match(URL_RE)
    if (!matches || matches.length === 0) continue
    const urls = new Set(matches)
    out.push({ file: full, rel: path.relative(PROJECT_ROOT, full), urls })
  }
  return out
}

async function main() {
  console.log(`[migrate-external-images] DRY_RUN=${DRY_RUN ? 'YES' : 'no'}`)
  console.log(`  UPLOADS_ROOT = ${UPLOADS_ROOT}`)
  console.log(`  external dir = ${externalDir}`)
  console.log(`  target width = ${TARGET_WIDTH}, avif quality = ${AVIF_QUALITY}`)
  console.log(`  hosts = ${EXTERNAL_HOSTS.join(', ')}`)

  const { Client } = pg
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  // ---- 1) Keşif: URL içeren kolonları ve JSON dosyalarını bul ----
  console.log('\n[1/3] Tablolar taranıyor...')
  const colsRes = await client.query(`
    SELECT c.table_schema, c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying', 'jsonb', 'json')
      AND (c.is_generated IS NULL OR c.is_generated <> 'ALWAYS')
    ORDER BY c.table_schema, c.table_name, c.column_name
  `)

  console.log(`  taranacak kolon = ${colsRes.rows.length}`)

  const allUrls = new Set()
  const colsWithMatches = []

  for (const col of colsRes.rows) {
    const fq = `"${col.table_schema}"."${col.table_name}"`
    const isJson = col.data_type === 'jsonb' || col.data_type === 'json'
    const readExpr = isJson ? `"${col.column_name}"::text` : `"${col.column_name}"`

    let q
    try {
      q = await client.query(
        `SELECT ${readExpr} AS val FROM ${fq} WHERE ${readExpr} ~ $1`,
        [PG_PATTERN],
      )
    } catch (e) {
      console.warn(
        `  ? SKIP ${col.table_schema}.${col.table_name}.${col.column_name}: ${e.message}`,
      )
      continue
    }
    if (q.rows.length === 0) continue

    const colUrls = new Set()
    for (const row of q.rows) {
      const val = row.val
      if (!val) continue
      const matches = String(val).match(URL_RE)
      if (!matches) continue
      for (const m of matches) {
        allUrls.add(m)
        colUrls.add(m)
      }
    }
    if (colUrls.size > 0) {
      colsWithMatches.push({ ...col, urls: colUrls, rowCount: q.rows.length })
      console.log(
        `  · ${col.table_schema}.${col.table_name}.${col.column_name} (${col.data_type}) — rows=${q.rows.length} urls=${colUrls.size}`,
      )
    }
  }

  // JSON statik dosyalarını tara
  console.log('\n  JSON dosyaları taranıyor (public/page-builder/*.json)...')
  const jsonFiles = await scanJsonFiles()
  for (const jf of jsonFiles) {
    for (const u of jf.urls) allUrls.add(u)
    console.log(`  · ${jf.rel} — urls=${jf.urls.size}`)
  }

  console.log(`\n[özet]`)
  console.log(`  benzersiz URL      = ${allUrls.size}`)
  console.log(`  etkilenen kolon    = ${colsWithMatches.length}`)
  console.log(`  etkilenen JSON dsy = ${jsonFiles.length}`)

  if (allUrls.size === 0) {
    console.log('Hiç external URL bulunamadı, çıkılıyor.')
    await client.end()
    return
  }

  // ---- 2) İndir + AVIF'e çevir ----
  console.log(`\n[2/3] İndirme başlıyor (paralel=${MAX_CONCURRENT})...`)
  const urlMap = new Map()
  await runWithConcurrency(
    [...allUrls],
    async (url) => {
      const pub = await downloadAndConvert(url)
      urlMap.set(url, pub)
    },
    MAX_CONCURRENT,
  )

  const successCount = [...urlMap.values()].filter(Boolean).length
  console.log(
    `[indirme] bitti — başarılı=${successCount}, hatalı=${allUrls.size - successCount}`,
  )

  if (DRY_RUN) {
    console.log('\nDRY_RUN=1 — DB güncellenmedi. Gerçek çalıştırma için DRY_RUN bayrağını kaldır.')
    await client.end()
    return
  }

  if (successCount === 0) {
    console.log('\nHiç URL başarıyla indirilemedi, DB güncellemesi atlanıyor.')
    await client.end()
    return
  }

  // ---- 3) DB güncelle ----
  console.log('\n[3/3] DB güncellemesi başlıyor...')
  let totalRowsUpdated = 0
  let totalReplacements = 0

  for (const col of colsWithMatches) {
    const fq = `"${col.table_schema}"."${col.table_name}"`
    const isJson = col.data_type === 'jsonb' || col.data_type === 'json'
    const colRef = `"${col.column_name}"`
    const readExpr = isJson ? `${colRef}::text` : colRef

    for (const oldUrl of col.urls) {
      const newUrl = urlMap.get(oldUrl)
      if (!newUrl) continue

      const setExpr = isJson
        ? `SET ${colRef} = replace(${readExpr}, $1, $2)::${col.data_type}`
        : `SET ${colRef} = replace(${readExpr}, $1, $2)`
      const whereExpr = `WHERE position($1 in ${readExpr}) > 0`
      const sql = `UPDATE ${fq} ${setExpr} ${whereExpr}`

      try {
        const r = await client.query(sql, [oldUrl, newUrl])
        if (r.rowCount && r.rowCount > 0) {
          totalRowsUpdated += r.rowCount
          totalReplacements++
        }
      } catch (e) {
        console.warn(
          `  ! UPDATE hatası ${col.table_schema}.${col.table_name}.${col.column_name}: ${e.message}`,
        )
      }
    }
    console.log(`  ✓ ${col.table_schema}.${col.table_name}.${col.column_name}`)
  }

  // JSON dosyalarını güncelle
  let jsonFilesUpdated = 0
  let jsonReplacements = 0
  for (const jf of jsonFiles) {
    let txt = await fs.readFile(jf.file, 'utf8')
    let localReplacements = 0
    for (const oldUrl of jf.urls) {
      const newUrl = urlMap.get(oldUrl)
      if (!newUrl) continue
      if (!txt.includes(oldUrl)) continue
      // replaceAll ile tüm kopyalar
      txt = txt.split(oldUrl).join(newUrl)
      localReplacements++
    }
    if (localReplacements > 0) {
      await fs.writeFile(jf.file, txt, 'utf8')
      jsonFilesUpdated++
      jsonReplacements += localReplacements
      console.log(`  ✓ ${jf.rel} (${localReplacements} replacement)`)
    }
  }

  console.log(`\n[bitti]`)
  console.log(`  DB replacement     = ${totalReplacements}`)
  console.log(`  DB satır etk.      = ${totalRowsUpdated}`)
  console.log(`  JSON dosya         = ${jsonFilesUpdated}`)
  console.log(`  JSON replacement   = ${jsonReplacements}`)
  console.log(`\nŞimdi build + restart lazım:`)
  console.log(`  npm run build && systemctl restart travel-web`)

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

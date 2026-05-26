/**
 * mamon.com.tr (Booking Core) MySQL → Wtatil API credential okuyucu.
 *
 * Booking Core tur ayarları genelde `core_settings` tablosunda (name / val).
 * Sunucu: Plesk phpMyAdmin veya SSH tüneli ile MySQL erişimi gerekir.
 *
 * Kullanım:
 *   set MAMON_DB_HOST=127.0.0.1
 *   set MAMON_DB_PORT=3306
 *   set MAMON_DB_USER=...
 *   set MAMON_DB_PASSWORD=...
 *   set MAMON_DB_NAME=...
 *   node scripts/read-wtatil-creds-from-mamon-db.mjs
 *
 *   node scripts/read-wtatil-creds-from-mamon-db.mjs --write-env scripts/config/wtatil.local.env
 *
 * Plesk phpMyAdmin tek satır SQL:
 *   SELECT name, val FROM core_settings
 *   WHERE name LIKE '%wtatil%' OR name LIKE '%reserwation%' OR val LIKE '%reserwation%';
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(__dirname, '..', 'frontend', 'package.json'))
const mysql = require('mysql2/promise')

const args = process.argv.slice(2)
const writeIdx = args.indexOf('--write-env')
const writePath = writeIdx >= 0 ? args[writeIdx + 1] : null

function mask(s) {
  if (!s) return '(boş)'
  const t = String(s)
  if (t.length <= 4) return '****'
  return `${t.slice(0, 2)}…${t.slice(-2)} (${t.length} karakter)`
}

function parseVal(raw) {
  if (raw == null) return null
  if (typeof raw === 'object') return raw
  const s = String(raw).trim()
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    // Booking Core bazen serialize PHP kullanır; JSON değilse ham string
    return s
  }
}

function pickFromObject(obj, depth = 0) {
  if (!obj || depth > 6) return {}
  const out = {}
  const keyMap = [
    ['applicationSecretKey', 'WTATIL_APPLICATION_SECRET_KEY'],
    ['application_secret_key', 'WTATIL_APPLICATION_SECRET_KEY'],
    ['secretKey', 'WTATIL_APPLICATION_SECRET_KEY'],
    ['secret', 'WTATIL_APPLICATION_SECRET_KEY'],
    ['userName', 'WTATIL_USERNAME'],
    ['username', 'WTATIL_USERNAME'],
    ['password', 'WTATIL_PASSWORD'],
    ['agencyId', 'WTATIL_AGENCY_ID'],
    ['agency_id', 'WTATIL_AGENCY_ID'],
    ['baseUrl', 'WTATIL_BASE_URL'],
    ['apiUrl', 'WTATIL_BASE_URL'],
    ['url', 'WTATIL_BASE_URL'],
  ]
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [from, to] of keyMap) {
      if (obj[from] != null && obj[from] !== '') out[to] = String(obj[from])
    }
    for (const v of Object.values(obj)) {
      Object.assign(out, pickFromObject(parseVal(v), depth + 1))
    }
  }
  return out
}

async function loadSettings(conn) {
  const tables = ['core_settings', 'core_setting', 'settings']
  for (const table of tables) {
    try {
      const [rows] = await conn.query(`SHOW TABLES LIKE ?`, [table])
      if (!rows.length) continue
      const [data] = await conn.query(
        `SELECT name, val FROM \`${table}\`
         WHERE name LIKE '%wtatil%'
            OR name LIKE '%reserwation%'
            OR name LIKE '%tour_api%'
            OR val LIKE '%reserwation%'
            OR val LIKE '%applicationSecret%'
            OR val LIKE '%wtatil%'`,
      )
      if (data.length) return { table, rows: data }
    } catch {
      // tablo yok
    }
  }
  return { table: null, rows: [] }
}

async function main() {
  const host = process.env.MAMON_DB_HOST || '127.0.0.1'
  const port = Number(process.env.MAMON_DB_PORT || 3306)
  const user = process.env.MAMON_DB_USER || ''
  const password = process.env.MAMON_DB_PASSWORD || ''
  const database = process.env.MAMON_DB_NAME || ''

  if (!user || !database) {
    throw new Error('MAMON_DB_USER ve MAMON_DB_NAME gerekli (Plesk → Veritabanları).')
  }

  const conn = await mysql.createConnection({ host, port, user, password, database })
  try {
    const { table, rows } = await loadSettings(conn)
    if (!rows.length) {
      console.log('Wtatil/reserwation içeren ayar satırı bulunamadı.')
      console.log('phpMyAdmin’de tüm ayarları tarayın:')
      console.log("  SELECT name, LEFT(val, 200) FROM core_settings WHERE name LIKE '%tour%';")
      return
    }

    console.log(`Tablo: ${table}, eşleşen satır: ${rows.length}\n`)

    const merged = { WTATIL_BASE_URL: 'https://tour-api.reserwation.com' }
    for (const row of rows) {
      console.log(`— ${row.name}`)
      const parsed = parseVal(row.val)
      const picked = pickFromObject(parsed)
      for (const [k, v] of Object.entries(picked)) {
        merged[k] = v
        console.log(`    ${k}: ${mask(v)}`)
      }
      if (!Object.keys(picked).length && typeof parsed === 'string') {
        console.log(`    (ham): ${parsed.slice(0, 120)}…`)
      }
    }

    const required = ['WTATIL_APPLICATION_SECRET_KEY', 'WTATIL_USERNAME', 'WTATIL_PASSWORD']
    const missing = required.filter((k) => !merged[k])
    if (missing.length) {
      console.log('\nEksik alanlar:', missing.join(', '))
      console.log('Satır isimlerini paylaşırsanız eşleme genişletilebilir.')
      return
    }

    console.log('\nCredential özeti OK (değerler maskeli).')

    if (writePath) {
      const abs = path.resolve(writePath)
      const lines = [
        '# mamon.com.tr Booking Core → otomatik (gitignore edin)',
        `WTATIL_BASE_URL=${merged.WTATIL_BASE_URL}`,
        `WTATIL_APPLICATION_SECRET_KEY=${merged.WTATIL_APPLICATION_SECRET_KEY}`,
        `WTATIL_USERNAME=${merged.WTATIL_USERNAME}`,
        `WTATIL_PASSWORD=${merged.WTATIL_PASSWORD}`,
      ]
      if (merged.WTATIL_AGENCY_ID) lines.push(`WTATIL_AGENCY_ID=${merged.WTATIL_AGENCY_ID}`)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, lines.join('\n') + '\n', 'utf8')
      console.log(`Yazıldı: ${abs}`)
      console.log('Sonra: node scripts/import-wtatil-tours.mjs --ping')
    }
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

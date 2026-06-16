/**
 * PostgreSQL client — travel-api ile aynı ortam (backend.env).
 * Öncelik: DATABASE_URL, yoksa PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBackendEnvFile } from './load-backend-env.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadPgModule() {
  const roots = [
    path.join(__dirname, '..'), // scripts/ (scripts/package.json)
    path.join(__dirname, '..', '..', 'frontend'),
  ]
  let lastErr
  for (const root of roots) {
    const pkg = path.join(root, 'package.json')
    try {
      return createRequire(pkg)('pg')
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(
    `pg modülü bulunamadı — cd scripts && npm install (veya frontend npm ci). ${lastErr?.message || ''}`,
  )
}

const pg = loadPgModule()

let envBootstrapped = false

function ensureBackendEnv() {
  if (envBootstrapped) return
  loadBackendEnvFile()
  envBootstrapped = true
}

export function createPgClient() {
  ensureBackendEnv()
  const url = (process.env.DATABASE_URL || '').trim()
  const pgPassword =
    process.env.PGPASSWORD == null ? '' : String(process.env.PGPASSWORD)
  const connectTimeout = Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 15000)

  const baseOpts = { connectionTimeoutMillis: connectTimeout }

  if (url) {
    try {
      const u = new URL(url)
      const user = decodeURIComponent(u.username || process.env.PGUSER || 'postgres')
      const database =
        u.pathname.replace(/^\//, '') || process.env.PGDATABASE || 'travel'
      const passwordFromUrl = u.password ? decodeURIComponent(u.password) : ''
      const password = passwordFromUrl || pgPassword
      if (!password) {
        throw new Error(
          'DATABASE_URL içinde şifre yok ve PGPASSWORD boş — backend.env kontrol edin.',
        )
      }
      return new pg.Client({
        ...baseOpts,
        host: u.hostname || process.env.PGHOST || '127.0.0.1',
        port: Number(u.port || process.env.PGPORT || 5432),
        user,
        password: String(password),
        database,
      })
    } catch (e) {
      if (e.message?.includes('backend.env')) throw e
      return new pg.Client({ ...baseOpts, connectionString: url })
    }
  }

  return new pg.Client({
    ...baseOpts,
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: pgPassword,
    database: process.env.PGDATABASE || 'travel',
  })
}

export async function testPgConnection() {
  ensureBackendEnv()
  const client = createPgClient()
  await client.connect()
  try {
    const r = await client.query('select current_database() as db, current_user as usr')
    return r.rows[0]
  } finally {
    await client.end()
  }
}

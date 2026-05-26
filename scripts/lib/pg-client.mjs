/**
 * PostgreSQL client — travel-api ile aynı ortam (backend.env).
 * Öncelik: DATABASE_URL, yoksa PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBackendEnvFile } from './load-backend-env.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(__dirname, '..', '..', 'frontend', 'package.json'))
const pg = require('pg')

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
        host: u.hostname || process.env.PGHOST || '127.0.0.1',
        port: Number(u.port || process.env.PGPORT || 5432),
        user,
        password: String(password),
        database,
      })
    } catch (e) {
      if (e.message?.includes('backend.env')) throw e
      return new pg.Client({ connectionString: url })
    }
  }

  return new pg.Client({
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

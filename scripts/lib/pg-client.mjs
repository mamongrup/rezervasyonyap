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
  if (url) {
    return new pg.Client({ connectionString: url })
  }
  const password = process.env.PGPASSWORD
  return new pg.Client({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: password == null ? '' : String(password),
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

/**
 * travel-api ile aynı ortam dosyasını Node sürecine yükler.
 * Sunucuda `source backend.env` export etmeden çalışırsa DATABASE_URL node'a gitmez —
 * bu modül dosyayı doğrudan okur.
 */
import fs from 'node:fs'

const DEFAULT_ENV_FILE = '/etc/rezervasyonyap/backend.env'

/** travel-api backend.env ile aynı anahtarlar — dosyadan her zaman okunur. */
const DB_ENV_KEYS = new Set([
  'DATABASE_URL',
  'PGPASSWORD',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGDATABASE',
])

function stripQuotes(value) {
  const v = String(value ?? '').trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }
  return v
}

function expandEnvRefs(value, env) {
  return String(value).replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => env[key] ?? '')
}

function parseEnvLine(rawLine) {
  let line = rawLine.replace(/\r$/, '').trim()
  if (!line || line.startsWith('#')) return null
  if (line.startsWith('export ')) line = line.slice(7).trim()
  const eq = line.indexOf('=')
  if (eq <= 0) return null
  const key = line.slice(0, eq).trim()
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null
  return [key, stripQuotes(line.slice(eq + 1))]
}

export function loadBackendEnvFile(filePath = process.env.TRAVEL_DB_ENV || DEFAULT_ENV_FILE) {
  if (!filePath || !fs.existsSync(filePath)) return { filePath, loaded: 0 }
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const parsed = []
  for (const rawLine of text.split('\n')) {
    const row = parseEnvLine(rawLine)
    if (row) parsed.push(row)
  }

  let loaded = 0
  const draft = { ...process.env }
  for (const [key, rawValue] of parsed) {
    draft[key] = expandEnvRefs(rawValue, draft)
  }
  for (const [key] of parsed) {
    const resolved = draft[key] ?? ''
    const forceFromFile = DB_ENV_KEYS.has(key)
    if (forceFromFile || process.env[key] == null || process.env[key] === '') {
      if (process.env[key] !== resolved) loaded += 1
      process.env[key] = resolved
    }
  }
  return { filePath, loaded }
}

export function describePgEnv() {
  const url = (process.env.DATABASE_URL || '').trim()
  const pgPassword =
    process.env.PGPASSWORD != null && String(process.env.PGPASSWORD) !== ''
  if (url) {
    try {
      const u = new URL(url)
      const passwordFromUrl = Boolean(u.password)
      return {
        mode: 'DATABASE_URL',
        host: u.hostname,
        database: u.pathname.replace(/^\//, ''),
        user: decodeURIComponent(u.username || ''),
        hasPassword: passwordFromUrl || pgPassword,
        passwordSource: passwordFromUrl ? 'url' : pgPassword ? 'PGPASSWORD' : 'none',
      }
    } catch {
      return { mode: 'DATABASE_URL', invalid: true }
    }
  }
  return {
    mode: 'PG*',
    host: process.env.PGHOST || '127.0.0.1',
    database: process.env.PGDATABASE || 'travel',
    user: process.env.PGUSER || 'postgres',
    hasPassword: pgPassword,
    passwordSource: pgPassword ? 'PGPASSWORD' : 'none',
  }
}

import {
  searchPublicListings,
  type PublicListingSearchParams,
  type PublicListingSearchResult,
} from '@/lib/travel-api'

type SnapshotPayload = {
  savedAt: string
  params: PublicListingSearchParams
  result: PublicListingSearchResult
}

export type ResilientPublicListingsSource = 'api' | 'snapshot' | 'none'

export type ResilientPublicListingsResult = {
  result: PublicListingSearchResult | null
  source: ResilientPublicListingsSource
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3

async function importNodeModule<T>(specifier: string): Promise<T> {
  return import(/* webpackIgnore: true */ specifier) as Promise<T>
}

function envNumber(name: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env[name] : undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeParams(params: PublicListingSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(params).sort() as Array<keyof PublicListingSearchParams>) {
    const value = params[key]
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      const cleaned = value.map((v) => String(v).trim()).filter(Boolean)
      if (cleaned.length > 0) out[key] = cleaned
      continue
    }
    out[key] = typeof value === 'string' ? value.trim() : value
  }
  return out
}

function withSignal(fetchInit: RequestInit | undefined, signal: AbortSignal): RequestInit {
  return { ...(fetchInit ?? {}), signal }
}

async function snapshotPath(params: PublicListingSearchParams): Promise<string> {
  const [{ createHash }, path] = await Promise.all([
    importNodeModule<{ createHash: (algorithm: string) => {
      update: (value: string) => { digest: (encoding: 'hex') => string }
    } }>('node:crypto'),
    importNodeModule<{ join: (...parts: string[]) => string }>('node:path'),
  ])
  const key = JSON.stringify(normalizeParams(params))
  const hash = createHash('sha256').update(key).digest('hex')
  return path.join(process.cwd(), '.next', 'cache', 'travel-public-listings', `${hash}.json`)
}

async function readSnapshot(params: PublicListingSearchParams): Promise<PublicListingSearchResult | null> {
  if (typeof window !== 'undefined') return null

  try {
    const [fs, filePath] = await Promise.all([
      importNodeModule<{ readFile: (path: string, encoding: 'utf8') => Promise<string> }>('node:fs/promises'),
      snapshotPath(params),
    ])
    const raw = await fs.readFile(filePath, 'utf8')
    const payload = JSON.parse(raw) as SnapshotPayload
    const savedAt = Date.parse(payload.savedAt)
    const maxAgeMs = envNumber('PUBLIC_LISTINGS_SNAPSHOT_MAX_AGE_MS', DEFAULT_SNAPSHOT_MAX_AGE_MS)
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > maxAgeMs) return null
    if (!payload.result || !Array.isArray(payload.result.listings)) return null
    return payload.result
  } catch {
    return null
  }
}

// Snapshot yalnız fallback içindir; her API yanıtında yeniden yazmak gereksiz
// disk I/O üretiyordu (DeHost yüksek yazma uyarısı). Aynı anahtar için taze bir
// snapshot varsa (bu pencere içinde) tekrar yazma.
const DEFAULT_SNAPSHOT_WRITE_THROTTLE_MS = 1000 * 60 * 30

async function snapshotIsFresh(filePath: string): Promise<boolean> {
  try {
    const fs = await importNodeModule<{
      stat: (path: string) => Promise<{ mtimeMs: number }>
    }>('node:fs/promises')
    const st = await fs.stat(filePath)
    const throttleMs = envNumber(
      'PUBLIC_LISTINGS_SNAPSHOT_WRITE_THROTTLE_MS',
      DEFAULT_SNAPSHOT_WRITE_THROTTLE_MS,
    )
    return Date.now() - st.mtimeMs < throttleMs
  } catch {
    return false
  }
}

async function writeSnapshot(
  params: PublicListingSearchParams,
  result: PublicListingSearchResult,
): Promise<void> {
  if (typeof window !== 'undefined') return
  if (!result || !Array.isArray(result.listings) || result.listings.length === 0) return

  try {
    const [fs, path, filePath] = await Promise.all([
      importNodeModule<{
        mkdir: (path: string, options: { recursive: true }) => Promise<unknown>
        writeFile: (path: string, data: string, encoding: 'utf8') => Promise<void>
        rename: (oldPath: string, newPath: string) => Promise<void>
      }>('node:fs/promises'),
      importNodeModule<{ dirname: (path: string) => string }>('node:path'),
      snapshotPath(params),
    ])
    // Taze snapshot varsa yeniden yazma (disk I/O throttle).
    if (await snapshotIsFresh(filePath)) return
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const tmpPath = `${filePath}.${process.pid}.tmp`
    const payload: SnapshotPayload = {
      savedAt: new Date().toISOString(),
      params: normalizeParams(params) as PublicListingSearchParams,
      result,
    }
    await fs.writeFile(tmpPath, JSON.stringify(payload), 'utf8')
    await fs.rename(tmpPath, filePath)
  } catch {
    // Snapshot cache is best effort; the live API result is still usable.
  }
}

async function searchWithTimeout(
  params: PublicListingSearchParams,
  fetchInit?: RequestInit,
): Promise<PublicListingSearchResult | null> {
  if (fetchInit?.signal) return searchPublicListings(params, fetchInit)

  const timeoutMs = envNumber('PUBLIC_LISTINGS_FETCH_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await searchPublicListings(params, withSignal(fetchInit, controller.signal))
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchPublicListingsResilient(
  params: PublicListingSearchParams,
  fetchInit?: RequestInit,
): Promise<ResilientPublicListingsResult> {
  const first = await searchWithTimeout(params, fetchInit)
  if (first) {
    await writeSnapshot(params, first)
    return { result: first, source: 'api' }
  }

  // Hız önceliği: ilk deneme başarısızsa önce snapshot'a dön.
  // Eski akışta ikinci API denemesi kullanıcıyı 4-7sn daha bekletiyordu.
  const snapshot = await readSnapshot(params)
  if (snapshot) return { result: snapshot, source: 'snapshot' }

  // Snapshot da yoksa son bir deneme daha yap.
  const second = await searchWithTimeout(params, fetchInit)
  if (second) {
    await writeSnapshot(params, second)
    return { result: second, source: 'api' }
  }

  return { result: null, source: 'none' }
}

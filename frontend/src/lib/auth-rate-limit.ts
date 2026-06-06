/**
 * Basit, in-memory, sliding-window rate-limit. Yalnızca `/api/auth/*`
 * Next.js route'ları için yeterli. Üretimde tek instance koşullarında
 * (single-process Node) doğru çalışır; çoklu instance / serverless'ta
 * Redis tabanlı bir yapıya geçilmelidir.
 *
 * Yaklaşım:
 *  - Anahtar başına son `WINDOW_MS` içindeki **başarısız** denemeleri sayar.
 *  - `MAX_FAILS` aşılırsa `BLOCK_MS` boyunca kilitlenir.
 *  - Başarılı giriş anahtar geçmişini sıfırlar.
 *
 * Anahtar = `${clientIp}|${email}` (route tarafında üretilir). Bu sayede
 * hem tek bir IP'nin farklı hesaplara saldırmasını hem de aynı hesaba
 * birden fazla IP'den brute-force denemeyi tek tek limitler.
 */

const WINDOW_MS = 15 * 60 * 1000 // 15 dakika
const MAX_FAILS = 5 // bu kadar başarısız denemeden sonra blok
const BLOCK_MS = 15 * 60 * 1000 // 15 dakika blok

export type Action = 'login' | 'register' | 'global_api' | 'auth_brute' | 'verify_tc' | 'newsletter'

/** `proxy.ts` — tüm `/api/*` istekleri (IP başına, 1 dk pencere). */
export const GLOBAL_API_RATE_MAX =
  Number.parseInt(process.env.GLOBAL_API_RATE_LIMIT_PER_MIN ?? '300', 10) || 300
export const GLOBAL_API_RATE_WINDOW_MS = 60_000
export const GLOBAL_API_RATE_BLOCK_MS = 60_000

/** `proxy.ts` — `/api/auth/*` POST brute-force ek katmanı (IP başına, 5 dk). */
export const AUTH_BRUTE_RATE_MAX = 30
export const AUTH_BRUTE_RATE_WINDOW_MS = 5 * 60_000
export const AUTH_BRUTE_RATE_BLOCK_MS = 5 * 60_000

/** `/api/verify-tc` — NVI proxy kötüye kullanımını sınırlar (IP başına, 15 dk). */
export const TC_VERIFY_RATE_MAX =
  Number.parseInt(process.env.TC_VERIFY_RATE_LIMIT_PER_15MIN ?? '10', 10) || 10
export const TC_VERIFY_RATE_WINDOW_MS = 15 * 60_000
export const TC_VERIFY_RATE_BLOCK_MS = 15 * 60_000

/** `/api/newsletter` — spam/abuse (IP başına, 1 saat). */
export const NEWSLETTER_RATE_MAX =
  Number.parseInt(process.env.NEWSLETTER_RATE_LIMIT_PER_HOUR ?? '5', 10) || 5
export const NEWSLETTER_RATE_WINDOW_MS = 60 * 60_000
export const NEWSLETTER_RATE_BLOCK_MS = 60 * 60_000

interface Bucket {
  failures: number[] // başarısız deneme zaman damgaları (ms)
  blockedUntil: number // 0 ise bloklu değil
}

const buckets = new Map<string, Bucket>()

interface RequestBucket {
  timestamps: number[]
  blockedUntil: number
}

const requestBuckets = new Map<string, RequestBucket>()

/** Kova anahtarı için aksiyon başına ayrı isim alanı kullan. */
function k(action: Action, key: string): string {
  return `${action}:${key}`
}

function pruneOld(b: Bucket, now: number): void {
  const cutoff = now - WINDOW_MS
  b.failures = b.failures.filter((t) => t >= cutoff)
}

export function isRateLimited(action: Action, key: string): boolean {
  const now = Date.now()
  const b = buckets.get(k(action, key))
  if (!b) return false
  if (b.blockedUntil > now) return true
  pruneOld(b, now)
  return false
}

export function rateLimitRetryAfter(action: Action, key: string): number {
  const now = Date.now()
  const b = buckets.get(k(action, key))
  if (!b) return 0
  if (b.blockedUntil > now) {
    return Math.ceil((b.blockedUntil - now) / 1000)
  }
  return 0
}

function requestBucketKey(
  action: 'global_api' | 'auth_brute' | 'verify_tc' | 'newsletter',
  key: string,
): string {
  return `${action}:req:${key}`
}

function pruneRequestTimestamps(b: RequestBucket, now: number, windowMs: number): void {
  const cutoff = now - windowMs
  b.timestamps = b.timestamps.filter((t) => t >= cutoff)
}

/**
 * İstek sayısına dayalı limit (`global_api`, `auth_brute`).
 * `recordAuthAttempt(..., true)` ile karıştırılmamalı — o yalnızca başarısız giriş sayar.
 */
export function isRequestRateLimited(
  action: 'global_api' | 'auth_brute' | 'verify_tc' | 'newsletter',
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const b = requestBuckets.get(requestBucketKey(action, key))
  if (!b) return false
  if (b.blockedUntil > now) return true
  pruneRequestTimestamps(b, now, windowMs)
  return b.timestamps.length >= maxRequests
}

/** Her geçen isteği pencereye ekler; limit aşılınca `blockedUntil` ayarlanır. */
export function recordRequest(
  action: 'global_api' | 'auth_brute' | 'verify_tc' | 'newsletter',
  key: string,
  maxRequests: number,
  windowMs: number,
  blockMs: number,
): void {
  const now = Date.now()
  const fullKey = requestBucketKey(action, key)
  const b = requestBuckets.get(fullKey) ?? { timestamps: [], blockedUntil: 0 }

  if (b.blockedUntil > now) return

  pruneRequestTimestamps(b, now, windowMs)
  b.timestamps.push(now)

  if (b.timestamps.length >= maxRequests) {
    b.blockedUntil = now + blockMs
    b.timestamps = []
  }

  requestBuckets.set(fullKey, b)

  if (requestBuckets.size > 10_000) {
    for (const [k2, v] of requestBuckets.entries()) {
      if (v.blockedUntil < now && v.timestamps.length === 0) requestBuckets.delete(k2)
    }
  }
}

export function recordAuthAttempt(action: Action, key: string, success: boolean): void {
  const now = Date.now()
  const fullKey = k(action, key)
  if (success) {
    buckets.delete(fullKey)
    return
  }
  const b = buckets.get(fullKey) ?? { failures: [], blockedUntil: 0 }
  pruneOld(b, now)
  b.failures.push(now)
  if (b.failures.length >= MAX_FAILS) {
    b.blockedUntil = now + BLOCK_MS
    b.failures = [] // bloklamada geçmişi temizle
  }
  buckets.set(fullKey, b)

  // Hafıza sızıntısı önlemi — bucket çok büyürse temizle
  if (buckets.size > 10_000) {
    for (const [k2, v] of buckets.entries()) {
      if (v.blockedUntil < now && v.failures.length === 0) buckets.delete(k2)
    }
  }
}

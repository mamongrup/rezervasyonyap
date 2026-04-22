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

type Action = 'login' | 'register'

interface Bucket {
  failures: number[] // başarısız deneme zaman damgaları (ms)
  blockedUntil: number // 0 ise bloklu değil
}

const buckets = new Map<string, Bucket>()

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

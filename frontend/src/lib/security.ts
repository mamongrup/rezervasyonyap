/**
 * Merkezi güvenlik yardımcıları.
 *
 * - validatePassword: kayıt/şifre değiştirme için politika kontrolü
 * - sanitizeFilename: path traversal ve null-byte saldırılarına karşı
 * - getErrorMessage: hassas detay sızdırmayan hata mesajı çıkarıcı
 * - isAllowedRevalidatePath: Next.js revalidatePath whitelist
 */

// ---------------------------------------------------------------------------
// Şifre politikası
// ---------------------------------------------------------------------------

export interface PasswordValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * Minimum 8 karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam.
 * OWASP temel önerileriyle uyumlu.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (!password || password.length < 8) {
    errors.push('password_too_short')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('password_no_uppercase')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('password_no_lowercase')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('password_no_digit')
  }

  return { ok: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Dosya adı sanitizasyonu
// ---------------------------------------------------------------------------

/**
 * Kullanıcıdan gelen dosya adlarını güvenli hale getirir:
 * - Path traversal (`../`, `..\\`) engellenir
 * - Null byte (`%00`, `\0`) temizlenir
 * - Yalnızca alfanümerik, tire, alt çizgi, nokta ve boşluk bırakılır
 * - Ardışık noktalar tek noktaya indirgenir (çift uzantı saldırısı)
 */
export function sanitizeFilename(raw: string): string {
  if (!raw) return 'untitled'

  // Null byte temizliği
  let s = raw.replace(/\x00/g, '').replace(/%00/g, '')

  // Path traversal
  while (s.includes('../') || s.includes('..\\')) {
    s = s.replace(/\.\.\//g, '').replace(/\.\.\\/g, '')
  }

  // Yalnızca izin verilen karakterler
  s = s.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ _.\-]/g, '')

  // Baştaki/sondaki boşluk ve noktaları temizle
  s = s.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '')

  // Ardışık noktaları tek noktaya indirge
  s = s.replace(/\.{2,}/g, '.')

  // Boş kaldıysa fallback
  if (!s) return 'untitled'

  return s
}

// ---------------------------------------------------------------------------
// Güvenli hata mesajı
// ---------------------------------------------------------------------------

/**
 * Bilinmeyen hatalarda hassas detayları (stack trace, DB bağlantı bilgisi vb.)
 * sızdırmayan genel mesaj döner. Bilinen `Error` nesneleri için `.message`
 * güvenli kabul edilir (backend'den gelen snake_case hata kodları).
 */
export function getErrorMessage(err: unknown, fallback = 'unexpected_error'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (err instanceof Error) {
    // Backend'den gelen yapılandırılmış hatalar (örn. "coupon_min_order_not_met")
    // güvenlidir; stack trace içermez.
    const msg = err.message
    if (!msg) return fallback
    // Stack trace sızmadığından emin ol
    if (msg.includes('\n') || msg.includes(' at ')) return fallback
    return msg
  }
  // Diğer türler (object vb.) — detay sızdırma
  return fallback
}

// ---------------------------------------------------------------------------
// Revalidate path whitelist
// ---------------------------------------------------------------------------

/** Revalidate için izin verilen path önekleri. */
const ALLOWED_REVALIDATE_PREFIXES = [
  '/tr/bolge/',
  '/en/region/',
  '/de/region/',
  '/ru/region/',
  '/zh/region/',
  '/fr/region/',
  '/tr/listing/',
  '/en/listing/',
  '/de/listing/',
  '/ru/listing/',
  '/zh/listing/',
  '/fr/listing/',
  '/tr/location/',
  '/en/location/',
  '/de/location/',
  '/ru/location/',
  '/zh/location/',
  '/fr/location/',
  '/tr/diqu/',
  '/en/diqu/',
  '/de/diqu/',
  '/ru/diqu/',
  '/zh/diqu/',
  '/fr/diqu/',
  '/tr/blog/',
  '/en/blog/',
  '/de/blog/',
  '/ru/blog/',
  '/zh/blog/',
  '/fr/blog/',
  '/tr/',
  '/en/',
  '/de/',
  '/ru/',
  '/zh/',
  '/fr/',
] as const

/**
 * Dışarıdan gelen revalidate path isteğinin izin verilen öneklerden
 * biriyle başlayıp başlamadığını kontrol eder.
 */
export function isAllowedRevalidatePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  // Path traversal girişimlerini reddet
  if (path.includes('..') || path.includes('\x00') || path.includes('%00')) return false
  const normalized = path.startsWith('/') ? path : `/${path}`
  return ALLOWED_REVALIDATE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

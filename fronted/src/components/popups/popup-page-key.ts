/**
 * URL pathname'inden popup hedefleme için kullanılan `pageKey`'i türetir.
 * Slider sayfa anahtarlarıyla uyumludur (homepage / oteller / turlar / …).
 */

const KNOWN_KEYS = new Set([
  'homepage',
  'oteller',
  'tatil-evleri',
  'turlar',
  'aktiviteler',
  'arac-kiralama',
  'yat-kiralama',
  'transfer',
  'feribot',
  'kruvaziyer',
  'ucak-bileti',
  'hac-umre',
  'vize',
])

/**
 * Pathname normalizasyonu:
 * - `/` veya `/{locale}` → `homepage`
 * - `/{locale}/oteller`, `/{locale}/oteller/...`, `/oteller`, `/oteller/...` → `oteller`
 * - Bilinmeyen kategori segmenti → segmentin kendisi (kullanıcı tanımlı sayfaya da
 *   popup hedeflemek isterse hızlı destek)
 */
export function popupPageKeyFromPathname(pathname: string): string {
  if (!pathname) return 'homepage'
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return 'homepage'

  // İlk segment locale ise at
  const first = parts[0]
  const isLocale = /^[a-z]{2}(-[a-z0-9]{1,8})?$/i.test(first) && first.length <= 5
  const seg = isLocale ? parts[1] : first

  if (!seg) return 'homepage'
  const lower = seg.toLowerCase()
  if (KNOWN_KEYS.has(lower)) return lower
  return lower
}

export function pathnameIsAdminLike(pathname: string): boolean {
  if (!pathname) return false
  return (
    pathname.includes('/manage') ||
    pathname.includes('/staff') ||
    pathname.includes('/checkout') ||
    pathname.includes('/auth') ||
    pathname.startsWith('/api') ||
    pathname.includes('/login') ||
    pathname.includes('/register')
  )
}

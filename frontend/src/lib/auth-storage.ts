/**
 * Tarayıcı tarafı auth token saklayıcısı.
 *
 * Mimari notu — Asıl güven kaynağı `travel_auth_token` **HttpOnly** cookie'dir;
 * `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` Next API
 * route'ları sunucu tarafında set/clear eder. JS bu cookie'yi okuyamaz.
 *
 * `localStorage`'da tutulan kopya yalnızca `Authorization: Bearer <token>`
 * gerektiren istemci-tarafı API çağrıları (örn. backend'e doğrudan fetch)
 * için yardımcıdır. XSS durumunda buradaki kopya çalınabilir; bunun için
 * yetkili API uçları cookie kontrolünü de yapar (`api-require-admin.ts`).
 *
 * Sekmeler arası senkron için `storage` event kullanılır.
 */

export const AUTH_TOKEN_STORAGE_KEY = 'travel_auth_token'

const AUTH_TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

/**
 * `localStorage` kopyasını siler ve sunucudaki HttpOnly cookie'yi de
 * temizlemek için `/api/auth/logout`'u tetikler. Fire-and-forget; çağıran
 * taraf beklemek zorunda değildir.
 */
export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  // HttpOnly cookie sunucu tarafı set edildiği için yine sunucudan temizlenir.
  void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(
    () => undefined,
  )
}

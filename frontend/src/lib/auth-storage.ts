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
export const AUTH_PROFILE_STORAGE_KEY = 'travel_auth_profile'
/** Aynı sekmede giriş/çıkış sonrası header menüsünü yenilemek için */
export const AUTH_CHANGED_EVENT = 'travel-auth-changed'

export function notifyAuthChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

const AUTH_TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY
const AUTH_PROFILE_KEY = AUTH_PROFILE_STORAGE_KEY

export type StoredAuthProfile = {
  display_name?: string | null
  email?: string | null
  roles?: { role_code: string; organization_id?: string | null }[]
  permissions?: string[]
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function getStoredAuthProfile(): StoredAuthProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_KEY)
    return raw ? (JSON.parse(raw) as StoredAuthProfile) : null
  } catch {
    return null
  }
}

export function setStoredAuthProfile(profile: StoredAuthProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile))
}

/**
 * `localStorage` kopyasını siler ve sunucudaki HttpOnly cookie'yi de
 * temizlemek için `/api/auth/logout`'u tetikler. Fire-and-forget; çağıran
 * taraf beklemek zorunda değildir.
 */
export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_PROFILE_KEY)
  // HttpOnly cookie sunucu tarafı set edildiği için yine sunucudan temizlenir.
  void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(
    () => undefined,
  )
}

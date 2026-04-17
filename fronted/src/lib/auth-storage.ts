/** localStorage anahtarı — başka sekme senkronu için dışa açık */
export const AUTH_TOKEN_STORAGE_KEY = 'travel_auth_token'

const AUTH_TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY
const COOKIE_NAME = 'travel_auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 gün

function setCookie(value: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function deleteCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  setCookie(token)
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  deleteCookie()
}

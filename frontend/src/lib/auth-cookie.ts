/**
 * `travel_auth_token` HttpOnly cookie ayarları.
 *
 * Güvenlik notu — `localStorage` ile JS'in eriştiği eski yaklaşım XSS
 * durumunda token sızdırırdı. Yeni akışta token yalnızca **HttpOnly**
 * cookie ile saklanır; JS hiç okuyamaz, bu sayede XSS olsa bile token
 * korunur. `Secure` ise prod'da HTTPS zorlar; local geliştirmede HTTP
 * ile gönderilebilsin diye `NODE_ENV` kontrol edilir.
 */
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const AUTH_COOKIE_NAME = 'travel_auth_token'

/** 7 gün — backend `user_sessions.expires_at` ile eşleşir. */
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

/**
 * Sertifikalı (HttpOnly + Secure + SameSite=Lax) cookie öznitelikleri.
 * `cookies().set(...)` ile veya `Set-Cookie` header üretmek için kullanılır.
 */
export function authCookieOptions(): Partial<ResponseCookie> {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  }
}

/** Çıkış / oturum sonu için sıfırlama. */
export function authCookieClearOptions(): Partial<ResponseCookie> {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }
}

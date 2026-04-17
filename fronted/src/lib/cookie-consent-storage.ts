/** Tarayıcıda saklanan çerez tercihi — `CookieConsentBanner` ve `GoogleScriptsClient` ile paylaşılır */

export const COOKIE_CONSENT_STORAGE_KEY = 'travel_cookie_consent_v1'

export type StoredCookieConsent = {
  v: 1
  mode: 'all' | 'essential'
  at: number
}

export function readCookieConsentFromStorage(): StoredCookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as StoredCookieConsent
    if (p?.v === 1 && (p.mode === 'all' || p.mode === 'essential') && typeof p.at === 'number') return p
  } catch {
    /* ignore */
  }
  return null
}

export function writeCookieConsentToStorage(mode: 'all' | 'essential') {
  const next: StoredCookieConsent = { v: 1, mode, at: Date.now() }
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next))
  try {
    window.dispatchEvent(new CustomEvent('travel-cookie-consent', { detail: next }))
  } catch {
    /* ignore */
  }
}

/** Analitik / pazarlama (GTM, GA4, Ads, AdSense) yüklemek için «Tümünü kabul» gerekir */
export function allowAnalyticsScripts(consentGate: boolean): boolean {
  if (!consentGate) return true
  return readCookieConsentFromStorage()?.mode === 'all'
}

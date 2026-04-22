/**
 * Tarayıcı tarafı popup gösterim sıklığı kayıt yardımcıları.
 * `localStorage` ile kalıcı, `sessionStorage` ile oturumluk takip yapılır.
 */

import type { PopupItem } from '@/lib/popups-types'

const LS_PREFIX = 'tv:popup:'
const SS_PREFIX = 'tv:popup-ses:'
const DISMISS_FOREVER = 'dismissForever'

interface PopupRecord {
  /** Son gösterilme epoch ms */
  lastShownAt: number
  /** Toplam gösterim sayısı */
  shownCount: number
  /** Kullanıcı "Bir daha gösterme" dediyse true */
  dismissedForever: boolean
}

function read(id: string): PopupRecord {
  if (typeof window === 'undefined') {
    return { lastShownAt: 0, shownCount: 0, dismissedForever: false }
  }
  try {
    const raw = localStorage.getItem(LS_PREFIX + id)
    if (!raw) return { lastShownAt: 0, shownCount: 0, dismissedForever: false }
    const parsed = JSON.parse(raw) as Partial<PopupRecord>
    return {
      lastShownAt: typeof parsed.lastShownAt === 'number' ? parsed.lastShownAt : 0,
      shownCount: typeof parsed.shownCount === 'number' ? parsed.shownCount : 0,
      dismissedForever: parsed.dismissedForever === true,
    }
  } catch {
    return { lastShownAt: 0, shownCount: 0, dismissedForever: false }
  }
}

function write(id: string, rec: PopupRecord): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_PREFIX + id, JSON.stringify(rec))
  } catch {
    /* quota / private mode → sessizce yut */
  }
}

function shownThisSession(id: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SS_PREFIX + id) === '1'
  } catch {
    return false
  }
}

function markShownThisSession(id: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SS_PREFIX + id, '1')
  } catch {
    /* yut */
  }
}

/** İlk ziyaret için: hiç popup görmediyse true. */
export function isFirstVisit(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return !localStorage.getItem('tv:visited')
  } catch {
    return false
  }
}

export function markVisited(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('tv:visited', String(Date.now()))
  } catch {
    /* yut */
  }
}

/** Sıklık ayarına göre popup şimdi gösterilebilir mi? */
export function popupCanShowNow(p: PopupItem, now = Date.now()): boolean {
  const rec = read(p.id)
  if (rec.dismissedForever) return false

  switch (p.frequency.mode) {
    case 'always':
      return true
    case 'once_session':
      return !shownThisSession(p.id)
    case 'once_per_visitor':
      return rec.shownCount === 0
    case 'every_n_days': {
      if (rec.lastShownAt === 0) return true
      const days = Math.max(1, p.frequency.everyNDays)
      const diff = now - rec.lastShownAt
      return diff >= days * 86_400_000
    }
    default:
      return true
  }
}

export function recordPopupShown(p: PopupItem, now = Date.now()): void {
  const rec = read(p.id)
  write(p.id, {
    ...rec,
    lastShownAt: now,
    shownCount: rec.shownCount + 1,
  })
  markShownThisSession(p.id)
}

export function recordDismissForever(p: PopupItem): void {
  const rec = read(p.id)
  write(p.id, { ...rec, dismissedForever: true })
}

/** Belirli bir popup'ın hatırlanan tüm tercihlerini siler — debug için faydalı. */
export function resetPopupRecord(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(LS_PREFIX + id)
    sessionStorage.removeItem(SS_PREFIX + id)
  } catch {
    /* yut */
  }
}

/** Audience kuralını kontrol et — auth çerez varlığı = logged_in. */
export function audienceMatches(audience: PopupItem['targeting']['audience']): boolean {
  if (typeof window === 'undefined') return audience === 'all'
  if (audience === 'all') return true
  const isLoggedIn =
    typeof document !== 'undefined' && /(?:^|;\s*)travel_auth_token=/.test(document.cookie)
  if (audience === 'logged_in') return isLoggedIn
  if (audience === 'guest') return !isLoggedIn
  if (audience === 'first_visit') return isFirstVisit()
  if (audience === 'returning') return !isFirstVisit()
  return true
}

export const DISMISS_KEY = DISMISS_FOREVER

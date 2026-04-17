/**
 * Hero arama — arayüz aynı; gönderim sonrası:
 * - Plan A (kayıt yok): `sessionStorage` — sekme oturumu, cihazda hesaba bağlı değil.
 * - Plan B (kayıt var): `localStorage` — kullanıcı id ile son aramalar listesi (sunucuya gitmez; ileride API’ye taşınabilir).
 */

import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAuthMe } from '@/lib/travel-api'

export type HeroSearchVertical = 'stay' | 'car' | 'experience' | 'flight'

export type HeroSearchSnapshot = {
  vertical: HeroSearchVertical
  params: Record<string, string>
  /** Ör. /stay-categories-map/all — locale öneki yok */
  pathnameHint?: string
  savedAt: string
}

const STORAGE_PLAN_A = 'travel_hero_search_plan_a'
const STORAGE_PLAN_B_PREFIX = 'travel_hero_search_plan_b_'

let cachedUserId: string | null | undefined

export function clearHeroSearchUserIdCache(): void {
  cachedUserId = undefined
}

export function formDataToStringRecord(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

function stableParamSignature(params: Record<string, string>): string {
  const keys = Object.keys(params).sort()
  return JSON.stringify(keys.reduce<Record<string, string>>((a, key) => {
    a[key] = params[key]
    return a
  }, {}))
}

/**
 * `router.push` öncesi çağırın — UI değişmez; yan etki: A/B saklama.
 */
export function runHeroSearchPlanEffects(
  vertical: HeroSearchVertical,
  params: Record<string, string>,
  pathnameHint?: string,
): void {
  if (typeof window === 'undefined') return

  const snapshot: HeroSearchSnapshot = {
    vertical,
    params,
    pathnameHint,
    savedAt: new Date().toISOString(),
  }

  const token = getStoredAuthToken()
  if (!token) {
    try {
      sessionStorage.setItem(STORAGE_PLAN_A, JSON.stringify(snapshot))
    } catch {
      /* quota / private mode */
    }
    return
  }

  void persistPlanB(snapshot, token)
}

async function persistPlanB(snapshot: HeroSearchSnapshot, token: string): Promise<void> {
  let uid = cachedUserId
  if (uid === undefined) {
    try {
      const me = await getAuthMe(token)
      uid = me.id
      cachedUserId = uid
    } catch {
      try {
        sessionStorage.setItem(STORAGE_PLAN_A, JSON.stringify(snapshot))
      } catch {
        /* ignore */
      }
      return
    }
  }

  const key = `${STORAGE_PLAN_B_PREFIX}${uid}`
  try {
    const raw = localStorage.getItem(key)
    const list: HeroSearchSnapshot[] = raw ? (JSON.parse(raw) as HeroSearchSnapshot[]) : []
    const sig = `${snapshot.vertical}|${stableParamSignature(snapshot.params)}`
    const filtered = list.filter((x) => `${x.vertical}|${stableParamSignature(x.params)}` !== sig)
    const next = [snapshot, ...filtered].slice(0, 15)
    localStorage.setItem(key, JSON.stringify(next))
    localStorage.setItem(`${key}:last`, JSON.stringify(snapshot))
  } catch {
    /* quota */
  }
}

/** Plan A — son arama (ör. doldurma için) */
export function readHeroSearchPlanA(): HeroSearchSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_PLAN_A)
    if (!raw) return null
    return JSON.parse(raw) as HeroSearchSnapshot
  } catch {
    return null
  }
}

/** Plan B — son kayıtlı arama (aynı tarayıcıda oturum açık kullanıcı) */
export function readHeroSearchPlanBLast(userId: string): HeroSearchSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PLAN_B_PREFIX}${userId}:last`)
    if (!raw) return null
    return JSON.parse(raw) as HeroSearchSnapshot
  } catch {
    return null
  }
}

/** Plan B listesinde (yeniden eskiye) verilen dikeye uyan ilk kayıt */
export function readHeroSearchPlanBFirstMatching(
  userId: string,
  vertical: HeroSearchVertical,
): HeroSearchSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PLAN_B_PREFIX}${userId}`)
    if (!raw) return null
    const list = JSON.parse(raw) as HeroSearchSnapshot[]
    if (!Array.isArray(list)) return null
    return list.find((x) => x.vertical === vertical) ?? null
  } catch {
    return null
  }
}

const DEFAULT_PATH_BY_VERTICAL: Record<HeroSearchVertical, string> = {
  stay: '/stay-categories-map/all',
  car: '/car-categories-map/all',
  experience: '/experience-categories-map/all',
  flight: '/flight-categories/all',
}

function locationQueryValue(vertical: HeroSearchVertical, params: Record<string, string>): string | undefined {
  switch (vertical) {
    case 'car':
      return params['pickup-location']
    case 'flight':
      return params['flying-from-location']
    default:
      return params['location']
  }
}

/** Kayıtlı hero araması için tam uygulama yolu — `vitrinPath` ile vitrin segmentleri uygulanır; sorgu korunur. */
export function buildHeroSearchHref(vitrinPath: (internal: string) => string, snapshot: HeroSearchSnapshot): string {
  const base = snapshot.pathnameHint?.trim() || DEFAULT_PATH_BY_VERTICAL[snapshot.vertical]
  const loc = locationQueryValue(snapshot.vertical, snapshot.params)
  const pathWithQuery = loc ? `${base}?location=${encodeURIComponent(loc)}` : base
  const qIdx = pathWithQuery.indexOf('?')
  const pathOnly = qIdx === -1 ? pathWithQuery : pathWithQuery.slice(0, qIdx)
  const query = qIdx === -1 ? '' : pathWithQuery.slice(qIdx)
  const internal = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
  return vitrinPath(internal) + query
}

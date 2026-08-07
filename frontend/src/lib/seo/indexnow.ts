/**
 * IndexNow protokolü — Bing, Yandex, Seznam ve arama motoru botlarına yeni ve güncellenen
 * ilan/kategori URL'lerini anında bildirerek arama motoru botlarını siteye çağırır.
 * https://www.indexnow.org/
 */

import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'

export const INDEXNOW_KEY = '5a7c29e1f8b34017bc92d8471e63a150'
export const INDEXNOW_KEY_FILE = `${INDEXNOW_KEY}.txt`

export interface IndexNowPayload {
  host: string
  key: string
  keyLocation?: string
  urlList: string[]
}

export interface IndexNowResult {
  ok: boolean
  status: number
  submittedCount: number
  error?: string
}

/**
 * Verilen URL veya URL listesini IndexNow API'sine gönderir.
 */
export async function submitToIndexNow(
  urls: string | string[],
  options?: {
    host?: string
    key?: string
    keyLocation?: string
  },
): Promise<IndexNowResult> {
  const urlList = (Array.isArray(urls) ? urls : [urls])
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))

  if (urlList.length === 0) {
    return { ok: false, status: 400, submittedCount: 0, error: 'no_valid_urls' }
  }

  const base = (await resolveCanonicalBaseUrl()) || getPublicSiteUrl()
  const parsedBase = new URL(base)
  const host = options?.host || parsedBase.hostname
  const key = options?.key || INDEXNOW_KEY
  const keyLocation =
    options?.keyLocation || `${parsedBase.origin}/${INDEXNOW_KEY_FILE}`

  const payload: IndexNowPayload = {
    host,
    key,
    keyLocation,
    urlList: Array.from(new Set(urlList)),
  }

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
      // IndexNow 200 (OK), 202 (Accepted) döndürür
      signal: AbortSignal.timeout(6000),
    })

    if (res.status === 200 || res.status === 202) {
      return { ok: true, status: res.status, submittedCount: payload.urlList.length }
    }

    return {
      ok: false,
      status: res.status,
      submittedCount: payload.urlList.length,
      error: `IndexNow HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      submittedCount: payload.urlList.length,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

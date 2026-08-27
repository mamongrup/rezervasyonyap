import { getStoredAuthToken } from '@/lib/auth-storage'

/**
 * Panel kaydı sonrası vitrin ISR/tag önbelleğini düşürür.
 * Çağıran isterse sonucu bekleyebilir; ağ hatası kayıt akışını bozmaz.
 */
export async function notifyCatalogRevalidate(body: {
  handle?: string
  category_slug?: string
  detail_segment?: string
  blog_slug?: string
  blog?: boolean
}): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const token = getStoredAuthToken()
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (token?.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`
    }
    const response = await fetch('/api/manage/revalidate-catalog', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(body),
    })
    return response.ok
  } catch {
    return false
  }
}

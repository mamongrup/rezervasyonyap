/**
 * /api/upload-image için merkezi fetch yardımcısı.
 * Token çerezi yazılamadığında Bearer header ile yedekler;
 * credentials: 'include' ile çerezi de gönderir.
 */
import { getStoredAuthToken } from '@/lib/auth-storage'

type UploadApiPayload = {
  ok: boolean
  url?: string
  /** `/api/upload-image` yanıtı — `url` ile aynı göreli yol */
  path?: string
  warning?: string
  error?: string
}

export type UploadResult = {
  ok: boolean
  url?: string
  warning?: string
  error?: string
}

export async function uploadFetch(body: FormData): Promise<UploadResult> {
  const headers: HeadersInit = {}
  const token = getStoredAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    body,
    credentials: 'include',
    headers,
  })

  try {
    const data = (await res.json()) as UploadApiPayload
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error:
          data.error ??
          (res.status === 401
            ? 'Oturum gerekli. Çıkış yapıp tekrar giriş yapın.'
            : `Sunucu hatası (${res.status})`),
      }
    }
    const url = (data.url ?? data.path)?.trim()
    if (!url) {
      return { ok: false, error: 'Sunucu yanıtında dosya yolu yok.' }
    }
    return { ok: true, url, warning: data.warning }
  } catch {
    return { ok: false, error: `Sunucu yanıtı okunamadı (${res.status})` }
  }
}

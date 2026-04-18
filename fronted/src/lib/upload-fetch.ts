/**
 * /api/upload-image için merkezi fetch yardımcısı.
 * Token çerezi yazılamadığında Bearer header ile yedekler;
 * credentials: 'include' ile çerezi de gönderir.
 */
import { getStoredAuthToken } from '@/lib/auth-storage'

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
    const data = (await res.json()) as UploadResult
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
    return data
  } catch {
    return { ok: false, error: `Sunucu yanıtı okunamadı (${res.status})` }
  }
}

import { getStoredAuthToken } from '@/lib/auth-storage'

/** Genel ayarlar — logo / favicon için `public/uploads/branding` yüklemesi */
export type BrandingUploadPurpose = 'logo-light' | 'logo-dark' | 'favicon'

export async function uploadBrandingAsset(file: File, purpose: BrandingUploadPurpose): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('variant', 'branding')
  form.append('purpose', purpose)

  const headers: HeadersInit = {}
  const token = getStoredAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers,
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string }

  if (!res.ok || !data.ok || typeof data.url !== 'string') {
    const msg =
      data.error ??
      (res.status === 401
        ? 'Oturum gerekli veya süresi doldu. Çıkış yapıp tekrar giriş yapın.'
        : 'Yükleme başarısız')
    throw new Error(msg)
  }
  return data.url
}

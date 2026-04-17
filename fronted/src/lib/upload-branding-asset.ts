/** Genel ayarlar — logo / favicon için `public/uploads/branding` yüklemesi */
export type BrandingUploadPurpose = 'logo-light' | 'logo-dark' | 'favicon'

export async function uploadBrandingAsset(file: File, purpose: BrandingUploadPurpose): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('variant', 'branding')
  form.append('purpose', purpose)

  const res = await fetch('/api/upload-image', { method: 'POST', body: form })
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string }

  if (!res.ok || !data.ok || typeof data.url !== 'string') {
    throw new Error(data.error ?? 'Yükleme başarısız')
  }
  return data.url
}

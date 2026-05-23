/** Genel ayarlar — logo / favicon için `public/uploads/site` yüklemesi */
import { uploadFetch } from '@/lib/upload-fetch'

/** `logo-light` gibi sabit adlar önyüzde şablon sanılır; yükleme dosya adı farklı olmalı */
export type BrandingUploadPurpose = 'brand-logo-light' | 'brand-logo-dark' | 'brand-favicon'

export async function uploadBrandingAsset(file: File, purpose: BrandingUploadPurpose): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  /** Yapısal site varlıkları: `public/uploads/site/{purpose}.{ext}` */
  form.append('folder', 'site')
  form.append('fixedStem', purpose)

  const data = await uploadFetch(form)

  if (!data.ok || typeof data.url !== 'string') {
    throw new Error(data.error ?? 'Yükleme başarısız')
  }
  return data.url
}

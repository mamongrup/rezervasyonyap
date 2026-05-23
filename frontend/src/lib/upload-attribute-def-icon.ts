/** Katalog → Öznitelikler: tanım vitrin ikonu (`public/uploads/general/attribute-icons/`) */
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { uploadFetch } from '@/lib/upload-fetch'

export async function uploadAttributeDefIcon(file: File, defCode: string): Promise<string> {
  const stem = slugifyMediaSegment(defCode).replace(/-/g, '_') || 'icon'
  const form = new FormData()
  form.append('file', file)
  form.append('folder', 'general/attribute-icons')
  form.append('fixedStem', stem)

  const data = await uploadFetch(form)
  if (!data.ok || typeof data.url !== 'string') {
    throw new Error(data.error ?? 'İkon yüklenemedi')
  }
  return data.url
}

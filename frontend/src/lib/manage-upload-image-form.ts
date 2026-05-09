/**
 * `/api/upload-image` için ortak FormData — ManageMediaPickerModal, medya kütüphanesi vb.
 */

import { uploadFetch, type UploadResult } from '@/lib/upload-fetch'

export type ManageMediaPickerUploadTarget = {
  folder: string
  subPath: string
  prefix: string
  /** `/api/upload-image` — `index` */
  index?: string
  /** `/api/upload-image` — `slot` (0 tabanlı slot → API içinde dosya sırasına çevrilir) */
  slot?: string
  fileBase?: string
  fixedStem?: string
  useOriginalStem?: boolean
}

export function appendManageUploadNaming(
  form: FormData,
  t: ManageMediaPickerUploadTarget,
  explicitIndex: number | null,
): void {
  if (t.fileBase?.trim()) form.append('fileBase', t.fileBase.trim())
  if (t.useOriginalStem) form.append('useOriginalStem', '1')
  if (t.fixedStem?.trim()) {
    form.append('fixedStem', t.fixedStem.trim())
    return
  }
  if (explicitIndex != null && explicitIndex >= 1) {
    form.append('index', String(explicitIndex))
    return
  }
  if (t.slot != null && t.slot !== '') {
    form.append('slot', t.slot)
    return
  }
  if (t.index != null && t.index !== '') {
    form.append('index', t.index)
  }
}

export function buildManageUploadImageFormData(
  file: File,
  t: ManageMediaPickerUploadTarget,
  explicitIndex: number | null,
): FormData {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', t.folder)
  form.append('subPath', t.subPath ?? '')
  form.append('prefix', t.prefix)
  appendManageUploadNaming(form, t, explicitIndex)
  return form
}

export function resolveBatchStartIndex(
  t: ManageMediaPickerUploadTarget,
  batchStartIndex?: number,
): number {
  if (batchStartIndex != null && batchStartIndex >= 1) return batchStartIndex
  if (t.index != null && t.index !== '') {
    const n = Number.parseInt(t.index, 10)
    if (Number.isFinite(n) && n >= 1) return n
  }
  return 1
}

/**
 * Sharp AVIF kodlaması CPU yoğun; aynı anda sınırlı sayıda istek gönderilir (ör. 8 dosya → 3+3+2).
 */
export const MANAGE_IMAGE_UPLOAD_CONCURRENCY = 3

export async function uploadManageImagesWithConcurrency(
  files: File[],
  t: ManageMediaPickerUploadTarget,
  batchStartIndex: number | undefined,
  multi: boolean,
): Promise<{ ok: true; urls: string[]; warning?: string } | { ok: false; error: string; urls: string[] }> {
  const start = resolveBatchStartIndex(t, batchStartIndex)
  const urls: string[] = []
  let lastWarning: string | undefined
  const n = files.length

  for (let offset = 0; offset < n; offset += MANAGE_IMAGE_UPLOAD_CONCURRENCY) {
    const end = Math.min(offset + MANAGE_IMAGE_UPLOAD_CONCURRENCY, n)
    const chunk: Promise<UploadResult>[] = []
    for (let i = offset; i < end; i++) {
      const explicitIdx = multi ? start + i : null
      chunk.push(uploadFetch(buildManageUploadImageFormData(files[i]!, t, explicitIdx)))
    }
    const results = await Promise.all(chunk)
    for (const data of results) {
      if (!data.ok || !data.url) {
        return { ok: false, error: data.error ?? 'Yükleme başarısız.', urls }
      }
      urls.push(data.url)
      if (data.warning) lastWarning = data.warning
    }
  }

  return { ok: true, urls, warning: lastWarning }
}

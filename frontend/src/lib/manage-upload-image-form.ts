/**
 * `/api/upload-image` için ortak FormData — ManageMediaPickerModal, medya kütüphanesi vb.
 */

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

/**
 * Bravo media_files → indirilebilir URL adayları.
 * CDN: https://cdn.rezervasyonyap.com.tr/0000/1/.../file.webp (uploads/ yok)
 * WWW: https://www.rezervasyonyap.com.tr/uploads/0000/1/.../file.webp
 */

export const CDN_BASE = 'https://cdn.rezervasyonyap.com.tr/'
export const WWW_UPLOAD_BASE = 'https://www.rezervasyonyap.com.tr/uploads/'

/** file_path içindeki uploads/ önekini kaldırır */
export function normalizeMediaPath(filePath) {
  if (!filePath) return ''
  return String(filePath)
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^uploads\//i, '')
}

/** Aynı dosya için CDN önce, sonra www (uploads/) */
export function mediaUrlCandidates(row) {
  if (!row?.file_path) return []
  const fp = normalizeMediaPath(row.file_path)
  if (!fp) return []

  const hasExt = /\.[a-z0-9]{2,5}$/i.test(fp)
  const ext = (row.file_extension || 'webp').replace(/^\./, '') || 'webp'
  const rel = hasExt ? fp : `${fp}.${ext}`

  const urls = [`${CDN_BASE}${rel}`, `${WWW_UPLOAD_BASE}${rel}`]
  return [...new Set(urls)]
}

/** Geriye uyumluluk: birincil aday (CDN) */
export function mediaUrl(row) {
  const c = mediaUrlCandidates(row)
  return c[0] ?? null
}

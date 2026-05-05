import { normalizeSiteRelativeUploadSrc } from '@/lib/normalize-site-upload-src'

/**
 * Bazı üretim nginx kurulumlarında `/uploads/*` önce httpdocs kökünde statik aranır;
 * panel dosyaları ise `frontend/public/uploads` altında olduğundan 404 olur.
 * `/api/*` genelde Next'e proxylendiği için `site/**` ağacını `/api/site-upload/**`
 * üzerinden sunmak görsellerin her zaman Node üzerinden okunmasını sağlar.
 */
export function siteUploadBrowserHref(src: string): string {
  const s = src.trim()
  if (!s.startsWith('/uploads/site/')) return s
  const rest = s.slice('/uploads/'.length)
  const parts = rest.split('/').filter(Boolean).map((seg) => encodeURIComponent(seg))
  if (parts.length === 0) return s
  return `/api/site-upload/${parts.join('/')}`
}

/** Yönetim paneli önizlemesi — kayıtlı URL `/uploads/site/**` kalır; yalnızca görüntüleme Next API üzerinden */
export function managePanelUploadPreviewSrc(raw: string): string {
  let s = normalizeSiteRelativeUploadSrc(raw.trim())
  if (!s) return s

  if (s.startsWith('/uploads/site/')) {
    return siteUploadBrowserHref(s)
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s)
      const p = u.pathname || ''
      if (p.startsWith('/uploads/site/')) {
        return siteUploadBrowserHref(`${p}${u.search}${u.hash}`)
      }
    } catch {
      /* yoksay */
    }
  }

  // Protokol göreli `//alan/uploads/site/...`
  if (s.startsWith('//')) {
    try {
      const u = new URL(`https:${s}`)
      const p = u.pathname || ''
      if (p.startsWith('/uploads/site/')) {
        return siteUploadBrowserHref(`${p}${u.search}${u.hash}`)
      }
    } catch {
      /* yoksay */
    }
  }

  return s
}

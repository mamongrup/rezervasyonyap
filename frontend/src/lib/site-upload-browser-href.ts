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

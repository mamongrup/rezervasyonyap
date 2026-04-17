/**
 * Vitrin paylaşım linkleri — `SocialsShare` ve benzeri bileşenler.
 */

export function buildFacebookShareUrl(pageUrl: string): string {
  const u = encodeURIComponent(pageUrl.trim())
  return `https://www.facebook.com/sharer/sharer.php?u=${u}`
}

export function buildTwitterShareUrl(pageUrl: string, title?: string): string {
  const u = encodeURIComponent(pageUrl.trim())
  const t = encodeURIComponent((title ?? '').trim())
  const q = t ? `url=${u}&text=${t}` : `url=${u}`
  return `https://twitter.com/intent/tweet?${q}`
}

export function buildMailtoShareUrl(pageUrl: string, title?: string): string {
  const sub = (title ?? '').trim()
  const body = pageUrl.trim()
  const params = new URLSearchParams()
  if (sub) params.set('subject', sub)
  if (body) params.set('body', body)
  const q = params.toString()
  return q ? `mailto:?${q}` : 'mailto:'
}

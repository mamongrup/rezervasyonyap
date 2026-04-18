/** Facebook / X (Twitter) / e-posta paylaşım URL’leri — harici aç */

export function buildFacebookShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`
}

export function buildTwitterShareUrl(pageUrl: string, text?: string): string {
  const u = new URL('https://twitter.com/intent/tweet')
  u.searchParams.set('url', pageUrl)
  if (text?.trim()) u.searchParams.set('text', text.trim())
  return u.toString()
}

export function buildMailtoShareUrl(pageUrl: string, subject?: string): string {
  const q = new URLSearchParams()
  if (subject?.trim()) q.set('subject', subject.trim())
  q.set('body', pageUrl)
  return `mailto:?${q.toString()}`
}

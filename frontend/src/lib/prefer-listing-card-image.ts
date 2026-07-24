/**
 * Vitrin kartı kapak URL’si — harici CDN’lerde “Big” yerine kart boyutu.
 * bookeder Photos/Big (~90KB JPEG) → Photos/Medium (~15KB); LCP değil ama
 * anasayfa SI / 3. taraf baytını ciddi düşürür.
 */
export function preferListingCardImageUrl(url: string): string {
  const raw = (url ?? '').trim()
  if (!raw) return raw
  try {
    const u = new URL(raw, 'https://rezervasyonyap.tr')
    if (!/(^|\.)bookeder\.com$/i.test(u.hostname)) return raw
    if (!/\/Photos\/Big\//i.test(u.pathname)) return raw
    u.pathname = u.pathname.replace(/\/Photos\/Big\//i, '/Photos/Medium/')
    return u.toString()
  } catch {
    return raw.replace(/\/Photos\/Big\//i, '/Photos/Medium/')
  }
}

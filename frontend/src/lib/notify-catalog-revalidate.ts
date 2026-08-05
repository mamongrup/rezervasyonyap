/**
 * Panel kaydı sonrası vitrin ISR/tag önbelleğini düşürmek için fire-and-forget.
 * Hata yutülür — kayıt akışını bozmaz.
 */
export function notifyCatalogRevalidate(body: {
  handle?: string
  category_slug?: string
  detail_segment?: string
  blog_slug?: string
  blog?: boolean
}): void {
  if (typeof window === 'undefined') return
  void fetch('/api/manage/revalidate-catalog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  }).catch(() => {})
}

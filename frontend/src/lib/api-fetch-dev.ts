/**
 * Next.js fetch disk önbelleği (`.next/cache/fetch-cache`) bazen bozuk gövde saklar;
 * yeniden okunurken `JSON.parse` konum 600+ gibi hatalar verir. Geliştirmede API
 * isteklerini önbelleğe almayarak taze yanıt kullanılır.
 *
 * Ek olarak `src/instrumentation.ts` tüm `NEXT_PUBLIC_API_URL` isteklerine dev'de
 * `cache: 'no-store'` uygular (parametresiz `fetch` dahil).
 *
 * `cache: 'no-store'` ile `next.revalidate` aynı anda kullanılamaz — dev'de `next` atılır.
 */
export function withDevNoStore<T extends RequestInit | undefined>(init?: T): RequestInit {
  if (process.env.NODE_ENV !== 'development') return init ?? {}
  const { next: _next, ...rest } = init ?? {}
  return { ...rest, cache: 'no-store' }
}

/**
 * Next.js yalnızca bu dosyadaki `middleware` export'unu çalıştırır.
 * Asıl mantık `proxy.ts` içinde (locale rewrite, HTTPS yönlendirme, korumalı yollar).
 */
export { proxy as middleware, config } from './proxy'

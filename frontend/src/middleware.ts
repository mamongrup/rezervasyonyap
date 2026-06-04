/**
 * Next.js 16+ edge giriş noktası `src/proxy.ts` (`export function proxy`).
 * Güvenlik (CORS, rate limit, Host, HttpOnly korumalı rotalar) orada uygulanır.
 *
 * Bu dosya eski `middleware.ts` adını arayan araçlar ve dokümantasyon için ince köprüdür.
 */
export { proxy as middleware, config } from './proxy'

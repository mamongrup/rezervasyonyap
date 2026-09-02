/**
 * Production'da bile konsola uyarı basan hata loglama yardımcısı.
 * Boş catch blokları yerine kullanılır: `.catch((e) => logCatch('checkout-pay', e))`
 */
export function logCatch(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    // Production'da sadece console.warn — Error Boundary tetiklemez,
    // ama sunucu loglarından takip edilebilir.
    console.warn(`[catch:${context}]`, error)
  }
}

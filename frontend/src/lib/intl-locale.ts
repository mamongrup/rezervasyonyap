/**
 * Uygulama içi locale kodunu (ör. `tr`, `zh`) `Intl.NumberFormat` / `Intl.DateTimeFormat`
 * için tam BCP 47 koduna çevirir. Yalnızca desteklenen 6 dil için sabitler döner;
 * bilinmeyen değerler için `en-US` fallback kullanılır.
 */
export function toIntlLocale(locale: string | undefined | null): string {
  const lc = (locale ?? '').trim().toLowerCase()
  switch (lc) {
    case 'tr': return 'tr-TR'
    case 'en': return 'en-US'
    case 'de': return 'de-DE'
    case 'ru': return 'ru-RU'
    case 'zh': return 'zh-CN'
    case 'fr': return 'fr-FR'
    default:   return 'en-US'
  }
}

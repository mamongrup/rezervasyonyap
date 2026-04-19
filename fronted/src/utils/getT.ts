import { de } from '../../public/locales/de'
import { en, type AppMessages } from '../../public/locales/en'
import { ru } from '../../public/locales/ru'
import { tr } from '../../public/locales/tr'
import { fr } from '../../public/locales/fr'
import { zh } from '../../public/locales/zh'
import { isEnglishLocale } from '@/lib/i18n-config'

export type { AppMessages }
export type Messages = AppMessages

const DICTS: Record<string, AppMessages> = { tr, en, de, ru, zh, fr }

/**
 * URL diline göre tüm çeviri sözlüğü (sunucu + istemci).
 *
 * Bilinmeyen diller için fallback **TR yerine EN** olur — uluslararası kullanıcılar
 * için tutarlı bir görünüm sağlar. (TR varsayılan dil olduğu için ona düşmek
 * "site bozuk" izlenimi yaratıyordu.)
 */
export function getMessages(locale: string | undefined | null): AppMessages {
  const loc = typeof locale === 'string' ? locale.trim().toLowerCase() : ''
  if (isEnglishLocale(loc)) return en
  const direct = DICTS[loc]
  if (direct) return direct
  return en
}

/**
 * Belirli bir anahtar yolu için çoklu sözlükten en uygun değeri seçer.
 *
 * Sıra: istenen dil → EN → TR → undefined.
 * Sözlüklerden biri ilgili anahtarı kaybetmişse boş metin yerine en yakın dilin
 * karşılığı görünür (`undefined` dönerse çağıran kaynaktan fallback alabilir).
 *
 * @example
 *   pickTranslation('fr', (m) => m.footer.rights)
 */
export function pickTranslation<T>(
  locale: string | undefined | null,
  selector: (m: AppMessages) => T | undefined,
): T | undefined {
  const loc = typeof locale === 'string' ? locale.trim().toLowerCase() : ''
  const order: AppMessages[] = []
  const direct = DICTS[loc]
  if (direct) order.push(direct)
  if (loc !== 'en') order.push(en)
  if (loc !== 'tr') order.push(tr)
  for (const d of order) {
    const v = selector(d)
    if (v !== undefined && v !== null && (typeof v !== 'string' || v.trim() !== '')) return v
  }
  return undefined
}

/** @deprecated Yeni kodda `getMessages(locale)` kullanın */
const T = tr

export default T


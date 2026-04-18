import { de } from '../../public/locales/de'
import { en, type AppMessages } from '../../public/locales/en'
import { ru } from '../../public/locales/ru'
import { tr } from '../../public/locales/tr'
import { fr } from '../../public/locales/fr'
import { zh } from '../../public/locales/zh'
import { isEnglishLocale } from '@/lib/i18n-config'

export type { AppMessages }
export type Messages = AppMessages

/** URL diline göre tüm çeviri sözlüğü (sunucu + istemci) */
export function getMessages(locale: string | undefined | null): AppMessages {
  const loc = typeof locale === 'string' ? locale.trim().toLowerCase() : ''
  if (isEnglishLocale(loc)) return en
  if (loc === 'tr') return tr
  if (loc === 'de') return de
  if (loc === 'ru') return ru
  if (loc === 'zh') return zh
  if (loc === 'fr') return fr
  return tr
}

/** @deprecated Yeni kodda `getMessages(locale)` kullanın */
const T = tr

export default T


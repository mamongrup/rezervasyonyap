import { de } from '@locales/de'
import { en } from '@locales/en'
import { fr } from '@locales/fr'
import { ru } from '@locales/ru'
import { tr } from '@locales/tr'
import { zh } from '@locales/zh'
import { flattenLocaleMessages } from './flatten-locale-messages'

const cache: Record<string, Record<string, string>> = {}

/** Dil koduna göre `public/locales/*.ts` düzleştirilmiş metinleri (panel yedeği / ön yüz ile uyum). */
export function getLocaleFlatMessages(localeCode: string): Record<string, string> {
  const c = localeCode.trim().toLowerCase()
  if (cache[c]) return cache[c]
  const messages =
    c === 'tr'
      ? tr
      : c === 'de'
        ? de
        : c === 'ru'
          ? ru
          : c === 'zh'
            ? zh
            : c === 'fr'
              ? fr
              : c === 'en'
                ? en
                : en
  const flat = flattenLocaleMessages(messages)
  cache[c] = flat
  return flat
}

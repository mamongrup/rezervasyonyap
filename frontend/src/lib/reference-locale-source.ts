import { en } from '../../public/locales/en'
import { flattenLocaleMessages } from './flatten-locale-messages'

let cache: Record<string, string> | null = null

/** `public/locales/en.ts` — tek referans kaynak (Laravel’deki “menşei” sütunu). */
export function getEnglishReferenceFlat(): Record<string, string> {
  if (!cache) {
    cache = flattenLocaleMessages(en)
  }
  return cache
}

export function englishReferenceKeyCount(): number {
  return Object.keys(getEnglishReferenceFlat()).length
}

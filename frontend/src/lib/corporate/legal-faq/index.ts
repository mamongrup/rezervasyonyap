import type { LegalFaqBundle } from './types'
import { de } from './de'
import { en } from './en'
import { fr } from './fr'
import { ru } from './ru'
import { tr } from './tr'
import { zh } from './zh'

const MAP: Record<string, LegalFaqBundle> = { tr, en, de, ru, zh, fr }

export function getLegalFaq(locale: string | undefined | null): LegalFaqBundle {
  const loc = (locale || 'tr').toLowerCase()
  return MAP[loc] ?? en
}

export * from './types'
export { fillFaqPlaceholders } from './placeholders'

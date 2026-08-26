const LANGUAGE_CODE_BY_NAME: Record<string, string> = {
  tr: 'TR', tur: 'TR', turkce: 'TR', turkish: 'TR', turkisch: 'TR', turc: 'TR', 'турецкий': 'TR', '土耳其语': 'TR',
  en: 'EN', eng: 'EN', ingilizce: 'EN', english: 'EN', englisch: 'EN', anglais: 'EN', 'английский': 'EN', '英语': 'EN',
  de: 'DE', deu: 'DE', ger: 'DE', almanca: 'DE', german: 'DE', deutsch: 'DE', allemand: 'DE', 'немецкий': 'DE', '德语': 'DE',
  ru: 'RU', rus: 'RU', rusca: 'RU', russian: 'RU', russisch: 'RU', russe: 'RU', 'русский': 'RU', 'русскии': 'RU', '俄语': 'RU',
  zh: 'ZH', zho: 'ZH', chi: 'ZH', cince: 'ZH', chinese: 'ZH', chinesisch: 'ZH', chinois: 'ZH', 'китайский': 'ZH', '中文': 'ZH', '汉语': 'ZH',
  fr: 'FR', fra: 'FR', fre: 'FR', fransizca: 'FR', french: 'FR', franzosisch: 'FR', francais: 'FR', 'французский': 'FR', '法语': 'FR',
  es: 'ES', spa: 'ES', ispanyolca: 'ES', spanish: 'ES', spanisch: 'ES', espagnol: 'ES', 'испанский': 'ES', '西班牙语': 'ES',
  ar: 'AR', ara: 'AR', arapca: 'AR', arabic: 'AR', arabisch: 'AR', arabe: 'AR', 'арабский': 'AR', '阿拉伯语': 'AR',
}

function normalizeLanguageName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

export function languageDisplayCode(value: string): string {
  const normalized = normalizeLanguageName(value)
  if (!normalized) return ''
  const known = LANGUAGE_CODE_BY_NAME[normalized]
  if (known) return known
  if (/^[a-z]{2,3}$/.test(normalized)) return normalized.slice(0, 2).toUpperCase()
  return value.trim().toUpperCase()
}

export function formatLanguageCodes(values: string[]): string {
  const codes = Array.from(new Set(values.map(languageDisplayCode).filter(Boolean)))
  return codes.join(', ')
}

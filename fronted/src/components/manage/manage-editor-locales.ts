/** Yönetim formlarında dil sekmesi + AI çeviri hedefleri (yeni ilan ile aynı liste) */
export const MANAGE_EDITOR_LOCALE_TABS = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const

export type ManageEditorLocaleTab = (typeof MANAGE_EDITOR_LOCALE_TABS)[number]

export const MANAGE_EDITOR_LOCALES_TR_TARGET = MANAGE_EDITOR_LOCALE_TABS.filter((l) => l.code !== 'tr')
